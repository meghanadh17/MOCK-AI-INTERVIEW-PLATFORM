package com.aiinterview.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "frame_metrics")
data class FrameMetricEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val timestamp: Long,
    val emotion: String,
    val confidence: Float,
    val eyeContact: Boolean,
    val postureScore: Float
)
