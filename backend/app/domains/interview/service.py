import logging
import textwrap
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Union
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from sqlalchemy.orm import selectinload

from app.database.repositories.interview_repository import InterviewRepository, InterviewQuestionRepository
from app.domains.interview.models import Interview, InterviewQuestion, QuestionBank, QuestionBankRating
from app.domains.interview.schemas import (
    InterviewCreate, InterviewSessionCreate, InterviewQuestionAnswer, QuestionBankCreate
)
from app.domains.interview.evaluator import InterviewEvaluationService
from app.domains.interview.question_generator import QuestionGenerator, AdaptiveQuestionGenerator
from app.domains.interview.adaptive_engine import AdaptiveEngine
from app.ai.mistral_client import MistralService
from app.config import settings

logger = logging.getLogger(__name__)


class InterviewService:
    """Manages interview sessions lifecycle, BKT grading, hints/skips, and reporting."""
    
    @staticmethod
    async def create_session(
        db: AsyncSession, 
        user_id: str, 
        session_in: Union[InterviewCreate, InterviewSessionCreate]
    ) -> Interview:
        interview_repo = InterviewRepository(db)
        question_repo = InterviewQuestionRepository(db)
        
        # 1. Parse inputs with default values
        title = getattr(session_in, "title", None)
        role = getattr(session_in, "role", "Software Engineer")
        if not title:
            title = f"{role} Mock Interview"
            
        difficulty = getattr(session_in, "difficulty", 0.5)
        num_questions = getattr(session_in, "num_questions", 10)
        
        # Support both 'type' and 'interview_type'
        interview_type = getattr(session_in, "type", None)
        if not interview_type:
            interview_type = getattr(session_in, "interview_type", "technical")
            
        resume_id = getattr(session_in, "resume_id", None)
        job_description = getattr(session_in, "job_description", None)
        
        # 2. Query Resume details if linked
        skills = ["Python", "FastAPI", "databases"]
        if resume_id:
            try:
                from app.domains.resume.service import ResumeService
                resume = await ResumeService.get_resume(db, resume_id)
                if resume and resume.user_id == user_id:
                    skills_data = resume.skill_summary.get("skills", [])
                    if skills_data:
                        skills = [s.get("name", s) if isinstance(s, dict) else s for s in skills_data]
            except Exception as e:
                logger.error(f"Failed to query resume skills: {e}")
                
        # 3. Create Session Record
        interview = Interview(
            user_id=user_id,
            resume_id=resume_id,
            title=title,
            interview_type=interview_type,
            difficulty=difficulty,
            status="created",
            total_questions=num_questions,
            job_description=job_description
        )
        await interview_repo.create(interview)
        
        # 4. Generate initial questions dynamically using LLM
        initial_count = min(3, num_questions)
        from app.ai.rag.retriever import HybridRetriever
        retriever = HybridRetriever()
        q_generator = AdaptiveQuestionGenerator(retriever, llm=MistralService)
        
        generated_questions = []
        asked_topics = set()
        
        for idx in range(initial_count):
            focus_skill = skills[idx % len(skills)] if skills else None
            session_context = {
                "role": role,
                "history": [q["question"] for q in generated_questions],
                "asked_topics": asked_topics,
                "focus_skill": focus_skill
            }
            if job_description:
                session_context["job_description"] = job_description
                
            try:
                # Attempt dynamic generation using LLM
                generated = await q_generator.generate(
                    user_id=user_id,
                    session=session_context,
                    q_type=interview_type,
                    difficulty=difficulty,
                    db=db
                )
                q_text = generated.get("question")
                expected = generated.get("expected_keywords", [])
                ideal = generated.get("ideal_answer_outline", "")
                
                if isinstance(ideal, (dict, list)):
                    import json
                    ideal = json.dumps(ideal, indent=2)
                elif ideal is not None:
                    ideal = str(ideal)
                
                if not q_text:
                    raise ValueError("Empty question text returned from LLM")
            except Exception as e:
                logger.error(f"Failed to generate initial question {idx} using LLM: {e}. Falling back.")
                # Rules-based fallback according to role and skills
                skill_term = skills[idx % len(skills)] if skills else "software engineering"
                if idx == 0:
                    q_text = f"How do you design a database schema to support scaling to millions of active daily users using {skill_term}?"
                    expected = ["database", "scale", "performance"]
                    ideal = f"1. Database schema design.\n2. Sharding/indexing for {skill_term}.\n3. Scalability optimization."
                elif idx == 1:
                    q_text = f"Explain the key architectural considerations when integrating real-time analysis tools into a backend supporting {skill_term}."
                    expected = ["API", "security", "architecture"]
                    ideal = "1. API integration design.\n2. Security considerations.\n3. Latency optimization."
                else:
                    q_text = f"Describe a highly challenging technical project you worked on using {skill_term}, and how you overcame key obstacles."
                    expected = ["project", "obstacles", "solutions"]
                    ideal = "1. Project context.\n2. Key obstacles.\n3. Technical outcomes."
                    
            q_obj = InterviewQuestion(
                interview_id=interview.id,
                question_text=q_text,
                question_type=interview_type,
                difficulty=difficulty,
                order_index=idx,
                expected_keywords=expected,
                ideal_outline=ideal
            )
            await question_repo.create(q_obj)
            generated_questions.append({"question": q_text})
            asked_topics.add(interview_type)
            
        await db.commit()
        return await interview_repo.get_with_questions(interview.id, user_id)

    @staticmethod
    async def get_session(db: AsyncSession, interview_id: str, user_id: str) -> Optional[Interview]:
        repo = InterviewRepository(db)
        return await repo.get_with_questions(interview_id, user_id)

    @staticmethod
    async def get_user_sessions(
        db: AsyncSession, 
        user_id: str,
        skip: int = 0,
        limit: int = 10,
        role: Optional[str] = None,
        type_filter: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Interview]:
        stmt = select(Interview).options(selectinload(Interview.questions)).where(Interview.user_id == user_id, Interview.deleted_at.is_(None)).order_by(Interview.created_at.desc())
        
        if role:
            stmt = stmt.where(Interview.title.ilike(f"%{role}%"))
        if type_filter:
            stmt = stmt.where(Interview.interview_type == type_filter)
        if status:
            stmt = stmt.where(Interview.status == status)
            
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def delete_session(db: AsyncSession, interview_id: str, user_id: str) -> bool:
        repo = InterviewRepository(db)
        interview = await repo.get(interview_id)
        if not interview or interview.user_id != user_id:
            return False
            
        interview.deleted_at = datetime.now(timezone.utc)
        await db.commit()
        return True

    @staticmethod
    async def start_session(db: AsyncSession, interview_id: str, user_id: str) -> Optional[InterviewQuestion]:
        interview = await InterviewService.get_session(db, interview_id, user_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview session not found")
            
        interview.status = "active"
        interview.started_at = datetime.now(timezone.utc)
        await db.commit()
        
        # Return first question (order_index=0)
        sorted_qs = sorted(interview.questions, key=lambda x: x.order_index)
        if sorted_qs:
            sorted_qs[0].asked_at = datetime.now(timezone.utc)
            await db.commit()
            return sorted_qs[0]
        return None

    @staticmethod
    async def answer_question(
        db: AsyncSession, 
        interview_id: str, 
        question_id: str, 
        user_id: str,
        answer_in: InterviewQuestionAnswer
    ) -> Optional[InterviewQuestion]:
        interview_repo = InterviewRepository(db)
        question_repo = InterviewQuestionRepository(db)
        
        interview = await interview_repo.get_with_questions(interview_id, user_id)
        if not interview:
            return None
            
        question = await question_repo.get_question(question_id, interview_id)
        if not question:
            return None
            
        # 1. Update answer response fields
        question.user_transcript = answer_in.user_transcript
        question.audio_path = answer_in.audio_path
        question.video_path = answer_in.video_path
        question.answered_at = datetime.now(timezone.utc)
        
        # 2. Evaluate answer using 5-dimension CoT service
        evaluation = await InterviewEvaluationService.evaluate_answer(
            question_text=question.question_text,
            user_transcript=answer_in.user_transcript,
            job_description=interview.job_description,
            expected_keywords=question.expected_keywords
        )
        
        overall = evaluation.get("overall_score", 50.0) # Scaled to 0-100 in mappings
        question.grade = overall
        question.ai_score = overall / 10.0 # Standard scaled 1-10
        question.ai_feedback = evaluation.get("thinking", "Answer graded successfully.")
        
        # Populate structured dimension scores
        question.dimension_scores = evaluation.get("dimension_scores", {})
        question.evaluation_feedback = evaluation
        
        # Apply score penalty for hints used
        if question.hints_used > 0:
            penalty = question.hints_used * 1.5
            question.ai_score = max(1.0, question.ai_score - penalty)
            question.grade = max(10.0, question.grade - (penalty * 10.0))
            
        interview.answered_count += 1
        
        # 3. BKT Adaptive Calibration for next question
        all_questions = await db.execute(
            select(InterviewQuestion).where(
                InterviewQuestion.interview_id == interview_id,
                InterviewQuestion.ai_score.isnot(None)
            )
        )
        scores = [float(q.ai_score) for q in all_questions.scalars().all()]
        new_mastery = AdaptiveEngine.calibrate_next_difficulty(scores, interview.difficulty)
        interview.difficulty = new_mastery
        
        # 4. Generate and append the next question if limit not reached
        total_q_count = await db.execute(
            select(func.count()).select_from(InterviewQuestion).where(InterviewQuestion.interview_id == interview_id)
        )
        current_count = total_q_count.scalar() or 0
        
        if current_count < interview.total_questions:
            # Create next question
            next_label = AdaptiveEngine.get_difficulty_label(new_mastery)
            
            # Generate next question dynamically (mock RAG logic fallback)
            from app.ai.rag.retriever import HybridRetriever
            retriever = HybridRetriever()
            
            q_generator = AdaptiveQuestionGenerator(retriever, llm=MistralService)
            
            # Query Resume details if linked to get focus skill
            skills = ["Python", "FastAPI", "databases"]
            if interview.resume_id:
                try:
                    from app.domains.resume.service import ResumeService
                    resume = await ResumeService.get_resume(db, interview.resume_id)
                    if resume:
                        skills_data = resume.skill_summary.get("skills", [])
                        if skills_data:
                            skills = [s.get("name", s) if isinstance(s, dict) else s for s in skills_data]
                except Exception as e:
                    logger.error(f"Failed to query resume skills: {e}")
            
            focus_skill = skills[current_count % len(skills)] if skills else None

            # Form dummy conversation history session representation
            session_context = {
                "role": interview.title,
                "history": [q.question_text for q in interview.questions],
                "asked_topics": {q.question_type for q in interview.questions},
                "focus_skill": focus_skill
            }
            
            try:
                # Attempt structured adaptive LLM question generation
                generated = await q_generator.generate(
                    user_id=user_id,
                    session=session_context,
                    q_type=interview.interview_type,
                    difficulty=new_mastery,
                    db=db
                )
                q_text = generated.get("question", "Explain your experience in scaling database schemas.")
                expected = generated.get("expected_keywords", ["scaling"])
                ideal = generated.get("ideal_answer_outline", "")
                
                if isinstance(ideal, (dict, list)):
                    import json
                    ideal = json.dumps(ideal, indent=2)
                elif ideal is not None:
                    ideal = str(ideal)
            except Exception:
                # Fallback rule-based question
                q_text = f"Describe how you handle concurrency and resource pooling at {next_label} difficulty."
                expected = ["concurrency", "pooling"]
                ideal = "1. Concurrency controls.\n2. Pool configuration.\n3. Latency optimization."
                
            next_q = InterviewQuestion(
                interview_id=interview.id,
                question_text=q_text,
                question_type=interview.interview_type,
                difficulty=new_mastery,
                expected_keywords=expected,
                ideal_outline=ideal,
                order_index=current_count
            )
            await question_repo.create(next_q)
            
        await db.commit()
        return question

    @staticmethod
    async def get_next_question(db: AsyncSession, interview_id: str, user_id: str) -> Optional[InterviewQuestion]:
        interview = await InterviewService.get_session(db, interview_id, user_id)
        if not interview:
            return None
            
        # Query the database directly to bypass SQLAlchemy relationship caching issues
        stmt = (
            select(InterviewQuestion)
            .where(
                InterviewQuestion.interview_id == interview_id,
                InterviewQuestion.answer_text.is_(None),
                InterviewQuestion.is_skipped == False
            )
            .order_by(InterviewQuestion.order_index.asc())
        )
        result = await db.execute(stmt)
        next_q = result.scalars().first()
        
        if next_q:
            next_q.asked_at = datetime.now(timezone.utc)
            await db.commit()
            return next_q
        return None

    @staticmethod
    async def request_hint(db: AsyncSession, interview_id: str, question_id: str, user_id: str) -> Dict[str, Any]:
        question_repo = InterviewQuestionRepository(db)
        question = await question_repo.get_question(question_id, interview_id)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
            
        if question.hints_used >= 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 2 hints allowed per question.")
            
        # Retrieve or generate hint
        hint_text = f"Think about: {', '.join(question.expected_keywords) if question.expected_keywords else 'normalizing database fields'}."
        question.hints_used += 1
        await db.commit()
        
        return {
            "hint": hint_text,
            "hint_text": hint_text,
            "message": hint_text,
            "hints_used": question.hints_used,
            "max_hints": 2
        }

    @staticmethod
    async def skip_question(db: AsyncSession, interview_id: str, question_id: str, user_id: str) -> Optional[InterviewQuestion]:
        interview_repo = InterviewRepository(db)
        question_repo = InterviewQuestionRepository(db)
        
        interview = await interview_repo.get_with_questions(interview_id, user_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview session not found")
            
        if interview.skipped_count >= 3:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 3 skips allowed per session.")
            
        question = await question_repo.get_question(question_id, interview_id)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
            
        question.is_skipped = True
        interview.skipped_count += 1
        
        # Check if we should generate the next question to maintain the total questions count
        total_q_count = await db.execute(
            select(func.count()).select_from(InterviewQuestion).where(InterviewQuestion.interview_id == interview_id)
        )
        current_count = total_q_count.scalar() or 0
        
        if current_count < interview.total_questions:
            # Calibrate difficulty from existing scores (exclude skipped)
            all_questions = await db.execute(
                select(InterviewQuestion).where(
                    InterviewQuestion.interview_id == interview_id,
                    InterviewQuestion.ai_score != None
                )
            )
            scores = [float(q.ai_score) for q in all_questions.scalars().all()]
            new_mastery = AdaptiveEngine.calibrate_next_difficulty(scores, interview.difficulty)
            next_label = AdaptiveEngine.get_difficulty_label(new_mastery)
            
            from app.ai.rag.retriever import HybridRetriever
            retriever = HybridRetriever()
            q_generator = AdaptiveQuestionGenerator(retriever, llm=MistralService)
            
            # Query Resume details if linked to get focus skill
            skills = ["Python", "FastAPI", "databases"]
            if interview.resume_id:
                try:
                    from app.domains.resume.service import ResumeService
                    resume = await ResumeService.get_resume(db, interview.resume_id)
                    if resume:
                        skills_data = resume.skill_summary.get("skills", [])
                        if skills_data:
                            skills = [s.get("name", s) if isinstance(s, dict) else s for s in skills_data]
                except Exception as e:
                    logger.error(f"Failed to query resume skills: {e}")
            
            focus_skill = skills[current_count % len(skills)] if skills else None

            session_context = {
                "role": interview.title,
                "history": [q.question_text for q in interview.questions],
                "asked_topics": {q.question_type for q in interview.questions},
                "focus_skill": focus_skill
            }
            if interview.job_description:
                session_context["job_description"] = interview.job_description
                
            try:
                generated = await q_generator.generate(
                    user_id=user_id,
                    session=session_context,
                    q_type=interview.interview_type,
                    difficulty=new_mastery,
                    db=db
                )
                q_text = generated.get("question", f"Explain software patterns at {next_label} level.")
                expected = generated.get("expected_keywords", ["design"])
                ideal = generated.get("ideal_answer_outline", "")
                
                if isinstance(ideal, (dict, list)):
                    import json
                    ideal = json.dumps(ideal, indent=2)
                elif ideal is not None:
                    ideal = str(ideal)
            except Exception:
                q_text = f"Describe how you handle concurrency and resource pooling at {next_label} difficulty."
                expected = ["concurrency", "pooling"]
                ideal = "1. Concurrency controls.\n2. Pool configuration.\n3. Latency optimization."
                
            next_q = InterviewQuestion(
                interview_id=interview.id,
                question_text=q_text,
                question_type=interview.interview_type,
                difficulty=new_mastery,
                expected_keywords=expected,
                ideal_outline=ideal,
                order_index=current_count
            )
            await question_repo.create(next_q)
            
        await db.commit()
        return await InterviewService.get_next_question(db, interview_id, user_id)

    @staticmethod
    async def finalize_session(db: AsyncSession, interview_id: str, user_id: str) -> Optional[Interview]:
        repo = InterviewRepository(db)
        interview = await repo.get_with_questions(interview_id, user_id)
        if not interview:
            return None
            
        interview.status = "completed"
        interview.ended_at = datetime.now(timezone.utc)
        interview.completed_at = datetime.now(timezone.utc)
        await db.commit()
        
        # Calculate scores synchronously so report is instantly available
        await InterviewService.generate_session_report(db, interview.id)
        
        # Trigger Celery report compiling (optional background task)
        try:
            from app.tasks.report_tasks import generate_report_task
            generate_report_task.delay(interview.id)
            logger.info(f"Triggered async Celery task to compile report for session: {interview.id}")
        except Exception as celery_err:
            logger.warning(f"Failed to queue report compiling task: {celery_err}")
            
        return interview

    @staticmethod
    async def generate_session_report(db: AsyncSession, session_id: str) -> None:
        """Calculates final scores, reviews technical/communication dimensions, and saves report values."""
        stmt = select(Interview).options(selectinload(Interview.questions)).where(Interview.id == session_id)
        res = await db.execute(stmt)
        interview = res.scalars().first()
        if not interview:
            return
            
        answered_questions = [q for q in interview.questions if q.ai_score is not None]
        if not answered_questions:
            interview.total_score = 5.0
            await db.commit()
            return
            
        # Calculate dimension aggregates
        tech_scores = []
        comm_scores = []
        depth_scores = []
        relevance_scores = []
        
        confidence_scores = []
        for q in answered_questions:
            # Struct metrics
            dims = q.dimension_scores or {}
            tech_scores.append(dims.get("technical_accuracy", q.ai_score))
            comm_scores.append(dims.get("communication", q.ai_score))
            depth_scores.append(dims.get("depth", q.ai_score))
            relevance_scores.append(dims.get("relevance", q.ai_score))
            confidence_scores.append(dims.get("confidence", q.ai_score))
            
        avg_tech = sum(tech_scores) / len(tech_scores)
        avg_comm = sum(comm_scores) / len(comm_scores)
        avg_depth = sum(depth_scores) / len(depth_scores)
        avg_relevance = sum(relevance_scores) / len(relevance_scores)
        avg_confidence = sum(confidence_scores) / len(confidence_scores)
        
        # Compute final overall score (1-10)
        overall = sum(q.ai_score for q in answered_questions) / len(answered_questions)
        
        interview.total_score = round(overall * 10.0, 1) # Scale 0-100 for compatibility
        interview.technical_score = round(avg_tech * 10.0, 1)
        interview.communication_score = round(avg_comm * 10.0, 1)
        interview.confidence_score = round(avg_depth * 10.0, 1)
        interview.structure_score = round(avg_confidence * 10.0, 1)
        interview.relevance_score = round(avg_relevance * 10.0, 1)
        
        if interview.started_at and interview.ended_at:
            started = interview.started_at.replace(tzinfo=None) if interview.started_at.tzinfo else interview.started_at
            ended = interview.ended_at.replace(tzinfo=None) if interview.ended_at.tzinfo else interview.ended_at
            interview.duration_seconds = int((ended - started).total_seconds())
            
        await db.commit()
        logger.info(f"Session {session_id} report compiled successfully.")

    @staticmethod
    async def get_session_feedback(db: AsyncSession, interview_id: str, user_id: str) -> List[Dict[str, Any]]:
        interview = await InterviewService.get_session(db, interview_id, user_id)
        if not interview:
            return []
            
        feedback_list = []
        for q in interview.questions:
            feedback_list.append({
                "question_id": q.id,
                "question_text": q.question_text,
                "grade": q.grade,
                "ai_feedback": q.ai_feedback,
                "ideal_outline": q.ideal_outline,
                "expected_keywords": q.expected_keywords
            })
        return feedback_list

    @staticmethod
    async def get_raw_pdf_bytes(db: AsyncSession, interview_id: str, user_id: str) -> bytes:
        interview = await InterviewService.get_session(db, interview_id, user_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview session not found")

        # Fetch candidate name
        from app.domains.auth.models import User
        user_stmt = select(User).where(User.id == user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalars().first()
        cand_name = user.full_name if (user and user.full_name) else (user.email if user else "Candidate")

        # Helper class for professional multi-page layout
        class PDFBuilder:
            def __init__(self, title: str, subtitle: str, doc_title: str):
                self.doc_title = doc_title
                self.title = title
                self.subtitle = subtitle
                self.pages = []
                self.current_page_commands = []
                self.y_cursor = 780
                self.margin_left = 50
                self.margin_right = 545
                self.page_height = 842
                self.page_width = 595
                
            def start_page(self):
                self.current_page_commands = []
                self.y_cursor = 780
                self.draw_header()
                
            def draw_header(self):
                escaped_title = self.doc_title.replace('(', '\\(').replace(')', '\\)')
                self.current_page_commands.append(f"BT /F2 8 Tf 0.5 0.5 0.5 rg {self.margin_left} 810 Td ({escaped_title}) Tj ET".encode('utf-8'))
                self.current_page_commands.append(f"0.5 w 0.8 0.8 0.8 RG {self.margin_left} 802 m {self.margin_right} 802 l S".encode('utf-8'))
                self.y_cursor = 780
                
            def draw_footer(self, page_num: int):
                self.current_page_commands.append(f"0.5 w 0.8 0.8 0.8 RG {self.margin_left} 45 m {self.margin_right} 45 l S".encode('utf-8'))
                self.current_page_commands.append(f"BT /F1 8 Tf 0.5 0.5 0.5 rg {self.margin_left} 30 Td (MockAI Platform - Assessment Report) Tj ET".encode('utf-8'))
                self.current_page_commands.append(f"BT /F1 8 Tf 0.5 0.5 0.5 rg {self.margin_right - 40} 30 Td (Page {page_num}) Tj ET".encode('utf-8'))

            def add_text_paragraph(self, text: str, font_name: str = 'F1', size: float = 10, line_height: float = 14, color: str = "0.2 0.2 0.2 rg", space_after: float = 10):
                if not text:
                    return
                paragraphs = text.split('\n')
                char_width = 85 if size == 10 else (72 if size == 12 else 95)
                wrapped_lines = []
                for para in paragraphs:
                    if not para.strip():
                        wrapped_lines.append("")
                    else:
                        wrapped_lines.extend(textwrap.wrap(para, width=char_width))
                        
                for line in wrapped_lines:
                    if self.y_cursor - line_height < 60:
                        self.pages.append(self.current_page_commands)
                        self.start_page()
                        
                    escaped = line.replace('(', '\\(').replace(')', '\\)')
                    cmd = f"BT /{font_name} {size} Tf {color} {self.margin_left} {self.y_cursor} Td ({escaped}) Tj ET"
                    self.current_page_commands.append(cmd.encode('utf-8'))
                    self.y_cursor -= line_height
                    
                self.y_cursor -= space_after
                
            def add_separator(self, space_before: float = 10, space_after: float = 10):
                if self.y_cursor - 20 < 60:
                    self.pages.append(self.current_page_commands)
                    self.start_page()
                self.y_cursor -= space_before
                self.current_page_commands.append(f"0.5 w 0.9 0.9 0.9 RG {self.margin_left} {self.y_cursor} m {self.margin_right} {self.y_cursor} l S".encode('utf-8'))
                self.y_cursor -= space_after

            def build(self) -> bytes:
                if self.current_page_commands:
                    self.pages.append(self.current_page_commands)
                    
                for idx, page_cmds in enumerate(self.pages):
                    self.current_page_commands = page_cmds
                    self.draw_footer(idx + 1)
                    
                objects = {}
                objects[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
                
                page_ids = []
                for i in range(len(self.pages)):
                    page_ids.append(3 + i * 2)
                    
                kids_str = " ".join([f"{pid} 0 R" for pid in page_ids])
                objects[2] = f"<< /Type /Pages /Kids [{kids_str}] /Count {len(self.pages)} >>".encode('utf-8')
                
                for idx, page_cmds in enumerate(self.pages):
                    content_bytes = b"\n".join(page_cmds)
                    page_obj_id = 3 + idx * 2
                    content_obj_id = 4 + idx * 2
                    
                    f1_id = 3 + len(self.pages) * 2
                    f2_id = 4 + len(self.pages) * 2
                    
                    objects[page_obj_id] = f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {f1_id} 0 R /F2 {f2_id} 0 R >> >> /Contents {content_obj_id} 0 R >>".encode('utf-8')
                    objects[content_obj_id] = f"<< /Length {len(content_bytes)} >>\nstream\n".encode("utf-8") + content_bytes + b"\nendstream"
                    
                f1_id = 3 + len(self.pages) * 2
                f2_id = 4 + len(self.pages) * 2
                
                objects[f1_id] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
                objects[f2_id] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
                
                body_parts = [b"%PDF-1.4\n"]
                current_offset = len(body_parts[0])
                offsets = {}
                
                for num in sorted(objects.keys()):
                    offsets[num] = current_offset
                    obj_data = f"{num} 0 obj\n".encode("utf-8") + objects[num] + b"\nendobj\n"
                    body_parts.append(obj_data)
                    current_offset += len(obj_data)
                    
                xref_offset = current_offset
                xref_lines = [f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("utf-8")]
                for num in sorted(objects.keys()):
                    xref_lines.append(f"{offsets[num]:010d} 00000 n \n".encode("utf-8"))
                    
                xref_bytes = b"".join(xref_lines)
                trailer = f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("utf-8")
                
                return b"".join(body_parts) + xref_bytes + trailer

        builder = PDFBuilder(
            title=f"Mock Interview: {interview.title}",
            subtitle="AI Interview Assessment",
            doc_title="MockAI AI Coach Performance Report"
        )
        builder.start_page()

        # Document Header
        builder.add_text_paragraph(
            "MockAI Mock Interview Assessment Report",
            font_name='F2', size=16, line_height=20, color="0.1 0.1 0.1 rg", space_after=15
        )
        builder.add_separator(space_before=5, space_after=15)

        # Metadata Card Grid
        builder.add_text_paragraph(f"Candidate: {cand_name}", font_name='F2', size=11, line_height=14, color="0.2 0.2 0.2 rg", space_after=3)
        builder.add_text_paragraph(f"Target Role: {interview.title}", font_name='F1', size=10, line_height=13, color="0.3 0.3 0.3 rg", space_after=3)
        builder.add_text_paragraph(f"Interview Type: {interview.interview_type.upper()}", font_name='F1', size=10, line_height=13, color="0.3 0.3 0.3 rg", space_after=3)
        
        session_date = interview.created_at.strftime("%B %d, %Y") if interview.created_at else "N/A"
        builder.add_text_paragraph(f"Session Date: {session_date}", font_name='F1', size=10, line_height=13, color="0.3 0.3 0.3 rg", space_after=10)
        builder.add_separator(space_before=5, space_after=15)

        # Overall Score
        overall_score = interview.total_score or 50.0
        builder.add_text_paragraph("OVERALL PERFORMANCE SUMMARY", font_name='F2', size=12, line_height=15, color="0.1 0.1 0.1 rg", space_after=8)
        builder.add_text_paragraph(f"Overall AI Score: {overall_score:.1f}/100", font_name='F2', size=11, line_height=14, color="0.1 0.4 0.1 rg" if overall_score >= 70 else "0.5 0.2 0.2 rg", space_after=8)

        # Scores Breakdown
        builder.add_text_paragraph("Performance Dimension Breakdown:", font_name='F2', size=10, line_height=13, color="0.2 0.2 0.2 rg", space_after=5)
        
        tech_score = interview.technical_score or 50.0
        comm_score = interview.communication_score or 50.0
        conf_score = interview.confidence_score or 50.0
        struct_score = interview.structure_score or 50.0
        rel_score = interview.relevance_score or 50.0
        
        builder.add_text_paragraph(f"  * Technical Accuracy: {tech_score:.1f}/100", font_name='F1', size=9, line_height=12, color="0.3 0.3 0.3 rg", space_after=3)
        builder.add_text_paragraph(f"  * Communication Depth: {comm_score:.1f}/100", font_name='F1', size=9, line_height=12, color="0.3 0.3 0.3 rg", space_after=3)
        builder.add_text_paragraph(f"  * Response Confidence: {conf_score:.1f}/100", font_name='F1', size=9, line_height=12, color="0.3 0.3 0.3 rg", space_after=3)
        builder.add_text_paragraph(f"  * Answer Structure: {struct_score:.1f}/100", font_name='F1', size=9, line_height=12, color="0.3 0.3 0.3 rg", space_after=3)
        builder.add_text_paragraph(f"  * Relevant Context: {rel_score:.1f}/100", font_name='F1', size=9, line_height=12, color="0.3 0.3 0.3 rg", space_after=15)

        # Dynamic Recommendations
        recs = []
        if tech_score < 70:
            recs.append("Structure technical answers with clearer architectural tradeoffs and design trade-offs.")
        if comm_score < 70:
            recs.append("Structure sentences to minimize fillers and emphasize clarity when explaining projects.")
        if struct_score < 70:
            recs.append("Use standard behavioral frameworks (STAR methodology: Situation, Task, Action, Result) for structured context.")
        if not recs:
            recs.append("Maintain the technical depth and clear articulation demonstrated in this mock session.")
            recs.append("Practice advanced scenarios under stricter response time limits to build rapid context mapping.")

        builder.add_text_paragraph("IMPROVEMENT RECOMMENDATIONS", font_name='F2', size=11, line_height=14, color="0.1 0.1 0.1 rg", space_after=8)
        for idx, rec in enumerate(recs):
            builder.add_text_paragraph(f"  {idx+1}. {rec}", font_name='F1', size=9.5, line_height=13, color="0.25 0.25 0.25 rg", space_after=4)
            
        builder.add_separator(space_before=10, space_after=20)

        # Timeline Q&As
        builder.add_text_paragraph("COMPREHENSIVE QUESTION & ANSWER TIMELINE", font_name='F2', size=12, line_height=16, color="0.1 0.1 0.1 rg", space_after=15)
        
        for idx, q in enumerate(interview.questions):
            builder.add_text_paragraph(f"Question {idx+1}: {q.question_text}", font_name='F2', size=10.5, line_height=14, color="0.15 0.15 0.15 rg", space_after=6)
            
            resp_txt = q.user_transcript or 'No response provided.'
            builder.add_text_paragraph(f"Candidate Response:", font_name='F2', size=9.5, line_height=13, color="0.3 0.3 0.3 rg", space_after=3)
            builder.add_text_paragraph(f"\"{resp_txt}\"", font_name='F1', size=9.5, line_height=13, color="0.4 0.4 0.4 rg", space_after=6)
            
            grade_val = q.grade or 0.0
            builder.add_text_paragraph(f"AI Evaluation (Score: {grade_val:.1f}/100):", font_name='F2', size=9.5, line_height=13, color="0.1 0.4 0.1 rg" if grade_val >= 70 else "0.5 0.2 0.2 rg", space_after=3)
            
            feedback_details = getattr(q, "evaluation_feedback", None) or {}
            what_went_well = feedback_details.get("what_was_good") or q.ai_feedback or "Graded successfully."
            gaps_misses = feedback_details.get("critical_gap") or "Review dimension scores for detailed gap analysis."
            
            builder.add_text_paragraph(f"  * What Worked: {what_went_well}", font_name='F1', size=9, line_height=12.5, color="0.25 0.25 0.25 rg", space_after=3)
            builder.add_text_paragraph(f"  * Gaps & Misses: {gaps_misses}", font_name='F1', size=9, line_height=12.5, color="0.25 0.25 0.25 rg", space_after=10)
            
            if idx < len(interview.questions) - 1:
                builder.add_separator(space_before=5, space_after=10)
                
        return builder.build()

    @staticmethod
    async def generate_qbank_questions(
        db: AsyncSession,
        role: str,
        difficulty: float,
        q_type: str,
        count: int
    ) -> List[QuestionBank]:
        # Fallback question list
        from app.domains.interview.service import InterviewService
        defaults = InterviewService.get_default_questions(role, q_type, count)
        
        created_list = []
        for d in defaults:
            # Verify if already in qbank
            stmt = select(QuestionBank).where(
                QuestionBank.question_text == d["question_text"],
                QuestionBank.role == role
            )
            res = await db.execute(stmt)
            existing = res.scalars().first()
            
            if not existing:
                qbank_obj = QuestionBank(
                    question_text=d["question_text"],
                    question_type=d["question_type"],
                    role=role,
                    difficulty=d["difficulty"],
                    expected_keywords=d["expected_keywords"],
                    ideal_outline=d["ideal_outline"]
                )
                db.add(qbank_obj)
                created_list.append(qbank_obj)
            else:
                created_list.append(existing)
                
        await db.commit()
        return created_list

    @staticmethod
    async def get_qbank(
        db: AsyncSession,
        role: Optional[str] = None,
        q_type: Optional[str] = None,
        difficulty: Optional[float] = None
    ) -> List[QuestionBank]:
        stmt = select(QuestionBank)
        if role:
            stmt = stmt.where(QuestionBank.role.ilike(f"%{role}%"))
        if q_type:
            stmt = stmt.where(QuestionBank.question_type == q_type)
        if difficulty is not None:
            stmt = stmt.where(QuestionBank.difficulty == difficulty)
            
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def rate_qbank_question(
        db: AsyncSession,
        question_id: str,
        user_id: str,
        rating: int
    ) -> bool:
        stmt_q = select(QuestionBank).where(QuestionBank.id == question_id)
        res_q = await db.execute(stmt_q)
        q_obj = res_q.scalars().first()
        if not q_obj:
            return False
            
        stmt_r = select(QuestionBankRating).where(
            QuestionBankRating.question_id == question_id,
            QuestionBankRating.user_id == user_id
        )
        res_r = await db.execute(stmt_r)
        existing_r = res_r.scalars().first()
        
        if existing_r:
            diff = rating - existing_r.rating
            existing_r.rating = rating
            q_obj.rating_sum += diff
        else:
            new_rating = QuestionBankRating(
                question_id=question_id,
                user_id=user_id,
                rating=rating
            )
            db.add(new_rating)
            q_obj.rating_count += 1
            q_obj.rating_sum += rating
            
        await db.commit()
        return True

    @staticmethod
    def get_default_questions(role: str, q_type: str, count: int = 3) -> List[dict]:
        """Taxonomy of high quality interview questions."""
        return [
            {
                "question_text": f"How do you design a database schema to support scaling to millions of active daily users using {role} principles?",
                "question_type": q_type,
                "difficulty": 0.5,
                "expected_keywords": ["scaling", "indexing", "sharding"],
                "ideal_outline": "1. Normalization & Indexing\n2. Caching layer (Redis)\n3. Read Replicas & Sharding"
            },
            {
                "question_text": f"Explain the key tradeoffs between REST APIs and gRPC in distributed service communication as a {role}.",
                "question_type": q_type,
                "difficulty": 0.7,
                "expected_keywords": ["protobuf", "http/2", "payload", "serialization"],
                "ideal_outline": "1. Transport protocols differences\n2. Serialization speed\n3. Client generation and streaming"
            },
            {
                "question_text": f"Describe a scenario where you had to debug a severe database deadlocking issue. How did you isolate and fix it?",
                "question_type": q_type,
                "difficulty": 0.6,
                "expected_keywords": ["deadlock", "locks", "transaction isolation"],
                "ideal_outline": "1. Identify lock query\n2. Query optimization\n3. Transaction sequencing"
            }
        ][:count]
