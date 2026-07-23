package com.aiinterview.data.remote.api

import com.aiinterview.data.remote.dto.interview.SessionDto
import com.aiinterview.data.remote.dto.interview.SessionHistoryDto
import com.aiinterview.data.remote.dto.sessions.*
import retrofit2.Response
import retrofit2.http.*

interface SessionApiService {
    @GET("sessions") suspend fun getAllSessions(): Response<List<SessionDto>>
    @GET("sessions/{id}") suspend fun getSessionDetail(@Path("id") id: String): Response<SessionDto>
    @DELETE("sessions/{id}") suspend fun deleteSession(@Path("id") id: String): Response<Unit>
    @GET("sessions/analytics") suspend fun getSessionAnalytics(): Response<Map<String, Any>>
    @GET("sessions/history") suspend fun getSessionHistory(
        @Query("skip") skip: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<List<SessionHistoryDto>>

    @GET("sessions/{id}/summary")
    suspend fun getSessionSummary(@Path("id") id: String): Response<SessionSummaryResponseDto>

    @GET("sessions/{id}/score-breakdown")
    suspend fun getSessionScoreBreakdown(@Path("id") id: String): Response<ScoreBreakdownResponseDto>

    @GET("sessions/{id}/improvements")
    suspend fun getSessionImprovements(@Path("id") id: String): Response<SessionImprovementsResponseDto>

    @POST("sessions/{id}/share")
    suspend fun shareSession(
        @Path("id") id: String,
        @Body request: ShareRequestDto
    ): Response<ShareResponseDto>

    @GET("sessions/analytics/progress")
    suspend fun getProgressTimeline(): Response<List<ProgressDataPointDto>>

    @GET("sessions/analytics/weak-areas")
    suspend fun getWeakAreas(): Response<List<TopicClusterDto>>

    @GET("sessions/analytics/strengths")
    suspend fun getStrengths(): Response<List<StrengthClusterDto>>

    @GET("sessions/streak")
    suspend fun getStreak(): Response<StreakResponseDto>

    @GET("sessions/export")
    suspend fun exportSessions(@Query("format") format: String): Response<ExportDataResponseDto>
}
