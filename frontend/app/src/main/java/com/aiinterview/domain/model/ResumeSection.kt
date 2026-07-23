package com.aiinterview.domain.model

data class ResumeSection(
    val title: String,
    val content: String,
    var isExpanded: Boolean = false
)
