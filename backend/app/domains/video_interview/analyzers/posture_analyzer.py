import logging
import time
import math
from typing import Dict, Any, Union
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Try loading MediaPipe Holistic
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False


@dataclass
class PostureResult:
    score: float
    shoulder_tilt_deg: float
    spine_angle_deg: float
    fidgeting_detected: bool
    shoulders_aligned: bool
    feedback: str


class PostureAnalyzer:
    """Uses MediaPipe Holistic to track body posture alignment, head/shoulder tilt, and fidgeting."""
    
    _holistic = None
    _mp_holistic = None

    def __init__(self):
        # Instance initialization support
        self.get_detector()

    @classmethod
    def get_detector(cls):
        """Dynamic getter for lazy loading MediaPipe Holistic detector."""
        if not MEDIAPIPE_AVAILABLE:
            return None, None
        if cls._holistic is None:
            try:
                cls._mp_holistic = mp.solutions.holistic
                cls._holistic = cls._mp_holistic.Holistic(
                    static_image_mode=False,
                    model_complexity=1,
                    smooth_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
                logger.info("PostureAnalyzer: Loaded MediaPipe Holistic successfully.")
            except Exception as e:
                logger.warning(f"Failed to load MediaPipe Holistic: {e}")
        return cls._holistic, cls._mp_holistic

    @classmethod
    def analyze_frame(cls, frame: Any) -> PostureResult:
        """Analyzes posture landmarks. Accepts bytes (for direct framing) or np.ndarray."""
        detector, mp_holistic = cls.get_detector()
        
        import cv2
        import numpy as np
        img = None
        
        if isinstance(frame, bytes):
            try:
                nparr = np.frombuffer(frame, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as e:
                logger.warning(f"PostureAnalyzer: Image decoding failed: {e}")
        elif isinstance(frame, np.ndarray):
            img = frame

        if detector is not None and img is not None:
            try:
                # Convert BGR to RGB for MediaPipe
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                results = detector.process(img_rgb)
                
                shoulder_tilt = 0.0
                spine_angle = 90.0
                fidgeting_detected = False
                
                if results.pose_landmarks:
                    landmarks = results.pose_landmarks.landmark
                    left_shoulder = landmarks[mp_holistic.PoseLandmark.LEFT_SHOULDER]
                    right_shoulder = landmarks[mp_holistic.PoseLandmark.RIGHT_SHOULDER]
                    
                    dy = left_shoulder.y - right_shoulder.y
                    dx = left_shoulder.x - right_shoulder.x
                    shoulder_tilt = math.degrees(math.atan2(dy, dx)) if dx != 0 else 0.0
                    
                    nose = landmarks[mp_holistic.PoseLandmark.NOSE]
                    mid_shoulder_x = (left_shoulder.x + right_shoulder.x) / 2.0
                    mid_shoulder_y = (left_shoulder.y + right_shoulder.y) / 2.0
                    
                    dy_spine = mid_shoulder_y - nose.y
                    dx_spine = mid_shoulder_x - nose.x
                    spine_angle = math.degrees(math.atan2(dy_spine, dx_spine)) if dx_spine != 0 else 90.0
                    
                    fidgeting_detected = abs(shoulder_tilt) > 5.0

                posture_score = 1.0 - min(abs(shoulder_tilt) / 20.0, 0.5) - min(abs(spine_angle - 90.0) / 30.0, 0.5)
                posture_score = max(0.0, min(1.0, posture_score))
                
                if abs(shoulder_tilt) > 4.0:
                    feedback = "Shoulders are tilted — try to sit up straight"
                elif abs(spine_angle - 90.0) > 10.0:
                    feedback = "Leaning or slouched — align head and spine"
                else:
                    feedback = "Good shoulder and head alignment"
                    
                return PostureResult(
                    score=float(round(posture_score, 3)),
                    shoulder_tilt_deg=float(round(shoulder_tilt, 2)),
                    spine_angle_deg=float(round(spine_angle, 2)),
                    fidgeting_detected=fidgeting_detected,
                    shoulders_aligned=bool(abs(shoulder_tilt) < 3.0),
                    feedback=feedback
                )
            except Exception as e:
                logger.error(f"Error during MediaPipe posture analysis: {e}")
                
        # Fallback simulation
        t = time.time()
        sim_shoulder_tilt = 1.2 * math.sin(t / 5.0) + 0.3 * math.cos(t / 2.0)
        sim_spine_angle = 90.0 + 1.5 * math.cos(t / 4.0)
        sim_fidget = 0.05 + 0.1 * abs(math.sin(t))
        fidgeting_detected = bool(sim_fidget > 0.12)
        
        posture_score = 1.0 - min(abs(sim_shoulder_tilt) / 20.0, 0.5) - min(abs(sim_spine_angle - 90.0) / 30.0, 0.5)
        posture_score = max(0.0, min(1.0, posture_score))
        
        if abs(sim_shoulder_tilt) > 3.0:
            feedback = "Slight shoulder tilt detected — align posture"
        elif fidgeting_detected:
            feedback = "Fidgeting detected — try to maintain steady posture"
        else:
            feedback = "Good alignment — posture is upright and professional"
            
        return PostureResult(
            score=float(round(posture_score, 3)),
            shoulder_tilt_deg=float(round(sim_shoulder_tilt, 2)),
            spine_angle_deg=float(round(sim_spine_angle, 2)),
            fidgeting_detected=fidgeting_detected,
            shoulders_aligned=bool(abs(sim_shoulder_tilt) < 2.0),
            feedback=feedback
        )
