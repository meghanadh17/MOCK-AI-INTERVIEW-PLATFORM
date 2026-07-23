package com.aiinterview.data.remote.dto.quiz

import com.google.gson.annotations.SerializedName

data class UserAttemptItemDto(
    @SerializedName("attempt_id") val attemptId: String,
    @SerializedName("quiz_id") val quizId: String,
    @SerializedName("quiz_title") val quizTitle: String,
    val score: Double,
    @SerializedName("time_taken_s") val timeTakenS: Int,
    @SerializedName("completed_at") val completedAt: String
)
