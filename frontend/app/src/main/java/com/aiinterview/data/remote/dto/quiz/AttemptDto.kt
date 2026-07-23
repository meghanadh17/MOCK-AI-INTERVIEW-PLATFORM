package com.aiinterview.data.remote.dto.quiz

import com.google.gson.annotations.SerializedName

data class AttemptDto(
    @SerializedName("attempt_id") val attemptId: String,
    @SerializedName("quiz_id") val quizId: String,
    @SerializedName("started_at") val startedAt: String,
    @SerializedName("time_limit_s") val timeLimitS: Int?
)

data class AnswerSubmitResponseDto(
    @SerializedName("question_id") val questionId: String,
    @SerializedName("selected_answer") val selectedAnswer: String,
    @SerializedName("is_correct") val isCorrect: Boolean,
    @SerializedName("correct_answer") val correctAnswer: String,
    val explanation: String?
)
