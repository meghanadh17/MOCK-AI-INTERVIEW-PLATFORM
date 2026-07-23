package com.aiinterview.data.remote.dto.quiz

import com.google.gson.annotations.SerializedName

data class QuestionExplanationItemDto(
    @SerializedName("question_id") val questionId: String,
    @SerializedName("question_text") val questionText: String,
    @SerializedName("chosen_answer") val chosenAnswer: String,
    @SerializedName("correct_answer") val correctAnswer: String,
    @SerializedName("is_correct") val isCorrect: Boolean,
    val explanation: String?
)

data class QuizResultDto(
    @SerializedName("attempt_id") val attemptId: String,
    @SerializedName("quiz_id") val quizId: String,
    val score: Double,
    @SerializedName("correct_count") val correctCount: Int,
    @SerializedName("time_taken_s") val timeTakenS: Int,
    @SerializedName("completed_at") val completedAt: String,
    val breakdown: List<QuestionExplanationItemDto>
)
