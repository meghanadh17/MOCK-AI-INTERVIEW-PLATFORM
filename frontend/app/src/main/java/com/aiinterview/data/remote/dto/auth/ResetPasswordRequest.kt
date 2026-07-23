package com.aiinterview.data.remote.dto.auth

data class ResetPasswordRequest(
    val email: String,
    val otp: String,
    val new_password: String
)
