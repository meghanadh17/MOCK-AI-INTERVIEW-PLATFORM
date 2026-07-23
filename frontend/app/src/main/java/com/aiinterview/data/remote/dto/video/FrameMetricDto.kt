package com.aiinterview.data.remote.dto.video

data class FrameMetricDto(val timestamp: Long, val emotion: String, val confidence: Float, val eye_contact: Boolean, val posture_score: Float)
