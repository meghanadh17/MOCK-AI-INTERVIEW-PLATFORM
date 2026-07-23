from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, ConfigDict


class JobListingBase(BaseModel):
    title: str
    company: str
    description: str
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    experience_level: Optional[str] = None


class JobListingCreate(JobListingBase):
    pass


class JobListingOut(JobListingBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobRecommendationResponse(BaseModel):
    job: JobListingOut
    match_score: float
    skills_overlap: List[str]
    missing_skills: List[str]
    ats_prediction: float

    model_config = ConfigDict(from_attributes=True)


class JobMatchDetails(BaseModel):
    match_score: float
    skills_overlap: List[str]
    missing_skills: List[str]
    ats_prediction: float

    model_config = ConfigDict(from_attributes=True)


class SavedJobOut(BaseModel):
    id: str
    job: JobListingOut
    match_score: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewPrepPlanResponse(BaseModel):
    job_id: str
    plan: str


class MarketInsightsResponse(BaseModel):
    role: str
    salary_ranges: Union[str, Dict[str, Any]]
    demand_trend: str
    top_skills: List[str]


class SkillGapAnalysisResponse(BaseModel):
    resume_id: str
    critical_missing_skills: List[str]
    skill_frequency: Dict[str, int]
    recommendations: str


class BatchIngestRequest(BaseModel):
    jobs: List[JobListingCreate]


class GenericStatusResponse(BaseModel):
    status: str
    message: str


class JobSearchItem(BaseModel):
    job: JobListingOut
    match_score: float

    model_config = ConfigDict(from_attributes=True)
