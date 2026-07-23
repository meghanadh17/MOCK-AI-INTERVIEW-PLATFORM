package com.aiinterview.data.remote.dto.video

data class VideoSessionDto(
    val id: String,
    val status: String,
    val recording_url: String?,
    val created_at: String,
    val interview_session_id: String?,
    val title: String? = null,
    val avg_posture_score: Float? = null,
    val avg_eye_contact: Float? = null,
    val avg_confidence: Float? = null,
    val dominant_emotion: String? = null,
    val avg_wpm: Float? = null,
    val filler_word_count: Int? = null,
    val silence_ratio: Float? = null,
    val clarity_score: Float? = null,
    val recording_duration_s: Int? = null
)
