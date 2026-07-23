import pytest
import uuid
import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.core import security
from app.domains.auth.models import User
from app.domains.interview.models import Interview, InterviewQuestion
from app.domains.video_interview.models import VideoSession
from app.domains.quiz.models import Quiz, QuizQuestion, QuizAttempt


@pytest.mark.asyncio
async def test_websockets_lifecycle(db) -> None:
    # 1. Create and save a mock User
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email="ws_test_user@example.com",
        hashed_password="password123",
        is_active=True
    )
    db.add(user)
    await db.commit()

    # Generate access token for query params authentication
    token = security.create_access_token(subject=user_id)

    # 2. Create and save an Interview Session
    interview = Interview(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title="WebSocket System Design Interview",
        status="active"
    )
    db.add(interview)
    await db.commit()

    # 3. Create and save a Video Interview Session
    video = VideoSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        status="active"
    )
    db.add(video)
    await db.commit()

    # 4. Create and save a Quiz + QuizAttempt
    quiz = Quiz(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title="WebSocket API Quiz",
        total_questions=1,
        time_limit_s=300,
        is_public=True,
        is_approved=True
    )
    db.add(quiz)
    await db.flush()

    qq = QuizQuestion(
        quiz_id=quiz.id,
        question_text="What protocol does WebSocket upgrade from?",
        options=["HTTP", "FTP", "SMTP", "SSH"],
        correct_answer="HTTP",
        order_index=0
    )
    db.add(qq)

    attempt = QuizAttempt(
        id=str(uuid.uuid4()),
        user_id=user_id,
        quiz_id=quiz.id,
        score=0.0,
        correct_count=0,
        time_taken_s=0,
        answers=[],
        status="in_progress"
    )
    db.add(attempt)
    await db.commit()

    # 5. Run the synchronous TestClient block to test all websockets
    with TestClient(app) as client:
        
        # Channel 1: GET/POST /ws/interview/{session_id}
        with client.websocket_connect(f"/ws/interview/{interview.id}?token={token}") as ws:
            # First question pushed immediately
            msg = ws.receive_json()
            assert msg["type"] == "question"
            q_id = msg["payload"]["question_id"]
            assert "question_text" in msg["payload"]

            # Client sends answer
            ws.send_json({
                "type": "answer",
                "payload": {
                    "question_id": q_id,
                    "answer_text": "WebSocket upgrades from HTTP using Connection Upgrade header."
                }
            })

            # Receive scoring feedback
            score_msg = ws.receive_json()
            assert score_msg["type"] == "scoring"
            assert score_msg["payload"]["score"] == 8.5
            assert "feedback" in score_msg["payload"]

            # Loop through remainder of default seeded questions until finished
            finished = False
            for _ in range(10):
                try:
                    res_msg = ws.receive_json()
                    if res_msg["type"] == "finished":
                        finished = True
                        assert res_msg["payload"]["overall_score"] == 8.5
                        break
                except Exception:
                    break
            assert finished

        # Channel 2: GET/POST /ws/video/{session_id}/frames
        with client.websocket_connect(f"/ws/video/{video.id}/frames?token={token}") as ws:
            # Create a mock 10x10 binary image frame
            img = np.zeros((10, 10, 3), dtype=np.uint8)
            _, img_bytes = cv2.imencode(".png", img)
            
            # Send binary frames bytes
            ws.send_bytes(img_bytes.tobytes())

            # Receive processed frame feedback JSON
            feedback = ws.receive_json()
            assert "timestamp_ms" in feedback
            assert "composite_score" in feedback

        # Channel 3: GET/POST /ws/video/{session_id}/coach
        with client.websocket_connect(f"/ws/video/{video.id}/coach?token={token}") as ws:
            # Coach Tip pushed immediately
            tip_msg = ws.receive_json()
            assert "tip" in tip_msg
            assert "score" in tip_msg
            assert "area" in tip_msg

        # Channel 4: GET/POST /ws/quiz/{attempt_id}
        with client.websocket_connect(f"/ws/quiz/{attempt.id}?token={token}") as ws:
            # Time synchronization countdown pushed immediately
            timer_msg = ws.receive_json()
            assert "time_left" in timer_msg
            assert "rank" in timer_msg

            # Submit answer payload
            ws.send_json({
                "type": "submit_answer",
                "question_id": qq.id,
                "selected_answer": "HTTP"
            })

            # Receive evaluation results (skipping any async timer messages in between)
            found_ans = False
            for _ in range(5):
                res_msg = ws.receive_json()
                if res_msg.get("type") == "answer_result":
                    assert res_msg["question_id"] == qq.id
                    assert res_msg["is_correct"] is True
                    found_ans = True
                    break
            assert found_ans

        # Channel 5: GET/POST /ws/notifications/{user_id}
        with client.websocket_connect(f"/ws/notifications/{user_id}?token={token}") as ws:
            # Welcome push message pushed immediately
            welcome = ws.receive_json()
            assert welcome["type"] == "welcome"
            assert user_id in welcome["data"]["message"]
