import json
import logging
import re
from typing import Dict, Any
from app.config import settings
from app.ai.mistral_client import MistralAIClient
from app.ai.prompt_templates import RESUME_ANALYSIS_SYSTEM

logger = logging.getLogger(__name__)


class ResumeATSAnalyzer:
    """Runs enterprise-grade ATS analysis on resume text using RESUME_ANALYSIS_SYSTEM prompt."""
    
    @classmethod
    async def analyze_resume(cls, text: str) -> Dict[str, Any]:
        logger.info("Performing ATS analysis on resume text...")
        
        if settings.MISTRAL_API_KEY:
            try:
                return await cls._analyze_with_llm(text)
            except Exception as e:
                logger.error("LLM ATS analysis failed. Falling back to mock analysis.", exc_info=True)
        
        # Fallback to local mock analyzer conforming to output schema
        return cls._get_mock_analysis(text)

    @classmethod
    async def _analyze_with_llm(cls, text: str) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": RESUME_ANALYSIS_SYSTEM},
            {"role": "user", "content": f"Resume Text:\n{text[:6000]}"}
        ]
        
        response = await MistralAIClient.chat_completion(
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2
        )
        
        content = response["choices"][0]["message"]["content"]
        return json.loads(content)

    @classmethod
    def _get_mock_analysis(cls, text: str) -> Dict[str, Any]:
        # Simple analysis based on text search
        words = text.lower().split()
        word_count = len(words)
        
        # Detect sections
        sections = []
        for sec in ["experience", "skills", "education", "projects", "certifications"]:
            if sec in text.lower():
                sections.append(sec)
                
        # Detect some skills
        common_skills = ["python", "fastapi", "flask", "django", "sql", "docker", "aws", "react"]
        skills_detected = []
        for s in common_skills:
            if s in text.lower():
                skills_detected.append({
                    "name": s.capitalize(),
                    "level": "expert" if "senior" in text.lower() or "lead" in text.lower() else "intermediate",
                    "evidence": f"Found '{s}' in resume text."
                })
                
        # Basic quantification score check (how many numbers)
        bullets_with_numbers = len(re.findall(r'[-•]\s+.*\d+.*', text))
        total_bullets = max(len(re.findall(r'[-•]\s+', text)), 1)
        quant_score = min(int((bullets_with_numbers / total_bullets) * 100), 100)
        if quant_score == 0 and any(char.isdigit() for char in text):
            # Fallback if bullets aren't hyphen/dot styled
            quant_score = 45
            
        ats_score = int(min(50 + (word_count / 10.0) + (len(skills_detected) * 5), 98.0))
        
        return {
            "ats_score": ats_score,
            "seniority_level": "senior" if "senior" in text.lower() or "lead" in text.lower() else "mid",
            "years_of_experience": 5 if word_count > 100 else 2,
            "sections_detected": sections,
            "skills": skills_detected,
            "strengths": [
                f"Detected key technical sections: {', '.join(sections)}",
                f"Contains strong skill set with {len(skills_detected)} matched technologies."
            ],
            "gaps": [
                "Consider adding more quantified achievements and metrics to bullet points."
            ],
            "missing_keywords": ["Kubernetes", "CI/CD", "TypeScript"] if "kubernetes" not in text.lower() else [],
            "quantification_score": quant_score,
            "action_verb_score": 70 if "designed" in text.lower() or "built" in text.lower() else 40,
            "section_scores": {sec: 80 for sec in sections},
            "improvement_suggestions": [
                {
                    "section": "experience",
                    "current": "Generic listing of responsibilities",
                    "suggested": "Start bullet points with action verbs and end with clear business impact metrics.",
                    "impact": "high"
                }
            ],
            "suitable_roles": ["Software Engineer", "Backend Developer"],
            "red_flags": []
        }
