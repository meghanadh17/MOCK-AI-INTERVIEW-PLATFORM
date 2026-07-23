package com.aiinterview.core.di

import com.aiinterview.data.repository.*
import com.aiinterview.domain.repository.*
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds @Singleton abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository
    @Binds @Singleton abstract fun bindResumeRepository(impl: ResumeRepositoryImpl): ResumeRepository
    @Binds @Singleton abstract fun bindInterviewRepository(impl: InterviewRepositoryImpl): InterviewRepository
    @Binds @Singleton abstract fun bindVideoRepository(impl: VideoRepositoryImpl): VideoRepository
    @Binds @Singleton abstract fun bindSessionRepository(impl: SessionRepositoryImpl): SessionRepository
    @Binds @Singleton abstract fun bindQuizRepository(impl: QuizRepositoryImpl): QuizRepository
    @Binds @Singleton abstract fun bindJobsRepository(impl: JobsRepositoryImpl): JobsRepository
}
