from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class ResumeBase(BaseModel):
    file_name: str


class ResumeCreate(ResumeBase):
    file_path: str
    user_id: str


class ResumeUpdate(BaseModel):
    parsed_text: Optional[str] = None
    skill_summary: Optional[Dict[str, Any]] = None
    parse_status: Optional[str] = None


class ResumeSectionOut(BaseModel):
    id: str
    section_type: str
    content: str
    order_index: int
    word_count: Optional[int] = None
    chunk_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ParsedEntityOut(BaseModel):
    id: str
    entity_type: str
    value: str
    evidence: Optional[str] = None
    proficiency: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ResumeOut(ResumeBase):
    id: str
    user_id: str
    file_path: str
    parse_status: str
    parse_strategy: Optional[str] = None
    parse_confidence: Optional[float] = None
    ats_score: Optional[int] = None
    parsed_text: Optional[str] = None
    skill_summary: Optional[Dict[str, Any]] = None
    word_count: Optional[int] = None
    page_count: Optional[int] = None
    is_primary: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumeDetailOut(ResumeOut):
    sections: List[ResumeSectionOut] = []
    entities: List[ParsedEntityOut] = []


class AtsCheckRequest(BaseModel):
    job_description: str


class AtsCheckResponse(BaseModel):
    ats_score: int
    match_analysis: str
    keywords_found: List[str]
    keywords_missing: List[str]


class EnhanceRequest(BaseModel):
    section_type: Optional[str] = None


class EnhanceResponse(BaseModel):
    original_text: str
    enhanced_text: str
    suggestions: List[str]


class CompareRequest(BaseModel):
    resume_id_1: str
    resume_id_2: str


class CompareResponse(BaseModel):
    resume_1_analysis: str
    resume_2_analysis: str
    comparison_diff: str
    verdict: str


class ExportResponse(BaseModel):
    format: str
    content: str
