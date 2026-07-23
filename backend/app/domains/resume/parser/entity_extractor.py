import re
import json
import logging
from typing import Dict, Any, List
from app.config import settings
from app.ai.mistral_client import MistralAIClient

logger = logging.getLogger(__name__)


class EntityExtractor:
    """
    Extracts structured candidate details (name, email, phone, skills, education, experience)
    from parsed resume text using LLM JSON extraction with regex heuristic fallbacks.
    """
    
    @classmethod
    async def extract_entities(cls, text: str) -> Dict[str, Any]:
        logger.info("Extracting candidate entities from resume text...")
        
        # Check if Mistral API is configured for high-fidelity extraction
        if settings.MISTRAL_API_KEY:
            try:
                return await cls._extract_with_llm(text)
            except Exception as e:
                logger.error(f"LLM entity extraction failed: {str(e)}. Falling back to regex.")
        
        # Fallback to local parsing rules
        return cls._extract_with_regex(text)

    @classmethod
    async def _extract_with_llm(cls, text: str) -> Dict[str, Any]:
        logger.info("Calling Mistral AI for structured resume entity parsing...")
        
        prompt = (
            "Analyze the following resume text and extract the candidate profile information as a JSON object.\n"
            "The JSON must have the following keys:\n"
            "  - 'name': Candidate's full name (string)\n"
            "  - 'email': Candidate's email (string)\n"
            "  - 'phone': Candidate's phone number (string)\n"
            "  - 'skills': List of professional skills/technologies (array of strings)\n"
            "  - 'education': List of schools/degrees (array of strings)\n"
            "  - 'experience': List of companies/roles (array of strings)\n"
            "\n"
            "Return ONLY the raw JSON object, no conversational wrapper, no markdown block.\n\n"
            f"Resume Text:\n{text[:4000]}"  # Truncate to avoid context window overhead
        )
        
        messages = [
            {"role": "user", "content": prompt}
        ]
        
        response = await MistralAIClient.chat_completion(
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        content = response["choices"][0]["message"]["content"]
        extracted = json.loads(content)
        
        # Clean and validate keys
        return {
            "name": extracted.get("name") or "Unknown Candidate",
            "email": extracted.get("email") or "",
            "phone": extracted.get("phone") or "",
            "skills": extracted.get("skills") or [],
            "education": extracted.get("education") or [],
            "experience": extracted.get("experience") or []
        }

    @classmethod
    def _extract_with_regex(cls, text: str) -> Dict[str, Any]:
        """Local regex heuristic fallback for parsing without LLM api access."""
        logger.info("Running local regex heuristic extraction strategy...")
        
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        # 1. Candidate Name (usually first non-empty line)
        name = "Unknown Candidate"
        if lines:
            # Pick first line if it looks like a name (not a heading, short)
            first_line = lines[0]
            if len(first_line) < 50 and not any(h in first_line.lower() for h in ["cv", "resume", "curriculum"]):
                name = first_line

        # 2. Email Address
        email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
        email = email_match.group(0) if email_match else ""

        # 3. Phone Number
        phone_match = re.search(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text)
        phone = phone_match.group(0) if phone_match else ""

        # 4. Skills list heuristic
        common_skills = [
            "Python", "FastAPI", "Flask", "Django", "SQLAlchemy", "PostgreSQL",
            "MySQL", "SQLite", "Redis", "Docker", "Kubernetes", "AWS", "Git",
            "React", "Vue", "Angular", "HTML", "CSS", "Javascript", "TypeScript",
            "Java", "C++", "C#", "Rust", "Go", "TensorFlow", "PyTorch", "NLP"
        ]
        skills = []
        for skill in common_skills:
            if re.search(r"\b" + re.escape(skill) + r"\b", text, re.IGNORECASE):
                skills.append(skill)
                
        # 5. Simple education lines heuristic
        education = []
        for line in lines:
            if any(term in line.lower() for term in ["bachelor", "master", "degree", "bs in", "ms in", "university", "college"]):
                if len(line) < 120:
                    education.append(line)

        # 6. Simple experience lines heuristic
        experience = []
        for line in lines:
            if any(term in line.lower() for term in ["engineer", "developer", "manager", "specialist", "intern", "architect"]) and \
               any(term in line.lower() for term in ["at ", "for ", "software", "tech", "systems"]):
                if len(line) < 120:
                    experience.append(line)

        return {
            "name": name,
            "email": email,
            "phone": phone,
            "skills": skills,
            "education": education,
            "experience": experience
        }
