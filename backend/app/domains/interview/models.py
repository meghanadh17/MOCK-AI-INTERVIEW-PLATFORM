import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import String, ForeignKey, Text, JSON, Float, Integer, Boolean, CHAR, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.domains.auth.models import User
    from app.domains.resume.models import Resume


class Interview(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resume_id: Mapped[Optional[str]] = mapped_column(ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    interview_type: Mapped[str] = mapped_column(String(50), default="technical")
    job_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty: Mapped[float] = mapped_column(Float, default=0.5)
    status: Mapped[str] = mapped_column(String(20), default="created")  # 'created', 'active', 'paused', 'completed', 'abandoned'
    total_questions: Mapped[int] = mapped_column(Integer, default=10)
    answered_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    total_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    technical_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    communication_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    structure_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    relevance_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="interviews")
    resume: Mapped[Optional["Resume"]] = relationship("Resume", back_populates="interviews")
    questions: Mapped[List["InterviewQuestion"]] = relationship(
        "InterviewQuestion", 
        back_populates="interview", 
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.order_index"
    )


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    interview_id: Mapped[str] = mapped_column(ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    difficulty: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    expected_keywords: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    ideal_outline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    answer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dimension_scores: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    hints_used: Mapped[int] = mapped_column(Integer, default=0)
    response_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_skipped: Mapped[bool] = mapped_column(Boolean, default=False)
    asked_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    answered_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # Relationships
    interview: Mapped["Interview"] = relationship("Interview", back_populates="questions")

    @property
    def user_transcript(self) -> Optional[str]:
        return self.answer_text

    @user_transcript.setter
    def user_transcript(self, value: Optional[str]) -> None:
        self.answer_text = value

    @property
    def grade(self) -> Optional[float]:
        return self.ai_score * 10.0 if self.ai_score is not None else None

    @grade.setter
    def grade(self, value: Optional[float]) -> None:
        self.ai_score = value / 10.0 if value is not None else None


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), default="technical")
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    difficulty: Mapped[float] = mapped_column(Float, default=0.5)
    expected_keywords: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    ideal_outline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rating_sum: Mapped[float] = mapped_column(Float, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    ratings: Mapped[List["QuestionBankRating"]] = relationship(
        "QuestionBankRating", back_populates="question", cascade="all, delete-orphan"
    )


class QuestionBankRating(Base):
    __tablename__ = "question_bank_ratings"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id: Mapped[str] = mapped_column(ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    question: Mapped["QuestionBank"] = relationship("QuestionBank", back_populates="ratings")
