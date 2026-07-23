import pytest
import time
from httpx import AsyncClient
from sqlalchemy import select
from app.domains.auth.models import User
from app.domains.resume.models import Resume
from app.domains.jobs.models import JobListing


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """Helper to create a standard test user and obtain auth headers."""
    email = f"jobs_test_{int(time.time())}@example.com"
    await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "password123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"}
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "email": email}


@pytest.fixture
async def admin_headers(client: AsyncClient, db) -> dict:
    """Helper to create an admin user and obtain superuser auth headers."""
    email = f"jobs_admin_{int(time.time())}@example.com"
    await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "password123"},
    )
    
    # Query user and upgrade role to admin
    stmt = select(User).where(User.email == email)
    res = await db.execute(stmt)
    user = res.scalar_one()
    user.role = "admin"
    await db.commit()

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"}
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_jobs_lifecycle(client: AsyncClient, db, auth_headers: dict, admin_headers: dict) -> None:
    headers = {"Authorization": auth_headers["Authorization"]}
    
    # 1. Insert a mock Resume for the user to trigger matching logic
    user_stmt = select(User).where(User.email == auth_headers["email"])
    res = await db.execute(user_stmt)
    user = res.scalar_one()
    
    resume = Resume(
        user_id=user.id,
        file_name="test_resume.pdf",
        file_path="/tmp/test_resume.pdf",
        parse_status="success",
        parsed_text="John Doe. Senior Software Engineer. Proficient with Python, FastAPI, and PostgreSQL. Familiar with Docker.",
        skill_summary={"skills": ["Python", "FastAPI", "PostgreSQL", "Docker"]},
        is_primary=True
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    
    # 2. Search jobs (GET /jobs/search) - Triggers seeding of default jobs
    search_resp = await client.get("/api/v1/jobs/search?q=Python", headers=headers)
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert len(search_data) > 0
    job_id = search_data[0]["job"]["id"]
    
    # 3. Get job details (GET /jobs/{id})
    get_job_resp = await client.get(f"/api/v1/jobs/{job_id}", headers=headers)
    assert get_job_resp.status_code == 200
    assert get_job_resp.json()["id"] == job_id
    
    # 4. Get job recommendations (GET /jobs/recommendations/{resume_id})
    recs_resp = await client.get(f"/api/v1/jobs/recommendations/{resume.id}", headers=headers)
    assert recs_resp.status_code == 200
    recs_data = recs_resp.json()
    assert len(recs_data) > 0
    assert "id" in recs_data[0]["job"]
    assert "match_score" in recs_data[0]
    
    # 5. Get match score (GET /jobs/match-score/{resume_id}/{job_id})
    match_resp = await client.get(f"/api/v1/jobs/match-score/{resume.id}/{job_id}", headers=headers)
    assert match_resp.status_code == 200
    match_data = match_resp.json()
    assert "match_score" in match_data
    assert "skills_overlap" in match_data
    assert "missing_skills" in match_data
    assert "ats_prediction" in match_data
    
    # 6. Save job to wishlist (POST /jobs/{id}/save)
    save_resp = await client.post(f"/api/v1/jobs/{job_id}/save", headers=headers)
    assert save_resp.status_code == 200
    assert save_resp.json()["status"] == "success"
    
    # 7. Get wishlist / saved jobs (GET /jobs/saved)
    saved_resp = await client.get("/api/v1/jobs/saved", headers=headers)
    assert saved_resp.status_code == 200
    saved_data = saved_resp.json()
    assert len(saved_data) > 0
    assert saved_data[0]["job"]["id"] == job_id
    assert saved_data[0]["match_score"] is not None
    
    # 8. Prepare interview plan (POST /jobs/{id}/prepare-interview)
    prep_resp = await client.post(f"/api/v1/jobs/{job_id}/prepare-interview", headers=headers)
    assert prep_resp.status_code == 200
    assert prep_resp.json()["job_id"] == job_id
    assert "plan" in prep_resp.json()
    
    # 9. Get market insights (GET /jobs/market-insights/{role})
    insights_resp = await client.get("/api/v1/jobs/market-insights/Python Developer", headers=headers)
    assert insights_resp.status_code == 200
    assert insights_resp.json()["role"] == "Python Developer"
    assert "salary_ranges" in insights_resp.json()
    
    # 10. Get skill gap analysis (GET /jobs/skill-gap/{resume_id})
    gap_resp = await client.get(f"/api/v1/jobs/skill-gap/{resume.id}", headers=headers)
    assert gap_resp.status_code == 200
    assert gap_resp.json()["resume_id"] == resume.id
    assert "critical_missing_skills" in gap_resp.json()
    
    # 11. Admin: batch ingest (POST /jobs/ingest)
    new_jobs = [
        {
            "title": "Flutter Developer",
            "company": "AppCraft Inc.",
            "description": "Build high-performance cross-platform mobile apps using Flutter.",
            "requirements": "2 years Flutter, Dart, experience with state management.",
            "salary_range": "₹8,00,000 - ₹11,00,000 LPA",
            "location": "Chennai, Tamil Nadu",
            "skills": ["Flutter", "Dart", "Git"],
            "experience_level": "Mid"
        }
    ]
    ingest_resp = await client.post("/api/v1/jobs/ingest", json=new_jobs, headers=admin_headers)
    assert ingest_resp.status_code == 201
    assert "Successfully ingested" in ingest_resp.json()["message"]
    
    # Verify the ingested job is now searchable
    search_flutter = await client.get("/api/v1/jobs/search?q=Flutter", headers=headers)
    assert search_flutter.status_code == 200
    assert len(search_flutter.json()) > 0
    assert search_flutter.json()[0]["job"]["title"] == "Flutter Developer"
    
    # 12. Admin: reindex (POST /jobs/reindex)
    reindex_resp = await client.post("/api/v1/jobs/reindex", headers=admin_headers)
    assert reindex_resp.status_code == 200
    assert reindex_resp.json()["status"] == "success"
    
    # 13. Remove saved job (DELETE /jobs/{id}/unsave)
    unsave_resp = await client.delete(f"/api/v1/jobs/{job_id}/unsave", headers=headers)
    assert unsave_resp.status_code == 200
    assert unsave_resp.json()["status"] == "success"
    
    # Wishlist should now be empty
    saved_empty = await client.get("/api/v1/jobs/saved", headers=headers)
    assert saved_empty.status_code == 200
    assert len(saved_empty.json()) == 0


@pytest.mark.asyncio
async def test_search_live_jobs(client: AsyncClient, db, auth_headers: dict) -> None:
    headers = {"Authorization": auth_headers["Authorization"]}
    
    # Insert a resume for the user to make sure matching logic is tested
    user_stmt = select(User).where(User.email == auth_headers["email"])
    res = await db.execute(user_stmt)
    user = res.scalar_one()
    
    resume = Resume(
        user_id=user.id,
        file_name="live_test_resume.pdf",
        file_path="/tmp/live_test_resume.pdf",
        parse_status="success",
        parsed_text="Jane Doe. Python Software Engineer specializing in backend APIs, FastAPI, Docker, and Kubernetes.",
        skill_summary={"skills": ["Python", "FastAPI", "Docker", "Kubernetes"]},
        is_primary=True
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    
    # Call the new GET /search-live endpoint
    # Since RAPIDAPI_KEY is not set in test env, it will fall back to mock India jobs!
    resp = await client.get("/api/v1/jobs/search-live?q=Python", headers=headers)
    assert resp.status_code == 200
    
    data = resp.json()
    assert len(data) > 0
    # The top mock job for Python should be the "Senior Python & FastAPI Engineer"
    assert data[0]["job"]["title"] == "Senior Python & FastAPI Engineer"
    assert data[0]["job"]["company"] == "Infosys AI Lab"
    assert "match_score" in data[0]
    assert data[0]["match_score"] > 0.0
    
    # Save the live job's ID
    live_job_id = data[0]["job"]["id"]
    
    # Verify we can fetch the job detail locally since it was ingested on-the-fly!
    detail_resp = await client.get(f"/api/v1/jobs/{live_job_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["title"] == "Senior Python & FastAPI Engineer"

