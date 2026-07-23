package com.aiinterview.data.remote.dto.interview

data class SessionHistoryDto(
    val id: String,
    val title: String,
    val type: String, // "text" or "video"
    val status: String,
    val grade: Float,
    val created_at: String
)
