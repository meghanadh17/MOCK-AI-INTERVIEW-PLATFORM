package com.aiinterview.data.remote.dto.auth

data class LoginResponse(
    val access_token: String,
    val refresh_token: String,
    val user: UserDto? = null,
    val user_id: String? = null
)
