import logging
import time
import cv2
import numpy as np
import asyncio
from typing import Any, List, Optional
from fastapi import (
    APIRouter, Depends, status, WebSocket, WebSocketDisconnect,
    HTTPException, Query, Body, Request, File, UploadFile
)
from sqlalchemy import select
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.dependencies import get_current_user
from app.domains.auth.models import User
from app.core import security
from app.database.repositories.user_repository import UserRepository
from app.config import settings

from app.domains.video_interview.schemas import (
    VideoSessionCreate, VideoSessionOut, VideoSessionResponse, IceServerConfig,
    PostureReport, GazeReport, EmotionReport, SpeechReport,
    TranscriptResponse, ClipExportResponse, VideoSummaryResponse
)
from app.domains.video_interview.service import VideoInterviewService
from app.domains.video_interview.analyzers.pipeline import AnalysisPipeline
from app.domains.video_interview.analyzers.coach_engine import CoachEngine

logger = logging.getLogger(__name__)

router = APIRouter()
ws_router = APIRouter()

# Helper function to authenticate WebSocket connections via query parameter token
async def get_ws_user(db: AsyncSession, token: Optional[str] = None) -> Optional[User]:
    if not token:
        return None
    try:
        payload = security.decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await UserRepository(db).get(user_id)
        if user and user.is_active:
            return user
    except Exception as e:
        logger.warning(f"WebSocket auth failed: {e}")
    return None


