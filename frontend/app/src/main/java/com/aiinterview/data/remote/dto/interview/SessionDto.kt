package com.aiinterview.data.remote.dto.interview

import com.google.gson.annotations.SerializedName

data class SessionDto(
    val id: String,
    @SerializedName("interview_type") val type: String,
    val difficulty: Double,
    val status: String,
    @SerializedName("total_score") val overall_score: Double?,
    val questions: List<QuestionDto>?,
    val created_at: String,
    val title: String? = null,
    val resume_id: String? = null,
    val total_questions: Int = 0,
    val answered_count: Int = 0,
    val skipped_count: Int = 0
)
