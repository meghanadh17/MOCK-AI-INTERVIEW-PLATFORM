package com.aiinterview.domain.model

data class JobMatch(
    val id: String,
    val title: String,
    val company: String,
    val location: String?,
    val salaryRange: String?,
    val matchScore: Float,
    val skillsOverlap: List<String>,
    val missingSkills: List<String>,
    val isSaved: Boolean = false
)
