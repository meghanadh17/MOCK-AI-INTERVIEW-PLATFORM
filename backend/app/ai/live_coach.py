import json
import logging
from typing import Dict, Any, Optional
from app.config import settings
from app.ai.mistral_client import MistralAIClient
from app.ai.prompt_templates import LIVE_COACH_SYSTEM

logger = logging.getLogger(__name__)


class LiveCoach:
    """Manages active real-time contextual coaching tips and alert feedback over WebSockets."""

    @classmethod
    async def get_realtime_hints(
        cls, 
        transcript_chunk: str,
        posture_score: Optional[float] = None,
        eye_contact_score: Optional[float] = None,
        wpm: Optional[float] = None,
        filler_words_count: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for generating real-time interview coaching alerts.
        Combines speech transcript content and CV metrics to invoke Mistral AI
        or fallback to rule-based contextual tips.
        """
        # Clean inputs
        p_score = float(posture_score) if posture_score is not None else 1.0
        g_score = float(eye_contact_score) if eye_contact_score is not None else 1.0
        speed_wpm = float(wpm) if wpm is not None else 130.0
        fillers = int(filler_words_count) if filler_words_count is not None else 0

        # Construct candidate metrics payload
        metrics = {
            "transcript_chunk": transcript_chunk,
            "posture_score": p_score,
            "eye_contact_score": g_score,
            "words_per_minute": speed_wpm,
            "filler_words_count": fillers
        }

        if settings.MISTRAL_API_KEY:
            try:
                return await cls._get_llm_hints(metrics)
            except Exception as e:
                logger.error(f"LiveCoach LLM generation failed: {e}. Falling back to rule-based engine.")

        # Fallback to local rule-based parsing
        return cls._get_rule_based_hints(metrics)

    @classmethod
    async def _get_llm_hints(cls, metrics: Dict[str, Any]) -> Dict[str, Any]:
        user_content = (
            f"Candidate Metrics:\n"
            f"  - Speech transcript segment: '{metrics['transcript_chunk']}'\n"
            f"  - Posture Score (0.0-1.0): {metrics['posture_score']:.2f}\n"
            f"  - Gaze Eye Contact Score (0.0-1.0): {metrics['eye_contact_score']:.2f}\n"
            f"  - Speaking Pace (WPM): {metrics['words_per_minute']:.1f}\n"
            f"  - Filler words counted: {metrics['filler_words_count']}\n"
        )
        
        messages = [
            {"role": "system", "content": LIVE_COACH_SYSTEM},
            {"role": "user", "content": user_content}
        ]

        response = await MistralAIClient.chat_completion(
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1
        )

        content = response["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        
        # Enforce schemas keys
        return {
            "alert_triggered": bool(parsed.get("alert_triggered", False)),
            "coaching_tip": parsed.get("coaching_tip") or "Maintain this focus!",
            "focus_area": parsed.get("focus_area") or "none"
        }

    @classmethod
    def _get_rule_based_hints(cls, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Deterministic fallback engine when Mistral AI connection is unavailable."""
        p_score = metrics["posture_score"]
        g_score = metrics["eye_contact_score"]
        wpm = metrics["words_per_minute"]
        fillers = metrics["filler_words_count"]

        # Run sequential rule checks
        if p_score < 0.78:
            return {
                "alert_triggered": True,
                "coaching_tip": "Posture slouched — sit up straight and align shoulders.",
                "focus_area": "posture"
            }
        if g_score < 0.75:
            return {
                "alert_triggered": True,
                "coaching_tip": "Gaze drifting — look directly at the camera to connect.",
                "focus_area": "gaze"
            }
        if wpm > 155.0:
            return {
                "alert_triggered": True,
                "coaching_tip": "Speaking quickly — slow down slightly and enunciate.",
                "focus_area": "speech_pace"
            }
        if wpm < 110.0:
            return {
                "alert_triggered": True,
                "coaching_tip": "Speaking slowly — speak with more speed and energy.",
                "focus_area": "speech_pace"
            }
        if fillers > 1:
            return {
                "alert_triggered": True,
                "coaching_tip": "Pause briefly instead of using filler words.",
                "focus_area": "filler_words"
            }

        return {
            "alert_triggered": False,
            "coaching_tip": "Excellent posture, solid pace, and direct eye contact.",
            "focus_area": "none"
        }

