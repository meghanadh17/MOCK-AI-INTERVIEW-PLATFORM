package com.aiinterview.domain.model

data class Resume(
    val id: String,
    val filename: String,
    val fileUrl: String?,
    val isPrimary: Boolean,
    val parseStatus: String,
    val createdAt: String,
    val atsScore: Int? = null,
    val sections: List<ResumeSection> = emptyList(),
    val skills: List<Skill> = emptyList(),
    val suitableRoles: List<String> = emptyList(),
    val strengths: List<String> = emptyList(),
    val gaps: List<String> = emptyList(),
    val quantificationScore: Int? = null,
    val actionVerbScore: Int? = null,
    val seniorityLevel: String? = null,
    val yearsOfExperience: Int? = null,
    val redFlags: List<String> = emptyList(),
    val improvementSuggestions: List<ImprovementSuggestion> = emptyList()
)
