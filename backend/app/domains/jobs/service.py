import logging
import asyncio
import uuid
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from app.domains.jobs.models import JobListing, SavedJob, JobMatch
from app.domains.resume.models import Resume
from app.domains.jobs.schemas import (
    JobListingCreate, JobListingOut, JobRecommendationResponse,
    JobMatchDetails, SavedJobOut, InterviewPrepPlanResponse,
    MarketInsightsResponse, SkillGapAnalysisResponse
)
from app.ai.rag.embedder import SentenceEmbedder
from app.ai.rag.faiss_store import FAISSStore
from app.config import settings

logger = logging.getLogger(__name__)

# Deterministic namespace for JSearch job UUIDs
JSEARCH_NAMESPACE = uuid.UUID("9c2b4c10-64b5-8ad5-03d4-20b9dfb2d69f")

# Curated list of mock tech jobs in India for demo/fallback when RAPIDAPI_KEY is not configured
MOCK_INDIA_JOBS = [
    {
        "job_id": "mock_in_01",
        "job_title": "Senior Python & FastAPI Engineer",
        "employer_name": "Infosys AI Lab",
        "job_description": "We are looking for a Senior backend engineer with extensive Python, FastAPI, and AWS expertise to work at our Bangalore office. You will scale high-throughput async services and integrate vector search components.",
        "job_highlights": {"Qualifications": ["5+ years Python developer experience", "Deep knowledge of FastAPI and asyncio", "AWS certifications are a plus"]},
        "job_min_salary": 1800000,
        "job_max_salary": 2800000,
        "job_salary_currency": "INR",
        "job_city": "Bengaluru",
        "job_state": "Karnataka",
        "job_country": "IN",
        "job_required_skills": ["Python", "FastAPI", "AWS", "SQL", "Docker"]
    },
    {
        "job_id": "mock_in_02",
        "job_title": "React Frontend Developer",
        "employer_name": "TCS Interactive",
        "job_description": "Join our frontend engineering team building high-fidelity client interfaces with React, TypeScript, and TailwindCSS in Mumbai. You will build state-of-the-art interactive micro-animations and optimize web bundles.",
        "job_highlights": {"Qualifications": ["3+ years React experience", "Proficiency in TypeScript and responsive CSS layouts", "Excellent communication skills"]},
        "job_min_salary": 1200000,
        "job_max_salary": 1800000,
        "job_salary_currency": "INR",
        "job_city": "Mumbai",
        "job_state": "Maharashtra",
        "job_country": "IN",
        "job_required_skills": ["React", "TypeScript", "TailwindCSS", "CSS", "JavaScript"]
    },
    {
        "job_id": "mock_in_03",
        "job_title": "Machine Learning Engineer",
        "employer_name": "Wipro Analytics",
        "job_description": "We are seeking a Machine Learning Engineer with deep knowledge of NLP and RAG pipelines to join our AI center of excellence in Hyderabad. You will fine-tune open-weights models and develop FAISS indexing setups.",
        "job_highlights": {"Qualifications": ["MS in Computer Science or related fields", "Experience with PyTorch, FAISS, and LangChain", "Strong SQL and data engineering skills"]},
        "job_min_salary": 2000000,
        "job_max_salary": 3200000,
        "job_salary_currency": "INR",
        "job_city": "Hyderabad",
        "job_state": "Telangana",
        "job_country": "IN",
        "job_required_skills": ["Python", "PyTorch", "LangChain", "FAISS", "Machine Learning"]
    },
    {
        "job_id": "mock_in_04",
        "job_title": "DevOps Engineer (Kubernetes & Cloud)",
        "employer_name": "HCL Tech Solutions",
        "job_description": "Manage containerized cloud deployments and CI/CD automation pipelines for enterprise clients in Pune. You will run Helm charts, debug network overlays, and deploy multi-AZ database clusters.",
        "job_highlights": {"Qualifications": ["3+ years DevOps experience", "Strong experience with Docker and Kubernetes", "Expertise in Terraform and AWS / GCP"]},
        "job_min_salary": 1400000,
        "job_max_salary": 2200000,
        "job_salary_currency": "INR",
        "job_city": "Pune",
        "job_state": "Maharashtra",
        "job_country": "IN",
        "job_required_skills": ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD"]
    }
]


