import logging
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.dependencies import get_current_user
from app.domains.auth.models import User
from app.domains.quiz.schemas import (
    QuizGenerateRequest, QuizOut, QuizListItem, AttemptStartResponse,
    QuizAnswerSubmit, AnswerSubmitResponse, AttemptResultResponse,
    QuizLeaderboardResponse, UserRankResponse, CustomQuizCreateRequest,
    QuizTopicItem, UserAttemptItem, QuizStatsResponse, ReportQuestionRequest,
    ReportStatusResponse, FinishAttemptRequest
)
from app.domains.quiz.service import QuizService

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Static Routes First (prevents conflict with /{id}) ---

# 1. POST /generate -> AI-generate quiz: topic, difficulty (easy/medium/hard/expert), count (5-50)
@router.post("/generate", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
async def generate_adaptive_quiz(
    gen_in: QuizGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Invokes Mistral structured generation to create an adaptive quiz on a selected topic."""
    return await QuizService.generate_quiz(db, current_user.id, gen_in)


# 2. GET /list -> Browse public quizzes: paginated, filterable by topic/difficulty/rating (Public)
@router.get("/list", response_model=List[QuizListItem])
async def list_public_quizzes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    topic: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    rating: Optional[float] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Lists public approved quizzes. Public route, doesn't require bearer JWT."""
    return await QuizService.list_quizzes(db, skip=skip, limit=limit, topic=topic, difficulty=difficulty, rating=rating)


# 9. GET /leaderboard/global -> Global all-time leaderboard (Public)
@router.get("/leaderboard/global", response_model=QuizLeaderboardResponse)
async def get_global_leaderboard(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Retrieves top 20 rankings of all time globally. Public route."""
    return await QuizService.get_board_leaderboard(db, "global", user_id="")


# 10. GET /leaderboard/weekly -> Weekly leaderboard (resets Monday 00:00 UTC) (Public)
@router.get("/leaderboard/weekly", response_model=QuizLeaderboardResponse)
async def get_weekly_leaderboard(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Retrieves top 20 rankings for the current calendar week. Public route."""
    return await QuizService.get_board_leaderboard(db, "weekly", user_id="")


# 11. GET /leaderboard/my-rank -> User rank, score, percentile in global/weekly boards
@router.get("/leaderboard/my-rank", response_model=UserRankResponse)
async def get_user_rank_positions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Fetches rank status and percentiles for the authenticated candidate."""
    return await QuizService.get_user_ranks(db, current_user.id)


# 12. POST /custom/create -> Create custom quiz from personal question bank
@router.post("/custom/create", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
async def create_custom_quiz_from_bank(
    quiz_in: CustomQuizCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Saves a custom user-defined quiz layout and questions."""
    return await QuizService.create_custom_quiz(db, current_user.id, quiz_in)


# 13. GET /topics -> All available quiz topics with question counts (Public)
@router.get("/topics", response_model=List[QuizTopicItem])
async def list_quiz_topics(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Returns unique topic labels along with aggregated counts. Public route."""
    return await QuizService.get_topics(db)


# 14. GET /my-attempts -> User's quiz attempt history with score trends
@router.get("/my-attempts", response_model=List[UserAttemptItem])
async def get_user_attempts_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Lists completions and historical scores for the user."""
    return await QuizService.get_user_attempts(db, current_user.id)


# 15. GET /stats -> Aggregate stats: avg score, best score, total time, streak
@router.get("/stats", response_model=QuizStatsResponse)
async def get_quiz_stats_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Calculates study streaks, average scores, and cumulative training time."""
    return await QuizService.get_stats(db, current_user.id)


# --- Parameterized Routes ({id} placeholder) ---

# 3. GET /{id} -> Quiz questions (without answers) + metadata
@router.get("/{id}", response_model=QuizOut)
async def get_quiz_details(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Fetches details of a specific quiz. Hides answers by schema exclusion."""
    quiz = await QuizService.get_quiz(db, id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


# 4. POST /{id}/start -> Start attempt; returns session token + timer start
@router.post("/{id}/start", response_model=AttemptStartResponse)
async def start_quiz_attempt(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Registers the initialization of a timed quiz attempt session."""
    attempt = await QuizService.start_attempt(db, id, current_user.id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return AttemptStartResponse(
        attempt_id=attempt.id,
        quiz_id=attempt.quiz_id,
        started_at=attempt.started_at,
        time_limit_s=attempt.quiz.time_limit_s
    )


# 5. POST /{id}/submit-answer -> Submit answer for one question (real-time scoring)
@router.post("/{id}/submit-answer", response_model=AnswerSubmitResponse)
async def submit_question_answer(
    id: str,
    ans_in: QuizAnswerSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Grades and registers selected choice for a question during an active session."""
    result = await QuizService.submit_answer(db, current_user.id, ans_in)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid active attempt session or question context")
    return result


# 6. POST /{id}/finish -> Finish attempt → instant results + per-question explanation
@router.post("/{id}/finish", response_model=AttemptResultResponse)
async def finish_quiz_attempt(
    id: str,
    finish_in: FinishAttemptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Stops session timer, registers final score, and returns detailed explanations."""
    result = await QuizService.finish_attempt(db, finish_in.attempt_id, current_user.id)
    if not result:
        raise HTTPException(status_code=400, detail="Attempt session not found or already completed")
    return result


# 7. GET /{id}/results/{attempt_id} -> Detailed results: score, time, per-question AI explanation
@router.get("/{id}/results/{attempt_id}", response_model=AttemptResultResponse)
async def get_attempt_results_details(
    id: str,
    attempt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieves breakdown metrics of a completed attempt."""
    result = await QuizService.get_attempt_results(db, attempt_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Attempt results not found")
    return result


# 8. GET /{id}/leaderboard -> Top 20 scores for this quiz (Redis sorted set) (Public)
@router.get("/{id}/leaderboard", response_model=QuizLeaderboardResponse)
async def get_quiz_specific_leaderboard(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Fetches candidate rankings for this quiz. Public endpoint."""
    return await QuizService.get_quiz_leaderboard(db, id, user_id="")


# 16. POST /{id}/report-question -> Report a question for inaccuracy (moderation)
@router.post("/{id}/report-question", response_model=ReportStatusResponse)
async def report_quiz_question(
    id: str,
    report_in: ReportQuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Submits a question moderation report."""
    return await QuizService.report_question(db, id, report_in.question_id, current_user.id, report_in.reason)


@router.delete("/attempts/{attempt_id}", status_code=status.HTTP_200_OK)
async def delete_quiz_attempt(
    attempt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Deletes a completed quiz attempt history item."""
    deleted = await QuizService.delete_attempt(db, attempt_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
    return {"detail": "Quiz attempt deleted successfully."}

