package com.aiinterview.data.remote.dto.interview

data class ReportDto(
    val session_id: String,
    val status: String? = null,
    val overall_score: Double,
    val dimension_scores: Map<String, Double>,
    val summary: String,
    val improvement_plan: List<String>? = null,
    val title: String? = null,
    val role: String? = null,
    val type: String? = null,
    val created_at: String? = null,
    val duration_seconds: Int? = null
)
