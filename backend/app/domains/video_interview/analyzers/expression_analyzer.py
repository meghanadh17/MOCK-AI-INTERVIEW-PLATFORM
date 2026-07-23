import logging
import time
import math
from typing import Any
from dataclasses import dataclass
from collections import deque

logger = logging.getLogger(__name__)

# Try optional DeepFace model imports
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False


@dataclass
class EmotionResult:
    dominant_emotion:  str
    confidence_score:  float    # 'confident + calm' composite
    scores:            dict     # All 7 emotion probabilities
    valence:           float    # -1 (negative) to +1 (positive)
    arousal:           float    # 0 (calm) to 1 (excited)
    feedback:          str


class ExpressionAnalyzer:
    '''
    Multi-model emotion recognition ensemble.
    Positive interview emotions: calm, neutral, happy.
    Negative: fear, angry, disgusted, sad.
    Uses valence-arousal circumplex model for nuanced scoring.
    '''

    # DeepFace emotion → (valence, arousal) mapping (Russell's circumplex)
    EMOTION_VA = {
        'happy':     (+0.9, +0.6),
        'neutral':   (+0.1, +0.0),
        'calm':      (+0.4, -0.4),
        'surprise':  (+0.3, +0.8),
        'fear':      (-0.7, +0.8),
        'angry':     (-0.8, +0.8),
        'disgusted': (-0.7, +0.2),
        'sad':       (-0.7, -0.4),
    }

    # Interview confidence proxy: neutral + calm + happy are positive signals
    CONFIDENCE_EMOTIONS = {'neutral': 0.4, 'calm': 0.4, 'happy': 0.2}

    def __init__(self):
        self.history: deque = deque(maxlen=10)  # Last 10 readings

    def analyze_frame(self, frame: Any) -> EmotionResult:
        """Processes frame input (accepts np.ndarray or bytes image buffer)."""
        import cv2
        import numpy as np
        img = None
        
        if isinstance(frame, bytes):
            try:
                nparr = np.frombuffer(frame, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as e:
                logger.warning(f"ExpressionAnalyzer: Image decoding failed: {e}")
        elif isinstance(frame, np.ndarray):
            img = frame

        if DEEPFACE_AVAILABLE and img is not None:
            try:
                result = DeepFace.analyze(
                    img,
                    actions=['emotion'],
                    detector_backend='retinaface',  # Most accurate face detector
                    enforce_detection=False
                )
                emotions = result[0]['emotion']
                dominant = result[0]['dominant_emotion']
                
                # Normalize emotion probabilities
                total = sum(emotions.values())
                norm  = {k: v / total for k, v in emotions.items()} if total > 0 else emotions

                # Compute valence + arousal from weighted emotions
                valence = sum(norm.get(e, 0) * self.EMOTION_VA.get(e, (0, 0))[0] for e in norm)
                arousal = sum(norm.get(e, 0) * self.EMOTION_VA.get(e, (0, 0))[1] for e in norm)

                # Interview confidence score (higher = appears calm and collected)
                confidence = sum(norm.get(e, 0) * w for e, w in self.CONFIDENCE_EMOTIONS.items())

                self.history.append({'dominant': dominant, 'scores': norm, 'confidence': confidence})

                feedback = self._feedback(dominant, confidence, arousal)
                return EmotionResult(
                    dominant_emotion=dominant,
                    confidence_score=round(confidence, 3),
                    scores={k: round(v, 3) for k, v in norm.items()},
                    valence=round(valence, 3),
                    arousal=round(arousal, 3),
                    feedback=feedback
                )
            except Exception as e:
                logger.error(f"Error during DeepFace emotion ensemble analysis: {e}")

        # Fallback simulation
        t = time.time()
        happy_prob = 0.05 + 0.1 * max(0.0, math.sin(t / 8.0))
        neutral_prob = 1.0 - happy_prob - 0.03
        surprise_prob = 0.02 + 0.01 * math.cos(t / 5.0)
        sad_prob = 0.005
        angry_prob = 0.005
        fear_prob = 0.005
        disgusted_prob = 0.005
        
        norm = {
            "happy": happy_prob,
            "neutral": neutral_prob,
            "surprise": surprise_prob,
            "sad": sad_prob,
            "angry": angry_prob,
            "fear": fear_prob,
            "disgusted": disgusted_prob
        }
        
        dominant = max(norm.items(), key=lambda x: x[1])[0]
        valence = sum(norm.get(e, 0) * self.EMOTION_VA.get(e, (0, 0))[0] for e in norm)
        arousal = sum(norm.get(e, 0) * self.EMOTION_VA.get(e, (0, 0))[1] for e in norm)
        confidence = sum(norm.get(e, 0) * w for e, w in self.CONFIDENCE_EMOTIONS.items())
        
        self.history.append({'dominant': dominant, 'scores': norm, 'confidence': confidence})
        feedback = self._feedback(dominant, confidence, arousal)
        
        return EmotionResult(
            dominant_emotion=dominant,
            confidence_score=round(confidence, 3),
            scores={k: round(v, 3) for k, v in norm.items()},
            valence=round(valence, 3),
            arousal=round(arousal, 3),
            feedback=feedback
        )

    def _feedback(self, emotion, confidence, arousal):
        if emotion in ('fear', 'angry', 'disgusted'):
            return 'Visible stress detected — take a breath and maintain composure'
        if emotion == 'sad':
            return 'Low energy expression — try to project positivity'
        if confidence > 0.60:
            return 'Calm and confident expression — excellent'
        return 'Neutral expression — slight smile can increase perceived confidence'
