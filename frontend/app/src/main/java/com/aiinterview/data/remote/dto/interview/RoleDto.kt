package com.aiinterview.data.remote.dto.interview

data class RoleDto(
    val name: String,
    val skills: List<String>
)

data class RolesResponseDto(
    val roles: List<RoleDto>
)