# 1. POST /sessions -> Create session; returns TURN/STUN credentials for WebRTC
@router.post("/sessions", response_model=VideoSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_video_session(
    session_in: VideoSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Initializes a video interview session and returns WebRTC ICE server details."""
    session = await VideoInterviewService.initialize_session(db, current_user.id, session_in)
    
    # Return TURN/STUN configurations dynamically from settings
    ice_servers = [
        IceServerConfig(urls=["stun:stun.l.google.com:19302"])
    ]
    if settings.TURN_SERVER_URL:
        ice_servers.append(
            IceServerConfig(
                urls=[settings.TURN_SERVER_URL],
                username=settings.TURN_USERNAME or "",
                credential=settings.TURN_PASSWORD or ""
            )
        )
    return VideoSessionResponse(session=VideoSessionOut.model_validate(session), ice_servers=ice_servers)


# 2. GET /sessions -> List video sessions with summary analytics
@router.get("/sessions", response_model=List[VideoSessionOut])
async def list_video_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Lists video sessions belonging to the authenticated user."""
    sessions = await VideoInterviewService.list_sessions(db, current_user.id, skip=skip, limit=limit, status=status)
    return [VideoSessionOut.model_validate(s) for s in sessions]


# 3. GET /sessions/{id} -> Session detail: frame metrics, speech report, emotion heatmap
@router.get("/sessions/{id}", response_model=VideoSessionOut)
async def get_video_session_detail(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieves detailed configuration and aggregate scores of a specific session."""
    session = await VideoInterviewService.get_session(db, id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Video session not found")
    return VideoSessionOut.model_validate(session)


@router.delete("/sessions/{id}", status_code=status.HTTP_200_OK)
async def delete_video_session(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Deletes a video session and cascades local databases."""
    deleted = await VideoInterviewService.delete_session(db, id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Video session not found")
    return {"detail": "Video session deleted successfully."}



# 4. POST /sessions/{id}/start -> Start recording + initialize analyzer pipeline
@router.post("/sessions/{id}/start", response_model=VideoSessionOut)
async def start_video_session(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Transitions the session status to active and prepares systems for real-time analysis."""
    session = await VideoInterviewService.start_session(db, id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Video session not found")
    return VideoSessionOut.model_validate(session)


# 5. POST /sessions/{id}/end -> Stop recording; triggers full async video analysis
@router.post("/sessions/{id}/end", response_model=VideoSessionOut)
async def end_video_session(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Terminates session recording and calculates final performance metrics."""
    session = await VideoInterviewService.end_session(db, id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Video session not found")
        
    # Trigger Celery post-analysis tasks
    from app.tasks.video_tasks import analyze_video_session_task
    analyze_video_session_task.delay(id, current_user.id)
    
    return VideoSessionOut.model_validate(session)


# 6. POST /sessions/{id}/frame -> HTTP frame upload fallback
@router.post("/sessions/{id}/frame", status_code=status.HTTP_200_OK)
async def upload_frame_fallback(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    frame_bytes: bytes = Body(...),
) -> Any:
    """Fallback endpoint for frame submission over HTTP in case WebSocket connection is unavailable."""
    session = await VideoInterviewService.get_session(db, id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Video session not found")
        
    try:
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame_np is not None:
            pipeline = AnalysisPipeline(session_id=id, coach_engine=CoachEngine)
            duration = 0
            if session.updated_at:
                duration = int((datetime.now(timezone.utc) - session.updated_at.replace(tzinfo=timezone.utc)).total_seconds() * 1000)
            result = await pipeline.process_frame(frame_np, duration)
            await VideoInterviewService.save_frame_metric(db, id, result)
            await db.commit()
            return {"status": "success", "composite_score": result.composite_score}
    except Exception as e:
        logger.error(f"Failed to process fallback HTTP frame: {e}")
        raise HTTPException(status_code=400, detail="Invalid frame image data")
        
    raise HTTPException(status_code=400, detail="Could not decode frame image")


# 7. GET /sessions/{id}/posture-report -> Posture score timeline
@router.get("/sessions/{id}/posture-report", response_model=PostureReport)
async def get_posture_report(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    report = await VideoInterviewService.get_posture_report(db, id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Video session not found")
    return report


# 8. GET /sessions/{id}/gaze-report -> Eye contact %, PERCLOS fatigue index
@router.get("/sessions/{id}/gaze-report", response_model=GazeReport)
async def get_gaze_report(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    report = await VideoInterviewService.get_gaze_report(db, id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Video session not found")
    return report


# 9. GET /sessions/{id}/emotion-report -> Emotion timeline
@router.get("/sessions/{id}/emotion-report", response_model=EmotionReport)
async def get_emotion_report(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    report = await VideoInterviewService.get_emotion_report(db, id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Video session not found")
    return report


# 10. GET /sessions/{id}/speech-report -> WPM, filler word log, prosody
@router.get("/sessions/{id}/speech-report", response_model=SpeechReport)
async def get_speech_report(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    report = await VideoInterviewService.get_speech_report(db, id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Video session not found")
    return report


# 11. GET /sessions/{id}/recording -> Signed S3 presigned URL for session recording
@router.get("/sessions/{id}/recording")
async def get_recording_download_url(
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    base_url = str(request.base_url).rstrip("/")
    url = await VideoInterviewService.get_recording_url(db, id, current_user.id, base_url)
    if not url:
        raise HTTPException(status_code=404, detail="Session recording not found or not finalized")
    session = await VideoInterviewService.get_session(db, id, current_user.id)
    duration = session.recording_duration_s if session else None
    return {"session_id": id, "recording_url": url, "duration_s": duration}


@router.post("/sessions/{id}/recording", status_code=status.HTTP_200_OK)
async def upload_session_recording(
    id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Uploads the actual recorded MP4/webm video file from the client for local playback."""
    session = await VideoInterviewService.get_session(db, id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Video session not found")
        
    import os
    try:
        ext = ".mp4"
        if file.filename:
            _, file_ext = os.path.splitext(file.filename)
            if file_ext.lower() in [".webm", ".mp4", ".ogg", ".mov"]:
                ext = file_ext.lower()
        elif file.content_type:
            if "webm" in file.content_type:
                ext = ".webm"
            elif "mp4" in file.content_type:
                ext = ".mp4"

        uploads_video_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "uploads", "video")
        os.makedirs(uploads_video_dir, exist_ok=True)
        
        # Clean up any existing recording files with different extensions for this session ID
        for existing_ext in [".mp4", ".webm"]:
            existing_path = os.path.join(uploads_video_dir, f"{id}{existing_ext}")
            if os.path.exists(existing_path):
                try:
                    os.remove(existing_path)
                except Exception as ex:
                    logger.warning(f"Could not remove existing recording file {existing_path}: {ex}")

        video_filepath = os.path.join(uploads_video_dir, f"{id}{ext}")
        
        # Save the uploaded file chunks
        with open(video_filepath, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
                
        session.recording_file_path = f"uploads/video/{id}{ext}"
        await db.commit()
        logger.info(f"Successfully saved uploaded video recording to: {video_filepath}")
        return {"status": "success", "file_path": session.recording_file_path}
    except Exception as e:
        logger.error(f"Failed to save uploaded video recording: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save recording: {str(e)}")


# 12. POST /sessions/{id}/transcript -> Trigger Whisper v3 transcription task
@router.post("/sessions/{id}/transcript")
async def trigger_transcription(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    session = await VideoInterviewService.get_session(db, id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Video session not found")
        
    # Trigger Whisper task asynchronously
    from app.tasks.video_tasks import transcribe_video_task
    transcribe_video_task.delay(id, current_user.id)
    
    return {"status": "processing", "message": "Async transcription task scheduled"}


# 13. GET /sessions/{id}/transcript -> Timestamped transcript
@router.get("/sessions/{id}/transcript", response_model=TranscriptResponse)
async def get_transcript_details(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    report = await VideoInterviewService.get_transcript(db, id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Video session not found")
    return report


# 14. POST /sessions/{id}/clip/{ts} -> Request 30s clip export around timestamp ts
@router.post("/sessions/{id}/clip/{ts}", response_model=ClipExportResponse)
async def export_video_clip(
    id: str,
    ts: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    clip = await VideoInterviewService.request_clip(db, id, ts, current_user.id)
    if not clip:
        raise HTTPException(status_code=404, detail="Video session not found")
    return clip


# 15. GET /sessions/{id}/summary -> AI narrative summary
@router.get("/sessions/{id}/summary", response_model=VideoSummaryResponse)
async def get_narrative_summary(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    summary = await VideoInterviewService.get_summary(db, id, current_user.id)
    if not summary:
        raise HTTPException(status_code=404, detail="Video session not found")
    return summary


# --- WebSocket Channels (Authenticated via token query parameter) ---

# 16. WS /ws/video-interview/{session_id}/frames -> Binary WebSocket: send frames, receive real-time feedback
@ws_router.websocket("/{session_id}/frames")
async def frames_ws_channel(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    await websocket.accept()
    user = await get_ws_user(db, token)
    if not user:
        logger.warning(f"Unauthenticated WS frames connection request for session {session_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    session = await VideoInterviewService.get_session(db, session_id, user.id)
    if not session:
        logger.warning(f"WS frames session {session_id} not found for user {user.id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    logger.info(f"WS Frames channel connected: session={session_id}, user={user.id}")
    pipeline = AnalysisPipeline(session_id=session_id, coach_engine=CoachEngine)
    start_time_ms = int(time.time() * 1000)
    
    try:
        while True:
            data = await websocket.receive()
            if "bytes" in data:
                frame_bytes = data["bytes"]
                timestamp_ms = int(time.time() * 1000) - start_time_ms
                
                nparr = np.frombuffer(frame_bytes, np.uint8)
                frame_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame_np is not None:
                    result = await pipeline.process_frame(frame_np, timestamp_ms)
                    await VideoInterviewService.save_frame_metric(db, session_id, result)
                    await db.commit()
                    
                    await websocket.send_json({
                        "timestamp_ms": result.timestamp_ms,
                        "composite_score": float(round(result.composite_score, 3)),
                        "coaching_alert": result.coaching_alert,
                        "posture_score": float(round(result.posture.score, 3)) if result.posture else None,
                        "posture_feedback": result.posture.feedback if result.posture else None,
                        "gaze_score": float(round(result.gaze.eye_contact_score, 3)) if result.gaze else None,
                        "gaze_feedback": result.gaze.feedback if result.gaze else None,
                        "emotion_label": result.emotion.dominant_emotion if result.emotion else None,
                        "emotion_feedback": result.emotion.feedback if result.emotion else None
                    })
    except WebSocketDisconnect:
        logger.info(f"WS Frames channel disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WS Frames channel error for session {session_id}: {e}")
    finally:
        try:
            from app.database.base import async_session_maker
            async with async_session_maker() as new_db:
                # Shield DB operations from cancellation to prevent connection pool corruption
                await asyncio.shield(VideoInterviewService.finalize_video_session(new_db, session_id))
        except Exception as e:
            logger.error(f"Failed to finalize video session on WS close: {e}")


# 17. WS /ws/video-interview/{session_id}/coach -> Text WebSocket: live coaching tips stream
@ws_router.websocket("/{session_id}/coach")
async def coach_ws_channel(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
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
        
    logger.info(f"WS Coach channel connected: session={session_id}, user={user.id}")
    
    try:
        # Periodically stream coaching tips to simulate active stream
        tips = [
            "Good composure. Keep looking straight at the camera.",
            "Posture is slightly slouched, sitting upright will increase confidence.",
            "Great speech clarity and pace! Keep it up.",
            "Try to relax your facial muscles and smile slightly."
        ]
        tip_idx = 0
        while True:
            # We can listen to heartbeat or client message, or just push tips
            await websocket.send_json({
                "type": "coaching_tip",
                "timestamp_ms": int(time.time() * 1000),
                "tip": tips[tip_idx % len(tips)]
            })
            tip_idx += 1
            await asyncio.sleep(12.0)
    except WebSocketDisconnect:
        logger.info(f"WS Coach channel disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WS Coach channel error: {e}")


# 18. WS /ws/video-interview/{session_id}/questions -> Text WebSocket: Q&A evaluation stream
@ws_router.websocket("/{session_id}/questions")
async def questions_ws_channel(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
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
        
    logger.info(f"WS Questions channel connected: session={session_id}, user={user.id}")
    
    try:
        if session.interview_session_id:
            from app.domains.interview.service import InterviewService
            from app.domains.interview.schemas import InterviewQuestionAnswer
            from app.domains.interview.models import InterviewQuestion
            
            # Start the corresponding text interview session
            await InterviewService.start_session(db, session.interview_session_id, user.id)
            
            # Get total questions count
            from app.domains.interview.models import Interview
            total_stmt = select(Interview.total_questions).where(
                Interview.id == session.interview_session_id
            )
            total_res = await db.execute(total_stmt)
            total_count = total_res.scalar() or 5
            
            while True:
                # Fetch next unanswered question
                q_stmt = select(InterviewQuestion).where(
                    InterviewQuestion.interview_id == session.interview_session_id,
                    InterviewQuestion.answer_text.is_(None),
                    InterviewQuestion.is_skipped.is_(False)
                ).order_by(InterviewQuestion.order_index).limit(1)
                
                q_res = await db.execute(q_stmt)
                current_q = q_res.scalar_one_or_none()
                
                if not current_q:
                    # If total questions count is reached, complete
                    break
                
                if not current_q.asked_at:
                    current_q.asked_at = datetime.now(timezone.utc)
                    await db.commit()
                
                # Send question to client
                await websocket.send_json({
                    "type": "question",
                    "timestamp_ms": int(time.time() * 1000),
                    "id": current_q.id,
                    "question": current_q.question_text,
                    "index": current_q.order_index + 1,
                    "total": total_count
                })
                
                # Wait for answer input from client
                msg_data = await websocket.receive_json()
                answer_text = msg_data.get("answer", "")
                
                # Evaluate response using the real evaluation engine
                answer_in = InterviewQuestionAnswer(user_transcript=answer_text)
                updated_q = await InterviewService.answer_question(
                    db,
                    interview_id=session.interview_session_id,
                    question_id=current_q.id,
                    user_id=user.id,
                    answer_in=answer_in
                )
                
                grade = updated_q.grade if (updated_q and updated_q.grade is not None) else 8.5
                feedback = updated_q.ai_feedback if (updated_q and updated_q.ai_feedback) else "Response processed."
                
                await websocket.send_json({
                    "type": "evaluation",
                    "timestamp_ms": int(time.time() * 1000),
                    "grade": grade,
                    "feedback": feedback
                })
                
                # Wait for user to trigger "next" question explicitly
                next_msg = await websocket.receive_json()
                if next_msg.get("action") != "next":
                    pass
        else:
            # Simulate a fallback mock questions flow if no text session exists
            questions = [
                "Could you describe your experience designing scalable systems?",
                "Explain how you handle concurrency and locking in database setups.",
                "How do you handle disagreement with senior developers in your team?"
            ]
            for idx, q_text in enumerate(questions):
                await websocket.send_json({
                    "type": "question",
                    "timestamp_ms": int(time.time() * 1000),
                    "question": q_text,
                    "index": idx + 1,
                    "total": len(questions)
                })
                
                # Wait for answer input from client
                answer_data = await websocket.receive_json()
                answer_text = answer_data.get("answer", "")
                
                await websocket.send_json({
                    "type": "evaluation",
                    "timestamp_ms": int(time.time() * 1000),
                    "grade": 8.5,
                    "feedback": "Strong answer structure. Highlighted horizontal scaling and indexing strategies well."
                })
                
                # Wait for next
                next_msg = await websocket.receive_json()
                if next_msg.get("action") != "next":
                    pass
            
    except WebSocketDisconnect:
        logger.info(f"WS Questions channel disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WS Questions channel error: {e}")
