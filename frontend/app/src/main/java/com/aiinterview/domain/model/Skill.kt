package com.aiinterview.domain.model

data class Skill(
    val name: String,
    val level: String, // "beginner", "intermediate", "advanced", "expert"
    val category: String? = null
)
