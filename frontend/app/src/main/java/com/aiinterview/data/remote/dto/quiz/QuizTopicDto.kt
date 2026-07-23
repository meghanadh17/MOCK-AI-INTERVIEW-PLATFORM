package com.aiinterview.data.remote.dto.quiz

import com.google.gson.annotations.SerializedName

data class QuizTopicItemDto(
    val topic: String,
    @SerializedName("question_count") val questionCount: Int,
    @SerializedName("quiz_count") val quizCount: Int
)
