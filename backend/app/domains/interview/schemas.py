from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class InterviewQuestionBase(BaseModel):
    question_text: str


class InterviewQuestionCreate(InterviewQuestionBase):
    interview_id: str


class InterviewQuestionAnswer(BaseModel):
    user_transcript: str
    audio_path: Optional[str] = None
    video_path: Optional[str] = None


class InterviewQuestionOut(InterviewQuestionBase):
    id: str
    interview_id: str
    question_type: Optional[str] = None
    user_transcript: Optional[str] = None
    audio_path: Optional[str] = None
    video_path: Optional[str] = None
    grade: Optional[float] = None
    ai_score: Optional[float] = None
    ai_feedback: Optional[str] = None
    evaluation_feedback: Optional[Dict[str, Any]] = None
    dimension_scores: Optional[Dict[str, Any]] = {}
    difficulty: Optional[float] = None
    expected_keywords: List[str] = []
    ideal_outline: Optional[str] = None
    hints_used: int = 0
    response_time_ms: Optional[int] = None
    order_index: int = 0
    is_skipped: bool = False
    asked_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewBase(BaseModel):
    title: str
    interview_type: str = "technical"
    job_description: Optional[str] = None


class InterviewCreate(InterviewBase):
    resume_id: Optional[str] = None


class InterviewSessionCreate(BaseModel):
    resume_id: Optional[str] = None
    role: Optional[str] = None
    difficulty: float = 0.5
    type: str = "technical"
    num_questions: int = 10
    title: Optional[str] = None
    job_description: Optional[str] = None


class InterviewUpdate(BaseModel):
    status: Optional[str] = None
    completed_at: Optional[datetime] = None


class InterviewOut(InterviewBase):
    id: str
    user_id: str
    resume_id: Optional[str] = None
    difficulty: float = 0.5
    status: str
    total_questions: int = 10
    answered_count: int = 0
    skipped_count: int = 0
    total_score: Optional[float] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    confidence_score: Optional[float] = None
    structure_score: Optional[float] = None
    relevance_score: Optional[float] = None
    duration_seconds: Optional[int] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    questions: List[InterviewQuestionOut] = []

    model_config = ConfigDict(from_attributes=True)


class AnswerSubmitResponse(BaseModel):
    score: float
    feedback: Dict[str, Any]
    next_question: Optional[InterviewQuestionOut] = None


class HintResponse(BaseModel):
    hint_text: str
    hints_used: int
    max_hints: int = 2


class SkipRequest(BaseModel):
    reason: str


class SkipResponse(BaseModel):
    message: str
    next_question: Optional[InterviewQuestionOut] = None


class ReportResponse(BaseModel):
    session_id: str
    status: str
    overall_score: float
    dimension_scores: Dict[str, float]
    summary: str
    improvement_plan: List[str]
    title: str
    role: Optional[str] = None
    type: str
    created_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None


class QuestionBankCreate(BaseModel):
    question_text: str
    question_type: str = "technical"
    role: str
    difficulty: float = 0.5
    expected_keywords: List[str] = []
    ideal_outline: Optional[str] = None


class QuestionBankOut(QuestionBankCreate):
    id: str
    average_rating: float = 0.0
    rating_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuestionBankGenerateRequest(BaseModel):
    role: str
    difficulty: str = "intermediate"
    type: str = "technical"
    count: int = 3


class QuestionRateRequest(BaseModel):
    rating: int
