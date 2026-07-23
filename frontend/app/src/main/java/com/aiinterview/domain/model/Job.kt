package com.aiinterview.domain.model

data class Job(
    val id: String,
    val title: String,
    val company: String,
    val description: String,
    val requirements: String?,
    val salaryRange: String?,
    val location: String?,
    val skills: List<String>,
    val experienceLevel: String?,
    val createdAt: String,
    val isSaved: Boolean = false,
    val matchScore: Float? = null
)
