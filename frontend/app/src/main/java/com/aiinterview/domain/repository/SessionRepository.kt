package com.aiinterview.domain.repository

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.*

interface SessionRepository {
    suspend fun getSessionHistory(skip: Int? = null, limit: Int? = null): Result<List<InterviewSession>>
    suspend fun getSessionSummary(id: String): Result<SessionSummary>
    suspend fun getSessionScoreBreakdown(id: String): Result<ScoreBreakdown>
    suspend fun getSessionImprovements(id: String): Result<SessionImprovements>
    suspend fun shareSession(id: String, expiresInHours: Int? = null): Result<ShareResult>
    suspend fun getProgressTimeline(): Result<List<ProgressDataPoint>>
    suspend fun getWeakAreas(): Result<List<TopicCluster>>
    suspend fun getStrengths(): Result<List<StrengthCluster>>
    suspend fun getStreak(): Result<StreakInfo>
    suspend fun exportSessions(format: String): Result<ExportResult>
    suspend fun deleteSession(id: String): Result<Unit>
}

