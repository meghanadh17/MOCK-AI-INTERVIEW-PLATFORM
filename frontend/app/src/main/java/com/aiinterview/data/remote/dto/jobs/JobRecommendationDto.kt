package com.aiinterview.data.remote.dto.jobs

data class JobRecommendationDto(
    val job: JobDto,
    val match_score: Float,
    val skills_overlap: List<String>,
    val missing_skills: List<String>,
    val ats_prediction: Float
)
