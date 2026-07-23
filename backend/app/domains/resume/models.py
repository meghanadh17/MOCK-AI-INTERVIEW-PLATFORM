import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import String, ForeignKey, Text, JSON, Float, Integer, Boolean, CHAR, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.domains.auth.models import User
    from app.domains.interview.models import Interview


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    parse_status: Mapped[str] = mapped_column(String(20), default="pending")  # 'pending', 'processing', 'success', 'failed'
    parse_strategy: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    parse_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ats_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    parsed_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    skill_summary: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    chroma_collection_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="resumes")
    interviews: Mapped[List["Interview"]] = relationship("Interview", back_populates="resume")
    sections: Mapped[List["ResumeSection"]] = relationship("ResumeSection", back_populates="resume", cascade="all, delete-orphan")
    entities: Mapped[List["ParsedEntity"]] = relationship("ParsedEntity", back_populates="resume", cascade="all, delete-orphan")


class ResumeSection(Base):
    __tablename__ = "resume_sections"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resume_id: Mapped[str] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    section_type: Mapped[str] = mapped_column(String(60), nullable=False)  # 'EXPERIENCE', 'EDUCATION', etc.
    content: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chunk_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # Relationships
    resume: Mapped["Resume"] = relationship("Resume", back_populates="sections")


class ParsedEntity(Base):
    __tablename__ = "parsed_entities"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resume_id: Mapped[str] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False)  # 'SKILL', 'ROLE', 'COMPANY', 'EDUCATION', etc.
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    proficiency: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'Beginner', 'Intermediate', 'Expert'
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # Relationships
    resume: Mapped["Resume"] = relationship("Resume", back_populates="entities")
