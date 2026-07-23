package com.aiinterview.data.remote.dto.resume

import com.google.gson.annotations.SerializedName

data class ParseStatusDto(
    @SerializedName("parse_status") val status: String,
    val progress: Int = 0,
    val error_message: String? = null
)
