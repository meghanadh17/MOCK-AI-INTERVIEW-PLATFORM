package com.aiinterview.domain.model

data class VideoSession(
    val id: String,
    val status: String,
    val recordingUrl: String?,
    val createdAt: String,
    val interviewSessionId: String?,
    val title: String? = null,
    val avgPostureScore: Float? = null,
    val avgEyeContact: Float? = null,
    val avgConfidence: Float? = null,
    val dominantEmotion: String? = null,
    val avgWpm: Float? = null,
    val fillerWordCount: Int? = null,
    val silenceRatio: Float? = null,
    val clarityScore: Float? = null,
    val recordingDurationS: Int? = null
)
