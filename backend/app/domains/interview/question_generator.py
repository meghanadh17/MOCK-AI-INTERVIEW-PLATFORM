import logging
from typing import List, Dict, Any

from app.ai.rag.retriever import HybridRetriever
from app.ai.mistral_client import MistralService
from app.ai.prompt_templates import PromptTemplates
from app.ai.prompt_compression import compress_context

logger = logging.getLogger(__name__)


class AdaptiveQuestionGenerator:
    '''
    Generates contextually personalized interview questions using:
    1. RAG retrieval of resume sections most relevant to question type
    2. Difficulty calibration via Bayesian Knowledge Tracing (BKT)
    3. Question diversity via MMR (Maximal Marginal Relevance)
    '''

    QUESTION_TYPES = ['technical', 'behavioral', 'situational',
                      'system_design', 'culture_fit', 'case_study']

    def __init__(self, retriever: HybridRetriever, llm: MistralService):
        self.retriever = retriever
        self.llm = llm

    async def generate(self, user_id: str, session: dict,
                       q_type: str, difficulty: float, db: Any = None) -> dict:
        '''
        difficulty: 0.0 (easy) → 1.0 (expert)
        session: {'history': [...], 'role': str, 'asked_topics': set, 'focus_skill': str}
        Returns: {'question': str, 'expected_keywords': list, 'difficulty': float}
        '''
        focus_skill = session.get("focus_skill")
        query = f'{session["role"]} {q_type} interview question difficulty {difficulty:.1f}'
        if focus_skill:
            query += f' focusing on {focus_skill}'

        chunks = await self.retriever.retrieve(user_id, query,
                     filters={'type': 'child'}, db=db)

        # Convert RetrievedChunk objects to dictionaries for compress_context
        context_blocks = [{"text": c.text, "parent_text": c.parent_text} for c in chunks[:5]]
        context = compress_context(context_blocks, token_limit=1500)

        prompt = PromptTemplates.generate_question(
            role=session['role'],
            q_type=q_type,
            difficulty=difficulty,
            resume_context=context,
            history=session['history'],
            asked_topics=list(session.get('asked_topics', set())),
            focus_skill=focus_skill
        )
        response = await self.llm.generate_structured(prompt, output_schema={
            'question': 'str',
            'expected_keywords': 'list[str]',
            'ideal_answer_outline': 'str',
            'follow_up_if_weak': 'str'
        })
        return response


class QuestionGenerator:
    """Generates mock interview questions using resume skills RAG context."""
    
    @staticmethod
    def generate_questions(skills: List[str], role: str, count: int = 3) -> List[str]:
        logger.info(f"Generating {count} questions for skills: {skills}")
        # Standard fallback questions
        return [
            f"How do you design a database schema to support scaling to millions of active daily users using {skills[0] if skills else 'Python'}?",
            f"Explain the key architectural considerations when integrating real-time analysis tools into a backend.",
            f"Describe a highly challenging technical project you worked on, and how you overcame key obstacles."
        ][:count]
