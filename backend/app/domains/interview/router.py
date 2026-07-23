import json
import logging
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.dependencies import get_current_user
from app.domains.auth.models import User
from app.domains.interview.schemas import (
    InterviewCreate, InterviewSessionCreate, InterviewOut,
    InterviewQuestionAnswer, InterviewQuestionOut, AnswerSubmitResponse,
    HintResponse, SkipResponse, SkipRequest, ReportResponse,
    QuestionBankCreate, QuestionBankOut, QuestionBankGenerateRequest, QuestionRateRequest
)
from app.domains.interview.service import InterviewService

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Static Metadata Endpoints ---

@router.get("/types")
async def get_interview_types() -> Any:
    """Get available mock interview types."""
    return {
        "types": ["technical", "behavioral", "system_design", "HR", "case"]
    }


@router.get("/roles")
async def get_supported_roles() -> Any:
    """Get supported job roles with skill taxonomies."""
    return {
        "roles": [
            {"name": "Software Engineer", "skills": ["Python", "FastAPI", "PostgreSQL", "System Design"]},
            {"name": "Frontend Developer", "skills": ["React", "TypeScript", "Vite", "CSS"]},
            {"name": "DevOps Engineer", "skills": ["Docker", "Kubernetes", "AWS", "CI/CD"]},
            {"name": "Product Manager", "skills": ["Roadmapping", "Product Strategy", "Metrics & Analytics"]}
        ]
    }


# --- Question Bank Endpoints ---

