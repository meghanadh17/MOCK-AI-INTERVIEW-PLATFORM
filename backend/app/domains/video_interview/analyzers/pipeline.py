import logging
import asyncio
import numpy as np
import time
from dataclasses import dataclass, field
from collections import deque
from typing import Optional, Any, List

from app.domains.video_interview.analyzers.posture_analyzer import PostureAnalyzer, PostureResult
from app.domains.video_interview.analyzers.gaze_tracker import GazeTracker, GazeResult
from app.domains.video_interview.analyzers.expression_analyzer import ExpressionAnalyzer, EmotionResult
from app.domains.video_interview.analyzers.speech_analyzer import SpeechAnalyzer
from app.domains.video_interview.analyzers.coach_engine import CoachEngine

logger = logging.getLogger(__name__)


@dataclass
class FrameAnalysisResult:
    timestamp_ms:       int
    posture:            Optional[PostureResult]    = None
    gaze:               Optional[GazeResult]       = None
    emotion:            Optional[EmotionResult]    = None
    composite_score:    float = 0.0
    coaching_alert:     Optional[str] = None


class AnalysisPipeline:
    '''
    Orchestrates all video analyzers with frame-rate throttling.
    Maintains a rolling window of results for trend detection.
    Inspired by HireVue's multi-modal interview analysis architecture.
    '''

    POSTURE_EVERY   = 2   # frames (once every 1s)
    GAZE_EVERY      = 2   # frames (once every 1s)
    EMOTION_EVERY   = 4   # frames (once every 2s)
    WINDOW_SIZE     = 30   # Rolling window for trend analysis
    COACH_INTERVAL  = 10.0 # seconds between coaching tips

    # Composite score weights (must sum to 1.0)
    WEIGHTS = {
        'posture': 0.25,
        'eye_contact': 0.30,
        'emotion': 0.20,
        'speech': 0.25,
    }

    def __init__(self, session_id: str, coach_engine):
        self.posture   = PostureAnalyzer()
        self.gaze      = GazeTracker()
        self.emotion   = ExpressionAnalyzer()
        self.speech    = SpeechAnalyzer()
        self.coach     = coach_engine
        self.session_id = session_id
        self.frame_no  = 0
        self.results: deque[FrameAnalysisResult] = deque(maxlen=self.WINDOW_SIZE)
        self.last_coach_time = 0.0

    async def process_frame(
        self, frame: np.ndarray, timestamp_ms: int
    ) -> FrameAnalysisResult:
        '''Process a single video frame through the analysis pipeline.'''
        self.frame_no += 1
        result = FrameAnalysisResult(timestamp_ms=timestamp_ms)

        # Run CPU-heavy analyzers on thread pool based on throttle schedule
        tasks = []
        if self.frame_no % self.POSTURE_EVERY == 0:
            tasks.append(self._run_posture(frame, result))
        if self.frame_no % self.GAZE_EVERY == 0:
            tasks.append(self._run_gaze(frame, result))
        if self.frame_no % self.EMOTION_EVERY == 0:
            tasks.append(self._run_emotion(frame, result))

        if tasks:
            await asyncio.gather(*tasks)  # Run enabled analyzers concurrently

        # Compute composite score from available results
        result.composite_score = self._compute_composite(result)
        self.results.append(result)

        # Check if coaching tip is due
        elapsed = timestamp_ms / 1000.0
        if elapsed - self.last_coach_time >= self.COACH_INTERVAL:
            result.coaching_alert = await self.coach.get_tip(
                list(self.results), self.session_id)
            self.last_coach_time = elapsed

        return result

    async def _run_posture(self, frame: np.ndarray, result: FrameAnalysisResult):
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, self.posture.analyze_frame, frame)
        result.posture = res

    async def _run_gaze(self, frame: np.ndarray, result: FrameAnalysisResult):
        loop = asyncio.get_event_loop()
        timestamp_s = result.timestamp_ms / 1000.0
        res = await loop.run_in_executor(None, self.gaze.analyze_frame, frame, timestamp_s)
        result.gaze = res

    async def _run_emotion(self, frame: np.ndarray, result: FrameAnalysisResult):
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, self.emotion.analyze_frame, frame)
        result.emotion = res

    def _compute_composite(self, r: FrameAnalysisResult) -> float:
        scores, w_total = 0.0, 0.0
        if r.posture:
            scores += r.posture.score * self.WEIGHTS['posture']
            w_total += self.WEIGHTS['posture']
        if r.gaze:
            scores += r.gaze.eye_contact_score * self.WEIGHTS['eye_contact']
            w_total += self.WEIGHTS['eye_contact']
        if r.emotion:
            scores += r.emotion.confidence_score * self.WEIGHTS['emotion']
            w_total += self.WEIGHTS['emotion']
        return (scores / w_total) if w_total > 0 else 0.5


class VideoAnalyzerPipeline:
    """Orchestrates posture, gaze, expression, and speech analysis in real-time (legacy sync compatibility)."""
    
    @staticmethod
    def process_frame(frame_data: bytes) -> dict:
        posture = PostureAnalyzer.analyze_frame(frame_data)
        gaze = GazeTracker().analyze_frame(frame_data, time.time())
        expression = ExpressionAnalyzer().analyze_frame(frame_data)
        
        return {
            "posture": {
                "posture_score": posture.score if hasattr(posture, "score") else 95.0,
                "shoulders_aligned": posture.shoulders_aligned if hasattr(posture, "shoulders_aligned") else True
            },
            "gaze": {
                "eye_contact_detected": gaze.looking_at_camera if hasattr(gaze, "looking_at_camera") else True,
                "gaze_vector": [gaze.gaze_x, gaze.gaze_y, 1.0] if hasattr(gaze, "gaze_x") else [0.0, 0.0, 1.0]
            },
            "expression": {
                "dominant_emotion": expression.dominant_emotion if hasattr(expression, "dominant_emotion") else "neutral",
                "emotion_probabilities": expression.scores if hasattr(expression, "scores") else {"neutral": 0.95}
            },
            "overall_fps": 30.0
        }

    @staticmethod
    def process_audio_chunk(audio_data: bytes) -> dict:
        return SpeechAnalyzer.analyze_audio(audio_data)

    @staticmethod
    def compile_live_feedback(frame_metrics: dict, audio_metrics: dict) -> dict:
        combined_metrics = {
            "posture": frame_metrics.get("posture", {}),
            "gaze": frame_metrics.get("gaze", {}),
            "expression": frame_metrics.get("expression", {}),
            "speech": audio_metrics
        }
        tip = CoachEngine.get_coaching_hint(combined_metrics)
        return {
            "metrics": combined_metrics,
            "coaching_tip": tip
        }
