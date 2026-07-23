package com.aiinterview.data.remote.dto.jobs

import com.google.gson.annotations.SerializedName

data class JobSearchDto(
    val job: JobDto,
    @SerializedName("match_score") val matchScore: Float
)
