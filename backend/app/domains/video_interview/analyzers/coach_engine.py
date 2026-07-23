import logging
from typing import Dict, Any, List
from app.ai.mistral_client import MistralService

logger = logging.getLogger(__name__)


class CoachEngine:
    """Generates active contextual AI coaching tips using Mistral AI based on posture, gaze, and speech metrics."""
    
    @classmethod
    async def get_tip(cls, results: List[Any], session_id: str) -> str:
        """Evaluates a rolling window of results to detect posture, gaze, or emotion trends and return coaching alerts."""
        if not results:
            return "Maintain a calm and steady posture."
            
        # Trend detection on the recent rolling window of frame results (e.g. last 15 frames)
        recent = results[-15:]
        posture_scores = [r.posture.score for r in recent if r.posture is not None]
        gaze_scores = [r.gaze.eye_contact_score for r in recent if r.gaze is not None]
        emotion_scores = [r.emotion.confidence_score for r in recent if r.emotion is not None]
        
        avg_posture = sum(posture_scores) / len(posture_scores) if posture_scores else 1.0
        avg_gaze = sum(gaze_scores) / len(gaze_scores) if gaze_scores else 1.0
        avg_confidence = sum(emotion_scores) / len(emotion_scores) if emotion_scores else 1.0
        
        tips = []
        if avg_posture < 0.78:
            tips.append("Posture slouched — sit up straight and align shoulders")
        if avg_gaze < 0.75:
            tips.append("Gaze drifting — look directly at the camera to connect")
        if avg_confidence < 0.50:
            tips.append("Stress indicator — take a breath, smile slightly, and relax")
            
        if tips:
            return tips[0]
            
        # Return standard encouraging feedback
        return "Good composure, direct eye contact, and steady posture. Excellent pace!"

    @staticmethod
    def get_coaching_hint(metrics: dict) -> str:
        """Combines posture, gaze, and speech metrics to generate a contextual active tip. Frequency: Every 10s."""
        posture_score = metrics.get("posture", {}).get("posture_score", 1.0)
        eye_contact = metrics.get("gaze", {}).get("eye_contact_score", 1.0)
        wpm = metrics.get("speech", {}).get("words_per_minute", 130.0)
        filler_words = metrics.get("speech", {}).get("filler_words_count", 0)
        
        tips = []
        if posture_score < 0.78:
            tips.append("Posture slouched — sit up straight and align shoulders")
        if eye_contact < 0.75:
            tips.append("Gaze drifting — look directly at the camera to connect")
        if wpm > 155.0:
            tips.append("Speaking quickly — slow down slightly and enunciate")
        elif wpm < 110.0:
            tips.append("Speaking slowly — speak with more speed and energy")
        if filler_words > 1:
            tips.append("Pause briefly instead of using filler words")
            
        if tips:
            return tips[0]
            
        return "Excellent posture, solid pace, and direct eye contact. Maintain this focus!"
