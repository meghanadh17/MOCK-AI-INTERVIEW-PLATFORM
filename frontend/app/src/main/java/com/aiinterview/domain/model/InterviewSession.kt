package com.aiinterview.domain.model

data class InterviewSession(
    val id: String,
    val title: String,
    val type: String, // "text" or "video"
    val difficulty: String = "",
    val status: String,
    val overallScore: Float?,
    val createdAt: String
)
