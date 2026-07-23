package com.aiinterview.presentation.home

import com.aiinterview.domain.model.InterviewSession
import com.aiinterview.domain.model.JobMatch
import com.aiinterview.domain.model.User

data class HomeUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val recentSessions: List<InterviewSession> = emptyList(),
    val jobMatches: List<JobMatch> = emptyList(),
    val error: String? = null
)
