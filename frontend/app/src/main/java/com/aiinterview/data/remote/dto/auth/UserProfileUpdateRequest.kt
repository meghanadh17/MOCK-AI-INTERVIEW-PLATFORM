package com.aiinterview.data.remote.dto.auth

import com.google.gson.annotations.SerializedName

data class UserProfileUpdateRequest(
    @SerializedName("full_name") val fullName: String? = null,
    val preferences: Map<String, Any>? = null
)
