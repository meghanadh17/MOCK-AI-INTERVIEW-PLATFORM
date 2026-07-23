package com.aiinterview.data.remote.api

import com.aiinterview.data.remote.dto.interview.*
import retrofit2.Response
import retrofit2.http.*

interface InterviewApiService {
    @POST("interview/sessions") suspend fun createSession(@Body params: Map<String, @JvmSuppressWildcards Any>): Response<SessionDto>
    @GET("interview/sessions/{id}") suspend fun getSession(@Path("id") id: String): Response<SessionDto>
    @GET("interview/roles") suspend fun getRoles(): Response<RolesResponseDto>
    @POST("interview/sessions/{id}/answer") suspend fun submitAnswer(@Path("id") id: String, @Body answer: AnswerSubmitRequest): Response<AnswerSubmitResponseDto>
    @GET("interview/sessions/{id}/report") suspend fun getReport(@Path("id") id: String): Response<ReportDto>
    @POST("interview/sessions/{id}/hint") suspend fun requestHint(@Path("id") id: String, @Query("question_id") questionId: String): Response<HintResponseDto>
    @POST("interview/sessions/{id}/skip") suspend fun skipQuestion(@Path("id") id: String, @Query("question_id") questionId: String): Response<SkipResponseDto>
    @GET("interview/sessions/{id}/questions") suspend fun getQuestions(@Path("id") id: String): Response<List<QuestionDto>>
    @POST("interview/sessions/{id}/start") suspend fun startSession(@Path("id") id: String): Response<QuestionDto>
    @POST("interview/sessions/{id}/end") suspend fun endSession(@Path("id") id: String): Response<SessionDto>
}
