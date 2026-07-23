package com.aiinterview.data.remote.dto.resume

import com.google.gson.annotations.SerializedName

data class ImprovementSuggestionDto(
    val section: String,
    val current: String,
    val suggested: String,
    val impact: String
)

data class AtsAnalysisDto(
    val ats_score: Int,
    val strengths: List<com.google.gson.JsonElement>?,
    val gaps: List<com.google.gson.JsonElement>?,
    @SerializedName("improvement_suggestions") val improvementSuggestions: List<ImprovementSuggestionDto>?,
    @SerializedName("quantification_score") val quantificationScore: Int?,
    @SerializedName("action_verb_score") val actionVerbScore: Int?,
    @SerializedName("seniority_level") val seniorityLevel: String?,
    @SerializedName("years_of_experience") val yearsOfExperience: Int?,
    @SerializedName("suitable_roles") val suitableRoles: List<String>?,
    @SerializedName("red_flags") val redFlags: List<String>?
)

data class ResumeAnalysisDto(
    @SerializedName("resume_id") val resumeId: String,
    val analysis: AtsAnalysisDto?
)
