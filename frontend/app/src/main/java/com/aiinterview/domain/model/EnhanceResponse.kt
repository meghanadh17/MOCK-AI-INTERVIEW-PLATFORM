package com.aiinterview.domain.model

data class EnhanceResponse(
    val originalText: String,
    val enhancedText: String,
    val suggestions: List<String>
)
