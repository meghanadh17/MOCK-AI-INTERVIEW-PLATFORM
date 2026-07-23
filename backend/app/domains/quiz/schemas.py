from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class QuizGenerateRequest(BaseModel):
    topic: str
    difficulty: str = Field("medium", description="'easy', 'medium', 'hard', 'expert'")
    count: int = Field(5, ge=5, le=50)


class QuizQuestionOut(BaseModel):
    id: str
    quiz_id: str
    question_text: str
    options: List[str]
    order_index: int

    model_config = ConfigDict(from_attributes=True)


class QuizOut(BaseModel):
    id: str
    user_id: str
    title: str
    topic: str
    difficulty: str
    total_questions: int
    time_limit_s: Optional[int] = None
    rating: float
    attempt_count: int
    created_at: datetime
    questions: List[QuizQuestionOut]

    model_config = ConfigDict(from_attributes=True)


class QuizListItem(BaseModel):
    id: str
    title: str
    topic: str
    difficulty: str
    total_questions: int
    time_limit_s: Optional[int] = None
    rating: float
    attempt_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttemptStartResponse(BaseModel):
    attempt_id: str
    quiz_id: str
    started_at: datetime
    time_limit_s: Optional[int] = None


class QuizAnswerSubmit(BaseModel):
    attempt_id: str
    question_id: str
    selected_answer: str


class AnswerSubmitResponse(BaseModel):
    question_id: str
    selected_answer: str
    is_correct: bool
    correct_answer: str
    explanation: Optional[str] = None


class FinishAttemptRequest(BaseModel):
    attempt_id: str


class QuestionExplanationItem(BaseModel):
    question_id: str
    question_text: str
    chosen_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str] = None


class AttemptResultResponse(BaseModel):
    attempt_id: str
    quiz_id: str
    score: float
    correct_count: int
    time_taken_s: int
    completed_at: datetime
    breakdown: List[QuestionExplanationItem]


class LeaderboardUserItem(BaseModel):
    rank: int
    user_id: str
    name: str
    score: float
    is_current_user: bool


class QuizLeaderboardResponse(BaseModel):
    leaderboard: List[LeaderboardUserItem]


class UserRankItem(BaseModel):
    rank: Optional[int] = None
    score: float
    percentile: float


class UserRankResponse(BaseModel):
    global_board: UserRankItem
    weekly_board: UserRankItem


class CustomQuestionInput(BaseModel):
    question_text: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None


class CustomQuizCreateRequest(BaseModel):
    title: str
    topic: Optional[str] = "Custom"
    difficulty: str = "medium"
    questions: List[CustomQuestionInput]


class QuizTopicItem(BaseModel):
    topic: str
    question_count: int
    quiz_count: int


class UserAttemptItem(BaseModel):
    attempt_id: str
    quiz_id: str
    quiz_title: str
    score: float
    time_taken_s: int
    completed_at: datetime


class QuizStatsResponse(BaseModel):
    avg_score: float
    best_score: float
    total_time_s: int
    streak: int


class ReportQuestionRequest(BaseModel):
    question_id: str
    reason: str


class ReportStatusResponse(BaseModel):
    report_id: str
    status: str
