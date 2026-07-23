package com.aiinterview.domain.model

data class PostureTimelineEvent(
    val timestampMs: Long,
    val postureScore: Float,
    val spineAngle: Float,
    val shoulderTilt: Float,
    val headTilt: Float,
    val forwardLean: Float
)

data class PostureReport(
    val sessionId: String,
    val averageScore: Float,
    val timeline: List<PostureTimelineEvent>
)

data class GazeTimelineEvent(
    val timestampMs: Long,
    val eyeContactScore: Float,
    val gazeX: Float,
    val gazeY: Float,
    val blinkDetected: Boolean
)

data class GazeReport(
    val sessionId: String,
    val eyeContactPercentage: Float,
    val perclosFatigueIndex: Float,
    val timeline: List<GazeTimelineEvent>
)

data class EmotionWindow(
    val startTimeS: Float,
    val endTimeS: Float,
    val dominantEmotion: String,
    val averageConfidence: Float
)

data class EmotionReport(
    val sessionId: String,
    val dominantEmotion: String,
    val timeline: List<EmotionWindow>
)

data class SpeechTimelineEvent(
    val startMs: Long,
    val endMs: Long,
    val wpm: Float,
    val clarityScore: Float,
    val energyMean: Float
)

data class SpeechReport(
    val sessionId: String,
    val wpm: Float,
    val fillerWordCount: Int,
    val silenceRatio: Float,
    val clarityScore: Float,
    val prosody: Map<String, Any>?,
    val timeline: List<SpeechTimelineEvent>? = null
)

data class VideoSummary(
    val sessionId: String,
    val summary: String,
    val keyStrengths: List<String>,
    val areasForImprovement: List<String>
)

data class VideoReportCombined(
    val posture: PostureReport,
    val gaze: GazeReport,
    val emotion: EmotionReport,
    val speech: SpeechReport,
    val summary: VideoSummary
)
