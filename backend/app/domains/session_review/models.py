import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, ForeignKey, Text, JSON, Float, CHAR, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.domains.auth.models import User


class SessionReport(Base):
    __tablename__ = "session_reports"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)
    session_type: Mapped[str] = mapped_column(String(20), default="text")  # 'text' or 'video'
    
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    what_went_well: Mapped[str] = mapped_column(Text, nullable=True)
    what_to_improve: Mapped[str] = mapped_column(Text, nullable=True)
    
    overall_performance_grade: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Radar chart scores (0.0 to 100.0)
    technical_score: Mapped[float] = mapped_column(Float, default=70.0)
    communication_score: Mapped[float] = mapped_column(Float, default=70.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=70.0)
    structure_score: Mapped[float] = mapped_column(Float, default=70.0)
    relevance_score: Mapped[float] = mapped_column(Float, default=70.0)
    
    # Study plan & lists
    study_plan_30d: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    key_strengths: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    weaknesses: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    
    # Sharing
    share_token: Mapped[Optional[str]] = mapped_column(CHAR(36), nullable=True, unique=True, index=True)
    share_expires_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User")


class ProgressSnapshot(Base):
    __tablename__ = "progress_snapshots"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_date: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now(), nullable=False)
    
    # Snapshot scores
    avg_score: Mapped[float] = mapped_column(Float, default=0.0)
    technical_score: Mapped[float] = mapped_column(Float, default=0.0)
    communication_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    structure_score: Mapped[float] = mapped_column(Float, default=0.0)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    user: Mapped["User"] = relationship("User")
