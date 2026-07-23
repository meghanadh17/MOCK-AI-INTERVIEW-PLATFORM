package com.aiinterview.data.remote.dto.auth

data class UserStats(
    val resumes_uploaded: Int = 0,
    val interviews_taken: Int = 0,
    val quizzes_taken: Int = 0,
    val avg_score: Float = 0f,
    val highest_score: Float = 0f,
    val active_streak: Int = 0
)

data class UserDto(
    val id: String,
    val email: String,
    val full_name: String?,
    val avatar_url: String?,
    val created_at: String,
    val role: String? = null,
    val is_verified: Boolean? = null,
    val mfa_enabled: Boolean? = null,
    val preferences: Map<String, Any>? = null,
    val stats: UserStats? = null
)
