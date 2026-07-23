from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.dependencies import get_current_user, get_current_active_superuser
from app.domains.auth.models import User
from app.domains.jobs.schemas import (
    JobListingCreate, JobListingOut, JobRecommendationResponse,
    JobMatchDetails, SavedJobOut, InterviewPrepPlanResponse,
    MarketInsightsResponse, SkillGapAnalysisResponse, GenericStatusResponse,
    JobSearchItem
)
from app.domains.jobs.service import JobService

router = APIRouter()


# --- Static Routes First (to avoid collision with /{id}) ---

# 7. GET /saved -> Get wishlist: saved jobs with match scores
@router.get("/saved", response_model=List[SavedJobOut])
async def get_wishlist_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieves all jobs saved to the user's wishlist along with calculated match scores."""
    return await JobService.get_saved_jobs(db, current_user.id)


# 3. GET /search -> Full-text + semantic hybrid job search with filters
@router.get("/search", response_model=List[JobSearchItem])
async def search_job_listings(
    q: Optional[str] = Query(None, description="Search terms for full-text and semantic matching"),
    location: Optional[str] = Query(None, description="Filter jobs by city or remote"),
    experience_level: Optional[str] = Query(None, description="Filter by experience level (e.g. Senior, Mid)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Performs hybrid full-text and semantic keyword searches on job listings with metadata filters."""
    return await JobService.search_jobs(db, query=q, location=location, experience_level=experience_level, skip=skip, limit=limit)


# GET /search-live -> Live search from India using JSearch
@router.get("/search-live", response_model=List[JobSearchItem])
async def search_live_jobs(
    q: Optional[str] = Query(None, description="Search terms for live jobs in India"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Queries JSearch API for live jobs from India, saves them on the fly, and calculates match scores."""
    return await JobService.search_live_jobs(db, user_id=current_user.id, query=q)


# 1. GET /recommendations/{resume_id} -> Top-N matched jobs using bi-encoder FAISS semantic search
@router.get("/recommendations/{resume_id}", response_model=List[JobRecommendationResponse])
async def get_job_recommendations(
    resume_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Calculates top matched job listings using a bi-encoder FAISS vector index."""
    return await JobService.get_recommendations(db, resume_id, limit=limit)


# 2. GET /match-score/{resume_id}/{job_id} -> Detailed match: skills overlap, gap analysis, ATS prediction
@router.get("/match-score/{resume_id}/{job_id}", response_model=JobMatchDetails)
async def get_job_match_score(
    resume_id: str,
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Computes detailed skill overlap analysis, gaps, and predicted ATS matching score."""
    return await JobService.get_match_score(db, resume_id, job_id)


# 9. GET /market-insights/{role} -> Salary ranges, demand trend, top required skills for role
@router.get("/market-insights/{role}", response_model=MarketInsightsResponse)
async def get_market_insights_for_role(
    role: str,
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieves target salary scales, demand metrics, and industry required skills."""
    return await JobService.get_market_insights(role)


# 10. GET /skill-gap/{resume_id} -> Skill gap analysis vs. top 10 matched jobs
@router.get("/skill-gap/{resume_id}", response_model=SkillGapAnalysisResponse)
async def get_skill_gap_analysis(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Aggregates missing skills against the Top 10 matching jobs."""
    return await JobService.get_skill_gap(db, resume_id)


# 11. POST /ingest -> Admin: batch ingest job listings (JSON array)
@router.post("/ingest", response_model=GenericStatusResponse, status_code=status.HTTP_201_CREATED)
async def admin_batch_ingest_jobs(
    jobs_in: List[JobListingCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
) -> Any:
    """Admin endpoint to batch ingest new job descriptions."""
    count = await JobService.batch_ingest(db, jobs_in)
    return GenericStatusResponse(status="success", message=f"Successfully ingested {count} job listings")


# 12. POST /reindex -> Admin: re-embed all job listings in FAISS index
@router.post("/reindex", response_model=GenericStatusResponse)
async def admin_reindex_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
) -> Any:
    """Admin endpoint to force re-embed all jobs in the FAISS search index."""
    await JobService.reindex_jobs(db)
    return GenericStatusResponse(status="success", message="Successfully rebuilt FAISS job index")


# --- Wildcard Parameterized Routes last ---

# 4. GET /{id} -> Full job listing: JD, requirements, company info, skill tags
@router.get("/{id}", response_model=JobListingOut)
async def get_job_listing_details(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieves single job listing details by database ID."""
    job = await JobService.get_job(db, id)
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")
    return job


# 5. POST /{id}/save -> Save job to wishlist
@router.post("/{id}/save", response_model=GenericStatusResponse)
async def save_job_listing(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Saves a job listing to wishlist."""
    result = await JobService.save_job(db, current_user.id, id)
    return GenericStatusResponse(**result)


# 6. DELETE /{id}/unsave -> Remove from wishlist
@router.delete("/{id}/unsave", response_model=GenericStatusResponse)
async def unsave_job_listing(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Removes a job listing from wishlist."""
    result = await JobService.unsave_job(db, current_user.id, id)
    return GenericStatusResponse(**result)


# 8. POST /{id}/prepare-interview -> Auto-generate interview prep plan for this specific job
@router.post("/{id}/prepare-interview", response_model=InterviewPrepPlanResponse)
async def prepare_job_interview(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Generates structured preparation guide for this specific job listing."""
    return await JobService.prepare_interview(db, id)
