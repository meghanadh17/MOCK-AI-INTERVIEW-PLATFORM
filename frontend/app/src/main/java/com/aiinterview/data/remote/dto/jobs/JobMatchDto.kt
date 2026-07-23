package com.aiinterview.data.remote.dto.jobs

import com.google.gson.annotations.SerializedName

data class JobMatchDto(
    @SerializedName("match_score") val matchScore: Float,
    @SerializedName("skills_overlap") val skillsOverlap: List<String>,
    @SerializedName("missing_skills") val missingSkills: List<String>,
    @SerializedName("ats_prediction") val atsPrediction: Float
)
