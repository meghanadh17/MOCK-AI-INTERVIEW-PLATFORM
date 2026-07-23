package com.aiinterview.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "video_sessions")
data class VideoSessionEntity(
    @PrimaryKey val id: String,
    val status: String,
    val recordingUrl: String?,
    val createdAt: String,
    val avgPostureScore: Float?,
    val avgEyeContact: Float?,
    val avgConfidence: Float?,
    val dominantEmotion: String?,
    val interviewSessionId: String?
)
