package com.aiinterview.data.remote.dto.quiz

import com.google.gson.annotations.SerializedName

data class QuizQuestionOutDto(
    val id: String,
    @SerializedName("quiz_id") val quizId: String,
    @SerializedName("question_text") val questionText: String,
    val options: List<String>,
    @SerializedName("order_index") val orderIndex: Int
)

data class QuizOutDto(
    val id: String,
    @SerializedName("user_id") val userId: String,
    val title: String,
    val topic: String,
    val difficulty: String,
    @SerializedName("total_questions") val totalQuestions: Int,
    @SerializedName("time_limit_s") val timeLimitS: Int?,
    val rating: Double,
    @SerializedName("attempt_count") val attemptCount: Int,
    @SerializedName("created_at") val createdAt: String,
    val questions: List<QuizQuestionOutDto>
)

data class QuizDto(
    val id: String,
    val title: String,
    val topic: String,
    val difficulty: String,
    @SerializedName("total_questions") val totalQuestions: Int,
    @SerializedName("time_limit_s") val timeLimitS: Int?,
    val rating: Double,
    @SerializedName("attempt_count") val attemptCount: Int,
    @SerializedName("created_at") val createdAt: String
)