@router.post("/question-bank/generate", response_model=List[QuestionBankOut])
async def generate_qbank_questions(
    payload: QuestionBankGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """AI-generate questions matching role/level/type and write to community Q-bank."""
    diff_val = 0.5
    if payload.difficulty == "easy":
        diff_val = 0.25
    elif payload.difficulty == "hard":
        diff_val = 0.8
        
    return await InterviewService.generate_qbank_questions(
        db, payload.role, diff_val, payload.type, payload.count
    )


@router.get("/question-bank", response_model=List[QuestionBankOut])
async def browse_qbank(
    role: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    difficulty: Optional[float] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Browse community Q-bank: filter by role/type/difficulty."""
    return await InterviewService.get_qbank(db, role, type, difficulty)


@router.post("/question-bank/{q_id}/rate")
async def rate_qbank_question(
    q_id: str,
    payload: QuestionRateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Rate question quality (1-5 stars) and update average scoring."""
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5 stars.")
        
    rated = await InterviewService.rate_qbank_question(db, q_id, current_user.id, payload.rating)
    if not rated:
        raise HTTPException(status_code=404, detail="Question bank record not found")
        
    return {"detail": "Rating submitted successfully."}


# --- Session Base Lifecycle ---

@router.post("/sessions", response_model=InterviewOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=InterviewOut, status_code=status.HTTP_201_CREATED)
async def create_interview(
    payload: InterviewSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Create a new mock interview session: resume, role, difficulty, type, and count."""
    return await InterviewService.create_session(db, current_user.id, payload)


@router.get("/sessions", response_model=List[InterviewOut])
async def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    role: Optional[str] = Query(None, description="Filter by candidate job role"),
    type: Optional[str] = Query(None, description="Filter by type: technical, behavioral, HR, etc."),
    status: Optional[str] = Query(None, description="Filter by status: created, active, completed"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List mock interview sessions: paginated, sorted, and filtered."""
    return await InterviewService.get_user_sessions(
        db, current_user.id, skip=skip, limit=limit, role=role, type_filter=type, status=status
    )


# --- Parameterized Session Endpoints ---

@router.get("/sessions/{interview_id}", response_model=InterviewOut)
@router.get("/{interview_id}", response_model=InterviewOut)
async def get_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve details of a mock interview session including timeline & questions."""
    interview = await InterviewService.get_session(db, interview_id, current_user.id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return interview


@router.delete("/sessions/{interview_id}")
async def delete_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Delete mock interview session and soft-delete all child questions."""
    deleted = await InterviewService.delete_session(db, interview_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return {"detail": "Interview session soft-deleted successfully."}


@router.post("/sessions/{interview_id}/start", response_model=InterviewQuestionOut)
async def start_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Activate session and return the first question."""
    question = await InterviewService.start_session(db, interview_id, current_user.id)
    if not question:
        raise HTTPException(status_code=400, detail="Could not activate session or no questions found.")
    return question


# --- Answer & Question Interactions ---

@router.post("/sessions/{interview_id}/answer", response_model=AnswerSubmitResponse)
async def submit_answer(
    interview_id: str,
    payload: InterviewQuestionAnswer,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Submit response to current active question. Calibrates difficulty & returns next question."""
    interview = await InterviewService.get_session(db, interview_id, current_user.id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    # Detect current unanswered question
    sorted_qs = sorted(interview.questions, key=lambda x: x.order_index)
    current_q = None
    for q in sorted_qs:
        if q.user_transcript is None and not q.is_skipped:
            current_q = q
            break
            
    if not current_q:
        raise HTTPException(status_code=400, detail="No active question to answer.")
        
    graded_q = await InterviewService.answer_question(
        db=db,
        interview_id=interview_id,
        question_id=current_q.id,
        user_id=current_user.id,
        answer_in=payload
    )
    
    # Get next question
    next_q = await InterviewService.get_next_question(db, interview_id, current_user.id)
    
    return {
        "score": graded_q.ai_score,
        "feedback": graded_q.evaluation_feedback or {},
        "next_question": next_q
    }


@router.post("/{interview_id}/answer/{question_id}", response_model=InterviewQuestionOut)
async def answer_question_legacy(
    interview_id: str,
    question_id: str,
    answer_in: InterviewQuestionAnswer,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Legacy grading endpoint to support backward compatibility in existing tests."""
    question = await InterviewService.answer_question(
        db=db,
        interview_id=interview_id,
        question_id=question_id,
        user_id=current_user.id,
        answer_in=answer_in
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.get("/sessions/{interview_id}/next-question", response_model=Optional[InterviewQuestionOut])
async def get_next_question(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve the next unanswered adaptive question."""
    return await InterviewService.get_next_question(db, interview_id, current_user.id)


@router.post("/sessions/{interview_id}/hint", response_model=HintResponse)
async def request_hint(
    interview_id: str,
    question_id: str = Query(..., description="ID of the question requesting hint for"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Request AI hint. Max 2 hints per question. Deducts points from question grade."""
    return await InterviewService.request_hint(db, interview_id, question_id, current_user.id)


@router.post("/sessions/{interview_id}/skip", response_model=SkipResponse)
async def skip_question(
    interview_id: str,
    question_id: str = Query(..., description="ID of the question to skip"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Skip the current question. Max 3 skips per session."""
    next_q = await InterviewService.skip_question(db, interview_id, question_id, current_user.id)
    return {
        "message": "Question skipped successfully.",
        "next_question": next_q
    }


@router.post("/sessions/{interview_id}/end", response_model=InterviewOut)
async def end_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """End interview session and trigger async reports generation."""
    interview = await InterviewService.finalize_session(db, interview_id, current_user.id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return interview


@router.post("/{interview_id}/finish", response_model=InterviewOut)
async def finish_interview_legacy(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Legacy finalize endpoint supporting backwards compatibility."""
    interview = await InterviewService.finalize_session(db, interview_id, current_user.id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return interview


@router.get("/sessions/{interview_id}/report", response_model=ReportResponse)
async def get_session_report(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve full session performance report."""
    interview = await InterviewService.get_session(db, interview_id, current_user.id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    role_name = interview.title.replace(" Mock Interview", "") if " Mock Interview" in interview.title else interview.title
    return {
        "session_id": interview.id,
        "status": interview.status,
        "overall_score": interview.total_score or 50.0,
        "dimension_scores": {
            "technical_accuracy": interview.technical_score or 50.0,
            "communication": interview.communication_score or 50.0,
            "depth": interview.confidence_score or 50.0,
            "structure": interview.structure_score or 50.0,
            "relevance": interview.relevance_score or 50.0
        },
        "summary": "AI Mock interview report complete.",
        "improvement_plan": [
            "Elaborate further with specific trade-offs and architectural considerations.",
            "Use quantified achievements and structures when explaining projects."
        ],
        "title": interview.title,
        "role": role_name,
        "type": interview.interview_type,
        "created_at": interview.created_at,
        "duration_seconds": interview.duration_seconds
    }


@router.get("/sessions/{interview_id}/feedback")
async def get_session_feedback(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve per-answer AI evaluation feedback with model outlines."""
    return await InterviewService.get_session_feedback(db, interview_id, current_user.id)


@router.get("/sessions/{interview_id}/transcript")
async def get_session_transcript(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Download the Q&A session transcript as a formatted PDF."""
    pdf_bytes = await InterviewService.get_raw_pdf_bytes(db, interview_id, current_user.id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=transcript_{interview_id}.pdf"}
    )


# --- Real-Time Streaming Coaching (WebSocket) ---

@router.websocket("/sessions/{interview_id}/live-coach")
async def websocket_live_coach(
    websocket: WebSocket,
    interview_id: str,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for active streaming coach feedback tips."""
    await websocket.accept()
    
    # Authenticate via token query param or authorization header
    token = websocket.query_params.get("token")
    if not token:
        auth_header = websocket.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        from app.core import security
        from app.domains.auth.schemas import TokenPayload
        from app.database.repositories.user_repository import UserRepository
        
        payload = security.decode_access_token(token)
        token_data = TokenPayload(**payload)
        user = await UserRepository(db).get(token_data.sub)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    if not user or not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        while True:
            # Receive speech segments and behavior markers
            data = await websocket.receive_text()
            payload_data = json.loads(data)
            
            transcript = payload_data.get("transcript_chunk", "")
            posture = payload_data.get("posture_score")
            gaze = payload_data.get("eye_contact_score")
            wpm = payload_data.get("wpm")
            fillers = payload_data.get("filler_words_count")
            
            from app.ai.live_coach import LiveCoach
            tips = await LiveCoach.get_realtime_hints(
                transcript_chunk=transcript,
                posture_score=posture,
                eye_contact_score=gaze,
                wpm=wpm,
                filler_words_count=fillers
            )
            await websocket.send_json(tips)
    except WebSocketDisconnect:
        logger.info(f"WebSocket coach disconnected for session {interview_id}")
    except Exception as e:
        logger.error(f"WebSocket coach error: {e}")
