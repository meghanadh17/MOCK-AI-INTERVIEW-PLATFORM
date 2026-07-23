package com.aiinterview.domain.model

data class ImprovementSuggestion(
    val section: String,
    val current: String,
    val suggested: String,
    val impact: String
)

data class ResumeAnalysis(
    val resumeId: String,
    val atsScore: Int,
    val strengths: List<String>,
    val gaps: List<String>,
    val improvementSuggestions: List<ImprovementSuggestion>,
    val quantificationScore: Int,
    val actionVerbScore: Int,
    val seniorityLevel: String,
    val yearsOfExperience: Int,
    val suitableRoles: List<String>,
    val redFlags: List<String>
)
