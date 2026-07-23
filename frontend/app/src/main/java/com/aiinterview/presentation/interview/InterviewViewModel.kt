package com.aiinterview.presentation.interview

import android.os.CountDownTimer
import androidx.lifecycle.viewModelScope
import com.aiinterview.core.base.BaseViewModel
import com.aiinterview.core.result.Result
import com.aiinterview.core.websocket.WebSocketEvent
import com.aiinterview.core.websocket.WebSocketManager
import com.aiinterview.data.remote.dto.interview.*
import com.aiinterview.domain.model.Resume
import com.aiinterview.domain.model.InterviewSession
import com.aiinterview.domain.repository.InterviewRepository
import com.aiinterview.domain.repository.ResumeRepository
import com.aiinterview.domain.repository.SessionRepository
import com.google.gson.Gson
import com.aiinterview.core.storage.TokenDataStore
import com.google.gson.JsonObject
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Locale
import javax.inject.Inject

enum class InterviewState {
    SETUP, ACTIVE, FEEDBACK, COMPLETED
}

@HiltViewModel
class InterviewViewModel @Inject constructor(
    private val interviewRepo: InterviewRepository,
    private val resumeRepo: ResumeRepository,
    private val sessionRepo: SessionRepository,
    private val webSocketManager: WebSocketManager,
    private val tokenDataStore: TokenDataStore
) : BaseViewModel() {

    private val _historyList = MutableStateFlow<List<InterviewSession>>(emptyList())
    val historyList: StateFlow<List<InterviewSession>> = _historyList.asStateFlow()

    private val _roles = MutableStateFlow<List<RoleDto>>(emptyList())
    val roles: StateFlow<List<RoleDto>> = _roles.asStateFlow()

    private val _evaluationFeedback = Channel<AnswerSubmitResponseDto>(Channel.BUFFERED)
    val evaluationFeedback: Flow<AnswerSubmitResponseDto> = _evaluationFeedback.receiveAsFlow()

    private var _pendingNextQuestion: QuestionDto? = null

    private val _state = MutableStateFlow(InterviewState.SETUP)
    val state: StateFlow<InterviewState> = _state.asStateFlow()

    private val _resumes = MutableStateFlow<List<Resume>>(emptyList())
    val resumes: StateFlow<List<Resume>> = _resumes.asStateFlow()

    private val _activeSession = MutableStateFlow<SessionDto?>(null)
    val activeSession: StateFlow<SessionDto?> = _activeSession.asStateFlow()

    private val _questions = MutableStateFlow<List<QuestionDto>>(emptyList())
    val questions: StateFlow<List<QuestionDto>> = _questions.asStateFlow()

    private val _currentQuestionIndex = MutableStateFlow(0)
    val currentQuestionIndex: StateFlow<Int> = _currentQuestionIndex.asStateFlow()

    private val _currentQuestion = MutableStateFlow<QuestionDto?>(null)
    val currentQuestion: StateFlow<QuestionDto?> = _currentQuestion.asStateFlow()

    private val _timerText = MutableStateFlow("20:00")
    val timerText: StateFlow<String> = _timerText.asStateFlow()

    private val _sessionReport = MutableStateFlow<ReportDto?>(null)
    val sessionReport: StateFlow<ReportDto?> = _sessionReport.asStateFlow()

    private val _questionBank = MutableStateFlow<List<QuestionDto>>(emptyList())
    val questionBank: StateFlow<List<QuestionDto>> = _questionBank.asStateFlow()

    private val _hintText = MutableStateFlow<String?>(null)
    val hintText: StateFlow<String?> = _hintText.asStateFlow()

    private val _isSubmitting = MutableStateFlow(false)
    val isSubmitting: StateFlow<Boolean> = _isSubmitting.asStateFlow()

    private val _isHintLoading = MutableStateFlow(false)
    val isHintLoading: StateFlow<Boolean> = _isHintLoading.asStateFlow()

    private val _isSkipping = MutableStateFlow(false)
    val isSkipping: StateFlow<Boolean> = _isSkipping.asStateFlow()

    private val _isEnding = MutableStateFlow(false)
    val isEnding: StateFlow<Boolean> = _isEnding.asStateFlow()

    private var countDownTimer: CountDownTimer? = null
    private val gson = Gson()

    fun loadResumes() {
        viewModelScope.launch {
            when (val result = resumeRepo.getResumes()) {
                is Result.Success -> _resumes.value = result.data
                else -> _resumes.value = emptyList()
            }
        }
    }

    fun loadRoles() {
        viewModelScope.launch {
            when (val result = interviewRepo.getRoles()) {
                is Result.Success -> _roles.value = result.data
                else -> _roles.value = emptyList()
            }
        }
    }

    fun loadHistory() {
        viewModelScope.launch {
            when (val result = sessionRepo.getSessionHistory()) {
                is Result.Success -> {
                    _historyList.value = result.data.filter { it.type.lowercase() == "text" }
                }
                else -> {
                    _historyList.value = emptyList()
                }
            }
        }
    }

    fun createSession(
        resumeId: String?,
        role: String,
        type: String,
        difficulty: Double,
        questionCount: Int,
        jobDescription: String? = null
    ) {
        _isLoading.value = true
        viewModelScope.launch {
            val title = "$role Mock Interview"
            when (val result = interviewRepo.createSession(resumeId, role, type, difficulty, questionCount, jobDescription, title)) {
                is Result.Success -> {
                    val session = result.data
                    _activeSession.value = session
                    _questions.value = session.questions ?: emptyList()
                    _currentQuestionIndex.value = 0
                    _currentQuestion.value = session.questions?.firstOrNull()
                    _state.value = InterviewState.ACTIVE
                    
                    connectWebSocket(session.id)
                    startTimer(1200)
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                }
                else -> {}
            }
            _isLoading.value = false
        }
    }

    private fun connectWebSocket(sessionId: String) {
        val base = com.aiinterview.BuildConfig.API_BASE_URL
        val hostPort = base.substringAfter("://").substringBefore("/")
        val protocol = if (base.startsWith("https")) "wss" else "ws"
        viewModelScope.launch {
            try {
                val token = tokenDataStore.getAccessToken() ?: ""
                val wsUrl = "$protocol://$hostPort/ws/interview/$sessionId?token=$token"
                webSocketManager.connect("interview", wsUrl)
                webSocketManager.getEvents("interview")?.collect { event ->
                    when (event) {
                        is WebSocketEvent.Message -> {
                            try {
                                val json = gson.fromJson(event.text, JsonObject::class.java)
                                val type = json.get("type")?.asString
                                if (type == "question") {
                                    val payload = json.getAsJsonObject("payload")
                                    if (payload != null) {
                                        val qId = payload.get("question_id")?.asString ?: ""
                                        val qText = payload.get("question_text")?.asString ?: ""
                                        val qIndex = payload.get("order_index")?.asInt ?: 0
                                        
                                        val questionDto = QuestionDto(
                                            id = qId,
                                            index = qIndex,
                                            text = qText
                                        )
                                        _currentQuestion.value = questionDto
                                        
                                        val currentList = _questions.value.toMutableList()
                                        if (currentList.none { it.id == qId }) {
                                            currentList.add(questionDto)
                                            _questions.value = currentList
                                        }
                                        
                                        _currentQuestionIndex.value = qIndex
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

    private fun startTimer(durationSeconds: Long) {
        countDownTimer?.cancel()
        countDownTimer = object : CountDownTimer(durationSeconds * 1000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val sec = millisUntilFinished / 1000
                val minutes = sec / 60
                val seconds = sec % 60
                _timerText.value = String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)
            }

            override fun onFinish() {
                _timerText.value = "00:00"
                endSession()
            }
        }.start()
    }

    fun submitAnswer(answerText: String) {
        val session = _activeSession.value ?: return
        _isSubmitting.value = true
        viewModelScope.launch {
            when (val result = interviewRepo.submitAnswer(session.id, answerText)) {
                is Result.Success -> {
                    _pendingNextQuestion = result.data.next_question
                    _evaluationFeedback.send(result.data)
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                }
                else -> {}
            }
            _isSubmitting.value = false
        }
    }

    fun goToNextQuestion(nextQuestionDto: QuestionDto?) {
        val nextIndex = _currentQuestionIndex.value + 1
        val totalCount = _activeSession.value?.total_questions ?: 5
        
        if (nextQuestionDto != null) {
            val currentList = _questions.value.toMutableList()
            if (currentList.none { it.id == nextQuestionDto.id }) {
                currentList.add(nextQuestionDto)
                _questions.value = currentList
            }
            _currentQuestionIndex.value = nextIndex
            _currentQuestion.value = nextQuestionDto
            _hintText.value = null
        } else if (nextIndex < _questions.value.size) {
            _currentQuestionIndex.value = nextIndex
            _currentQuestion.value = _questions.value[nextIndex]
            _hintText.value = null
        } else {
            endSession()
        }
    }

    fun clearFeedback() {
        // No-op: SharedFlow doesn't hold state, no need to clear
    }

    fun advanceAfterFeedback() {
        val nextQ = _pendingNextQuestion
        _pendingNextQuestion = null
        goToNextQuestion(nextQ)
    }

    fun selectQuestionAtIndex(index: Int) {
        if (index >= 0 && index < _questions.value.size) {
            _currentQuestionIndex.value = index
            _currentQuestion.value = _questions.value[index]
            _hintText.value = null
        }
    }

    fun requestHint() {
        val session = _activeSession.value ?: return
        val questionId = _currentQuestion.value?.id ?: return
        _isHintLoading.value = true
        viewModelScope.launch {
            when (val result = interviewRepo.requestHint(session.id, questionId)) {
                is Result.Success -> {
                    _hintText.value = result.data.hint_text
                }
                else -> {}
            }
            _isHintLoading.value = false
        }
    }

    fun skipQuestion() {
        val session = _activeSession.value ?: return
        val questionId = _currentQuestion.value?.id ?: return
        _isSkipping.value = true
        viewModelScope.launch {
            when (val result = interviewRepo.skipQuestion(session.id, questionId)) {
                is Result.Success -> {
                    val nextQ = result.data.nextQuestion
                    if (nextQ != null) {
                        goToNextQuestion(nextQ)
                    } else {
                        endSession()
                    }
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                }
                else -> {}
            }
            _isSkipping.value = false
        }
    }

    fun endSession() {
        val session = _activeSession.value ?: return
        countDownTimer?.cancel()
        webSocketManager.disconnect("interview")
        _isEnding.value = true
        viewModelScope.launch {
            when (val result = interviewRepo.endSession(session.id)) {
                is Result.Success -> {
                    _state.value = InterviewState.COMPLETED
                    loadReport(session.id)
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                }
                else -> {}
            }
            _isEnding.value = false
        }
    }

    fun loadReport(sessionId: String) {
        _isLoading.value = true
        viewModelScope.launch {
            val reportResult = interviewRepo.getReport(sessionId)
            val sessionResult = interviewRepo.getSession(sessionId)
            
            if (reportResult is Result.Success) {
                _sessionReport.value = reportResult.data
            }
            if (sessionResult is Result.Success) {
                val session = sessionResult.data
                _activeSession.value = session
                _questions.value = session.questions ?: emptyList()
            }
            
            if (reportResult is Result.Error) {
                _error.emit(reportResult.exception.userMessage)
            } else if (sessionResult is Result.Error) {
                _error.emit(sessionResult.exception.userMessage)
            }
            _isLoading.value = false
        }
    }

    fun loadQuestionBank(keyword: String? = null, category: String? = null) {
        _isLoading.value = true
        viewModelScope.launch {
            val list = listOf(
                QuestionDto("1", 1, "Explain Solid Principles in Android development.", "Technical", 0.75),
                QuestionDto("2", 2, "How do you optimize RecyclerView scrolling speeds?", "Technical", 0.5),
                QuestionDto("3", 3, "Describe a challenging issue you resolved in a past project.", "Behavioral", 0.5)
            )
            _questionBank.value = list.filter {
                (keyword == null || it.text.contains(keyword, ignoreCase = true)) &&
                (category == null || category == "All Categories" || it.category.equals(category, ignoreCase = true))
            }
            _isLoading.value = false
        }
    }

    fun resetSessionState() {
        _activeSession.value = null
        _state.value = InterviewState.SETUP
        _questions.value = emptyList()
        _currentQuestionIndex.value = 0
        _currentQuestion.value = null
        _timerText.value = "20:00"
        _sessionReport.value = null
    }

    fun loadActiveSession(sessionId: String) {
        _isLoading.value = true
        viewModelScope.launch {
            when (val result = interviewRepo.getSession(sessionId)) {
                is Result.Success -> {
                    val session = result.data
                    _activeSession.value = session
                    _questions.value = session.questions ?: emptyList()
                    
                    if (session.status == "created") {
                        when (val startResult = interviewRepo.startSession(session.id)) {
                            is Result.Success -> {
                                val firstQ = startResult.data
                                _currentQuestionIndex.value = 0
                                _currentQuestion.value = firstQ
                                
                                // Ensure the first question is in the list
                                val currentList = _questions.value.toMutableList()
                                if (currentList.none { it.id == firstQ.id }) {
                                    currentList.add(0, firstQ)
                                    _questions.value = currentList
                                }
                            }
                            is Result.Error -> {
                                // Fall back to first question from session list
                                _currentQuestionIndex.value = 0
                                _currentQuestion.value = session.questions?.firstOrNull()
                            }
                            else -> {}
                        }
                    } else {
                        // Session already active/started — find current unanswered question
                        val unanswered = session.questions?.firstOrNull { 
                            it.user_transcript == null && !it.is_skipped 
                        }
                        val idx = session.questions?.indexOf(unanswered) ?: 0
                        _currentQuestionIndex.value = if (idx >= 0) idx else 0
                        _currentQuestion.value = unanswered ?: session.questions?.firstOrNull()
                    }
                    
                    _state.value = InterviewState.ACTIVE
                    connectWebSocket(session.id)
                    startTimer(1200)
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                }
                else -> {}
            }
            _isLoading.value = false
        }
    }

    override fun onCleared() {
        super.onCleared()
        countDownTimer?.cancel()
        webSocketManager.disconnect("interview")
    }
}
