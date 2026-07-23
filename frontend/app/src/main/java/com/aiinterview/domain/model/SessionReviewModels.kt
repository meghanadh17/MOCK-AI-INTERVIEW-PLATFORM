package com.aiinterview.domain.model

data class SessionSummary(
    val sessionId: String,
    val summary: String,
    val whatWentWell: String,
    val whatToImprove: String,
    val overallPerformanceGrade: Float
)

data class ScoreBreakdown(
    val sessionId: String,
    val technical: Float,
    val communication: Float,
    val confidence: Float,
    val structure: Float,
    val relevance: Float
)

data class SessionImprovements(
    val sessionId: String,
    val studyPlan30d: Map<String, List<String>>,
    val weaknesses: List<String>
)

data class ProgressDataPoint(
    val date: String,
    val avgScore: Float,
    val technical: Float,
    val communication: Float,
    val confidence: Float,
    val structure: Float,
    val relevance: Float
)

data class TopicCluster(
    val topic: String,
    val frequency: Int,
    val averageScore: Float
)

data class StrengthCluster(
    val topic: String,
    val frequency: Int
)

data class StreakInfo(
    val currentStreak: Int,
    val longestStreak: Int,
    val lastSessionDate: String?
)

data class ShareResult(
    val shareUrl: String,
    val shareToken: String,
    val expiresAt: String?
)

data class ExportResult(
    val format: String,
    val exportedAt: String,
    val downloadUrl: String?
)
