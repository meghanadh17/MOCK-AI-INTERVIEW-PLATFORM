package com.aiinterview.data.mapper

import com.aiinterview.data.remote.dto.interview.SessionDto
import com.aiinterview.domain.model.InterviewSession

object InterviewMapper {
    fun SessionDto.toDomain() = InterviewSession(
        id = id,
        title = title ?: "Mock Interview",
        type = type,
        difficulty = when {
            difficulty <= 0.3 -> "Easy"
            difficulty <= 0.6 -> "Medium"
            difficulty <= 0.8 -> "Hard"
            else -> "Expert"
        },
        status = status,
        overallScore = overall_score?.toFloat(),
        createdAt = created_at
    )
}
