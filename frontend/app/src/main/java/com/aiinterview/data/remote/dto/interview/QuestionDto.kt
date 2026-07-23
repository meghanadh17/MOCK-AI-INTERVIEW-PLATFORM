package com.aiinterview.data.remote.dto.interview

import com.google.gson.annotations.SerializedName

data class QuestionDto(
    val id: String,
    @SerializedName("order_index") val index: Int,
    @SerializedName("question_text") val text: String,
    @SerializedName("question_type") val category: String? = null,
    val difficulty: Double? = null,
    val expected_keywords: List<String>? = null,
    val ideal_outline: String? = null,
    val ai_score: Double? = null,
    val ai_feedback: String? = null,
    val user_transcript: String? = null,
    val is_skipped: Boolean = false,
    val hints_used: Int = 0,
    val evaluation_feedback: FeedbackDetailDto? = null
) {
    val difficultyLabel: String
        get() = when {
            difficulty == null -> "Medium"
            difficulty <= 0.3 -> "Easy"
            difficulty <= 0.6 -> "Medium"
            difficulty <= 0.8 -> "Hard"
            else -> "Expert"
        }
}
