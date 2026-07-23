import logging
from typing import List

logger = logging.getLogger(__name__)


class AdaptiveEngine:
    """Calibrates mock interview questions difficulty based on Bayesian Knowledge Tracing."""
    
    # BKT standard parameters
    P_T = 0.1  # Probability of learning (transition)
    P_S = 0.1  # Probability of slip (knowing the skill but making a mistake)
    P_G = 0.2  # Probability of guessing (not knowing the skill but getting it correct)

    @classmethod
    def calibrate_next_difficulty(cls, history_scores: List[float], current_p_mastery: float = 0.5) -> float:
        """
        Calculates the updated mastery probability P(M) dynamically based on history scores.
        Each history score is expected to be a float from 0.0 to 10.0 (overall_score).
        """
        p_mastery = current_p_mastery
        for score in history_scores:
            # Determine if candidate's response indicates mastery (outcome >= 7.0)
            outcome = 1.0 if score >= 7.0 else 0.0
            
            # Bayes update
            if outcome == 1.0:
                p_obs = p_mastery * (1.0 - cls.P_S) + (1.0 - p_mastery) * cls.P_G
                p_posterior = (p_mastery * (1.0 - cls.P_S)) / (p_obs if p_obs > 0 else 1.0)
            else:
                p_obs = p_mastery * cls.P_S + (1.0 - p_mastery) * (1.0 - cls.P_G)
                p_posterior = (p_mastery * cls.P_S) / (p_obs if p_obs > 0 else 1.0)
                
            # Learning transition
            p_mastery = p_posterior + (1.0 - p_posterior) * cls.P_T
            
        # Ensure value fits within [0.1, 0.95] boundary
        return max(0.1, min(p_mastery, 0.95))

    @classmethod
    def get_difficulty_label(cls, difficulty_val: float) -> str:
        if difficulty_val < 0.4:
            return "easy"
        elif difficulty_val < 0.75:
            return "intermediate"
        else:
            return "hard"
            
    @classmethod
    def calibrate_difficulty(cls, history: list) -> str:
        """Backward compatibility method mapping lists of questions to a difficulty label."""
        scores = []
        for q in history:
            grade = getattr(q, "grade", None)
            if grade is None and isinstance(q, dict):
                grade = q.get("grade")
            if grade is not None:
                # Scale to 0-10 if it's in 0-100 format
                if grade > 10.0:
                    grade = grade / 10.0
                scores.append(grade)
        val = cls.calibrate_next_difficulty(scores)
        return cls.get_difficulty_label(val)
