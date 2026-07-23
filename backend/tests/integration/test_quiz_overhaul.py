import pytest
import time
from httpx import AsyncClient


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """Helper to create a test user and obtain auth headers."""
    email = f"quiz_overhaul_{int(time.time())}@example.com"
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
async def test_quiz_overhaul_lifecycle(client: AsyncClient, auth_headers: dict) -> None:
    headers = auth_headers
    
    # 1. POST /quiz/generate -> AI-generate quiz
    gen_resp = await client.post(
        "/api/v1/quiz/generate",
        headers=headers,
        json={"topic": "Python FastAPI", "difficulty": "hard", "count": 5}
    )
    assert gen_resp.status_code == 201
    quiz_data = gen_resp.json()
    assert "questions" in quiz_data
    assert len(quiz_data["questions"]) == 5
    quiz_id = quiz_data["id"]
    
    # 2. GET /quiz/list -> Browse public quizzes (Public, no headers needed)
    list_resp = await client.get("/api/v1/quiz/list")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert len(list_data) > 0
    
    # 3. GET /quiz/{id} -> Quiz questions without answers
    detail_resp = await client.get(f"/api/v1/quiz/{quiz_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail_data = detail_resp.json()
    assert detail_data["id"] == quiz_id
    assert len(detail_data["questions"]) == 5
    # Ensure correct_answer is NOT exposed in the output schema
    for q in detail_data["questions"]:
        assert "correct_answer" not in q
        
    # 4. POST /quiz/{id}/start -> Start attempt session
    start_resp = await client.post(f"/api/v1/quiz/{quiz_id}/start", headers=headers)
    assert start_resp.status_code == 200
    attempt_data = start_resp.json()
    assert attempt_data["quiz_id"] == quiz_id
    attempt_id = attempt_data["attempt_id"]
    
    # 5. POST /quiz/{id}/submit-answer -> Submit answer for one question
    q_id = quiz_data["questions"][0]["id"]
    submit_resp = await client.post(
        f"/api/v1/quiz/{quiz_id}/submit-answer",
        headers=headers,
        json={
            "attempt_id": attempt_id,
            "question_id": q_id,
            "selected_answer": "Correct Option B for question 1"
        }
    )
    assert submit_resp.status_code == 200
    sub_data = submit_resp.json()
    assert sub_data["question_id"] == q_id
    assert "is_correct" in sub_data
    
    # 6. POST /quiz/{id}/finish -> Finish attempt session
    finish_resp = await client.post(
        f"/api/v1/quiz/{quiz_id}/finish",
        headers=headers,
        json={"attempt_id": attempt_id}
    )
    assert finish_resp.status_code == 200
    results_data = finish_resp.json()
    assert results_data["attempt_id"] == attempt_id
    assert "score" in results_data
    assert len(results_data["breakdown"]) == 5
    
    # 7. GET /quiz/{id}/results/{attempt_id} -> Detailed results
    get_results_resp = await client.get(f"/api/v1/quiz/{quiz_id}/results/{attempt_id}", headers=headers)
    assert get_results_resp.status_code == 200
    assert get_results_resp.json()["attempt_id"] == attempt_id
    
    # 8. GET /quiz/{id}/leaderboard -> Quiz leaderboard (Public)
    ql_resp = await client.get(f"/api/v1/quiz/{quiz_id}/leaderboard")
    assert ql_resp.status_code == 200
    assert len(ql_resp.json()["leaderboard"]) > 0
    
    # 9. GET /quiz/leaderboard/global -> Global board (Public)
    g_resp = await client.get("/api/v1/quiz/leaderboard/global")
    assert g_resp.status_code == 200
    assert len(g_resp.json()["leaderboard"]) > 0
    
    # 10. GET /quiz/leaderboard/weekly -> Weekly board (Public)
    w_resp = await client.get("/api/v1/quiz/leaderboard/weekly")
    assert w_resp.status_code == 200
    assert len(w_resp.json()["leaderboard"]) > 0
    
    # 11. GET /quiz/leaderboard/my-rank -> User ranks
    rank_resp = await client.get("/api/v1/quiz/leaderboard/my-rank", headers=headers)
    assert rank_resp.status_code == 200
    rank_data = rank_resp.json()
    assert "global_board" in rank_data
    assert "weekly_board" in rank_data
    
    # 12. POST /quiz/custom/create -> Create custom quiz
    custom_resp = await client.post(
        "/api/v1/quiz/custom/create",
        headers=headers,
        json={
            "title": "Custom Kubernetes Quiz",
            "topic": "Kubernetes",
            "difficulty": "expert",
            "questions": [
                {
                    "question_text": "What is the primary role of kube-apiserver?",
                    "options": ["Expose API", "Run pods", "Store data", "Monitor nodes"],
                    "correct_answer": "Expose API",
                    "explanation": "kube-apiserver exposes the Kubernetes API and serves as front-end for control plane."
                }
            ]
        }
    )
    assert custom_resp.status_code == 201
    assert custom_resp.json()["total_questions"] == 1
    
    # 13. GET /quiz/topics -> All available topics (Public)
    topics_resp = await client.get("/api/v1/quiz/topics")
    assert topics_resp.status_code == 200
    assert len(topics_resp.json()) > 0
    
    # 14. GET /quiz/my-attempts -> Attempts history
    my_att_resp = await client.get("/api/v1/quiz/my-attempts", headers=headers)
    assert my_att_resp.status_code == 200
    assert len(my_att_resp.json()) > 0
    
    # 15. GET /quiz/stats -> Aggregate stats
    stats_resp = await client.get("/api/v1/quiz/stats", headers=headers)
    assert stats_resp.status_code == 200
    assert "avg_score" in stats_resp.json()
    assert "streak" in stats_resp.json()
    
    # 16. POST /quiz/{id}/report-question -> Report question
    report_resp = await client.post(
        f"/api/v1/quiz/{quiz_id}/report-question",
        headers=headers,
        json={"question_id": q_id, "reason": "Typo in options list"}
    )
    assert report_resp.status_code == 200
    assert report_resp.json()["status"] == "pending"
    assert "report_id" in report_resp.json()
