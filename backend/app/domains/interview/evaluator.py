import httpx
import json
import logging
from typing import Dict, Any, Optional, List
from app.config import settings
from app.ai.prompt_templates import EVALUATE_ANSWER_SYSTEM

logger = logging.getLogger(__name__)


class InterviewEvaluationService:
    """
    Evaluates candidate mock interview answers using a 5-dimension rubric
    enforcing Chain-of-Thought (CoT) reasoning.
    """

    @classmethod
    async def evaluate_answer(
        cls, 
        question_text: str, 
        user_transcript: str, 
        job_description: Optional[str] = None,
        expected_keywords: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Runs the evaluation pipeline. Fallbacks to mock logic if MISTRAL_API_KEY is not configured.
        """
        if not settings.MISTRAL_API_KEY:
            logger.warning("MISTRAL_API_KEY not set. Using fallback mock evaluator.")
            return cls._get_mock_evaluation(question_text, user_transcript, expected_keywords)

        user_content = f"Question: {question_text}\n"
        if expected_keywords:
            user_content += f"Expected Keywords/Concepts: {', '.join(expected_keywords)}\n"
        user_content += f"Candidate Response: {user_transcript}"
        if job_description:
            user_content += f"\nTarget Job Description / Context: {job_description}"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.MISTRAL_MODEL,
                        "messages": [
                            {"role": "system", "content": EVALUATE_ANSWER_SYSTEM},
                            {"role": "user", "content": user_content},
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.2,
                    },
                    timeout=15.0,
                )
                
                if response.status_code == 200:
                    result_json = response.json()
                    content = result_json["choices"][0]["message"]["content"]
                    try:
                        parsed = json.loads(content)
                        return cls._map_to_backward_compatible(parsed, question_text, user_transcript, expected_keywords)
                    except Exception as parse_err:
                        logger.error(f"Failed to parse/repair Mistral JSON: {str(parse_err)}. Content was: {content}")
                        return cls._get_mock_evaluation(question_text, user_transcript, expected_keywords)
                else:
                    logger.error(f"Mistral API error (status {response.status_code}): {response.text}")
                    return cls._get_mock_evaluation(question_text, user_transcript, expected_keywords)
        except Exception as e:
            logger.error(f"Failed to call Mistral API: {str(e)}")
            return cls._get_mock_evaluation(question_text, user_transcript, expected_keywords)

    @classmethod
    def _map_to_backward_compatible(
        cls, 
        parsed: Dict[str, Any], 
        question_text: str, 
        user_transcript: str, 
        expected_keywords: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Maps the new enterprise JSON output format to the legacy schema for full backward compatibility."""
        dim_scores = parsed.get("dimension_scores", {})
        
        # Scale 1-10 scores to 0-100 scores
        tech_score = dim_scores.get("technical_accuracy", 5.0) * 10.0
        depth_score = dim_scores.get("depth", 5.0) * 10.0
        comm_score = dim_scores.get("communication", 5.0) * 10.0
        relevance_score = dim_scores.get("relevance", 5.0) * 10.0
        confidence_score = dim_scores.get("confidence", 5.0) * 10.0
        
        composite_score = parsed.get("composite_score", 5.0)
        
        what_was_good = parsed.get("what_was_good", "")
        critical_gap = parsed.get("critical_gap", "")
        model_answer_outline = parsed.get("model_answer_outline", "")
        follow_up_question = parsed.get("follow_up_question")
        
        # Format legacy recommendations list
        suggestions = [critical_gap] if critical_gap else []
        if parsed.get("keywords_missed"):
            suggestions.append(f"Try to incorporate terms like: {', '.join(parsed['keywords_missed'])}")
        else:
            suggestions.append("Structure technical answers using the STAR methodology.")

        return {
            # Legacy fields (required by tests and database logic)
            "thinking": f"CoT 5-Dimension Evaluation. Strengths: {what_was_good}. Gaps: {critical_gap}.",
            "overall_score": round(composite_score * 10.0, 1),
            "technical_accuracy": {
                "score": tech_score,
                "feedback": f"Technical detail strengths: {what_was_good}"
            },
            "depth": {
                "score": depth_score,
                "feedback": f"Critical gap: {critical_gap}"
            },
            "communication": {
                "score": comm_score,
                "feedback": f"Communication score: {comm_score}/100"
            },
            "structure": {
                "score": comm_score,  # Map structure score using communication
                "feedback": f"Suggested Outline: {model_answer_outline}"
            },
            "relevance": {
                "score": relevance_score,
                "feedback": f"Relevance score: {relevance_score}/100"
            },
            "suggestions": suggestions,
            
            # Enterprise fields
            "dimension_scores": {
                "technical_accuracy": dim_scores.get("technical_accuracy", 5),
                "depth": dim_scores.get("depth", 5),
                "communication": dim_scores.get("communication", 5),
                "relevance": dim_scores.get("relevance", 5),
                "confidence": dim_scores.get("confidence", 5)
            },
            "composite_score": composite_score,
            "what_was_good": what_was_good,
            "critical_gap": critical_gap,
            "model_answer_outline": model_answer_outline,
            "follow_up_question": follow_up_question,
            "keywords_hit": parsed.get("keywords_hit", []),
            "keywords_missed": parsed.get("keywords_missed", [])
        }

    @classmethod
    def _get_mock_evaluation(
        cls, 
        question: str, 
        response: str, 
        expected_keywords: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Deterministic mock generator to evaluate answers in tests or during offline local dev."""
        words = response.lower().split()
        word_count = len(words)
        
        has_scaling = "scale" in words or "scaling" in words or "sharding" in words
        has_indexing = "index" in words or "indexing" in words or "cache" in words
        has_normalize = "normalize" in words or "normalization" in words
        
        tech_score = 6.0
        if has_indexing or has_normalize:
            tech_score += 2.0
        if has_scaling:
            tech_score += 1.5
        tech_score = min(tech_score, 9.8)
        
        depth_score = min(5.0 + (word_count / 30.0), 9.5)
        comm_score = 8.0 if word_count > 10 else 5.0
        relevance_score = 8.5 if any(w in question.lower() for w in words) else 5.0
        confidence_score = 7.5 if word_count > 15 else 5.0
        
        # Calculate weighted composite: Technical=0.30, Depth=0.25, Communication=0.20, Relevance=0.15, Confidence=0.10
        composite_score = round(
            (tech_score * 0.30) + 
            (depth_score * 0.25) + 
            (comm_score * 0.20) + 
            (relevance_score * 0.15) + 
            (confidence_score * 0.10),
            1
        )
        
        keywords_hit = []
        keywords_missed = []
        if expected_keywords:
            for kw in expected_keywords:
                if kw.lower() in response.lower():
                    keywords_hit.append(kw)
                else:
                    keywords_missed.append(kw)
        else:
            # Fallback keywords
            for kw in ["scaling", "indexing", "caching"]:
                if kw in words:
                    keywords_hit.append(kw)
                else:
                    keywords_missed.append(kw)
                    
        what_was_good = "Candidate structured response and hit key concepts." if word_count > 15 else "Response was concise."
        critical_gap = "Could elaborate further with specific trade-offs and edge cases."
        model_answer_outline = "1. Define core components.\n2. Detail database design.\n3. Mention performance tuning."
        follow_up_question = "How would you handle failover and database clustering?" if composite_score < 8.5 else None
        
        return cls._map_to_backward_compatible({
            "dimension_scores": {
                "technical_accuracy": round(tech_score, 1),
                "depth": round(depth_score, 1),
                "communication": round(comm_score, 1),
                "relevance": round(relevance_score, 1),
                "confidence": round(confidence_score, 1)
            },
            "composite_score": composite_score,
            "what_was_good": what_was_good,
            "critical_gap": critical_gap,
            "model_answer_outline": model_answer_outline,
            "follow_up_question": follow_up_question,
            "keywords_hit": keywords_hit,
            "keywords_missed": keywords_missed
        }, question, response, expected_keywords)