async def fetch_jsearch_jobs(query: str, api_key: str, api_host: str) -> List[Dict[str, Any]]:
    """Calls JSearch RapidAPI to search for live jobs."""
    url = f"https://{api_host}/search"
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": api_host,
        "Content-Type": "application/json"
    }
    
    # Force searching for India jobs
    search_query = f"{query} in India" if "india" not in query.lower() else query
    
    params = {
        "query": search_query,
        "page": "1",
        "num_pages": "1"
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers, params=params)
        if response.status_code != 200:
            logger.error(f"JSearch API returned error status {response.status_code}: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"JSearch API returned: {response.text}")
        
        data = response.json()
        return data.get("data", [])


class JobService:
    """Performs semantic bi-encoder matches of resume skills against jobs using FAISS."""

    _faiss_store: Optional[FAISSStore] = None
    _job_id_mapping: List[str] = []
    _lock = asyncio.Lock()

    @classmethod
    async def ensure_index(cls, db: AsyncSession):
        """Ensures the FAISS index is initialized."""
        async with cls._lock:
            if cls._faiss_store is None:
                await cls._reindex_jobs_internal(db)

    @classmethod
    async def reindex_jobs(cls, db: AsyncSession):
        """Public endpoint to force reindex."""
        async with cls._lock:
            await cls._reindex_jobs_internal(db)

    @classmethod
    async def _reindex_jobs_internal(cls, db: AsyncSession):
        """Internal helper to rebuild the FAISS index from scratch."""
        # 1. Fetch all job listings
        stmt = select(JobListing)
        res = await db.execute(stmt)
        jobs = list(res.scalars().all())

        # 2. Seed default job listings if completely empty
        if not jobs:
            default_jobs = [
                {
                    "title": "Senior Python Backend Engineer",
                    "company": "TechCorp Solutions",
                    "description": "We are seeking a Senior Python Developer with extensive FastAPI, PostgreSQL, and AWS experience. You will build and scale high-performance async APIs, optimize complex database queries, and design robust microservices architectures.",
                    "requirements": "5+ years of experience with Python, expertise in FastAPI/asyncio, strong SQL knowledge, experience with Docker and Kubernetes.",
                    "salary_range": "₹12,00,000 - ₹16,00,000 LPA",
                    "location": "Bengaluru, Karnataka (Hybrid)",
                    "skills": ["Python", "FastAPI", "PostgreSQL", "AWS", "Docker", "Kubernetes", "SQL"],
                    "experience_level": "Senior"
                },
                {
                    "title": "React Frontend Developer",
                    "company": "CreativeWeb Studio",
                    "description": "Looking for a passionate React Developer to build responsive user interfaces, craft premium dynamic animations, and work closely with product designers to deliver wow-factor web experiences.",
                    "requirements": "3+ years React development, experience with TailwindCSS, TypeScript, web animation libraries, responsive UI design.",
                    "salary_range": "₹9,00,000 - ₹12,00,000 LPA",
                    "location": "Hyderabad, Telangana",
                    "skills": ["React", "TypeScript", "TailwindCSS", "HTML5", "CSS3", "JavaScript"],
                    "experience_level": "Mid"
                },
                {
                    "title": "Machine Learning Engineer",
                    "company": "DeepAI Innovations",
                    "description": "Join our R&D team building generative AI solutions and RAG pipelines. You will fine-tune LLMs, design vector database embedding pipelines, and integrate semantic retrieval models.",
                    "requirements": "MS/PhD in CS, strong background in NLP/Deep Learning, PyTorch, experience with ChromaDB/FAISS, Hugging Face pipelines.",
                    "salary_range": "₹14,00,000 - ₹19,00,000 LPA",
                    "location": "Remote (India)",
                    "skills": ["Python", "PyTorch", "LLMs", "RAG", "FAISS", "ChromaDB", "NLP", "Machine Learning"],
                    "experience_level": "Senior"
                },
                {
                    "title": "DevOps & Cloud Engineer",
                    "company": "CloudNative Systems",
                    "description": "Maintain and scale cloud infrastructure, build robust CI/CD pipelines, monitor systems performance, and manage AWS/GCP clusters.",
                    "requirements": "AWS certification, experience with Terraform, Ansible, CI/CD tools, Linux administration.",
                    "salary_range": "₹11,00,000 - ₹15,00,000 LPA",
                    "location": "Pune, Maharashtra",
                    "skills": ["AWS", "Terraform", "CI/CD", "Docker", "Linux", "DevOps"],
                    "experience_level": "Senior"
                }
            ]
            for dj in default_jobs:
                job = JobListing(
                    title=dj["title"],
                    company=dj["company"],
                    description=dj["description"],
                    requirements=dj["requirements"],
                    salary_range=dj["salary_range"],
                    location=dj["location"],
                    skills=dj["skills"],
                    experience_level=dj["experience_level"]
                )
                db.add(job)
            await db.commit()

            # Query again after seeding
            res = await db.execute(stmt)
            jobs = list(res.scalars().all())

        # 3. Build text documents and encode
        texts = []
        for j in jobs:
            text = f"{j.title} at {j.company}. Description: {j.description}. Requirements: {j.requirements or ''}. Skills: {', '.join(j.skills or [])}"
            texts.append(text)

        embeddings = SentenceEmbedder.encode_batch(texts)
        faiss_store = FAISSStore()
        faiss_store.build_index(embeddings)

        cls._faiss_store = faiss_store
        cls._job_id_mapping = [j.id for j in jobs]
        logger.info(f"JobService: Rebuilt FAISS job index with {len(jobs)} jobs successfully.")

    @staticmethod
    def _compute_match_details(resume: Resume, job: JobListing) -> dict:
        """Computes overlap skills, missing skills, and overlap percentages."""
        resume_skills = []
        if resume and resume.skill_summary:
            skills_data = resume.skill_summary.get("skills", [])
            if isinstance(skills_data, list):
                resume_skills.extend([s.get("name", s) if isinstance(s, dict) else s for s in skills_data])
            else:
                for k, v in resume.skill_summary.items():
                    if isinstance(v, list):
                        resume_skills.extend([s.get("name", s) if isinstance(s, dict) else s for s in v])
        
        # Also extract skills from parsed entities of type 'SKILL'
        if resume and hasattr(resume, "entities") and resume.entities:
            for entity in resume.entities:
                if entity.entity_type == "SKILL":
                    resume_skills.append(entity.value)

        # Standardize matching
        resume_skills_lower = {s.lower() for s in resume_skills if isinstance(s, str)}
        job_skills = job.skills or []
        job_skills_lower = {s.lower() for s in job_skills if isinstance(s, str)}

        overlap_lower = resume_skills_lower.intersection(job_skills_lower)
        skills_overlap = [s for s in job_skills if s.lower() in overlap_lower]
        missing_skills = [s for s in job_skills if s.lower() not in overlap_lower]

        overlap_pct = (len(skills_overlap) / len(job_skills)) * 100.0 if job_skills else 100.0
        return {
            "skills_overlap": skills_overlap,
            "missing_skills": missing_skills,
            "overlap_pct": overlap_pct
        }

    @staticmethod
    async def get_recommendations(db: AsyncSession, resume_id: str, limit: int = 10) -> List[JobRecommendationResponse]:
        """Calculates Top-N matched jobs using bi-encoder FAISS semantic search."""
        # 1. Fetch Resume
        stmt = select(Resume).options(selectinload(Resume.entities)).where(Resume.id == resume_id, Resume.deleted_at.is_(None))
        res = await db.execute(stmt)
        resume = res.scalar_one_or_none()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        # 2. Build index if not initialized
        await JobService.ensure_index(db)

        # 3. Create query vector from resume text or skills
        query_text = resume.parsed_text or ""
        if not query_text and resume.skill_summary:
            skills_list = []
            skills_data = resume.skill_summary.get("skills", [])
            if isinstance(skills_data, list):
                skills_list.extend([s.get("name", s) if isinstance(s, dict) else s for s in skills_data])
            query_text = "Skills: " + ", ".join(skills_list)
            
        if not query_text:
            query_text = "Software Developer Engineer Resume"

        query_vector = SentenceEmbedder.encode_text(query_text)

        # 4. Search index
        hits = JobService._faiss_store.search(query_vector, top_k=limit)

        results = []
        for idx, similarity in hits:
            if idx < 0 or idx >= len(JobService._job_id_mapping):
                continue
            job_id = JobService._job_id_mapping[idx]

            # Fetch job listing
            job_stmt = select(JobListing).where(JobListing.id == job_id)
            job_res = await db.execute(job_stmt)
            job = job_res.scalar_one_or_none()
            if not job:
                continue

            details = JobService._compute_match_details(resume, job)

            # Cosine similarity similarity scales to [0, 1] range, map to 0-100%
            sim_score = max(0.0, min(1.0, similarity)) * 100.0
            ats_prediction = int(round(0.4 * sim_score + 0.6 * details["overlap_pct"]))
            ats_prediction = max(0, min(100, ats_prediction))
            match_score = round(float(ats_prediction), 1)

            # Insert or update JobMatch Cache Record
            match_stmt = select(JobMatch).where(JobMatch.resume_id == resume_id, JobMatch.job_id == job_id)
            m_res = await db.execute(match_stmt)
            job_match = m_res.scalars().first()

            if job_match:
                job_match.match_score = match_score
                job_match.skills_overlap = details["skills_overlap"]
                job_match.missing_skills = details["missing_skills"]
                job_match.ats_prediction = ats_prediction
            else:
                job_match = JobMatch(
                    resume_id=resume_id,
                    job_id=job_id,
                    match_score=match_score,
                    skills_overlap=details["skills_overlap"],
                    missing_skills=details["missing_skills"],
                    ats_prediction=ats_prediction
                )
                db.add(job_match)

            results.append(JobRecommendationResponse(
                job=JobListingOut.model_validate(job),
                match_score=match_score,
                skills_overlap=details["skills_overlap"],
                missing_skills=details["missing_skills"],
                ats_prediction=float(ats_prediction)
            ))

        await db.commit()
        return results

    @staticmethod
    async def get_match_score(db: AsyncSession, resume_id: str, job_id: str) -> JobMatchDetails:
        """Returns detailed gap match analysis and updates cached values."""
        stmt = select(Resume).options(selectinload(Resume.entities)).where(Resume.id == resume_id, Resume.deleted_at.is_(None))
        res = await db.execute(stmt)
        resume = res.scalar_one_or_none()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        job_stmt = select(JobListing).where(JobListing.id == job_id)
        job_res = await db.execute(job_stmt)
        job = job_res.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=404, detail="Job listing not found")

        # Compute semantic match details
        details = JobService._compute_match_details(resume, job)

        # Generate cosine similarity using embeddings
        res_text = resume.parsed_text or ""
        job_text = f"{job.title}. Description: {job.description}. Requirements: {job.requirements or ''}"
        
        res_emb = SentenceEmbedder.encode_text(res_text)
        job_emb = SentenceEmbedder.encode_text(job_text)
        
        # Simple inner product since fallback normalizes vector
        import numpy as np
        similarity = float(np.dot(res_emb, job_emb))
        sim_score = max(0.0, min(1.0, similarity)) * 100.0

        ats_prediction = int(round(0.4 * sim_score + 0.6 * details["overlap_pct"]))
        ats_prediction = max(0, min(100, ats_prediction))
        match_score = round(float(ats_prediction), 1)

        # Upsert cached JobMatch
        match_stmt = select(JobMatch).where(JobMatch.resume_id == resume_id, JobMatch.job_id == job_id)
        m_res = await db.execute(match_stmt)
        job_match = m_res.scalars().first()

        if job_match:
            job_match.match_score = match_score
            job_match.skills_overlap = details["skills_overlap"]
            job_match.missing_skills = details["missing_skills"]
            job_match.ats_prediction = ats_prediction
        else:
            job_match = JobMatch(
                resume_id=resume_id,
                job_id=job_id,
                match_score=match_score,
                skills_overlap=details["skills_overlap"],
                missing_skills=details["missing_skills"],
                ats_prediction=ats_prediction
            )
            db.add(job_match)
        await db.commit()

        return JobMatchDetails(
            match_score=match_score,
            skills_overlap=details["skills_overlap"],
            missing_skills=details["missing_skills"],
            ats_prediction=float(ats_prediction)
        )

    @staticmethod
    async def search_jobs(
        db: AsyncSession,
        query: Optional[str] = None,
        location: Optional[str] = None,
        experience_level: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Filters job list using SQL and performs semantic hybrid matching on search query."""
        await JobService.ensure_index(db)

        # Build database filters
        stmt = select(JobListing)
        if location:
            stmt = stmt.where(JobListing.location.ilike(f"%{location}%"))
        if experience_level:
            stmt = stmt.where(JobListing.experience_level.ilike(f"%{experience_level}%"))

        res = await db.execute(stmt)
        filtered_jobs = list(res.scalars().all())
        filtered_ids = {job.id for job in filtered_jobs}

        if query and query.strip():
            query_vector = SentenceEmbedder.encode_text(query)
            hits = JobService._faiss_store.search(query_vector, top_k=len(JobService._job_id_mapping))

            results = []
            for idx, similarity in hits:
                if idx < 0 or idx >= len(JobService._job_id_mapping):
                    continue
                job_id = JobService._job_id_mapping[idx]
                if job_id not in filtered_ids:
                    continue

                job = next((j for j in filtered_jobs if j.id == job_id), None)
                if not job:
                    continue

                # Add lexical keyword boost for precision matching on keywords
                query_words = set(query.lower().split())
                title_words = set(job.title.lower().split())
                skills_lower = {s.lower() for s in (job.skills or [])}

                keyword_boost = 0.0
                if query_words.intersection(title_words):
                    keyword_boost += 50.0
                if query_words.intersection(skills_lower):
                    keyword_boost += 50.0

                sim_score = max(0.0, min(1.0, similarity)) * 100.0 + keyword_boost
                results.append({
                    "job": job,
                    "match_score": round(sim_score, 1)
                })

            results.sort(key=lambda x: x["match_score"], reverse=True)
            return results[skip:skip + limit]
        else:
            paginated = filtered_jobs[skip:skip + limit]
            return [{"job": job, "match_score": 100.0} for job in paginated]

    @staticmethod
    async def get_job(db: AsyncSession, job_id: str) -> Optional[JobListing]:
        """Returns single job details by UUID."""
        stmt = select(JobListing).where(JobListing.id == job_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def save_job(db: AsyncSession, user_id: str, job_id: str) -> dict:
        """Saves a job listing to the user's wishlist."""
        job_stmt = select(JobListing).where(JobListing.id == job_id)
        res = await db.execute(job_stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Job listing not found")

        check_stmt = select(SavedJob).where(SavedJob.user_id == user_id, SavedJob.job_id == job_id)
        c_res = await db.execute(check_stmt)
        if c_res.scalar_one_or_none():
            return {"status": "success", "message": "Job already saved"}

        saved = SavedJob(user_id=user_id, job_id=job_id)
        db.add(saved)
        await db.commit()
        return {"status": "success", "message": "Job saved to wishlist successfully"}

    @staticmethod
    async def unsave_job(db: AsyncSession, user_id: str, job_id: str) -> dict:
        """Removes a job listing from the user's wishlist."""
        stmt = delete(SavedJob).where(SavedJob.user_id == user_id, SavedJob.job_id == job_id)
        res = await db.execute(stmt)
        await db.commit()
        
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Saved job not found")
        return {"status": "success", "message": "Job removed from wishlist successfully"}

    @staticmethod
    async def get_saved_jobs(db: AsyncSession, user_id: str) -> List[SavedJobOut]:
        """Returns all wishlist items, including computed match scores."""
        stmt = select(SavedJob).options(selectinload(SavedJob.job)).where(SavedJob.user_id == user_id).order_by(SavedJob.created_at.desc())
        res = await db.execute(stmt)
        saved = list(res.scalars().all())

        # Retrieve user's primary/latest resume
        res_stmt = select(Resume).options(selectinload(Resume.entities)).where(Resume.user_id == user_id, Resume.deleted_at.is_(None)).order_by(Resume.is_primary.desc(), Resume.created_at.desc())
        res_res = await db.execute(res_stmt)
        resume = res_res.scalars().first()

        out = []
        for s in saved:
            score = None
            if resume:
                # Query index or compute overlap fallback
                match_stmt = select(JobMatch).where(JobMatch.resume_id == resume.id, JobMatch.job_id == s.job.id)
                m_res = await db.execute(match_stmt)
                job_match = m_res.scalars().first()
                if job_match:
                    score = job_match.match_score
                else:
                    details = JobService._compute_match_details(resume, s.job)
                    score = round(details["overlap_pct"], 1)

            out.append(SavedJobOut(
                id=s.id,
                job=JobListingOut.model_validate(s.job),
                match_score=score,
                created_at=s.created_at
            ))
        return out

    @staticmethod
    async def prepare_interview(db: AsyncSession, job_id: str) -> InterviewPrepPlanResponse:
        """Generates tailored study plans using Mistral chat model or robust default template."""
        stmt = select(JobListing).where(JobListing.id == job_id)
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=404, detail="Job listing not found")

        plan = None
        if settings.MISTRAL_API_KEY:
            try:
                from app.ai.mistral_client import MistralAIClient
                prompt = (
                    f"Create a 30-day interview preparation plan for the role of '{job.title}' at '{job.company}'.\n"
                    f"Job Description: {job.description}\n"
                    f"Requirements: {job.requirements or ''}\n"
                    f"Skills: {', '.join(job.skills or [])}\n"
                    f"Format the plan beautifully in Markdown with sections for 'Week 1: Core Fundamentals', "
                    f"'Week 2: Advanced Concepts & System Design', 'Week 3: Mock Interview Practice', 'Week 4: Final Prep & Review'."
                )
                messages = [
                    {"role": "system", "content": "You are an expert technical interviewer and career coach."},
                    {"role": "user", "content": prompt}
                ]
                res_completion = await MistralAIClient.chat_completion(messages=messages, temperature=0.5)
                plan = res_completion["choices"][0]["message"]["content"]
            except Exception as e:
                logger.error(f"Failed to generate interview prep plan: {e}")

        if not plan:
            plan = (
                f"# 30-Day Interview Prep Plan for {job.title} at {job.company}\n\n"
                f"### Week 1: Core Fundamentals & System Requirements\n"
                f"- **Focus**: Master core languages and databases requested in the description.\n"
                f"- **Topics**: Review foundational concepts of {', '.join(job.skills[:3]) if job.skills else 'software development'}.\n"
                f"- **Practice**: Solve 5 foundational coding challenges on these topics.\n\n"
                f"### Week 2: Advanced Design and Framework Architecture\n"
                f"- **Focus**: Understand structural layout, system integrations, and design patterns.\n"
                f"- **Topics**: Dive deep into framework configuration, API security, performance monitoring, and containerization ({', '.join(job.skills[3:6]) if len(job.skills) > 3 else 'Docker/REST'}).\n"
                f"- **Practice**: Build a mock integration service modeling the company's domain.\n\n"
                f"### Week 3: Behavioural Questions & Technical Mock Scenarios\n"
                f"- **Focus**: Structure responses using the STAR method for company values.\n"
                f"- **Topics**: Prepare scenario stories explaining conflict resolution, high-load scaling challenges, and technical leadership.\n"
                f"- **Practice**: Conduct 2 mock interview sessions on our portal.\n\n"
                f"### Week 4: Speed Drills, System Review & Mock Assessment\n"
                f"- **Focus**: Enhance problem-solving efficiency and final review.\n"
                f"- **Topics**: Complete real-time speed assessments, trace microservice pipelines, and rehearse explanations.\n"
                f"- **Practice**: Final comprehensive exam simulation."
            )

        return InterviewPrepPlanResponse(job_id=job_id, plan=plan)

    @staticmethod
    async def get_market_insights(role: str) -> MarketInsightsResponse:
        """Retrieves salary averages and demand metrics for roles."""
        salary_ranges = None
        demand_trend = None
        top_skills = None

        if settings.MISTRAL_API_KEY:
            try:
                from app.ai.mistral_client import MistralAIClient
                prompt = (
                    f"Analyze current job market insights for the role of '{role}'.\n"
                    f"Provide: 'salary_ranges' (e.g. '$100k - $140k'), 'demand_trend' (e.g. 'High', 'Steady', 'Growing'), "
                    f"and 'top_skills' (list of exactly 5 top skills).\n"
                    f"Return JSON: {{\"salary_ranges\": \"...\", \"demand_trend\": \"...\", \"top_skills\": [\"...\"]}}"
                )
                res_structured = await MistralAIClient.generate_structured(prompt)
                salary_ranges = res_structured.get("salary_ranges")
                demand_trend = res_structured.get("demand_trend")
                top_skills = res_structured.get("top_skills")
            except Exception as e:
                logger.error(f"Failed to fetch AI market insights: {e}")

        if not salary_ranges or not demand_trend or not top_skills:
            role_lower = role.lower()
            if "senior" in role_lower or "lead" in role_lower:
                salary_ranges = "₹18,0,00,000 - ₹28,00,000 LPA"
                # Wait, "₹18,0,00,000" has a typo in it or wait, let's make it exactly "₹18,00,000 - ₹28,00,000 LPA"
                salary_ranges = "₹18,00,000 - ₹28,00,000 LPA"
                demand_trend = "High Demand"
                top_skills = ["System Design", "Technical Leadership", "Python", "Cloud Architecture", "Kubernetes"]
            elif "frontend" in role_lower or "react" in role_lower:
                salary_ranges = "₹9,50,000 - ₹13,00,000 LPA"
                demand_trend = "Growing"
                top_skills = ["React", "TypeScript", "TailwindCSS", "Next.js", "State Management"]
            elif "machine learning" in role_lower or "ai" in role_lower or "data scientist" in role_lower:
                salary_ranges = "₹14,00,000 - ₹20,00,000 LPA"
                demand_trend = "Explosive Growth"
                top_skills = ["PyTorch", "LLMs", "RAG", "Data Pipelines", "Transformers"]
            else:
                salary_ranges = "₹9,00,000 - ₹14,00,000 LPA"
                demand_trend = "Steady"
                top_skills = ["Python", "FastAPI", "SQL", "Git", "Docker"]

        return MarketInsightsResponse(
            role=role,
            salary_ranges=salary_ranges,
            demand_trend=demand_trend,
            top_skills=top_skills
        )

    @staticmethod
    async def get_skill_gap(db: AsyncSession, resume_id: str) -> SkillGapAnalysisResponse:
        """Aggregates missing skills against the Top 10 recommendations."""
        stmt = select(Resume).where(Resume.id == resume_id)
        res = await db.execute(stmt)
        resume = res.scalar_one_or_none()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

        recs = await JobService.get_recommendations(db, resume_id, limit=10)

        # Aggregate missing skills frequencies
        frequency = {}
        for r in recs:
            for skill in r.missing_skills:
                std_skill = skill.strip()
                match = next((k for k in frequency if k.lower() == std_skill.lower()), None)
                if match:
                    frequency[match] += 1
                else:
                    frequency[std_skill] = 1

        critical_missing = sorted(frequency.keys(), key=lambda x: frequency[x], reverse=True)[:5]

        if critical_missing:
            recommendations = (
                f"Based on your profile matching against top local jobs, the most critical skill gaps identified are: "
                f"{', '.join(critical_missing)}. We recommend reviewing our tailored learning materials and starting mock interview sessions for "
                f"topics relating to {critical_missing[0]}."
            )
        else:
            recommendations = "Excellent matching! No major skill gaps identified against matching jobs."

        return SkillGapAnalysisResponse(
            resume_id=resume_id,
            critical_missing_skills=critical_missing,
            skill_frequency=frequency,
            recommendations=recommendations
        )

    @staticmethod
    async def batch_ingest(db: AsyncSession, jobs_in: List[JobListingCreate]) -> int:
        """Ingests a collection of jobs and re-embeds the index."""
        count = 0
        for j in jobs_in:
            job = JobListing(
                title=j.title,
                company=j.company,
                description=j.description,
                requirements=j.requirements,
                salary_range=j.salary_range,
                location=j.location,
                skills=j.skills,
                experience_level=j.experience_level
            )
            db.add(job)
            count += 1
        await db.commit()

        # Trigger reindexing
        await JobService.reindex_jobs(db)
        return count

    @classmethod
    async def search_live_jobs(cls, db: AsyncSession, user_id: str, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Searches live jobs from India using JSearch API (or fallback), ingests new ones, and computes match scores."""
        api_key = settings.RAPIDAPI_KEY
        api_host = settings.RAPIDAPI_HOST
        
        raw_jobs = []
        is_mock = False
        
        # If API key is not configured or is placeholder, fall back to mock India jobs
        if not api_key or api_key.startswith("<your-") or api_key.strip() == "":
            logger.warning("RAPIDAPI_KEY is not configured. Falling back to mock live India jobs.")
            is_mock = True
            raw_jobs = MOCK_INDIA_JOBS
            if query and query.strip():
                q_words = query.lower().split()
                filtered = []
                for mj in raw_jobs:
                    match_found = False
                    for qw in q_words:
                        if (qw in mj["job_title"].lower() or 
                            qw in mj["job_description"].lower() or 
                            any(qw in s.lower() for s in mj["job_required_skills"])):
                            match_found = True
                            break
                    if match_found:
                        filtered.append(mj)
                raw_jobs = filtered
        else:
            try:
                raw_jobs = await fetch_jsearch_jobs(query or "Software Developer", api_key, api_host)
            except Exception as e:
                logger.error(f"Failed to fetch live jobs from JSearch: {e}. Falling back to mock jobs.")
                is_mock = True
                raw_jobs = MOCK_INDIA_JOBS
                if query and query.strip():
                    q_words = query.lower().split()
                    filtered = []
                    for mj in raw_jobs:
                        match_found = False
                        for qw in q_words:
                            if (qw in mj["job_title"].lower() or 
                                qw in mj["job_description"].lower() or 
                                any(qw in s.lower() for s in mj["job_required_skills"])):
                                match_found = True
                                break
                        if match_found:
                            filtered.append(mj)
                    raw_jobs = filtered

        # Fetch user's primary resume to compute match scores
        res_stmt = select(Resume).options(selectinload(Resume.entities)).where(Resume.user_id == user_id, Resume.deleted_at.is_(None)).order_by(Resume.is_primary.desc(), Resume.created_at.desc())
        res_res = await db.execute(res_stmt)
        resume = res_res.scalars().first()

        results = []
        new_jobs_to_embed = []

        for r_job in raw_jobs:
            j_id = r_job.get("job_id")
            if not j_id:
                continue

            # Deterministic UUIDv5 to prevent duplicates
            job_uuid = str(uuid.uuid5(JSEARCH_NAMESPACE, j_id))

            # Check if job listing already exists
            stmt = select(JobListing).where(JobListing.id == job_uuid)
            job_res = await db.execute(stmt)
            job = job_res.scalar_one_or_none()

            if not job:
                # Map fields
                title = r_job.get("job_title", "Unknown Role")
                company = r_job.get("employer_name", "Unknown Company")
                description = r_job.get("job_description", "")

                # Format requirements
                quals = r_job.get("job_highlights", {}).get("Qualifications", []) if isinstance(r_job.get("job_highlights"), dict) else []
                requirements = "\n".join(quals) if quals else description[:1000]

                # Format salary range
                min_sal = r_job.get("job_min_salary")
                max_sal = r_job.get("job_max_salary")
                currency = r_job.get("job_salary_currency", "INR")
                if min_sal and max_sal:
                    salary_range = f"{currency} {min_sal:,} - {max_sal:,} / year"
                elif min_sal or max_sal:
                    sal = min_sal or max_sal
                    salary_range = f"{currency} {sal:,} / year"
                else:
                    salary_range = "Salary Negotiable"

                # Format location
                city = r_job.get("job_city")
                state = r_job.get("job_state")
                country = r_job.get("job_country", "IN")
                loc_parts = [p for p in [city, state, country] if p]
                location = ", ".join(loc_parts) if loc_parts else "India"

                # Format skills
                skills = r_job.get("job_required_skills") or []
                if not isinstance(skills, list):
                    skills = []

                # Format experience level
                exp_years = r_job.get("job_experience_in_years_required")
                if exp_years is not None:
                    try:
                        exp_years = float(exp_years)
                        if exp_years < 2.0:
                            experience_level = "Entry"
                        elif exp_years <= 5.0:
                            experience_level = "Mid"
                        else:
                            experience_level = "Senior"
                    except ValueError:
                        experience_level = "Mid"
                else:
                    # Guess from title
                    t_lower = title.lower()
                    if "senior" in t_lower or "sr." in t_lower:
                        experience_level = "Senior"
                    elif "lead" in t_lower or "principal" in t_lower:
                        experience_level = "Lead"
                    elif "junior" in t_lower or "jr." in t_lower or "intern" in t_lower or "entry" in t_lower:
                        experience_level = "Entry"
                    else:
                        experience_level = "Mid"

                job = JobListing(
                    id=job_uuid,
                    title=title,
                    company=company,
                    description=description,
                    requirements=requirements,
                    salary_range=salary_range,
                    location=location,
                    skills=skills,
                    experience_level=experience_level,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(job)
                new_jobs_to_embed.append(job)

            # Compute match score
            if resume:
                details = cls._compute_match_details(resume, job)
                # Compute semantic matching
                res_text = resume.parsed_text or ""
                job_text = f"{job.title}. Description: {job.description}. Requirements: {job.requirements or ''}"

                res_emb = SentenceEmbedder.encode_text(res_text)
                job_emb = SentenceEmbedder.encode_text(job_text)

                import numpy as np
                similarity = float(np.dot(res_emb, job_emb))
                sim_score = max(0.0, min(1.0, similarity)) * 100.0

                ats_prediction = int(round(0.4 * sim_score + 0.6 * details["overlap_pct"]))
                ats_prediction = max(0, min(100, ats_prediction))
                match_score = round(float(ats_prediction), 1)

                # Cache match score
                match_stmt = select(JobMatch).where(JobMatch.resume_id == resume.id, JobMatch.job_id == job.id)
                m_res = await db.execute(match_stmt)
                job_match = m_res.scalars().first()
                if job_match:
                    job_match.match_score = match_score
                    job_match.skills_overlap = details["skills_overlap"]
                    job_match.missing_skills = details["missing_skills"]
                    job_match.ats_prediction = ats_prediction
                else:
                    job_match = JobMatch(
                        resume_id=resume.id,
                        job_id=job.id,
                        match_score=match_score,
                        skills_overlap=details["skills_overlap"],
                        missing_skills=details["missing_skills"],
                        ats_prediction=ats_prediction
                    )
                    db.add(job_match)
            else:
                match_score = 100.0

            results.append({
                "job": JobListingOut.model_validate(job),
                "match_score": match_score
            })

        try:
            await db.commit()
        except Exception as e:
            logger.warning(f"Database commit failed during live job ingestion: {e}. Attempting recovery by re-fetching.")
            await db.rollback()
            
            # Re-fetch the jobs from the database (since they might have been inserted by a concurrent request)
            results = []
            for r_job in raw_jobs:
                j_id = r_job.get("job_id")
                if not j_id:
                    continue
                job_uuid = str(uuid.uuid5(JSEARCH_NAMESPACE, j_id))
                
                stmt = select(JobListing).where(JobListing.id == job_uuid)
                job_res = await db.execute(stmt)
                job = job_res.scalar_one_or_none()
                if not job:
                    continue
                
                if resume:
                    details = cls._compute_match_details(resume, job)
                    res_text = resume.parsed_text or ""
                    job_text = f"{job.title}. Description: {job.description}. Requirements: {job.requirements or ''}"
                    
                    res_emb = SentenceEmbedder.encode_text(res_text)
                    job_emb = SentenceEmbedder.encode_text(job_text)
                    
                    import numpy as np
                    similarity = float(np.dot(res_emb, job_emb))
                    sim_score = max(0.0, min(1.0, similarity)) * 100.0
                    
                    ats_prediction = int(round(0.4 * sim_score + 0.6 * details["overlap_pct"]))
                    ats_prediction = max(0, min(100, ats_prediction))
                    match_score = round(float(ats_prediction), 1)
                else:
                    match_score = 100.0
                
                results.append({
                    "job": JobListingOut.model_validate(job),
                    "match_score": match_score
                })
            
            # Sort results by match score descending and return
            results.sort(key=lambda x: x["match_score"], reverse=True)
            return results

        # Rebuild FAISS index if new jobs were added, so that they show up in semantic matching/recommendations too!
        if new_jobs_to_embed:
            await cls.reindex_jobs(db)

        # Sort results by match score descending
        results.sort(key=lambda x: x["match_score"], reverse=True)
        return results
