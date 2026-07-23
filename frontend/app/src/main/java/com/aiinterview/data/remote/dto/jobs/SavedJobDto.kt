package com.aiinterview.data.remote.dto.jobs

import com.google.gson.annotations.SerializedName

data class SavedJobDto(
    val id: String,
    val job: JobDto,
    @SerializedName("match_score") val matchScore: Float?,
    @SerializedName("created_at") val createdAt: String
)
