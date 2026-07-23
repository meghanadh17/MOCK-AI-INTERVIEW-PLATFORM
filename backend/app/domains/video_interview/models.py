import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import String, ForeignKey, Text, JSON, Float, Integer, Boolean, CHAR, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

if TYPE_CHECKING:
    from app.domains.auth.models import User
    from app.domains.resume.models import Resume
    from app.domains.interview.models import Interview


class VideoSession(Base):
    __tablename__ = "video_sessions"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id: Mapped[Optional[str]] = mapped_column(ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True, index=True)
    interview_session_id: Mapped[Optional[str]] = mapped_column(ForeignKey("interview_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    webrtc_room_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    recording_file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recording_duration_s: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    frame_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="created")
    
    # Aggregate scores (0.0 – 1.0)
    avg_posture_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_eye_contact: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dominant_emotion: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    
    # Speech analytics
    avg_wpm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    filler_word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    silence_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    clarity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # WebRTC metadata
    turn_server_used: Mapped[bool] = mapped_column(Boolean, default=False)
    browser_info: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now()
    )

    @property
    def title(self) -> str:
        return self.interview.title if self.interview else "AI Video Practice Mock"

    @property
    def average_gaze_score(self) -> Optional[float]:
        return self.avg_eye_contact * 100.0 if self.avg_eye_contact is not None else None

    @average_gaze_score.setter
    def average_gaze_score(self, val: Optional[float]) -> None:
        self.avg_eye_contact = val / 100.0 if val is not None else None

    @property
    def average_posture_score(self) -> Optional[float]:
        return self.avg_posture_score * 100.0 if self.avg_posture_score is not None else None

    @average_posture_score.setter
    def average_posture_score(self, val: Optional[float]) -> None:
        self.avg_posture_score = val / 100.0 if val is not None else None

    # Relationships
    user: Mapped["User"] = relationship("User")
    resume: Mapped[Optional["Resume"]] = relationship("Resume")
    interview: Mapped[Optional["Interview"]] = relationship("Interview")
    frame_metrics: Mapped[List["FrameMetric"]] = relationship("FrameMetric", back_populates="video_session", cascade="all, delete-orphan")
    speech_segments: Mapped[List["SpeechSegment"]] = relationship("SpeechSegment", back_populates="video_session", cascade="all, delete-orphan")


class FrameMetric(Base):
    __tablename__ = "frame_metrics"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_session_id: Mapped[str] = mapped_column(ForeignKey("video_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Posture
    spine_angle: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    shoulder_tilt: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    head_tilt: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    forward_lean: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    posture_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Gaze
    gaze_x: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gaze_y: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    eye_contact_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    blink_detected: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    
    # Emotion
    emotion_label: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    emotion_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    emotion_scores: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    
    landmarks_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

    # Relationships
    video_session: Mapped["VideoSession"] = relationship("VideoSession", back_populates="frame_metrics")


class SpeechSegment(Base):
    __tablename__ = "speech_segments"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_session_id: Mapped[str] = mapped_column(ForeignKey("video_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    start_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    end_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    transcript_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    wpm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    filler_words: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    pause_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    clarity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pitch_mean: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pitch_std: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    energy_mean: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    video_session: Mapped["VideoSession"] = relationship("VideoSession", back_populates="speech_segments")
