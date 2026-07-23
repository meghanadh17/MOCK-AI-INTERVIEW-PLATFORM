import logging
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.dependencies import get_current_user
from app.domains.auth.models import User
from app.domains.session_review.schemas import (
    SessionHistoryItem, SessionSummaryResponse, SessionImprovementsResponse,
    ScoreBreakdownResponse, ComparisonResponse, ShareRequest, ShareResponse,
    ProgressDataPoint, TopicCluster, StrengthCluster, ExportDataResponse,
    StreakResponse, LeaderboardResponse
)
from app.domains.session_review.service import SessionReviewService

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Static Routes First (to prevent route parameter conflict) ---

# 1. GET /history -> All sessions (text+video) with summary metrics, paginated
@router.get("/history", response_model=List[SessionHistoryItem])
async def get_sessions_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Lists text mock interviews and video session history for the current user."""
    return await SessionReviewService.get_history(db, current_user.id, skip=skip, limit=limit)


# 7. GET /analytics/progress -> Time-series score data for progress chart
@router.get("/analytics/progress", response_model=List[ProgressDataPoint])
async def get_progress_timeline(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieves chronological score aggregates for progress trend charting."""
    return await SessionReviewService.get_progress(db, current_user.id)


# 8. GET /analytics/weak-areas -> Top 5 weak topic clusters across all sessions
@router.get("/analytics/weak-areas", response_model=List[TopicCluster])
async def get_top_weak_areas(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Aggregates and filters top weak topics or categories across sessions."""
    return await SessionReviewService.get_weak_areas(db, current_user.id)


# 9. GET /analytics/strengths -> Top 5 strength clusters across all sessions
@router.get("/analytics/strengths", response_model=List[StrengthCluster])
async def get_top_strengths(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Aggregates and filters top strengths or skill clusters across sessions."""
    return await SessionReviewService.get_strengths(db, current_user.id)


# 11. GET /export -> Export all session data as CSV, PDF, or JSON archive
@router.get("/export", response_model=ExportDataResponse)
async def export_sessions_report(
    format: str = Query("json", regex="^(json|csv|pdf)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Triggers dataset aggregation and returns download endpoint for session reports."""
    return await SessionReviewService.export_data(db, current_user.id, format)


# 12. GET /streak -> Study streak: consecutive days with at least one session
@router.get("/streak", response_model=StreakResponse)
async def get_user_study_streak(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Calculates active and longest study day streaks."""
    return await SessionReviewService.get_streak(db, current_user.id)


# 13. GET /leaderboard/friends -> Friend-based comparative performance leaderboard
@router.get("/leaderboard/friends", response_model=LeaderboardResponse)
async def get_comparative_leaderboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Compiles performance rankings among friends or peers."""
    return await SessionReviewService.get_leaderboard(db, current_user.id)


# Public shared report access route
@router.get("/shared/{token}")
async def get_public_shared_report(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Retrieves a session report using a public share token without requiring auth headers."""
    report = await SessionReviewService.get_shared_report(db, token)
    if not report:
        raise HTTPException(status_code=404, detail="Shared report not found or has expired")
    
    return {
        "session_id": report.session_id,
        "session_type": report.session_type,
        "summary": report.summary,
        "grade": report.overall_performance_grade,
        "key_strengths": report.key_strengths,
        "weaknesses": report.weaknesses
    }


# --- Parameterized Routes ---

# 2. GET /{id}/summary -> AI narrative of session: what went well, what to improve
@router.get("/{id}/summary", response_model=SessionSummaryResponse)
async def get_session_summary(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    report = await SessionReviewService.get_or_create_report(db, id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionSummaryResponse(
        session_id=id,
        summary=report.summary,
        what_went_well=report.what_went_well or "",
        what_to_improve=report.what_to_improve or "",
        overall_performance_grade=report.overall_performance_grade
    )


# 3. GET /{id}/improvements -> Personalized 30-day study plan from weak areas
@router.get("/{id}/improvements", response_model=SessionImprovementsResponse)
async def get_session_study_improvements(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    report = await SessionReviewService.get_improvements(db, id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Session not found")
    return report


# 4. GET /{id}/score-breakdown -> Radar chart data
@router.get("/{id}/score-breakdown", response_model=ScoreBreakdownResponse)
async def get_score_radar_metrics(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    report = await SessionReviewService.get_score_breakdown(db, id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Session not found")
    return report


# 5. GET /{id}/comparison -> Current session vs. user's rolling 30-day average
@router.get("/{id}/comparison", response_model=ComparisonResponse)
async def get_scores_comparison(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    report = await SessionReviewService.get_comparison(db, id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Session not found")
    return report


# 6. POST /{id}/share -> Create public shareable report link
@router.post("/{id}/share", response_model=ShareResponse)
async def create_share_link(
    id: str,
    share_in: ShareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    share = await SessionReviewService.share_report(db, id, share_in.expires_in_hours, current_user.id)
    if not share:
        raise HTTPException(status_code=404, detail="Session not found")
    return share


# 10. POST /{id}/re-evaluate -> Re-run AI evaluation on existing answers
@router.post("/{id}/re-evaluate")
async def trigger_narrative_re_evaluation(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    report = await SessionReviewService.re_evaluate(db, id, current_user.id)
    if not report:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "success", "message": "Session narrative re-evaluated successfully"}


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_session(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Deletes a text mock interview or video session based on session ID."""
    deleted = await SessionReviewService.delete_session(db, id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"detail": "Session deleted successfully."}

