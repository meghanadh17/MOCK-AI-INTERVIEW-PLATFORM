package com.aiinterview.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "interview_sessions")
data class InterviewSessionEntity(
    @PrimaryKey val id: String,
    val type: String,
    val difficulty: String,
    val status: String,
    val overall_score: Int?,
    val created_at: String
)
