import pytest
from httpx import AsyncClient
from app.domains.auth.service import get_cache_val
from app.domains.resume.models import Resume, ResumeSection, ParsedEntity


@pytest.mark.asyncio
async def test_resume_upload_and_lifecycle(client: AsyncClient, db) -> None:
    # 1. Sign up and Login
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "resume@example.com", "password": "password123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "resume@example.com", "password": "password123"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Upload Mock PDF
    # Create mock PDF binary stream
    pdf_content = b"%PDF-1.4\n%mock PDF content for resume parser test"
    files = {"file": ("resume.pdf", pdf_content, "application/pdf")}
    
    upload_resp = await client.post(
        "/api/v1/resume/upload",
        headers=headers,
        files=files
    )
    assert upload_resp.status_code == 201
    resume_data = upload_resp.json()
    assert resume_data["file_name"] == "resume.pdf"
    assert "id" in resume_data
    resume_id = resume_data["id"]
    
    # 3. Retrieve list of resumes
    list_resp = await client.get("/api/v1/resume/list", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) > 0
    
    # 4. Get individual resume details
    detail_resp = await client.get(f"/api/v1/resume/{resume_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == resume_id
    
    # 5. Get parse status
    status_resp = await client.get(f"/api/v1/resume/{resume_id}/parse-status", headers=headers)
    assert status_resp.status_code == 200
    assert "parse_status" in status_resp.json()
    
    # 6. ATS check against JD
    ats_resp = await client.post(
        f"/api/v1/resume/{resume_id}/ats-check",
        headers=headers,
        json={"job_description": "We need a Senior Python Developer with FastAPI and Docker experience."}
    )
    assert ats_resp.status_code == 200
    assert "ats_score" in ats_resp.json()
    assert len(ats_resp.json()["keywords_found"]) > 0
    
    # 7. AI Enhance suggestions
    enhance_resp = await client.post(
        f"/api/v1/resume/{resume_id}/enhance",
        headers=headers,
        json={"section_type": "EXPERIENCE"}
    )
    assert enhance_resp.status_code == 200
    assert "enhanced_text" in enhance_resp.json()
    assert len(enhance_resp.json()["suggestions"]) > 0
    
    # 8. Export parsed markdown
    export_resp = await client.get(f"/api/v1/resume/{resume_id}/export?format=markdown", headers=headers)
    assert export_resp.status_code == 200
    assert export_resp.json()["format"] == "markdown"
    assert "resume.pdf" in export_resp.json()["content"]


@pytest.mark.asyncio
async def test_compare_resumes(client: AsyncClient, db) -> None:
    # 1. Sign up and Login
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "compare@example.com", "password": "password123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "compare@example.com", "password": "password123"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Upload two resumes
    files_1 = {"file": ("r1.pdf", b"%PDF-1.4\nResume 1", "application/pdf")}
    files_2 = {"file": ("r2.pdf", b"%PDF-1.4\nResume 2", "application/pdf")}
    
    u1 = await client.post("/api/v1/resume/upload", headers=headers, files=files_1)
    u2 = await client.post("/api/v1/resume/upload", headers=headers, files=files_2)
    
    r1_id = u1.json()["id"]
    r2_id = u2.json()["id"]
    
    # 3. Perform side-by-side comparison
    compare_resp = await client.post(
        "/api/v1/resume/compare",
        headers=headers,
        json={"resume_id_1": r1_id, "resume_id_2": r2_id}
    )
    assert compare_resp.status_code == 200
    comp_data = compare_resp.json()
    assert "resume_1_analysis" in comp_data
    assert "resume_2_analysis" in comp_data
    assert "verdict" in comp_data
