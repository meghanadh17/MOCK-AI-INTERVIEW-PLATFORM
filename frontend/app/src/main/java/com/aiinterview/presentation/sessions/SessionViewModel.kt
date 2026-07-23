package com.aiinterview.presentation.sessions

import androidx.lifecycle.viewModelScope
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.cachedIn
import androidx.paging.filter
import com.aiinterview.core.base.BaseViewModel
import com.aiinterview.core.storage.UserPrefsDataStore
import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.*
import com.aiinterview.domain.repository.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SessionDetailState(
    val summary: SessionSummary? = null,
    val score: ScoreBreakdown? = null,
    val improvements: SessionImprovements? = null
)

data class AnalyticsState(
    val progressData: List<ProgressDataPoint> = emptyList(),
    val weakAreas: List<TopicCluster> = emptyList(),
    val strengths: List<StrengthCluster> = emptyList(),
    val streak: StreakInfo? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class SessionViewModel @Inject constructor(
    private val repository: SessionRepository,
    private val userPrefsDataStore: UserPrefsDataStore
) : BaseViewModel() {

    // --- Search & Filters for Session History ---
    val searchQuery = MutableStateFlow("")
    val filterType = MutableStateFlow("All") // "All", "Text", "Video"

    // Base paging pager
    private val pagingSourceFlow = Pager(
        config = PagingConfig(pageSize = 10, enablePlaceholders = false)
    ) {
        SessionHistoryPagingSource(repository)
    }.flow.cachedIn(viewModelScope)

    // Filtered paging flow combining paging data with search and filter flows
    val sessionHistoryFlow: Flow<PagingData<InterviewSession>> = combine(
        pagingSourceFlow,
        searchQuery,
        filterType
    ) { pagingData, query, type ->
        pagingData.filter { session ->
            val matchesSearch = session.title.contains(query, ignoreCase = true)
            val matchesType = when (type) {
                "Text" -> session.type.lowercase() == "text"
                "Video" -> session.type.lowercase() == "video"
                else -> true
            }
            matchesSearch && matchesType
        }
    }.cachedIn(viewModelScope)

    // --- Session Detail State ---
    private val _sessionDetail = MutableStateFlow<SessionDetailState?>(null)
    val sessionDetail: StateFlow<SessionDetailState?> = _sessionDetail.asStateFlow()

    // --- Analytics Progress State ---
    private val _analyticsState = MutableStateFlow(AnalyticsState())
    val analyticsState: StateFlow<AnalyticsState> = _analyticsState.asStateFlow()

    // --- Checklist state hooks ---
    fun getCheckedImprovements(sessionId: String): Flow<Set<String>> =
        userPrefsDataStore.getCheckedImprovements(sessionId)

    fun setCheckedImprovements(sessionId: String, checkedIds: Set<String>) {
        viewModelScope.launch {
            userPrefsDataStore.setCheckedImprovements(sessionId, checkedIds)
        }
    }

    // Load Session Details concurrently
    fun loadSessionDetail(sessionId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _sessionDetail.value = null
            try {
                // Fetch 3 detail endpoints concurrently
                val summaryDeferred = async { repository.getSessionSummary(sessionId) }
                val scoreDeferred = async { repository.getSessionScoreBreakdown(sessionId) }
                val improvementsDeferred = async { repository.getSessionImprovements(sessionId) }

                val summaryRes = summaryDeferred.await()
                val scoreRes = scoreDeferred.await()
                val improvementsRes = improvementsDeferred.await()

                if (summaryRes is Result.Success && scoreRes is Result.Success && improvementsRes is Result.Success) {
                    _sessionDetail.value = SessionDetailState(
                        summary = summaryRes.data,
                        score = scoreRes.data,
                        improvements = improvementsRes.data
                    )
                } else {
                    val errorList = listOfNotNull(
                        (summaryRes as? Result.Error)?.exception?.userMessage,
                        (scoreRes as? Result.Error)?.exception?.userMessage,
                        (improvementsRes as? Result.Error)?.exception?.userMessage
                    )
                    _error.emit(errorList.joinToString("; "))
                }
            } catch (e: Exception) {
                _error.emit(e.message ?: "Failed to load session details")
            } finally {
                _isLoading.value = false
            }
        }
    }

    // Load Analytics metrics concurrently
    fun loadAnalytics() {
        viewModelScope.launch {
            _analyticsState.value = _analyticsState.value.copy(isLoading = true, error = null)
            try {
                val progressDeferred = async { repository.getProgressTimeline() }
                val weakAreasDeferred = async { repository.getWeakAreas() }
                val strengthsDeferred = async { repository.getStrengths() }
                val streakDeferred = async { repository.getStreak() }

                val progressRes = progressDeferred.await()
                val weakAreasRes = weakAreasDeferred.await()
                val strengthsRes = strengthsDeferred.await()
                val streakRes = streakDeferred.await()

                val progressData = progressRes.getOrNull() ?: emptyList()
                val weakAreas = weakAreasRes.getOrNull() ?: emptyList()
                val strengths = strengthsRes.getOrNull() ?: emptyList()
                val streak = streakRes.getOrNull()

                _analyticsState.value = AnalyticsState(
                    progressData = progressData,
                    weakAreas = weakAreas,
                    strengths = strengths,
                    streak = streak,
                    isLoading = false
                )
            } catch (e: Exception) {
                _analyticsState.value = _analyticsState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load analytics"
                )
            }
        }
    }

    fun shareSession(sessionId: String, onUrlCreated: (String) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                when (val result = repository.shareSession(sessionId, expiresInHours = 24)) {
                    is Result.Success -> onUrlCreated(result.data.shareUrl)
                    is Result.Error -> _error.emit(result.exception.userMessage)
                    else -> {}
                }
            } catch (e: Exception) {
                _error.emit(e.message ?: "Failed to share session")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun exportSessions(format: String, onExportCompleted: (String) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                when (val result = repository.exportSessions(format)) {
                    is Result.Success -> result.data.downloadUrl?.let { onExportCompleted(it) }
                    is Result.Error -> _error.emit(result.exception.userMessage)
                    else -> {}
                }
            } catch (e: Exception) {
                _error.emit(e.message ?: "Failed to export reports")
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteSession(sessionId: String, onSuccess: () -> Unit) {
        _isLoading.value = true
        viewModelScope.launch {
            try {
                when (val result = repository.deleteSession(sessionId)) {
                    is Result.Success -> {
                        onSuccess()
                    }
                    is Result.Error -> {
                        _error.emit(result.exception.userMessage)
                    }
                    else -> {}
                }
            } finally {
                _isLoading.value = false
            }
        }
    }
}

