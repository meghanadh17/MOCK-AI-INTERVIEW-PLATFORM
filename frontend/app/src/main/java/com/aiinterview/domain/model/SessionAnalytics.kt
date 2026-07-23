package com.aiinterview.domain.model

data class SessionAnalytics(val totalSessions: Int, val averageScore: Float, val sessionsByType: Map<String, Int>, val improvementTrend: List<Float>)
