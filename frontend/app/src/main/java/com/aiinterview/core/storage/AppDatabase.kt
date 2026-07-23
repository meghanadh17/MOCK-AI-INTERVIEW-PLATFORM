package com.aiinterview.core.storage

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.aiinterview.data.local.dao.*
import com.aiinterview.data.local.entity.*

@Database(
    entities = [
        UserEntity::class,
        ResumeEntity::class,
        InterviewSessionEntity::class,
        QuizAttemptEntity::class,
        VideoSessionEntity::class,
        FrameMetricEntity::class
    ],
    version = 6,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun resumeDao(): ResumeDao
    abstract fun interviewSessionDao(): InterviewSessionDao
    abstract fun quizAttemptDao(): QuizAttemptDao
    abstract fun videoSessionDao(): VideoSessionDao
}
