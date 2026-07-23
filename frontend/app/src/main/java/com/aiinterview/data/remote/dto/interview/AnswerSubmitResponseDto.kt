package com.aiinterview.data.remote.dto.interview

import com.google.gson.annotations.SerializedName

data class FeedbackDetailDto(
    val what_was_good: String?,
    val critical_gap: String?,
    val model_answer_outline: String?,
    val keywords_hit: List<String>?,
    val keywords_missed: List<String>?
)

data class AnswerSubmitResponseDto(
    val score: Float,
    val feedback: FeedbackDetailDto?,
    @SerializedName("next_question") val next_question: QuestionDto?
)
