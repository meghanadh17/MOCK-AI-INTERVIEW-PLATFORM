import pytest
from httpx import AsyncClient


@pytest.fixture
async def auth_token(client: AsyncClient) -> str:
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "quiz_test@example.com", "password": "password123"},
    )
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "quiz_test@example.com", "password": "password123"},
    )
    return login_response.json()["access_token"]


@pytest.mark.asyncio
async def test_create_and_submit_quiz(client: AsyncClient, auth_token: str) -> None:
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # 1. Create custom quiz
    response = await client.post(
        "/api/v1/quiz/custom/create",
        json={
            "title": "Database Optimization Quiz",
            "topic": "SQL",
            "difficulty": "medium",
            "questions": [
                {
                    "question_text": "Which HTTP status code represents a resource created successfully?",
                    "options": ["200 OK", "201 Created", "204 No Content"],
                    "correct_answer": "201 Created",
                    "explanation": "201 is correct"
                },
                {
                    "question_text": "What is the primary purpose of an index?",
                    "options": ["Speed up queries", "Compress data", "Security"],
                    "correct_answer": "Speed up queries",
                    "explanation": "Speed up queries is correct"
                }
            ]
        },
        headers=headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Database Optimization Quiz"
    assert len(data["questions"]) == 2
    
    quiz_id = data["id"]
    q1_id = data["questions"][0]["id"]
    q2_id = data["questions"][1]["id"]
    
    # Start attempt
    start_resp = await client.post(f"/api/v1/quiz/{quiz_id}/start", headers=headers)
    assert start_resp.status_code == 200
    attempt_id = start_resp.json()["attempt_id"]
    
    # Submit quiz answers
    await client.post(
        f"/api/v1/quiz/{quiz_id}/submit-answer",
        json={
            "attempt_id": attempt_id,
            "question_id": q1_id,
            "selected_answer": "201 Created"
        },
        headers=headers
    )
    await client.post(
        f"/api/v1/quiz/{quiz_id}/submit-answer",
        json={
            "attempt_id": attempt_id,
            "question_id": q2_id,
            "selected_answer": "Compress data"
        },
        headers=headers
    )
    
    # Finish attempt
    finish_resp = await client.post(
        f"/api/v1/quiz/{quiz_id}/finish",
        json={"attempt_id": attempt_id},
        headers=headers
    )
    assert finish_resp.status_code == 200
    submit_data = finish_resp.json()
    assert submit_data["score"] == 50.0
