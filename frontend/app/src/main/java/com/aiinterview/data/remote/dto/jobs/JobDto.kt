package com.aiinterview.data.remote.dto.jobs

data class JobDto(
    val id: String,
    val title: String,
    val company: String,
    val description: String,
    val requirements: String? = null,
    val salary_range: String? = null,
    val location: String? = null,
    val skills: List<String> = emptyList(),
    val experience_level: String? = null,
    val created_at: String
)
