package com.aiinterview.data.remote.dto.video

data class PostureTimelineEventDto(
    val timestamp_ms: Long,
    val posture_score: Float?,
    val spine_angle: Float?,
    val shoulder_tilt: Float?,
    val head_tilt: Float?,
    val forward_lean: Float?
)

data class PostureReportDto(
    val session_id: String,
    val average_score: Float,
    val timeline: List<PostureTimelineEventDto>
)

data class GazeTimelineEventDto(
    val timestamp_ms: Long,
    val eye_contact_score: Float?,
    val gaze_x: Float?,
    val gaze_y: Float?,
    val blink_detected: Boolean?
)

data class GazeReportDto(
    val session_id: String,
    val eye_contact_percentage: Float,
    val perclos_fatigue_index: Float,
    val timeline: List<GazeTimelineEventDto>
)

data class EmotionWindowDto(
    val start_time_s: Float,
    val end_time_s: Float,
    val dominant_emotion: String,
    val average_confidence: Float
)

data class EmotionReportDto(
    val session_id: String,
    val dominant_emotion: String,
    val timeline: List<EmotionWindowDto>
)

data class VideoSummaryDto(
    val session_id: String,
    val summary: String,
    val key_strengths: List<String>,
    val areas_for_improvement: List<String>
)

data class SpeechReportResponseDto(
    val session_id: String,
    val wpm: Float,
    val filler_word_count: Int,
    val silence_ratio: Float,
    val clarity_score: Float,
    val prosody: Map<String, Any>?
)

data class VideoSessionResponseDto(
    val session: VideoSessionDto,
    val ice_servers: List<Map<String, Any>>
)
