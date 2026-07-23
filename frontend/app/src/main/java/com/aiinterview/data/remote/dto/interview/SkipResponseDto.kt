package com.aiinterview.data.remote.dto.interview

import com.google.gson.annotations.SerializedName

data class SkipResponseDto(
    val message: String,
    @SerializedName("next_question") val nextQuestion: QuestionDto?
)
