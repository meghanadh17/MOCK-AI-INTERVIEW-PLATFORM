package com.aiinterview.presentation.quiz

import androidx.lifecycle.viewModelScope
import com.aiinterview.core.base.BaseViewModel
import com.aiinterview.core.result.Result
import com.aiinterview.core.storage.TokenDataStore
import com.aiinterview.core.websocket.WebSocketEvent
import com.aiinterview.core.websocket.WebSocketManager
import com.aiinterview.domain.model.*
import com.aiinterview.domain.repository.QuizRepository
import com.google.gson.Gson
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class QuizNavigationEvent {
    data class StartQuizAttempt(val quizId: String, val attemptId: String) : QuizNavigationEvent()
    data class ViewQuizResult(val quizId: String, val attemptId: String) : QuizNavigationEvent()
}

@HiltViewModel
class QuizViewModel @Inject constructor(
    private val repo: QuizRepository,
    private val webSocketManager: WebSocketManager,
    private val tokenDataStore: TokenDataStore
) : BaseViewModel() {

    private val gson = Gson()

    private val _quizList = MutableStateFlow<List<Quiz>>(emptyList())
    val quizList: StateFlow<List<Quiz>> = _quizList.asStateFlow()

    private val _userStats = MutableStateFlow<QuizStats?>(null)
    val userStats: StateFlow<QuizStats?> = _userStats.asStateFlow()

    private val _leaderboardList = MutableStateFlow<List<LeaderboardEntry>>(emptyList())
    val leaderboardList: StateFlow<List<LeaderboardEntry>> = _leaderboardList.asStateFlow()

    private val _myRank = MutableStateFlow<UserRank?>(null)
    val myRank: StateFlow<UserRank?> = _myRank.asStateFlow()

    private val _activeQuizDetail = MutableStateFlow<QuizDetail?>(null)
    val activeQuizDetail: StateFlow<QuizDetail?> = _activeQuizDetail.asStateFlow()

    private val _activeAttempt = MutableStateFlow<AttemptStartResponse?>(null)
    val activeAttempt: StateFlow<AttemptStartResponse?> = _activeAttempt.asStateFlow()

    private val _quizTopics = MutableStateFlow<List<QuizTopic>>(emptyList())
    val quizTopics: StateFlow<List<QuizTopic>> = _quizTopics.asStateFlow()

    private val _myAttempts = MutableStateFlow<List<UserAttempt>>(emptyList())
    val myAttempts: StateFlow<List<UserAttempt>> = _myAttempts.asStateFlow()

    private val _currentQuestionIndex = MutableStateFlow(0)
    val currentQuestionIndex: StateFlow<Int> = _currentQuestionIndex.asStateFlow()

    val currentQuestion: StateFlow<QuizQuestion?> = combine(
        _activeQuizDetail,
        _currentQuestionIndex
    ) { detail, index ->
        detail?.questions?.getOrNull(index)
    }.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    private val _selectedOption = MutableStateFlow<String?>(null)
    val selectedOption: StateFlow<String?> = _selectedOption.asStateFlow()

    private val _isAnswerSubmitted = MutableStateFlow(false)
    val isAnswerSubmitted: StateFlow<Boolean> = _isAnswerSubmitted.asStateFlow()

    private val _answerResult = MutableStateFlow<AnswerSubmitResponse?>(null)
    val answerResult: StateFlow<AnswerSubmitResponse?> = _answerResult.asStateFlow()

    private val _timeLeft = MutableStateFlow(300)
    val timeLeft: StateFlow<Int> = _timeLeft.asStateFlow()

    private val _quizResult = MutableStateFlow<QuizResult?>(null)
    val quizResult: StateFlow<QuizResult?> = _quizResult.asStateFlow()

    private val _isSubmittingAnswer = MutableStateFlow(false)
    val isSubmittingAnswer: StateFlow<Boolean> = _isSubmittingAnswer.asStateFlow()

    private val _navigationEvent = MutableSharedFlow<QuizNavigationEvent>(replay = 0, extraBufferCapacity = 64)
    val navigationEvent: SharedFlow<QuizNavigationEvent> = _navigationEvent.asSharedFlow()

    private var localTimerJob: Job? = null

    private suspend fun fetchQuizzes() {
        when (val result = repo.getQuizzes()) {
            is Result.Success -> _quizList.value = result.data
            is Result.Error -> _error.emit(result.exception.userMessage)
            else -> {}
        }
    }

    private suspend fun fetchStats() {
        when (val result = repo.getStats()) {
            is Result.Success -> _userStats.value = result.data
            else -> {}
        }
    }

    private suspend fun fetchMyRank() {
        when (val result = repo.getMyRank()) {
            is Result.Success -> _myRank.value = result.data
            else -> {}
        }
    }

    private suspend fun fetchTopics() {
        when (val result = repo.getQuizTopics()) {
            is Result.Success -> _quizTopics.value = result.data
            else -> {}
        }
    }

    private suspend fun fetchMyAttempts() {
        when (val result = repo.getMyAttempts()) {
            is Result.Success -> _myAttempts.value = result.data
            else -> {}
        }
    }

    fun loadQuizHome() {
        val showLoader = _quizList.value.isEmpty()
        if (showLoader) {
            _isLoading.value = true
        }
        viewModelScope.launch {
            try {
                val jobs = listOf(
                    launch { fetchQuizzes() },
                    launch { fetchStats() },
                    launch { fetchMyRank() },
                    launch { fetchTopics() },
                    launch { fetchMyAttempts() }
                )
                jobs.forEach { it.join() }
            } finally {
                if (showLoader) {
                    _isLoading.value = false
                }
            }
        }
    }

    fun loadQuizzes() {
        viewModelScope.launch { fetchQuizzes() }
    }

    fun loadStats() {
        viewModelScope.launch { fetchStats() }
    }

    fun loadMyRank() {
        viewModelScope.launch { fetchMyRank() }
    }

    fun loadTopics() {
        viewModelScope.launch { fetchTopics() }
    }

    fun loadMyAttempts() {
        viewModelScope.launch { fetchMyAttempts() }
    }

    private suspend fun startQuizInternal(quizId: String): Boolean {
        when (val result = repo.startQuiz(quizId)) {
            is Result.Success -> {
                _activeAttempt.value = result.data
                _currentQuestionIndex.value = 0
                _selectedOption.value = null
                _isAnswerSubmitted.value = false
                _answerResult.value = null
                _quizResult.value = null
                
                val maxTime = result.data.timeLimitS ?: 300
                startLocalTimer(maxTime)
                connectQuizWebSocket(result.data.attemptId)
                
                _navigationEvent.emit(QuizNavigationEvent.StartQuizAttempt(result.data.quizId, result.data.attemptId))
                return true
            }
            is Result.Error -> {
                _error.emit(result.exception.userMessage)
                return false
            }
            else -> return false
        }
    }

    fun generateQuiz(topic: String, difficulty: String, count: Int) {
        _isLoading.value = true
        viewModelScope.launch {
            try {
                when (val result = repo.generateQuiz(topic, difficulty, count)) {
                    is Result.Success -> {
                        _activeQuizDetail.value = result.data
                        fetchQuizzes()
                        startQuizInternal(result.data.id)
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

    fun startQuiz(quizId: String) {
        _isLoading.value = true
        viewModelScope.launch {
            try {
                startQuizInternal(quizId)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadQuizDetail(id: String) {
        val alreadyLoaded = _activeQuizDetail.value?.id == id
        if (alreadyLoaded) {
            viewModelScope.launch {
                when (val result = repo.getQuizDetail(id)) {
                    is Result.Success -> _activeQuizDetail.value = result.data
                    else -> {}
                }
            }
            return
        }

        _isLoading.value = true
        viewModelScope.launch {
            try {
                when (val result = repo.getQuizDetail(id)) {
                    is Result.Success -> _activeQuizDetail.value = result.data
                    is Result.Error -> _error.emit(result.exception.userMessage)
                    else -> {}
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun resumeQuiz(quizId: String, attemptId: String) {
        if (_activeAttempt.value?.attemptId == attemptId) return
        _isLoading.value = true
        viewModelScope.launch {
            try {
                when (val result = repo.getQuizDetail(quizId)) {
                    is Result.Success -> {
                        _activeQuizDetail.value = result.data
                        val maxTime = result.data.timeLimitS ?: 300
                        _activeAttempt.value = AttemptStartResponse(attemptId, quizId, "", maxTime)
                        _currentQuestionIndex.value = 0
                        _selectedOption.value = null
                        _isAnswerSubmitted.value = false
                        _answerResult.value = null
                        _quizResult.value = null
                        startLocalTimer(maxTime)
                        connectQuizWebSocket(attemptId)
                    }
                    is Result.Error -> _error.emit(result.exception.userMessage)
                    else -> {}
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun selectOption(option: String) {
        if (!_isAnswerSubmitted.value) {
            _selectedOption.value = option
        }
    }

    fun submitAnswer() {
        val attempt = _activeAttempt.value ?: return
        val question = currentQuestion.value ?: return
        val option = _selectedOption.value ?: return
        
        _isSubmittingAnswer.value = true
        viewModelScope.launch {
            try {
                when (val result = repo.submitAnswer(attempt.quizId, attempt.attemptId, question.id, option)) {
                    is Result.Success -> {
                        _answerResult.value = result.data
                        _isAnswerSubmitted.value = true
                    }
                    is Result.Error -> _error.emit(result.exception.userMessage)
                    else -> {}
                }
            } finally {
                _isSubmittingAnswer.value = false
            }
        }
    }

    fun nextQuestion() {
        val detail = _activeQuizDetail.value ?: return
        val nextIndex = _currentQuestionIndex.value + 1
        if (nextIndex < detail.questions.size) {
            _currentQuestionIndex.value = nextIndex
            _selectedOption.value = null
            _isAnswerSubmitted.value = false
            _answerResult.value = null
        } else {
            finishQuiz()
        }
    }

    fun finishQuiz() {
        val attempt = _activeAttempt.value ?: return
        localTimerJob?.cancel()
        webSocketManager.disconnect("quiz")
        _isLoading.value = true
        viewModelScope.launch {
            try {
                when (val result = repo.finishAttempt(attempt.quizId, attempt.attemptId)) {
                    is Result.Success -> {
                        _quizResult.value = result.data
                        fetchStats()
                        _activeAttempt.value = null
                        _navigationEvent.emit(QuizNavigationEvent.ViewQuizResult(result.data.quizId, result.data.attemptId))
                    }
                    is Result.Error -> _error.emit(result.exception.userMessage)
                    else -> {}
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadResults(quizId: String, attemptId: String) {
        val alreadyLoaded = _quizResult.value?.attemptId == attemptId
        if (alreadyLoaded) {
            viewModelScope.launch {
                when (val result = repo.getAttemptResult(quizId, attemptId)) {
                    is Result.Success -> _quizResult.value = result.data
                    else -> {}
                }
            }
            return
        }

        _isLoading.value = true
        viewModelScope.launch {
            try {
                when (val result = repo.getAttemptResult(quizId, attemptId)) {
                    is Result.Success -> _quizResult.value = result.data
                    is Result.Error -> _error.emit(result.exception.userMessage)
                    else -> {}
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadLeaderboard(type: String, quizId: String? = null) {
        val showLoader = _leaderboardList.value.isEmpty()
        if (showLoader) {
            _isLoading.value = true
        }
        viewModelScope.launch {
            try {
                val result = when {
                    type == "This Quiz" && quizId != null -> repo.getQuizLeaderboard(quizId)
                    type == "Weekly" -> repo.getWeeklyLeaderboard()
                    else -> repo.getGlobalLeaderboard()
                }
                when (result) {
                    is Result.Success -> _leaderboardList.value = result.data
                    is Result.Error -> _error.emit(result.exception.userMessage)
                    else -> {}
                }
            } finally {
                if (showLoader) {
                    _isLoading.value = false
                }
            }
        }
    }

    private fun startLocalTimer(initialSeconds: Int) {
        localTimerJob?.cancel()
        _timeLeft.value = initialSeconds
        localTimerJob = viewModelScope.launch {
            while (_timeLeft.value > 0) {
                delay(1000)
                _timeLeft.value = _timeLeft.value - 1
            }
            finishQuiz()
        }
    }

    private fun connectQuizWebSocket(attemptId: String) {
        val base = com.aiinterview.BuildConfig.API_BASE_URL
        val hostPort = base.substringAfter("://").substringBefore("/")
        val protocol = if (base.startsWith("https")) "wss" else "ws"
        viewModelScope.launch {
            try {
                val token = tokenDataStore.getAccessToken() ?: ""
                val wsUrl = "$protocol://$hostPort/ws/quiz/$attemptId?token=$token"
                webSocketManager.connect("quiz", wsUrl)
                webSocketManager.getEvents("quiz")?.collect { event ->
                    when (event) {
                        is WebSocketEvent.Message -> {
                            try {
                                val json = gson.fromJson(event.text, com.google.gson.JsonObject::class.java)
                                if (json.has("time_left")) {
                                    val wsTimeLeft = json.get("time_left").asInt
                                    _timeLeft.value = wsTimeLeft
                                    if (localTimerJob?.isActive != true) {
                                        startLocalTimer(wsTimeLeft)
                                    }
                                }
                            } catch (e: Exception) {}
                        }
                        else -> {}
                    }
                }
            } catch (e: Exception) {}
        }
    }

    fun clearActiveAttempt() {
        _activeAttempt.value = null
    }

    fun clearQuizResult() {
        _quizResult.value = null
    }

    fun deleteAttempt(attemptId: String) {
        _isLoading.value = true
        viewModelScope.launch {
            try {
                when (val result = repo.deleteAttempt(attemptId)) {
                    is Result.Success -> {
                        fetchMyAttempts()
                        fetchStats()
                        fetchMyRank()
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

    override fun onCleared() {
        super.onCleared()
        localTimerJob?.cancel()
        webSocketManager.disconnect("quiz")
    }
}

