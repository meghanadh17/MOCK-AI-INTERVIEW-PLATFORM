from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class VideoSessionCreate(BaseModel):
    webrtc_room_id: Optional[str] = None
    resume_id: Optional[str] = None
    interview_session_id: Optional[str] = None
    browser_info: Optional[Dict[str, Any]] = None
    role: Optional[str] = None
    difficulty: Optional[float] = 0.5
    type: Optional[str] = "technical"
    num_questions: Optional[int] = 5
    title: Optional[str] = None
    job_description: Optional[str] = None


class VideoSessionOut(BaseModel):
    id: str
    user_id: str
    title: Optional[str] = None
    resume_id: Optional[str] = None
    interview_session_id: Optional[str] = None
    webrtc_room_id: Optional[str] = None
    recording_file_path: Optional[str] = None
    recording_duration_s: Optional[int] = None
    frame_count: int
    status: str
    
    avg_posture_score: Optional[float] = None
    avg_eye_contact: Optional[float] = None
    avg_confidence: Optional[float] = None
    dominant_emotion: Optional[str] = None
    
    avg_wpm: Optional[float] = None
    filler_word_count: Optional[int] = None
    silence_ratio: Optional[float] = None
    clarity_score: Optional[float] = None
    
    turn_server_used: bool
    browser_info: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IceServerConfig(BaseModel):
    urls: List[str]
    username: Optional[str] = None
    credential: Optional[str] = None


class VideoSessionResponse(BaseModel):
    session: VideoSessionOut
    ice_servers: List[IceServerConfig]


# --- Reports ---

class PostureTimelineEvent(BaseModel):
    timestamp_ms: int
    spine_angle: Optional[float] = None
    shoulder_tilt: Optional[float] = None
    head_tilt: Optional[float] = None
    forward_lean: Optional[float] = None
    posture_score: Optional[float] = None


class PostureReport(BaseModel):
    session_id: str
    average_score: float
    timeline: List[PostureTimelineEvent]


class GazeTimelineEvent(BaseModel):
    timestamp_ms: int
    gaze_x: Optional[float] = None
    gaze_y: Optional[float] = None
    eye_contact_score: Optional[float] = None
    blink_detected: Optional[bool] = None


class GazeReport(BaseModel):
    session_id: str
    eye_contact_percentage: float
    perclos_fatigue_index: float
    timeline: List[GazeTimelineEvent]


class EmotionWindow(BaseModel):
    start_time_s: float
    end_time_s: float
    dominant_emotion: str
    average_confidence: float


class EmotionReport(BaseModel):
    session_id: str
    dominant_emotion: str
    timeline: List[EmotionWindow]


class FillerWordEvent(BaseModel):
    word: str
    timestamp_ms: int


class SpeechTimelineEvent(BaseModel):
    start_ms: int
    end_ms: int
    wpm: float
    clarity_score: float
    energy_mean: float


class SpeechReport(BaseModel):
    session_id: str
    wpm: float
    filler_word_count: int
    silence_ratio: float
    clarity_score: float
    prosody: Dict[str, Any]
    timeline: List[SpeechTimelineEvent] = []


class TranscriptSegment(BaseModel):
    start_ms: int
    end_ms: int
    speaker: str
    text: str


class TranscriptResponse(BaseModel):
    session_id: str
    segments: List[TranscriptSegment]


class ClipExportResponse(BaseModel):
    clip_id: str
    session_id: str
    timestamp_ms: int
    export_status: str
    download_url: Optional[str] = None


class VideoSummaryResponse(BaseModel):
    session_id: str
    summary: str
    key_strengths: List[str]
    areas_for_improvement: List[str]
