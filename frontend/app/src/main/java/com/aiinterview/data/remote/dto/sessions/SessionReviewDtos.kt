package com.aiinterview.data.remote.dto.sessions

import com.google.gson.annotations.SerializedName

data class SessionSummaryResponseDto(
    @SerializedName("session_id") val sessionId: String,
    val summary: String,
    @SerializedName("what_went_well") val whatWentWell: String,
    @SerializedName("what_to_improve") val whatToImprove: String,
    @SerializedName("overall_performance_grade") val overallPerformanceGrade: Float
)

data class ScoreBreakdownResponseDto(
    @SerializedName("session_id") val sessionId: String,
    val technical: Float,
    val communication: Float,
    val confidence: Float,
    val structure: Float,
    val relevance: Float
)

data class SessionImprovementsResponseDto(
    @SerializedName("session_id") val sessionId: String,
    @SerializedName("study_plan_30d") val studyPlan30d: Map<String, List<String>>,
    val weaknesses: List<String>
)

data class ProgressDataPointDto(
    val date: String,
    @SerializedName("avg_score") val avgScore: Float,
    val technical: Float,
    val communication: Float,
    val confidence: Float,
    val structure: Float,
    val relevance: Float
)

data class TopicClusterDto(
    val topic: String,
    val frequency: Int,
    @SerializedName("average_score") val averageScore: Float
)

data class StrengthClusterDto(
    val topic: String,
    val frequency: Int
)

data class StreakResponseDto(
    @SerializedName("current_streak") val currentStreak: Int,
    @SerializedName("longest_streak") val longestStreak: Int,
    @SerializedName("last_session_date") val lastSessionDate: String?
)

data class ShareRequestDto(
    @SerializedName("expires_in_hours") val expiresInHours: Int?
)

data class ShareResponseDto(
    @SerializedName("share_url") val shareUrl: String,
    @SerializedName("share_token") val shareToken: String,
    @SerializedName("expires_at") val expiresAt: String?
)

data class ExportDataResponseDto(
    val format: String,
    @SerializedName("exported_at") val exportedAt: String,
    @SerializedName("download_url") val downloadUrl: String?,
    @SerializedName("data_summary") val dataSummary: Map<String, Any>
)
