package com.aiinterview.data.remote.dto.interview

data class HintResponseDto(
    val hint_text: String,
    val hints_used: Int,
    val max_hints: Int
)
