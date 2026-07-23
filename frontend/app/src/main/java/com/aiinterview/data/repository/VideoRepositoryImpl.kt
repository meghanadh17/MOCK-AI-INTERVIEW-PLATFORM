package com.aiinterview.data.repository

import com.aiinterview.domain.repository.VideoRepository
import com.aiinterview.data.remote.api.VideoApiService
import javax.inject.Inject
import javax.inject.Singleton

import com.aiinterview.core.result.ApiException
import com.aiinterview.core.result.Result
import com.aiinterview.data.local.dao.VideoSessionDao
import com.aiinterview.data.mapper.VideoMapper.toDomain
import com.aiinterview.data.mapper.VideoMapper.toEntity
import com.aiinterview.domain.model.*
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import okhttp3.MediaType.Companion.toMediaTypeOrNull


@Singleton
class VideoRepositoryImpl @Inject constructor(
    private val api: VideoApiService,
    private val dao: VideoSessionDao
) : VideoRepository {

    override suspend fun createVideoSession(
        resumeId: String?,
        role: String,
        type: String,
        difficulty: Float,
        numQuestions: Int,
        jobDescription: String?
    ): Result<VideoSession> = try {
        val params = mapOf(
            "resume_id" to resumeId,
            "role" to role,
            "type" to type,
            "difficulty" to difficulty,
            "num_questions" to numQuestions,
            "job_description" to jobDescription
        )
        val response = api.createVideoSession(params)
        if (response.isSuccessful && response.body() != null) {
            val session = response.body()!!.session.toDomain()
            // Cache locally
            dao.insertSession(response.body()!!.session.toEntity())
            Result.Success(session)
        } else {
            Result.Error("Failed to create video session: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun startVideoSession(sessionId: String): Result<VideoSession> = try {
        val response = api.startVideoSession(sessionId)
        if (response.isSuccessful && response.body() != null) {
            val session = response.body()!!.toDomain()
            dao.insertSession(response.body()!!.toEntity())
            Result.Success(session)
        } else {
            Result.Error("Failed to start session: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun endVideoSession(sessionId: String): Result<VideoSession> = try {
        val response = api.endVideoSession(sessionId)
        if (response.isSuccessful && response.body() != null) {
            val session = response.body()!!.toDomain()
            dao.insertSession(response.body()!!.toEntity())
            Result.Success(session)
        } else {
            Result.Error("Failed to end session: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getCombinedReport(sessionId: String): Result<VideoReportCombined> = coroutineScope {
        try {
            val postureDeferred = async { api.getPostureReport(sessionId) }
            val gazeDeferred = async { api.getGazeReport(sessionId) }
            val emotionDeferred = async { api.getEmotionReport(sessionId) }
            val speechDeferred = async { api.getSpeechReport(sessionId) }
            val summaryDeferred = async { api.getVideoSummary(sessionId) }

            val postureRes = postureDeferred.await()
            val gazeRes = gazeDeferred.await()
            val emotionRes = emotionDeferred.await()
            val speechRes = speechDeferred.await()
            val summaryRes = summaryDeferred.await()

            if (postureRes.isSuccessful && postureRes.body() != null &&
                gazeRes.isSuccessful && gazeRes.body() != null &&
                emotionRes.isSuccessful && emotionRes.body() != null &&
                speechRes.isSuccessful && speechRes.body() != null &&
                summaryRes.isSuccessful && summaryRes.body() != null
            ) {
                val posture = postureRes.body()!!.toDomain()
                val gaze = gazeRes.body()!!.toDomain()
                val emotion = emotionRes.body()!!.toDomain()
                val speech = speechRes.body()!!.toDomain()
                val summary = summaryRes.body()!!.toDomain()

                // Cache metrics locally under session (optional update if needed)
                val sessionDto = api.getVideoSession(sessionId).body()
                if (sessionDto != null) {
                    dao.insertSession(sessionDto.toEntity(
                        avgPostureScore = posture.averageScore,
                        avgEyeContact = gaze.eyeContactPercentage,
                        dominantEmotion = emotion.dominantEmotion
                    ))
                }

                Result.Success(
                    VideoReportCombined(
                        posture = posture,
                        gaze = gaze,
                        emotion = emotion,
                        speech = speech,
                        summary = summary
                    )
                )
            } else {
                Result.Error("Failed to load combined reports. Posture code: ${postureRes.code()}, Gaze code: ${gazeRes.code()}")
            }
        } catch (e: Exception) {
            Result.Error(ApiException.map(e))
        }
    }

    override suspend fun getRecordingUrl(sessionId: String): Result<String> = try {
        val response = api.getRecordingUrl(sessionId)
        if (response.isSuccessful && response.body() != null) {
            val recordingUrl = response.body()!!["recording_url"] as? String ?: ""
            Result.Success(recordingUrl)
        } else {
            Result.Error("Failed to fetch recording URL: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun uploadRecording(sessionId: String, file: java.io.File): Result<Unit> = try {
        val requestFile = okhttp3.RequestBody.create("video/mp4".toMediaTypeOrNull(), file)
        val body = okhttp3.MultipartBody.Part.createFormData("file", file.name, requestFile)
        val response = api.uploadRecording(sessionId, body)
        if (response.isSuccessful) {
            Result.Success(Unit)
        } else {
            Result.Error("Failed to upload recording: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun saveFrameMetricLocally(sessionId: String, metric: FrameMetric) {
        try {
            dao.insertFrameMetric(metric.toEntity(sessionId))
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override suspend fun getFrameMetricsLocally(sessionId: String): List<FrameMetric> = try {
        dao.getFrameMetrics(sessionId).map { it.toDomain() }
    } catch (e: Exception) {
        emptyList()
    }

    override suspend fun listVideoSessions(): Result<List<VideoSession>> = try {
        val response = api.listVideoSessions()
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.map { it.toDomain() })
        } else {
            Result.Error("Failed to fetch sessions: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun deleteVideoSession(sessionId: String): Result<Unit> = try {
        val response = api.deleteVideoSession(sessionId)
        if (response.isSuccessful) {
            dao.deleteSession(sessionId)
            dao.deleteFrameMetricsForSession(sessionId)
            Result.Success(Unit)
        } else {
            Result.Error("Failed to delete video session: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }
}

