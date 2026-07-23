package com.aiinterview.core.di

import android.content.Context
import androidx.room.Room
import com.aiinterview.core.storage.AppDatabase
import com.aiinterview.data.local.dao.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "mocrai_db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideUserDao(db: AppDatabase): UserDao = db.userDao()
    @Provides fun provideResumeDao(db: AppDatabase): ResumeDao = db.resumeDao()
    @Provides fun provideInterviewSessionDao(db: AppDatabase): InterviewSessionDao = db.interviewSessionDao()
    @Provides fun provideQuizAttemptDao(db: AppDatabase): QuizAttemptDao = db.quizAttemptDao()
    @Provides fun provideVideoSessionDao(db: AppDatabase): VideoSessionDao = db.videoSessionDao()
}
