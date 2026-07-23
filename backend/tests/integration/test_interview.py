import pytest
from httpx import AsyncClient


@pytest.fixture
async def auth_token(client: AsyncClient) -> str:
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "interview_test@example.com", "password": "password123"},
    )
    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": "interview_test@example.com", "password": "password123"},
    )
    return login_response.json()["access_token"]


@pytest.mark.asyncio
async def test_create_and_run_interview(client: AsyncClient, auth_token: str) -> None:
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # 1. Create interview session
    response = await client.post(
        "/api/v1/interview/",
        json={"title": "Software Engineer Mock", "interview_type": "technical", "job_description": "We need a FastAPI expert"},
        headers=headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Software Engineer Mock"
    assert data["status"] == "created"
    assert len(data["questions"]) == 3
    
    interview_id = data["id"]
    question_id = data["questions"][0]["id"]
    
    # 2. Submit an answer to the first question
    answer_response = await client.post(
        f"/api/v1/interview/{interview_id}/answer/{question_id}",
        json={"user_transcript": "I design schemas by normalizing data and indexing fields that are queried often."},
        headers=headers
    )
    assert answer_response.status_code == 200
    answer_data = answer_response.json()
    assert answer_data["user_transcript"] == "I design schemas by normalizing data and indexing fields that are queried often."
    assert "grade" in answer_data
    assert isinstance(answer_data["grade"], float)
    assert 0.0 <= answer_data["grade"] <= 100.0
    assert "evaluation_feedback" in answer_data
    assert "technical_accuracy" in answer_data["evaluation_feedback"]
    assert "thinking" in answer_data["evaluation_feedback"]
    
    # 3. Finish the interview
    finish_response = await client.post(
        f"/api/v1/interview/{interview_id}/finish",
        headers=headers
    )
    assert finish_response.status_code == 200
    finish_data = finish_response.json()
    assert finish_data["status"] == "completed"
    assert finish_data["completed_at"] is not None


@pytest.mark.asyncio
async def test_interview_adaptive_and_extended_endpoints(client: AsyncClient, auth_token: str) -> None:
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # 1. Create Interview Session via POST /sessions
    resp = await client.post(
        "/api/v1/interview/sessions",
        headers=headers,
        json={
            "role": "Python Backend Engineer",
            "difficulty": 0.5,
            "type": "technical",
            "num_questions": 5
        }
    )
    assert resp.status_code == 201
    session = resp.json()
    session_id = session["id"]
    assert session["status"] == "created"
    assert session["total_questions"] == 5
    
    # 2. Start Session
    start_resp = await client.post(
        f"/api/v1/interview/sessions/{session_id}/start",
        headers=headers
    )
    assert start_resp.status_code == 200
    first_q = start_resp.json()
    assert "question_text" in first_q
    q_id = first_q["id"]
    
    # 3. Request Hint
    hint_resp = await client.post(
        f"/api/v1/interview/sessions/{session_id}/hint?question_id={q_id}",
        headers=headers
    )
    assert hint_resp.status_code == 200
    hint_data = hint_resp.json()
    assert hint_data["hints_used"] == 1
    assert "hint_text" in hint_data
    
    # 4. Skip Question
    skip_resp = await client.post(
        f"/api/v1/interview/sessions/{session_id}/skip?question_id={q_id}",
        headers=headers
    )
    assert skip_resp.status_code == 200
    skip_data = skip_resp.json()
    assert "message" in skip_data
    assert "next_question" in skip_data
    
    # 5. Answer Question
    ans_resp = await client.post(
        f"/api/v1/interview/sessions/{session_id}/answer",
        headers=headers,
        json={"user_transcript": "FastAPI is built on Starlette and Pydantic for high performance."}
    )
    assert ans_resp.status_code == 200
    ans_data = ans_resp.json()
    assert "score" in ans_data
    assert "feedback" in ans_data
    
    # 6. End Session
    end_resp = await client.post(
        f"/api/v1/interview/sessions/{session_id}/end",
        headers=headers
    )
    assert end_resp.status_code == 200
    assert end_resp.json()["status"] == "completed"
    
    # 7. Get Performance Report
    report_resp = await client.get(
        f"/api/v1/interview/sessions/{session_id}/report",
        headers=headers
    )
    assert report_resp.status_code == 200
    report = report_resp.json()
    assert report["session_id"] == session_id
    assert "dimension_scores" in report
    
    # 8. Get Feedback details
    feedback_resp = await client.get(
        f"/api/v1/interview/sessions/{session_id}/feedback",
        headers=headers
    )
    assert feedback_resp.status_code == 200
    assert isinstance(feedback_resp.json(), list)
    
    # 9. Get PDF Transcript download
    transcript_resp = await client.get(
        f"/api/v1/interview/sessions/{session_id}/transcript",
        headers=headers
    )
    assert transcript_resp.status_code == 200
    assert transcript_resp.headers["content-type"] == "application/pdf"
    assert len(transcript_resp.content) > 0
    
    # 10. Question Bank generate, list, rate
    qbank_gen_resp = await client.post(
        "/api/v1/interview/question-bank/generate",
        headers=headers,
        json={
            "role": "Data Scientist",
            "difficulty": "hard",
            "type": "technical",
            "count": 2
        }
    )
    assert qbank_gen_resp.status_code == 200
    qbank_qs = qbank_gen_resp.json()
    assert len(qbank_qs) == 2
    qbank_q_id = qbank_qs[0]["id"]
    
    qbank_list_resp = await client.get(
        "/api/v1/interview/question-bank?role=Data Scientist",
        headers=headers
    )
    assert qbank_list_resp.status_code == 200
    assert len(qbank_list_resp.json()) > 0
    
    rate_resp = await client.post(
        f"/api/v1/interview/question-bank/{qbank_q_id}/rate",
        headers=headers,
        json={"rating": 5}
    )
    assert rate_resp.status_code == 200
    
    # 11. Metadata routes
    types_resp = await client.get("/api/v1/interview/types")
    assert types_resp.status_code == 200
    assert "types" in types_resp.json()
    
    roles_resp = await client.get("/api/v1/interview/roles")
    assert roles_resp.status_code == 200
    assert "roles" in roles_resp.json()

