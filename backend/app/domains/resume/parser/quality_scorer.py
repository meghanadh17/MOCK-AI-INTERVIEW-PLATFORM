import re
import logging

logger = logging.getLogger(__name__)


class QualityScorer:
    """Evaluates text extraction quality, readability, and structural completeness."""
    
    @staticmethod
    def rate_quality(parsed_text: str) -> float:
        logger.info("Computing semantic quality score for parsing output...")
        
        text = parsed_text.strip()
        if not text or len(text) < 100:
            return 0.0
            
        score = 1.0
        
        # 1. Structure completeness (deduct 0.1 for each missing key section)
        key_sections = [
            r"experience|work|employment|history",
            r"education|academic|university|degree",
            r"skills|technologies|expertise",
            r"projects|accomplishments|portfolio",
        ]
        for section in key_sections:
            if not re.search(section, text, re.IGNORECASE):
                score -= 0.1
                
        # 2. Contact details presence (deduct 0.1 if email/phone is missing)
        email_pattern = r"[\w\.-]+@[\w\.-]+\.\w+"
        phone_pattern = r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
        
        if not re.search(email_pattern, text):
            score -= 0.1
        if not re.search(phone_pattern, text):
            score -= 0.1
            
        # 3. Readability & Character density
        # Excess spacing or high ratio of non-words indicate noisy OCR parsing
        word_count = len(text.split())
        char_count = len(text)
        
        avg_word_len = char_count / word_count if word_count > 0 else 0
        if avg_word_len < 3 or avg_word_len > 12:
            # Words too short or too long (sign of corrupt text/space stripping)
            score -= 0.15
            
        # 4. Alphanumeric ratio (garbage text detection)
        alnum_count = sum(1 for c in text if c.isalnum() or c.isspace())
        alnum_ratio = alnum_count / len(text)
        if alnum_ratio < 0.85:
            score -= 0.15
            
        # Keep score bounded between 0.0 and 1.0
        final_score = max(0.0, min(1.0, score))
        logger.info(f"Calculated extraction quality score: {final_score:.2f}")
        return final_score
