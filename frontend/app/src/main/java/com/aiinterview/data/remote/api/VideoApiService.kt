package com.aiinterview.data.remote.api

import com.aiinterview.data.remote.dto.video.*
import retrofit2.Response
import retrofit2.http.*

interface VideoApiService {
    @POST("video-interview/sessions")
    suspend fun createVideoSession(@Body params: Map<String, @JvmSuppressWildcards Any?>): Response<VideoSessionResponseDto>

    @GET("video-interview/sessions/{id}")
    suspend fun getVideoSession(@Path("id") id: String): Response<VideoSessionDto>

    @POST("video-interview/sessions/{id}/start")
    suspend fun startVideoSession(@Path("id") id: String): Response<VideoSessionDto>

    @POST("video-interview/sessions/{id}/end")
    suspend fun endVideoSession(@Path("id") id: String): Response<VideoSessionDto>

    @POST("video-interview/sessions/{id}/frame")
    suspend fun submitFrame(@Path("id") id: String, @Body frameBytes: okhttp3.RequestBody): Response<Map<String, Any>>

    @GET("video-interview/sessions/{id}/posture-report")
    suspend fun getPostureReport(@Path("id") id: String): Response<PostureReportDto>

    @GET("video-interview/sessions/{id}/gaze-report")
    suspend fun getGazeReport(@Path("id") id: String): Response<GazeReportDto>

    @GET("video-interview/sessions/{id}/emotion-report")
    suspend fun getEmotionReport(@Path("id") id: String): Response<EmotionReportDto>

    @GET("video-interview/sessions/{id}/speech-report")
    suspend fun getSpeechReport(@Path("id") id: String): Response<SpeechReportResponseDto>

    @GET("video-interview/sessions/{id}/summary")
    suspend fun getVideoSummary(@Path("id") id: String): Response<VideoSummaryDto>

    @GET("video-interview/sessions/{id}/recording")
    suspend fun getRecordingUrl(@Path("id") id: String): Response<Map<String, Any>>

    @Multipart
    @POST("video-interview/sessions/{id}/recording")
    suspend fun uploadRecording(
        @Path("id") id: String,
        @Part file: okhttp3.MultipartBody.Part
    ): Response<Map<String, Any>>

    @GET("video-interview/sessions")
    suspend fun listVideoSessions(): Response<List<VideoSessionDto>>

    @DELETE("video-interview/sessions/{id}")
    suspend fun deleteVideoSession(@Path("id") id: String): Response<Unit>
}

