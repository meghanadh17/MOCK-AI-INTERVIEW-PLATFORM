package com.aiinterview.domain.model

data class UserStats(
    val resumesUploaded: Int = 0,
    val interviewsTaken: Int = 0,
    val quizzesTaken: Int = 0,
    val avgScore: Float = 0f,
    val highestScore: Float = 0f,
    val activeStreak: Int = 0
)

data class User(
    val id: String,
    val email: String,
    val fullName: String?,
    val avatarUrl: String?,
    val createdAt: String,
    val role: String? = null,
    val isVerified: Boolean = false,
    val mfaEnabled: Boolean = false,
    val stats: UserStats? = null,
    val preferences: Map<String, Any>? = null
)
