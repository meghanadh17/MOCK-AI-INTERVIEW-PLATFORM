package com.aiinterview.domain.repository

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.*

interface VideoRepository {
    suspend fun createVideoSession(
        resumeId: String?,
        role: String,
        type: String,
        difficulty: Float,
        numQuestions: Int,
        jobDescription: String? = null
    ): Result<VideoSession>

    suspend fun startVideoSession(sessionId: String): Result<VideoSession>
    suspend fun endVideoSession(sessionId: String): Result<VideoSession>
    
    suspend fun getCombinedReport(sessionId: String): Result<VideoReportCombined>
    suspend fun getRecordingUrl(sessionId: String): Result<String>
    suspend fun uploadRecording(sessionId: String, file: java.io.File): Result<Unit>
    
    suspend fun saveFrameMetricLocally(sessionId: String, metric: FrameMetric)
    suspend fun getFrameMetricsLocally(sessionId: String): List<FrameMetric>
    suspend fun listVideoSessions(): Result<List<VideoSession>>
    suspend fun deleteVideoSession(sessionId: String): Result<Unit>
}

