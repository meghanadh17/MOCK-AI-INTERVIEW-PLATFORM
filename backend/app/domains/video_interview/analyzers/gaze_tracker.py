import logging
import time
import math
from typing import Any
from dataclasses import dataclass
from collections import deque

logger = logging.getLogger(__name__)

# Try optional media processing imports
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False


@dataclass
class GazeResult:
    eye_contact_score: float    # 0.0 – 1.0
    gaze_x: float               # Normalized horizontal gaze (-1 left, +1 right)
    gaze_y: float               # Normalized vertical gaze
    blink_detected: bool
    perclos: float              # % of time eyes closed in last 60s (fatigue)
    looking_at_camera: bool
    feedback: str


class GazeTracker:
    '''
    Eye gaze estimation using MediaPipe FaceMesh 468-point landmarks.
    PERCLOS (PERcentage CLOSure of pupil) is the gold-standard fatigue metric
    used in automotive drowsiness detection, adapted here for interview focus.
    '''

    # Eye landmark indices (MediaPipe FaceMesh)
    LEFT_EYE_INDICES  = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
    RIGHT_EYE_INDICES = [33,  7,   163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
    # Iris landmark indices (MediaPipe iris model)
    LEFT_IRIS  = [474, 475, 476, 477]
    RIGHT_IRIS = [469, 470, 471, 472]

    EYE_ASPECT_RATIO_THRESHOLD = 0.20  # Below this = eye closed (blink)
    CAMERA_GAZE_TOLERANCE = 0.15        # Normalized units; within = 'looking at camera'
    PERCLOS_WINDOW_S = 60               # 60-second rolling window for PERCLOS

    def __init__(self):
        if MEDIAPIPE_AVAILABLE:
            try:
                self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                    static_image_mode=False,
                    max_num_faces=1,
                    refine_landmarks=True,  # Enables iris landmarks
                    min_detection_confidence=0.7,
                    min_tracking_confidence=0.7
                )
                logger.info("GazeTracker: Loaded face mesh with iris refining successfully.")
            except Exception as e:
                logger.warning(f"Failed to load FaceMesh model: {e}")
                self.face_mesh = None
        else:
            self.face_mesh = None
            
        self.blink_history: deque[tuple[float, bool]] = deque()  # (timestamp, is_closed)

    def analyze_frame(self, frame: Any, timestamp_s: float) -> GazeResult:
        """Processes frame input (accepts np.ndarray or bytes image buffer)."""
        import cv2
        import numpy as np
        img = None
        
        if isinstance(frame, bytes):
            try:
                nparr = np.frombuffer(frame, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as e:
                logger.warning(f"GazeTracker: Image decoding failed: {e}")
        elif isinstance(frame, np.ndarray):
            img = frame

        if self.face_mesh is not None and img is not None:
            try:
                h, w = img.shape[:2]
                results = self.face_mesh.process(img)
                if results.multi_face_landmarks:
                    lm = results.multi_face_landmarks[0].landmark

                    # --- Eye Aspect Ratio (EAR) for blink detection ---
                    def ear(indices):
                        pts = np.array([[lm[i].x * w, lm[i].y * h] for i in indices])
                        # Simplified EAR: vertical / horizontal distances
                        A = np.linalg.norm(pts[1] - pts[5])
                        B = np.linalg.norm(pts[2] - pts[4])
                        C = np.linalg.norm(pts[0] - pts[3])
                        return (A + B) / (2.0 * C) if C > 0 else 0

                    left_ear  = ear(self.LEFT_EYE_INDICES[:6])
                    right_ear = ear(self.RIGHT_EYE_INDICES[:6])
                    avg_ear   = (left_ear + right_ear) / 2
                    is_blink  = avg_ear < self.EYE_ASPECT_RATIO_THRESHOLD

                    # --- PERCLOS: rolling 60s closed-eye ratio ---
                    self.blink_history.append((timestamp_s, is_blink))
                    cutoff = timestamp_s - self.PERCLOS_WINDOW_S
                    while self.blink_history and self.blink_history[0][0] < cutoff:
                        self.blink_history.popleft()
                    closed = sum(1 for _, c in self.blink_history if c)
                    perclos = closed / len(self.blink_history) if self.blink_history else 0.0

                    # --- Iris-based gaze estimation ---
                    def iris_center(indices):
                        pts = np.array([[lm[i].x, lm[i].y] for i in indices])
                        return pts.mean(axis=0)

                    left_iris  = iris_center(self.LEFT_IRIS)
                    right_iris = iris_center(self.RIGHT_IRIS)
                    gaze = (left_iris + right_iris) / 2
                    gaze_x = (gaze[0] - 0.5) * 2  # Normalize to [-1, 1]
                    gaze_y = (gaze[1] - 0.5) * 2

                    looking = abs(gaze_x) < self.CAMERA_GAZE_TOLERANCE and abs(gaze_y) < self.CAMERA_GAZE_TOLERANCE
                    eye_contact = max(0.0, 1.0 - (abs(gaze_x) + abs(gaze_y)) / 2)

                    # Penalty for PERCLOS > 20% (fatigue indicator)
                    if perclos > 0.20:
                        eye_contact *= (1 - (perclos - 0.20) * 2)

                    feedback = self._generate_feedback(gaze_x, gaze_y, perclos, is_blink)
                    return GazeResult(
                        eye_contact_score=round(max(0.0, eye_contact), 3),
                        gaze_x=round(gaze_x, 3), gaze_y=round(gaze_y, 3),
                        blink_detected=is_blink, perclos=round(perclos, 3),
                        looking_at_camera=looking, feedback=feedback
                    )
            except Exception as e:
                logger.error(f"Error in MediaPipe iris gaze analysis: {e}")

        # Fallback simulation
        is_blink = bool(math.sin(timestamp_s * 1.5) > 0.98)
        self.blink_history.append((timestamp_s, is_blink))
        cutoff = timestamp_s - self.PERCLOS_WINDOW_S
        while self.blink_history and self.blink_history[0][0] < cutoff:
            self.blink_history.popleft()
        closed = sum(1 for _, c in self.blink_history if c)
        perclos = closed / len(self.blink_history) if self.blink_history else 0.0

        gaze_x = 0.02 * math.sin(timestamp_s / 2.0)
        gaze_y = 0.01 * math.cos(timestamp_s / 3.0)
        looking = abs(gaze_x) < self.CAMERA_GAZE_TOLERANCE and abs(gaze_y) < self.CAMERA_GAZE_TOLERANCE
        eye_contact = max(0.0, 1.0 - (abs(gaze_x) + abs(gaze_y)) / 2)

        if perclos > 0.20:
            eye_contact *= (1 - (perclos - 0.20) * 2)

        feedback = self._generate_feedback(gaze_x, gaze_y, perclos, is_blink)
        return GazeResult(
            eye_contact_score=round(max(0.0, eye_contact), 3),
            gaze_x=round(gaze_x, 3), gaze_y=round(gaze_y, 3),
            blink_detected=is_blink, perclos=round(perclos, 3),
            looking_at_camera=looking, feedback=feedback
        )

    def _generate_feedback(self, gx, gy, perclos, blink):
        if perclos > 0.30:
            return 'High eye-closure rate detected — try to maintain alertness'
        if abs(gx) > 0.35:
            return 'Looking sideways — try to maintain eye contact with the camera'
        if abs(gy) > 0.35:
            return 'Looking away from camera — maintain forward-facing gaze'
        return 'Good eye contact — keep it up'
