package com.aiinterview.data.remote.dto.auth

import com.google.gson.annotations.SerializedName

data class MfaEnableResponse(
    val secret: String,
    @SerializedName("provisioning_uri") val provisioningUri: String
)
