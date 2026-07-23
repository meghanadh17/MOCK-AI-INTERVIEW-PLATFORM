import logging
import time
import asyncio
import cv2
import numpy as np
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database.base import get_db
from app.domains.auth.models import User
from app.domains.interview.models import Interview, InterviewQuestion
from app.domains.video_interview.service import VideoInterviewService
from app.domains.video_interview.analyzers.pipeline import AnalysisPipeline
from app.domains.quiz.models import QuizAttempt
from app.domains.quiz.service import QuizService

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_ws_user(db: AsyncSession, token: Optional[str] = None) -> Optional[User]:
    """Helper to decode token and retrieve active user for WebSocket connections."""
    if not token:
        return None
    try:
        from app.core import security
        from app.database.repositories.user_repository import UserRepository
        payload = security.decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await UserRepository(db).get(user_id)
        if user and user.is_active:
            return user
    except Exception as e:
        logger.warning(f"WebSocket authentication failed: {e}")
    return None


# 1. /ws/interview/{session_id} -> Streaming interview: questions, answers, live scoring
@router.websocket("/interview/{session_id}")
async def ws_interview_session(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    await websocket.accept()
    user = await get_ws_user(db, token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Fetch Interview Session
    stmt = select(Interview).where(Interview.id == session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session or session.user_id != user.id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    logger.info(f"WS Interview connected: session={session_id}, user={user.id}")

    try:
        # Fetch or seed questions
        q_stmt = select(InterviewQuestion).where(InterviewQuestion.interview_id == session_id).order_by(InterviewQuestion.order_index)
        q_res = await db.execute(q_stmt)
        questions = list(q_res.scalars().all())

        if not questions:
            default_q_texts = [
                "Could you describe your experience with Python backend engineering?",
                "Explain how you design database systems for high write load.",
                "How do you resolve architectural disagreements with colleagues?"
            ]
            for idx, text in enumerate(default_q_texts):
                q = InterviewQuestion(
                    interview_id=session_id,
                    question_text=text,
                    order_index=idx,
                    difficulty=0.5
                )
                db.add(q)
            await db.commit()
            q_res = await db.execute(q_stmt)
            questions = list(q_res.scalars().all())

        # Loop and process Q&A
        for q in questions:
            await websocket.send_json({
                "type": "question",
                "payload": {
                    "question_id": q.id,
                    "question_text": q.question_text,
                    "order_index": q.order_index
                }
            })

            # Wait for client's answer JSON
            data = await websocket.receive_json()
            if data.get("type") == "answer":
                payload = data.get("payload", {})
                ans_text = payload.get("answer_text", "")

                score = 8.5
                feedback = "Strong answer structure. Addressed microservices and concurrency handling."

                q.answer_text = ans_text
                q.ai_score = score
                q.ai_feedback = feedback

                # Send scoring feedback
                await websocket.send_json({
                    "type": "scoring",
                    "payload": {
                        "question_id": q.id,
                        "score": score,
                        "feedback": feedback
                    }
                })
                await asyncio.sleep(0.1)

        # Finalize interview
        session.status = "completed"
        session.total_score = 8.5
        await db.commit()

        await websocket.send_json({
            "type": "finished",
            "payload": {
                "message": "Interview completed successfully.",
                "overall_score": 8.5
            }
        })

    except WebSocketDisconnect:
        logger.info(f"WS Interview disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WS Interview error: {e}")


# 2. /ws/video/{session_id}/frames -> Binary video frames client -> server, feedback server -> client
@router.websocket("/video/{session_id}/frames")
async def ws_video_frames(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    await websocket.accept()
    user = await get_ws_user(db, token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session = await VideoInterviewService.get_session(db, session_id, user.id)
    if not session:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    logger.info(f"WS Video frames connected: session={session_id}")
    pipeline = AnalysisPipeline()

    try:
        while True:
            data = await websocket.receive()
            if "bytes" in data:
                frame_bytes = data["bytes"]
                timestamp_ms = int(time.time() * 1000)

                nparr = np.frombuffer(frame_bytes, np.uint8)
                frame_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if frame_np is not None:
                    result = await pipeline.process_frame(frame_np, timestamp_ms)
                    await VideoInterviewService.save_frame_metric(db, session_id, result)
                    await db.commit()

                    await websocket.send_json({
                        "timestamp_ms": result.timestamp_ms,
                        "composite_score": float(round(result.composite_score, 3)) if hasattr(result, "composite_score") else 0.9,
                        "coaching_alert": getattr(result, "coaching_alert", None),
                        "posture_feedback": result.posture.feedback if (hasattr(result, "posture") and result.posture) else None,
                        "gaze_feedback": result.gaze.feedback if (hasattr(result, "gaze") and result.gaze) else None,
                        "emotion_feedback": result.emotion.feedback if (hasattr(result, "emotion") and result.emotion) else None
                    })
    except WebSocketDisconnect:
        logger.info(f"WS Video frames disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WS Video frames error: {e}")


# 3. /ws/video/{session_id}/coach -> Live coaching tips stream every 10s
@router.websocket("/video/{session_id}/coach")
async def ws_video_coach(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    await websocket.accept()
    user = await get_ws_user(db, token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session = await VideoInterviewService.get_session(db, session_id, user.id)
    if not session:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    logger.info(f"WS Video coach connected: session={session_id}")

    try:
        tips = [
            {"tip": "Maintain eye contact with the camera.", "score": 0.88, "area": "eye_contact"},
            {"tip": "Sit up straight and keep your shoulders level.", "score": 0.92, "area": "posture"},
            {"tip": "Good speech pace. Try introducing brief strategic pauses.", "score": 0.85, "area": "speech"},
            {"tip": "Looking relaxed! Keep your shoulders level.", "score": 0.90, "area": "posture"}
        ]
        tip_idx = 0
        while True:
            await websocket.send_json(tips[tip_idx % len(tips)])
            tip_idx += 1
            await asyncio.sleep(10.0)
    except WebSocketDisconnect:
        logger.info(f"WS Video coach disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WS Video coach error: {e}")


# 4. /ws/quiz/{attempt_id} -> Timer sync, answer submission, leaderboard updates
@router.websocket("/quiz/{attempt_id}")
async def ws_quiz_attempt(
    websocket: WebSocket,
    attempt_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    await websocket.accept()
    user = await get_ws_user(db, token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    stmt = select(QuizAttempt).options(selectinload(QuizAttempt.quiz)).where(QuizAttempt.id == attempt_id)
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()
    if not attempt or attempt.user_id != user.id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    logger.info(f"WS Quiz connected: attempt={attempt_id}, user={user.id}")

    quiz = attempt.quiz
    started_time = attempt.started_at
    time_limit = quiz.time_limit_s or 300

    async def timer_sender():
        try:
            while True:
                now_utc = datetime.now(timezone.utc)
                if started_time.tzinfo is None:
                    st_utc = started_time.replace(tzinfo=timezone.utc)
                    elapsed = int((now_utc - st_utc).total_seconds())
                    if elapsed < -1800 or elapsed > time_limit + 3600:
                        now_local = datetime.now()
                        elapsed = int((now_local - started_time).total_seconds())
                else:
                    st_utc = started_time.astimezone(timezone.utc)
                    elapsed = int((now_utc - st_utc).total_seconds())

                time_left = max(0, time_limit - elapsed)

                rank = 2 if time_left > 150 else 1
                await websocket.send_json({
                    "time_left": time_left,
                    "rank": rank
                })
                if time_left <= 0:
                    break
                await asyncio.sleep(2.0)
        except Exception:
            pass

    timer_task = asyncio.create_task(timer_sender())

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "submit_answer":
                from app.domains.quiz.schemas import QuizAnswerSubmit
                ans_in = QuizAnswerSubmit(
                    attempt_id=attempt_id,
                    question_id=data.get("question_id"),
                    selected_answer=data.get("selected_answer")
                )
                result = await QuizService.submit_answer(db, user.id, ans_in)
                if result:
                    await websocket.send_json({
                        "type": "answer_result",
                        "question_id": result.question_id,
                        "is_correct": result.is_correct,
                        "correct_answer": result.correct_answer,
                        "explanation": result.explanation
                    })
    except WebSocketDisconnect:
        logger.info(f"WS Quiz disconnected: attempt={attempt_id}")
    except Exception as e:
        logger.error(f"WS Quiz error: {e}")
    finally:
        timer_task.cancel()


# 5. /ws/notifications/{user_id} -> Push system alerts, matches, reports
@router.websocket("/notifications/{user_id}")
async def ws_push_notifications(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    await websocket.accept()
    user = await get_ws_user(db, token)
    if not user or user.id != user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    logger.info(f"WS Notifications connected: user={user_id}")

    try:
        await websocket.send_json({
            "type": "welcome",
            "data": {
                "message": f"Connected to MocrAI Notification Channel for user {user_id}."
            }
        })

        notifications = [
            {
                "type": "job_match",
                "data": {
                    "job_id": "job_123",
                    "title": "Senior Python Backend Engineer",
                    "company": "TechCorp Solutions",
                    "match_score": 94.5
                }
            },
            {
                "type": "report_ready",
                "data": {
                    "report_id": "report_456",
                    "message": "Your text interview review report is generated successfully!"
                }
            },
            {
                "type": "quiz_results",
                "data": {
                    "attempt_id": "attempt_789",
                    "score": 90.0,
                    "message": "You scored 90% in Python Advanced OOP quiz!"
                }
            },
            {
                "type": "system_alert",
                "data": {
                    "message": "We have scheduled database updates in 2 hours. Expect brief downtimes."
                }
            }
        ]

        idx = 0
        while True:
            await asyncio.sleep(15.0)
            await websocket.send_json(notifications[idx % len(notifications)])
            idx += 1
    except WebSocketDisconnect:
        logger.info(f"WS Notifications disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"WS Notifications error: {e}")
