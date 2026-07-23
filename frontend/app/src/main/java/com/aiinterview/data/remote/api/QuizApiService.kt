package com.aiinterview.data.remote.api

import com.aiinterview.data.remote.dto.quiz.*
import retrofit2.Response
import retrofit2.http.*

interface QuizApiService {
    @GET("quiz/list")
    suspend fun getQuizzes(): Response<List<QuizDto>>

    @POST("quiz/generate")
    suspend fun generateQuiz(
        @Body params: Map<String, @JvmSuppressWildcards Any>
    ): Response<QuizOutDto>

    @GET("quiz/{id}")
    suspend fun getQuizDetail(
        @Path("id") id: String
    ): Response<QuizOutDto>

    @POST("quiz/{id}/start")
    suspend fun startQuiz(
        @Path("id") id: String
    ): Response<AttemptDto>

    @POST("quiz/{id}/submit-answer")
    suspend fun submitAnswer(
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<AnswerSubmitResponseDto>

    @POST("quiz/{id}/finish")
    suspend fun finishAttempt(
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<QuizResultDto>

    @GET("quiz/{id}/results/{attempt_id}")
    suspend fun getAttemptResult(
        @Path("id") id: String,
        @Path("attempt_id") attemptId: String
    ): Response<QuizResultDto>

    @GET("quiz/leaderboard/global")
    suspend fun getGlobalLeaderboard(): Response<QuizLeaderboardResponseDto>

    @GET("quiz/leaderboard/weekly")
    suspend fun getWeeklyLeaderboard(): Response<QuizLeaderboardResponseDto>

    @GET("quiz/{id}/leaderboard")
    suspend fun getQuizLeaderboard(
        @Path("id") id: String
    ): Response<QuizLeaderboardResponseDto>

    @GET("quiz/leaderboard/my-rank")
    suspend fun getMyRank(): Response<UserRankResponseDto>

    @GET("quiz/stats")
    suspend fun getStats(): Response<QuizStatsResponseDto>

    @GET("quiz/topics")
    suspend fun getQuizTopics(): Response<List<QuizTopicItemDto>>

    @GET("quiz/my-attempts")
    suspend fun getMyAttempts(): Response<List<UserAttemptItemDto>>

    @DELETE("quiz/attempts/{attempt_id}")
    suspend fun deleteAttempt(@Path("attempt_id") attemptId: String): Response<Unit>
}


