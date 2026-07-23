import pytest
import time
from httpx import AsyncClient


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """Helper to create a test user and obtain auth headers."""
    email = f"review_test_{int(time.time())}@example.com"
    await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "password123"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"}
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_session_review_lifecycle(client: AsyncClient, auth_headers: dict) -> None:
    headers = auth_headers
    
    # 1. Create a mock text interview session first to obtain a valid session_id
    create_intv_resp = await client.post(
        "/api/v1/interview/sessions",
        headers=headers,
        json={"role": "Senior Engineer", "difficulty": 0.8, "num_questions": 3, "interview_type": "technical"}
    )
    assert create_intv_resp.status_code == 201
    session_id = create_intv_resp.json()["id"]
    
    # 2. GET /sessions/history -> Unified history list
    hist_resp = await client.get("/api/v1/sessions/history", headers=headers)
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert len(hist_data) > 0
    assert any(h["id"] == session_id for h in hist_data)
    
    # 3. GET /sessions/{id}/summary -> AI Summary
    summary_resp = await client.get(f"/api/v1/sessions/{session_id}/summary", headers=headers)
    assert summary_resp.status_code == 200
    summary_data = summary_resp.json()
    assert summary_data["session_id"] == session_id
    assert "summary" in summary_data
    
    # 4. GET /sessions/{id}/improvements -> Study Plan & Weaknesses
    imp_resp = await client.get(f"/api/v1/sessions/{session_id}/improvements", headers=headers)
    assert imp_resp.status_code == 200
    imp_data = imp_resp.json()
    assert imp_data["session_id"] == session_id
    assert "study_plan_30d" in imp_data
    assert "weaknesses" in imp_data
    
    # 5. GET /sessions/{id}/score-breakdown -> Radar chart scores
    break_resp = await client.get(f"/api/v1/sessions/{session_id}/score-breakdown", headers=headers)
    assert break_resp.status_code == 200
    break_data = break_resp.json()
    assert break_data["session_id"] == session_id
    assert "technical" in break_data
    assert "communication" in break_data
    
    # 6. GET /sessions/{id}/comparison -> current session vs rolling avg
    comp_resp = await client.get(f"/api/v1/sessions/{session_id}/comparison", headers=headers)
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert comp_data["session_id"] == session_id
    assert "current_scores" in comp_data
    assert "rolling_30d_avg" in comp_data
    
    # 7. POST /sessions/{id}/share -> create public share link
    share_resp = await client.post(
        f"/api/v1/sessions/{session_id}/share",
        headers=headers,
        json={"expires_in_hours": 24}
    )
    assert share_resp.status_code == 200
    share_data = share_resp.json()
    assert "share_url" in share_data
    assert "share_token" in share_data
    share_token = share_data["share_token"]
    
    # 8. GET /sessions/shared/{token} -> Access shared report publicly without authorization headers
    public_resp = await client.get(f"/api/v1/sessions/shared/{share_token}")
    assert public_resp.status_code == 200
    public_data = public_resp.json()
    assert public_data["session_id"] == session_id
    assert "summary" in public_data
    assert "grade" in public_data
    
    # 9. GET /sessions/analytics/progress -> Progress history timeline
    prog_resp = await client.get("/api/v1/sessions/analytics/progress", headers=headers)
    assert prog_resp.status_code == 200
    assert len(prog_resp.json()) > 0
    
    # 10. GET /sessions/analytics/weak-areas -> Weak topics cluster
    weak_resp = await client.get("/api/v1/sessions/analytics/weak-areas", headers=headers)
    assert weak_resp.status_code == 200
    assert len(weak_resp.json()) > 0
    
    # 11. GET /sessions/analytics/strengths -> Strength topics cluster
    strength_resp = await client.get("/api/v1/sessions/analytics/strengths", headers=headers)
    assert strength_resp.status_code == 200
    assert len(strength_resp.json()) > 0
    
    # 12. POST /sessions/{id}/re-evaluate -> trigger AI recheck
    reev_resp = await client.post(f"/api/v1/sessions/{session_id}/re-evaluate", headers=headers)
    assert reev_resp.status_code == 200
    assert reev_resp.json()["status"] == "success"
    
    # 13. GET /sessions/export -> Export CSV/JSON/PDF data download
    export_resp = await client.get("/api/v1/sessions/export?format=csv", headers=headers)
    assert export_resp.status_code == 200
    assert export_resp.json()["format"] == "csv"
    assert "download_url" in export_resp.json()
    
    # 14. GET /sessions/streak -> Daily study streaks
    streak_resp = await client.get("/api/v1/sessions/streak", headers=headers)
    assert streak_resp.status_code == 200
    assert "current_streak" in streak_resp.json()
    assert "longest_streak" in streak_resp.json()
    
    # 15. GET /sessions/leaderboard/friends -> Comparative ranking
    lead_resp = await client.get("/api/v1/sessions/leaderboard/friends", headers=headers)
    assert lead_resp.status_code == 200
    assert len(lead_resp.json()["leaderboard"]) > 0
