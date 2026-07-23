package com.aiinterview.domain.model

data class LeaderboardEntry(
    val rank: Int,
    val userId: String,
    val name: String,
    val score: Double,
    val isCurrentUser: Boolean
)

data class UserRankItem(
    val rank: Int?,
    val score: Double,
    val percentile: Double
)

data class UserRank(
    val globalBoard: UserRankItem,
    val weeklyBoard: UserRankItem
)

data class QuizStats(
    val avgScore: Double,
    val bestScore: Double,
    val totalTimeS: Int,
    val streak: Int
)
