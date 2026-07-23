package com.aiinterview.data.remote.dto.resume

import com.google.gson.annotations.SerializedName

data class EnhanceRequest(
    @SerializedName("section_type") val section_type: String
)

data class EnhanceResponseDto(
    @SerializedName("original_text") val original_text: String,
    @SerializedName("enhanced_text") val enhanced_text: String,
    @SerializedName("suggestions") val suggestions: List<String>
)
