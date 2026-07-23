package com.aiinterview.data.remote.dto.resume

import com.google.gson.annotations.SerializedName

data class AtsScoreDto(
    @SerializedName("ats_score") val score: Int,
    @SerializedName("keywords_found") val keyword_matches: List<String>,
    @SerializedName("keywords_missing") val missing_keywords: List<String>,
    @SerializedName("match_analysis") val recommendations: String
)
