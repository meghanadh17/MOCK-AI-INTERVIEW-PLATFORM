package com.aiinterview.data.remote.dto.quiz

import com.google.gson.annotations.SerializedName

data class LeaderboardUserItemDto(
    val rank: Int,
    @SerializedName("user_id") val userId: String,
    val name: String,
    val score: Double,
    @SerializedName("is_current_user") val isCurrentUser: Boolean
)

data class QuizLeaderboardResponseDto(
    val leaderboard: List<LeaderboardUserItemDto>
)

data class UserRankItemDto(
    val rank: Int?,
    val score: Double,
    val percentile: Double
)

data class UserRankResponseDto(
    @SerializedName("global_board") val globalBoard: UserRankItemDto,
    @SerializedName("weekly_board") val weeklyBoard: UserRankItemDto
)

data class QuizStatsResponseDto(
    @SerializedName("avg_score") val avgScore: Double,
    @SerializedName("best_score") val bestScore: Double,
    @SerializedName("total_time_s") val totalTimeS: Int,
    val streak: Int
)
