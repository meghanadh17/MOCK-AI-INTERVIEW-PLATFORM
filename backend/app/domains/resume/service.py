import logging
import os
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database.repositories.resume_repository import ResumeRepository
from app.domains.resume.models import Resume, ResumeSection, ParsedEntity
from app.domains.resume.parser.pdf_extractor import MultiStrategyPDFExtractor
from app.domains.resume.parser.entity_extractor import EntityExtractor
from app.domains.resume.parser.section_chunker import SectionChunker
from app.ai.mistral_client import MistralAIClient
from app.ai.rag.pipeline import RAGPipeline
from app.config import settings

logger = logging.getLogger(__name__)


class ResumeService:
    """Manages business operations around parsing, analyzing, and storing resumes."""
    
    @staticmethod
    async def save_and_ingest(
        db: AsyncSession, 
        user_id: str, 
        file_name: str, 
        file_path: str
    ) -> Resume:
        """Saves a pending resume record and triggers async Celery parsing task."""
        # Create a pending Resume record
        repo = ResumeRepository(db)
        db_obj = Resume(
            user_id=user_id,
            file_name=file_name,
            file_path=file_path,
            parse_status="pending",
            is_primary=False
        )
        created_resume = await repo.create(db_obj)
        await db.commit()
        await db.refresh(created_resume)
        
        # Trigger Celery parse task asynchronously
        try:
            from app.tasks.resume_tasks import parse_resume_task
            # Delay parsing to Celery
            parse_resume_task.delay(created_resume.id, file_path)
            logger.info(f"Triggered async parsing task for resume: {created_resume.id}")
        except Exception as celery_err:
            # Fallback to sync parsing in local development if Celery/Redis is down
            logger.warning(f"Failed to queue Celery parse task: {celery_err}. Running synchronously.")
            await ResumeService.parse_and_index_resume(db, created_resume.id, file_path)
            
        return created_resume

    @staticmethod
    async def parse_and_index_resume(db: AsyncSession, resume_id: str, file_path: str) -> None:
        """Executes full PDF parsing, entity extraction, ATS scoring, and RAG vector indexing."""
        repo = ResumeRepository(db)
        resume = await repo.get(resume_id)
        if not resume:
            raise ValueError(f"Resume ID {resume_id} not found.")
            
        resume.parse_status = "processing"
        await db.commit()
        
        try:
            # Read file bytes for the extractor
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()

            # 1. Run multi-strategy extraction pipeline
            extractor = MultiStrategyPDFExtractor(mistral_client=MistralAIClient)
            extraction = await extractor.extract(pdf_bytes)
            raw_text = extraction.text
            
            # 2. Evaluate ATS Analysis and Score using RESUME_ANALYSIS_SYSTEM
            from app.domains.resume.parser.ats_analyzer import ResumeATSAnalyzer
            ats_analysis = await ResumeATSAnalyzer.analyze_resume(raw_text)
            ats_score = ats_analysis.get("ats_score", 70)
            
            # 3. Extract candidate entities
            entities = await EntityExtractor.extract_entities(raw_text)
            entities["ats_analysis"] = ats_analysis
            
            # 4. Update Resume record
            resume.parsed_text = raw_text
            resume.skill_summary = entities
            resume.parse_strategy = extraction.strategy.value
            resume.parse_confidence = extraction.confidence
            resume.parse_status = "success" if extraction.confidence >= 0.60 else "failed"
            resume.ats_score = ats_score
            resume.word_count = len(raw_text.split())
            resume.page_count = extraction.page_count
            
            # 5. Run RAG Pipeline Ingestion
            rag_data = RAGPipeline.ingest_document(raw_text, user_id=resume.user_id, resume_id=resume.id)
            
            # 6. Parse and populate ResumeSection records
            parent_chunks = rag_data.get("parent_chunks", [])
            child_chunks = rag_data.get("child_chunks", [])
            
            # Clear old sections/entities if reparsing
            stmt_sec = select(ResumeSection).where(ResumeSection.resume_id == resume.id)
            res_sec = await db.execute(stmt_sec)
            for s in res_sec.scalars().all():
                await db.delete(s)
                
            stmt_ent = select(ParsedEntity).where(ParsedEntity.resume_id == resume.id)
            res_ent = await db.execute(stmt_ent)
            for e in res_ent.scalars().all():
                await db.delete(e)
            
            for idx, pc in enumerate(parent_chunks):
                sub_chunks = sum(1 for cc in child_chunks if cc.get("parent_id") == pc["id"])
                sec_obj = ResumeSection(
                    resume_id=resume.id,
                    section_type=pc["section"].upper(),
                    content=pc["text"],
                    order_index=idx,
                    word_count=len(pc["text"].split()),
                    chunk_count=sub_chunks
                )
                db.add(sec_obj)
                
            # 7. Populate SQL ParsedEntities
            skills = entities.get("skills", [])
            for skill in skills:
                skill_val = skill
                proficiency = "Intermediate"
                evidence = ""
                if isinstance(skill, dict):
                    skill_val = skill.get("name", "")
                    proficiency = skill.get("level", "Intermediate")
                    evidence = skill.get("context", "")
                    
                entity_obj = ParsedEntity(
                    resume_id=resume.id,
                    entity_type="SKILL",
                    value=skill_val,
                    proficiency=proficiency,
                    evidence=evidence
                )
                db.add(entity_obj)
                
            await db.commit()
            logger.info(f"Resume {resume_id} parsed and indexed successfully.")
        except Exception as e:
            logger.error(f"Failed to parse resume {resume_id}: {str(e)}")
            resume.parse_status = "failed"
            await db.commit()
            raise e

    @staticmethod
    async def get_user_resumes(
        db: AsyncSession, 
        user_id: str,
        skip: int = 0,
        limit: int = 10,
        status_filter: Optional[str] = None
    ) -> List[Resume]:
        stmt = select(Resume).where(Resume.user_id == user_id, Resume.deleted_at.is_(None))
        if status_filter:
            stmt = stmt.where(Resume.parse_status == status_filter)
        stmt = stmt.order_by(Resume.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def set_primary_resume(db: AsyncSession, resume_id: str, user_id: str) -> bool:
        """Sets a specific resume as primary and clears is_primary for all other user resumes."""
        stmt = select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id, Resume.deleted_at.is_(None))
        res = await db.execute(stmt)
        resume = res.scalar_one_or_none()
        if not resume:
            return False
            
        from sqlalchemy import update
        # Clear primary status for other resumes
        await db.execute(
            update(Resume)
            .where(Resume.user_id == user_id, Resume.id != resume_id)
            .values(is_primary=False)
        )
        
        # Mark current as primary
        resume.is_primary = True
        await db.commit()
        return True

    @staticmethod
    async def get_resume(db: AsyncSession, resume_id: str) -> Optional[Resume]:
        stmt = (
            select(Resume)
            .options(selectinload(Resume.sections), selectinload(Resume.entities))
            .where(Resume.id == resume_id, Resume.deleted_at.is_(None))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def delete_resume(db: AsyncSession, resume_id: str, user_id: str) -> bool:
        resume = await ResumeService.get_resume(db, resume_id)
        if not resume or resume.user_id != user_id:
            return False
            
        # 1. Soft-delete in SQL database
        resume.deleted_at = datetime.now(timezone.utc)
        await db.commit()
        
        # 2. Purge from vector DB
        try:
            from app.ai.rag.chroma_store import ChromaStore
            child_store = ChromaStore(collection_name=f"resume_child_{user_id}")
            parent_store = ChromaStore(collection_name=f"resume_parent_{user_id}")
            
            child_store.delete_by_resume(resume_id)
            parent_store.delete_by_resume(resume_id)
            logger.info(f"Purged vector store indices for resume: {resume_id}")
        except Exception as e:
            logger.error(f"Failed to purge vector database chunks: {e}")
            
        return True

    @staticmethod
    async def ats_check(db: AsyncSession, resume_id: str, job_description: str) -> Dict[str, Any]:
        resume = await ResumeService.get_resume(db, resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        prompt = (
            f"Analyze the following candidate resume text against the target job description.\n"
            f"Resume Text:\n{resume.parsed_text or ''}\n\n"
            f"Job Description:\n{job_description}\n\n"
            f"Return a JSON object with: 'ats_score' (int 0-100), 'match_analysis' (str), "
            f"'keywords_found' (list of strings), 'keywords_missing' (list of strings)."
        )
        
        if not settings.MISTRAL_API_KEY:
            # Graceful local fallback mock response
            return {
                "ats_score": 85,
                "match_analysis": "The candidate's technical skills align well with Python/FastAPI requirements. However, there is missing cloud experience.",
                "keywords_found": ["Python", "FastAPI", "SQLAlchemy", "PostgreSQL"],
                "keywords_missing": ["Docker", "Kubernetes", "AWS"]
            }
            
        try:
            res = await MistralAIClient.generate_structured(prompt)
            if not isinstance(res, dict):
                res = {}
            if "ats_score" not in res:
                res["ats_score"] = 70
            else:
                try:
                    res["ats_score"] = int(res["ats_score"])
                except Exception:
                    res["ats_score"] = 70
            if "match_analysis" not in res:
                res["match_analysis"] = "Analysis complete."
            else:
                res["match_analysis"] = str(res["match_analysis"])
            if "keywords_found" not in res or not isinstance(res["keywords_found"], list):
                res["keywords_found"] = []
            if "keywords_missing" not in res or not isinstance(res["keywords_missing"], list):
                res["keywords_missing"] = []
            return res
        except Exception as e:
            logger.error(f"ATS check LLM query failed: {e}")
            return {
                "ats_score": 70,
                "match_analysis": "Error analyzing compatibility. General overlap match score default returned.",
                "keywords_found": [],
                "keywords_missing": []
            }

    @staticmethod
    async def enhance_section(db: AsyncSession, resume_id: str, section_type: Optional[str] = None) -> Dict[str, Any]:
        resume = await ResumeService.get_resume(db, resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        target_text = ""
        if section_type:
            target_sec = next((s for s in resume.sections if s.section_type == section_type.upper()), None)
            if target_sec:
                target_text = target_sec.content
        if not target_text:
            target_text = resume.parsed_text or ""
            
        prompt = (
            f"Rewrite the following text to make it sound professional, using impact-first "
            f"language (e.g. 'Action verb + quantified metric + result achieved').\n"
            f"Text:\n{target_text}\n\n"
            f"Return JSON: 'original_text' (str), 'enhanced_text' (str), 'suggestions' (list of strings)."
        )
        
        if not settings.MISTRAL_API_KEY:
            return {
                "original_text": target_text[:100] + "...",
                "enhanced_text": "Architected high-throughput async Python backend APIs, boosting database query retrieval latency by 45%.",
                "suggestions": [
                    "Use strong action verbs like 'Architected' instead of 'Did code'.",
                    "Quantify latency achievements (e.g., 'boosting retrieval by 45%')."
                ]
            }
            
        try:
            res = await MistralAIClient.generate_structured(prompt)
            
            # Formatter helper functions
            def format_structured_text(val: Any) -> str:
                if isinstance(val, str):
                    return val
                if isinstance(val, list):
                    lines = []
                    for item in val:
                        if isinstance(item, dict):
                            lines.append(format_structured_dict(item))
                        elif isinstance(item, list):
                            lines.append(format_structured_text(item))
                        else:
                            lines.append(f"• {item}")
                    return "\n".join(lines)
                if isinstance(val, dict):
                    return format_structured_dict(val)
                return str(val)

            def format_structured_dict(d: dict) -> str:
                lines = []
                # Try to extract common job fields
                role = d.get("role") or d.get("title") or d.get("position")
                company = d.get("company") or d.get("employer") or d.get("organization")
                location = d.get("location") or d.get("city")
                duration = d.get("duration") or d.get("dates") or d.get("period")
                description = d.get("description") or d.get("summary") or d.get("content")
                achievements = d.get("achievements") or d.get("key_achievements") or d.get("accomplishments") or d.get("highlights")
                
                header_parts = []
                if role: header_parts.append(f"**{role}**")
                if company: header_parts.append(f"at **{company}**")
                if location: header_parts.append(location)
                if duration: header_parts.append(f"({duration})")
                
                if header_parts:
                    lines.append(f"• {', '.join(header_parts)}")
                
                if description and isinstance(description, str):
                    lines.append(f"  {description}")
                    
                if achievements:
                    if isinstance(achievements, list):
                        for ach in achievements:
                            lines.append(f"  - {ach}")
                    elif isinstance(achievements, str):
                        lines.append(f"  - {achievements}")
                        
                matched_keys = {"role", "title", "position", "company", "employer", "organization", "location", "city", "duration", "dates", "period", "description", "summary", "content", "achievements", "key_achievements", "accomplishments", "highlights"}
                other_keys = [k for k in d.keys() if k.lower() not in matched_keys]
                
                if other_keys:
                    for k in other_keys:
                        v = d[k]
                        if isinstance(v, (dict, list)):
                            lines.append(f"  {k.upper()}:")
                            lines.append(format_structured_text(v))
                        else:
                            lines.append(f"  {k}: {v}")
                            
                return "\n".join(lines)

            # Sanitize output dictionary
            if not isinstance(res, dict):
                res = {"original_text": target_text, "enhanced_text": str(res), "suggestions": []}
                
            if "original_text" not in res:
                res["original_text"] = target_text
                
            if "suggestions" not in res:
                res["suggestions"] = []
            elif isinstance(res["suggestions"], str):
                res["suggestions"] = [res["suggestions"]]
                
            if "enhanced_text" not in res:
                res["enhanced_text"] = target_text
            else:
                res["enhanced_text"] = format_structured_text(res["enhanced_text"])
                
            return res
        except Exception as e:
            logger.error(f"LLM rewrite enhance failed: {e}")
            return {"original_text": target_text, "enhanced_text": target_text, "suggestions": []}

    @staticmethod
    async def compare_resumes(db: AsyncSession, resume_id_1: str, resume_id_2: str) -> Dict[str, Any]:
        r1 = await ResumeService.get_resume(db, resume_id_1)
        r2 = await ResumeService.get_resume(db, resume_id_2)
        if not r1 or not r2:
            raise HTTPException(status_code=404, detail="One or both resumes not found")
            
        prompt = (
            f"Compare the following two resumes side-by-side.\n"
            f"Resume 1 (Candidate: {r1.file_name}):\n{r1.parsed_text or ''}\n\n"
            f"Resume 2 (Candidate: {r2.file_name}):\n{r2.parsed_text or ''}\n\n"
            f"Return JSON: 'resume_1_analysis' (str summary), 'resume_2_analysis' (str summary), "
            f"'comparison_diff' (str detailing major diffs), 'verdict' (str recommendation)."
        )
        
        if not settings.MISTRAL_API_KEY:
            return {
                "resume_1_analysis": f"Resume 1 contains strong backend scaling experience in Python/FastAPI.",
                "resume_2_analysis": f"Resume 2 contains strong frontend rendering performance in React/Vite.",
                "comparison_diff": "Resume 1 is backend-focused; Resume 2 is frontend/full-stack focused.",
                "verdict": "Recommend Resume 1 for Backend Developer role, and Resume 2 for Frontend role."
            }
            
        try:
            res = await MistralAIClient.generate_structured(prompt)
            if not isinstance(res, dict):
                res = {}
            if "resume_1_analysis" not in res:
                res["resume_1_analysis"] = "Analysis complete."
            else:
                res["resume_1_analysis"] = str(res["resume_1_analysis"])
            if "resume_2_analysis" not in res:
                res["resume_2_analysis"] = "Analysis complete."
            else:
                res["resume_2_analysis"] = str(res["resume_2_analysis"])
            if "comparison_diff" not in res:
                res["comparison_diff"] = "Comparison complete."
            else:
                res["comparison_diff"] = str(res["comparison_diff"])
            if "verdict" not in res:
                res["verdict"] = "Manual review required."
            else:
                res["verdict"] = str(res["verdict"])
            return res
        except Exception as e:
            logger.error(f"LLM comparison query failed: {e}")
            return {
                "resume_1_analysis": "Error analyzing Candidate 1.",
                "resume_2_analysis": "Error analyzing Candidate 2.",
                "comparison_diff": "Failed to generate side-by-side diff.",
                "verdict": "Review manually."
            }
