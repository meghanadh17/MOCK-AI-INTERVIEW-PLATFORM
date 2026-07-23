package com.aiinterview.data.mapper

import com.aiinterview.data.remote.dto.auth.UserDto
import com.aiinterview.data.remote.dto.auth.UserStats as DtoUserStats
import com.aiinterview.data.local.entity.UserEntity
import com.aiinterview.domain.model.User
import com.aiinterview.domain.model.UserStats as DomainUserStats

object AuthMapper {
    fun UserDto.toDomain() = User(
        id = id,
        email = email,
        fullName = full_name,
        avatarUrl = avatar_url,
        createdAt = created_at,
        role = role,
        isVerified = is_verified ?: false,
        mfaEnabled = mfa_enabled ?: false,
        stats = stats?.toDomain(),
        preferences = preferences
    )

    fun DtoUserStats.toDomain() = DomainUserStats(
        resumesUploaded = resumes_uploaded,
        interviewsTaken = interviews_taken,
        quizzesTaken = quizzes_taken,
        avgScore = avg_score,
        highestScore = highest_score,
        activeStreak = active_streak
    )

    fun UserDto.toEntity() = UserEntity(
        id = id,
        email = email,
        full_name = full_name,
        avatar_url = avatar_url,
        created_at = created_at
    )

    fun UserEntity.toDomain() = User(
        id = id,
        email = email,
        fullName = full_name,
        avatarUrl = avatar_url,
        createdAt = created_at
    )
}
