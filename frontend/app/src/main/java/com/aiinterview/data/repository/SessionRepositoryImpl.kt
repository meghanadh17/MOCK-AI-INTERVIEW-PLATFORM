package com.aiinterview.data.repository

import com.aiinterview.core.result.ApiException
import com.aiinterview.core.result.Result
import com.aiinterview.data.remote.api.SessionApiService
import com.aiinterview.data.remote.dto.sessions.ShareRequestDto
import com.aiinterview.domain.model.*
import com.aiinterview.domain.repository.SessionRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionRepositoryImpl @Inject constructor(
    private val api: SessionApiService
) : SessionRepository {

    override suspend fun getSessionHistory(skip: Int?, limit: Int?): Result<List<InterviewSession>> = try {
        val response = api.getSessionHistory(skip, limit)
        if (response.isSuccessful) {
            val dtoList = response.body() ?: emptyList()
            val domainList = dtoList.map { dto ->
                InterviewSession(
                    id = dto.id,
                    title = dto.title,
                    type = dto.type,
                    status = dto.status,
                    overallScore = dto.grade,
                    createdAt = dto.created_at
                )
            }
            Result.Success(domainList)
        } else {
            Result.Error("Failed to fetch session history: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getSessionSummary(id: String): Result<SessionSummary> = try {
        val response = api.getSessionSummary(id)
        if (response.isSuccessful && response.body() != null) {
            val dto = response.body()!!
            Result.Success(
                SessionSummary(
                    sessionId = dto.sessionId,
                    summary = dto.summary,
                    whatWentWell = dto.whatWentWell,
                    whatToImprove = dto.whatToImprove,
                    overallPerformanceGrade = dto.overallPerformanceGrade
                )
            )
        } else {
            Result.Error("Failed to fetch session summary: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getSessionScoreBreakdown(id: String): Result<ScoreBreakdown> = try {
        val response = api.getSessionScoreBreakdown(id)
        if (response.isSuccessful && response.body() != null) {
            val dto = response.body()!!
            Result.Success(
                ScoreBreakdown(
                    sessionId = dto.sessionId,
                    technical = dto.technical,
                    communication = dto.communication,
                    confidence = dto.confidence,
                    structure = dto.structure,
                    relevance = dto.relevance
                )
            )
        } else {
            Result.Error("Failed to fetch score breakdown: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getSessionImprovements(id: String): Result<SessionImprovements> = try {
        val response = api.getSessionImprovements(id)
        if (response.isSuccessful && response.body() != null) {
            val dto = response.body()!!
            Result.Success(
                SessionImprovements(
                    sessionId = dto.sessionId,
                    studyPlan30d = dto.studyPlan30d,
                    weaknesses = dto.weaknesses
                )
            )
        } else {
            Result.Error("Failed to fetch improvements: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun shareSession(id: String, expiresInHours: Int?): Result<ShareResult> = try {
        val response = api.shareSession(id, ShareRequestDto(expiresInHours))
        if (response.isSuccessful && response.body() != null) {
            val dto = response.body()!!
            Result.Success(
                ShareResult(
                    shareUrl = dto.shareUrl,
                    shareToken = dto.shareToken,
                    expiresAt = dto.expiresAt
                )
            )
        } else {
            Result.Error("Failed to share session: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getProgressTimeline(): Result<List<ProgressDataPoint>> = try {
        val response = api.getProgressTimeline()
        if (response.isSuccessful) {
            val dtoList = response.body() ?: emptyList()
            val domainList = dtoList.map { dto ->
                ProgressDataPoint(
                    date = dto.date,
                    avgScore = dto.avgScore,
                    technical = dto.technical,
                    communication = dto.communication,
                    confidence = dto.confidence,
                    structure = dto.structure,
                    relevance = dto.relevance
                )
            }
            Result.Success(domainList)
        } else {
            Result.Error("Failed to fetch progress timeline: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getWeakAreas(): Result<List<TopicCluster>> = try {
        val response = api.getWeakAreas()
        if (response.isSuccessful) {
            val dtoList = response.body() ?: emptyList()
            val domainList = dtoList.map { dto ->
                TopicCluster(
                    topic = dto.topic,
                    frequency = dto.frequency,
                    averageScore = dto.averageScore
                )
            }
            Result.Success(domainList)
        } else {
            Result.Error("Failed to fetch weak areas: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getStrengths(): Result<List<StrengthCluster>> = try {
        val response = api.getStrengths()
        if (response.isSuccessful) {
            val dtoList = response.body() ?: emptyList()
            val domainList = dtoList.map { dto ->
                StrengthCluster(
                    topic = dto.topic,
                    frequency = dto.frequency
                )
            }
            Result.Success(domainList)
        } else {
            Result.Error("Failed to fetch strengths: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getStreak(): Result<StreakInfo> = try {
        val response = api.getStreak()
        if (response.isSuccessful && response.body() != null) {
            val dto = response.body()!!
            Result.Success(
                StreakInfo(
                    currentStreak = dto.currentStreak,
                    longestStreak = dto.longestStreak,
                    lastSessionDate = dto.lastSessionDate
                )
            )
        } else {
            Result.Error("Failed to fetch streak: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun exportSessions(format: String): Result<ExportResult> = try {
        val response = api.exportSessions(format)
        if (response.isSuccessful && response.body() != null) {
            val dto = response.body()!!
            Result.Success(
                ExportResult(
                    format = dto.format,
                    exportedAt = dto.exportedAt,
                    downloadUrl = dto.downloadUrl
                )
            )
        } else {
            Result.Error("Failed to export sessions: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun deleteSession(id: String): Result<Unit> = try {
        val response = api.deleteSession(id)
        if (response.isSuccessful) {
            Result.Success(Unit)
        } else {
            Result.Error("Failed to delete session: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }
}
