package com.aiinterview.core.di

import com.aiinterview.core.network.ApiClient
import com.aiinterview.data.remote.api.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides @Singleton
    fun provideOkHttpClient(apiClient: ApiClient): OkHttpClient = apiClient.okHttpClient

    @Provides @Singleton
    fun provideRetrofit(apiClient: ApiClient): Retrofit = apiClient.retrofit

    @Provides @Singleton
    fun provideAuthApiService(retrofit: Retrofit): AuthApiService =
        retrofit.create(AuthApiService::class.java)

    @Provides @Singleton
    fun provideResumeApiService(retrofit: Retrofit): ResumeApiService =
        retrofit.create(ResumeApiService::class.java)

    @Provides @Singleton
    fun provideInterviewApiService(retrofit: Retrofit): InterviewApiService =
        retrofit.create(InterviewApiService::class.java)

    @Provides @Singleton
    fun provideVideoApiService(retrofit: Retrofit): VideoApiService =
        retrofit.create(VideoApiService::class.java)

    @Provides @Singleton
    fun provideSessionApiService(retrofit: Retrofit): SessionApiService =
        retrofit.create(SessionApiService::class.java)

    @Provides @Singleton
    fun provideQuizApiService(retrofit: Retrofit): QuizApiService =
        retrofit.create(QuizApiService::class.java)

    @Provides @Singleton
    fun provideJobsApiService(retrofit: Retrofit): JobsApiService =
        retrofit.create(JobsApiService::class.java)
}
