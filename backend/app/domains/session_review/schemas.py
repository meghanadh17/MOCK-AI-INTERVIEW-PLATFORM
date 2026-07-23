from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class SessionHistoryItem(BaseModel):
    id: str
    title: str
    type: str  # "text" or "video"
    status: str
    grade: float
    created_at: datetime


class SessionSummaryResponse(BaseModel):
    session_id: str
    summary: str
    what_went_well: str
    what_to_improve: str
    overall_performance_grade: float


class SessionImprovementsResponse(BaseModel):
    session_id: str
    study_plan_30d: Dict[str, Any]
    weaknesses: List[str]


class ScoreBreakdownResponse(BaseModel):
    session_id: str
    technical: float
    communication: float
    confidence: float
    structure: float
    relevance: float


class ScoreComparisonItem(BaseModel):
    technical: float
    communication: float
    confidence: float
    structure: float
    relevance: float


class ComparisonResponse(BaseModel):
    session_id: str
    current_scores: ScoreComparisonItem
    rolling_30d_avg: ScoreComparisonItem
    difference: ScoreComparisonItem


class ShareRequest(BaseModel):
    expires_in_hours: Optional[int] = None


class ShareResponse(BaseModel):
    share_url: str
    share_token: str
    expires_at: Optional[datetime] = None


class ProgressDataPoint(BaseModel):
    date: datetime
    avg_score: float
    technical: float
    communication: float
    confidence: float
    structure: float
    relevance: float


class TopicCluster(BaseModel):
    topic: str
    frequency: int
    average_score: float


class StrengthCluster(BaseModel):
    topic: str
    frequency: int


class ExportDataResponse(BaseModel):
    format: str
    exported_at: datetime
    download_url: Optional[str] = None
    data_summary: Dict[str, Any]


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_session_date: Optional[datetime] = None


class LeaderboardUser(BaseModel):
    rank: int
    user_id: str
    name: str
    avatar_url: Optional[str] = None
    score: float
    is_current_user: bool


class LeaderboardResponse(BaseModel):
    leaderboard: List[LeaderboardUser]
