from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import get_db
from app.dependencies import get_current_user
from app.domains.auth.models import User
from app.domains.resume.schemas import (
    ResumeOut, ResumeDetailOut, AtsCheckRequest, AtsCheckResponse,
    EnhanceRequest, EnhanceResponse, CompareRequest, CompareResponse, ExportResponse
)
from app.domains.resume.service import ResumeService
from app.storage.local_storage import LocalStorageClient

router = APIRouter()


@router.post("/upload", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Upload resume PDF (max 10MB) and trigger parsing + indexing pipeline."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF resumes are supported currently.",
        )
        
    # Read content to enforce 10MB size limit
    content = await file.read()
    max_size = 10 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum 10MB limit."
        )
        
    # Save file using local storage client
    file_path = LocalStorageClient.save_file(
        file_data=content,
        file_name=file.filename,
        sub_dir=f"resumes/{current_user.id}"
    )
    
    # Save pending database record and trigger task
    resume = await ResumeService.save_and_ingest(
        db=db,
        user_id=current_user.id,
        file_name=file.filename,
        file_path=file_path
    )
    return resume


@router.get("/list", response_model=List[ResumeOut])
@router.get("/", response_model=List[ResumeOut])
async def list_resumes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter resumes by parse status: pending, success, failed"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List all candidate resumes: paginated, sortable, filterable by parse status."""
    return await ResumeService.get_user_resumes(db, current_user.id, skip=skip, limit=limit, status_filter=status)


@router.get("/{resume_id}", response_model=ResumeDetailOut)
async def get_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve full resume details, including parsed sections, entities, and ATS scores."""
    resume = await ResumeService.get_resume(db, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.put("/{resume_id}/set-primary")
async def set_primary_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Set a specific resume as primary and clear other primary resumes for the user."""
    success = await ResumeService.set_primary_resume(db, resume_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"detail": "Resume marked as primary successfully."}


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Soft-delete resume record and purge vector embeddings from ChromaDB collections."""
    deleted = await ResumeService.delete_resume(db, resume_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"detail": "Resume deleted successfully and vector index purged."}


@router.post("/{resume_id}/reparse")
async def reparse_resume(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Re-trigger background parsing and indexing pipeline for a specific resume."""
    resume = await ResumeService.get_resume(db, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    resume.parse_status = "pending"
    await db.commit()
    
    from app.tasks.resume_tasks import parse_resume_task
    task = parse_resume_task.delay(resume.id, resume.file_path)
    return {"task_id": task.id, "parse_status": "pending"}


@router.get("/{resume_id}/parse-status")
async def get_parse_status(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Poll the status of the parsing task: pending, processing, success, failed."""
    resume = await ResumeService.get_resume(db, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"resume_id": resume.id, "parse_status": resume.parse_status}


@router.get("/{resume_id}/analyze")
async def get_resume_analysis(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve full AI analysis of strengths, gaps, ATS scoring, and keyword fits."""
    resume = await ResumeService.get_resume(db, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    # Return raw analysis nested under skill_summary
    analysis = resume.skill_summary.get("ats_analysis") if resume.skill_summary else None
    if not analysis:
        # Fallback evaluation on demand
        from app.domains.resume.parser.ats_analyzer import ResumeATSAnalyzer
        analysis = await ResumeATSAnalyzer.analyze_resume(resume.parsed_text or "")
        
    return {"resume_id": resume.id, "analysis": analysis}


@router.get("/{resume_id}/ats-score", response_model=AtsCheckResponse)
async def get_ats_score(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve the overall ATS score with per-keyword matching breakdown."""
    resume = await ResumeService.get_resume(db, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    analysis = resume.skill_summary.get("ats_analysis") if resume.skill_summary else {}
    
    # Extract keywords found (skills list names)
    skills = analysis.get("skills", [])
    keywords_found = []
    if isinstance(skills, list):
        for s in skills:
            if isinstance(s, dict) and "name" in s:
                keywords_found.append(s["name"])
            elif isinstance(s, str):
                keywords_found.append(s)
                
    # Fallback to root skills list if keywords_found is empty
    if not keywords_found and resume.skill_summary:
        root_skills = resume.skill_summary.get("skills", [])
        if isinstance(root_skills, list):
            keywords_found = [str(s) for s in root_skills]
            
    # Extract missing keywords
    keywords_missing = analysis.get("missing_keywords", [])
    if not isinstance(keywords_missing, list) or not keywords_missing:
        # Fallback default missing keywords if the score is low and list is empty
        if (resume.ats_score or 70) < 85:
            keywords_missing = ["Cloud Platforms (AWS/GCP)", "CI/CD Automation", "Unit Testing Suites"]
        else:
            keywords_missing = []
        
    return {
        "ats_score": resume.ats_score or 70,
        "match_analysis": analysis.get("match_analysis") or analysis.get("recommendations") or "Manual review advised.",
        "keywords_found": keywords_found,
        "keywords_missing": keywords_missing
    }


@router.post("/{resume_id}/ats-check", response_model=AtsCheckResponse)
async def ats_check_jd(
    resume_id: str,
    payload: AtsCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Check ATS compatibility and keyword coverage against a specific job description."""
    return await ResumeService.ats_check(db, resume_id, payload.job_description)


@router.get("/{resume_id}/skills")
async def get_skills(
    resume_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve all parsed skills, proficiency, and evidence from the SQL database."""
    resume = await ResumeService.get_resume(db, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    return {
        "resume_id": resume.id,
        "skills": [
            {
                "name": entity.value,
                "proficiency": entity.proficiency,
                "evidence": entity.evidence
            } for entity in resume.entities if entity.entity_type == "SKILL"
        ]
    }


@router.post("/{resume_id}/enhance", response_model=EnhanceResponse)
async def enhance_section(
    resume_id: str,
    payload: EnhanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Generate section rewrite suggestions using action-first quantified language."""
    return await ResumeService.enhance_section(db, resume_id, payload.section_type)


@router.post("/compare", response_model=CompareResponse)
async def compare_resumes(
    payload: CompareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Perform side-by-side AI comparison of two candidate resumes."""
    return await ResumeService.compare_resumes(db, payload.resume_id_1, payload.resume_id_2)


@router.get("/{resume_id}/export", response_model=ExportResponse)
async def export_resume(
    resume_id: str,
    format: str = Query("markdown", description="Export format: json, markdown"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Export parsed resume schema as structured markdown text or standard JSON representation."""
    resume = await ResumeService.get_resume(db, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if format.lower() == "json":
        import json
        content = json.dumps(
            {
                "file_name": resume.file_name,
                "ats_score": resume.ats_score,
                "skill_summary": resume.skill_summary,
                "sections": [
                    {
                        "section_type": sec.section_type,
                        "content": sec.content
                    } for sec in resume.sections
                ]
            },
            indent=2
        )
    else:
        # Markdown format export
        content = f"# Resume: {resume.file_name}\n\n## ATS Score: {resume.ats_score or 70}/100\n\n"
        for sec in resume.sections:
            content += f"### {sec.section_type}\n\n{sec.content}\n\n"
            
    return {"format": format.lower(), "content": content}
