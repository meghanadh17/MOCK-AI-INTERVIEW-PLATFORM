package com.aiinterview.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "quiz_attempts")
data class QuizAttemptEntity(
    @PrimaryKey val id: String,
    val quiz_id: String,
    val score: Int,
    val total: Int,
    val created_at: String
)
