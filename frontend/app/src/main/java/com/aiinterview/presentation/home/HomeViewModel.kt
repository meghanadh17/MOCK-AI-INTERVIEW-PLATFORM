package com.aiinterview.presentation.home

import androidx.lifecycle.viewModelScope
import com.aiinterview.core.base.BaseViewModel
import com.aiinterview.core.result.Result
import com.aiinterview.domain.repository.AuthRepository
import com.aiinterview.domain.repository.JobsRepository
import com.aiinterview.domain.repository.ResumeRepository
import com.aiinterview.domain.repository.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val sessionRepository: SessionRepository,
    private val jobsRepository: JobsRepository,
    private val resumeRepository: ResumeRepository
) : BaseViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadDashboardData()
    }

    fun loadDashboardData() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                // Fetch User profile and Resume list concurrently
                val userDeferred = async { authRepository.getCurrentUser() }
                val resumesDeferred = async { resumeRepository.getResumes() }

                val userResult = userDeferred.await()
                val resumesResult = resumesDeferred.await()

                if (userResult is Result.Error) {
                    _uiState.update { it.copy(isLoading = false, error = userResult.exception.userMessage) }
                    return@launch
                }

                val user = (userResult as Result.Success).data

                // Fetch Session History and Recommendations concurrently
                val sessionsDeferred = async { sessionRepository.getSessionHistory(limit = 5) }

                val resumesList = (resumesResult as? Result.Success)?.data ?: emptyList()
                val primaryResume = resumesList.find { it.isPrimary } ?: resumesList.firstOrNull()

                val jobsDeferred = if (primaryResume != null) {
                    async { jobsRepository.getRecommendations(primaryResume.id, limit = 3) }
                } else {
                    null
                }

                val sessionsResult = sessionsDeferred.await()
                val jobsResult = jobsDeferred?.await()

                val recentSessions = (sessionsResult as? Result.Success)?.data ?: emptyList()
                val jobMatches = (jobsResult as? Result.Success)?.data ?: emptyList()

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        recentSessions = recentSessions,
                        jobMatches = jobMatches
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.localizedMessage ?: "Unknown error occurred") }
            }
        }
    }

    fun toggleSaveJob(jobId: String, currentSaved: Boolean) {
        viewModelScope.launch {
            val result = if (currentSaved) {
                jobsRepository.unsaveJob(jobId)
            } else {
                jobsRepository.saveJob(jobId)
            }
            if (result is Result.Success) {
                _uiState.update { state ->
                    state.copy(
                        jobMatches = state.jobMatches.map {
                            if (it.id == jobId) it.copy(isSaved = !currentSaved) else it
                        }
                    )
                }
            }
        }
    }
}
