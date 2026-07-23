package com.aiinterview.presentation.video

import android.os.CountDownTimer
import androidx.lifecycle.viewModelScope
import com.aiinterview.core.base.BaseViewModel
import com.aiinterview.core.result.Result
import com.aiinterview.core.websocket.WebSocketEvent
import com.aiinterview.core.websocket.WebSocketManager
import com.aiinterview.domain.model.*
import com.aiinterview.domain.repository.ResumeRepository
import com.aiinterview.domain.repository.VideoRepository
import com.aiinterview.domain.repository.InterviewRepository
import com.aiinterview.core.storage.TokenDataStore
import com.google.gson.Gson
import com.google.gson.JsonObject
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import okio.ByteString.Companion.toByteString
import java.util.Locale
import javax.inject.Inject

enum class VideoState {
    SETUP, RECORDING, ANALYZING, COMPLETE
}

data class EvaluationResult(val grade: Float, val feedback: String)

@HiltViewModel
class VideoViewModel @Inject constructor(
    private val videoRepo: VideoRepository,
    private val resumeRepo: ResumeRepository,
    private val webSocketManager: WebSocketManager,
    private val tokenDataStore: TokenDataStore,
    private val interviewRepo: InterviewRepository
) : BaseViewModel() {

    private val _state = MutableStateFlow(VideoState.SETUP)
    val state: StateFlow<VideoState> = _state.asStateFlow()

    private val _resumes = MutableStateFlow<List<Resume>>(emptyList())
    val resumes: StateFlow<List<Resume>> = _resumes.asStateFlow()

    private val _videoSessions = MutableStateFlow<List<VideoSession>>(emptyList())
    val videoSessions: StateFlow<List<VideoSession>> = _videoSessions.asStateFlow()

    private val _activeSession = MutableStateFlow<VideoSession?>(null)
    val activeSession: StateFlow<VideoSession?> = _activeSession.asStateFlow()

    private val _postureScore = MutableStateFlow(100f)
    val postureScore: StateFlow<Float> = _postureScore.asStateFlow()

    private val _eyeScore = MutableStateFlow(100f)
    val eyeScore: StateFlow<Float> = _eyeScore.asStateFlow()

    private val _emotionLabel = MutableStateFlow("Neutral")
    val emotionLabel: StateFlow<String> = _emotionLabel.asStateFlow()

    private val _coachTip = MutableSharedFlow<String>(replay = 1)
    val coachTip: SharedFlow<String> = _coachTip.asSharedFlow()

    private val _questionText = MutableStateFlow("Loading first question...")
    val questionText: StateFlow<String> = _questionText.asStateFlow()

    private val _questionIndex = MutableStateFlow(1)
    val questionIndex: StateFlow<Int> = _questionIndex.asStateFlow()

    private val _totalQuestions = MutableStateFlow(5)
    val totalQuestions: StateFlow<Int> = _totalQuestions.asStateFlow()

    private val _timerText = MutableStateFlow("00:00")
    val timerText: StateFlow<String> = _timerText.asStateFlow()

    private val _combinedReport = MutableStateFlow<VideoReportCombined?>(null)
    val combinedReport: StateFlow<VideoReportCombined?> = _combinedReport.asStateFlow()

    private val _recordingUrl = MutableStateFlow<String?>(null)
    val recordingUrl: StateFlow<String?> = _recordingUrl.asStateFlow()

    private val _currentQuestionId = MutableStateFlow<String?>(null)
    val currentQuestionId: StateFlow<String?> = _currentQuestionId.asStateFlow()

    private val _evaluationResult = MutableStateFlow<EvaluationResult?>(null)
    val evaluationResult: StateFlow<EvaluationResult?> = _evaluationResult.asStateFlow()

    private val _hintText = MutableSharedFlow<String>(replay = 0)
    val hintText: SharedFlow<String> = _hintText.asSharedFlow()

    private val _livePostureHistory = MutableStateFlow<List<Float>>(emptyList())
    val livePostureHistory: StateFlow<List<Float>> = _livePostureHistory.asStateFlow()

    private val _liveGazeHistory = MutableStateFlow<List<Float>>(emptyList())
    val liveGazeHistory: StateFlow<List<Float>> = _liveGazeHistory.asStateFlow()

    private val _liveEmotionHistory = MutableStateFlow<List<String>>(emptyList())
    val liveEmotionHistory: StateFlow<List<String>> = _liveEmotionHistory.asStateFlow()

    private var durationSeconds = 0L
    private var recordingTimer: CountDownTimer? = null
    private val gson = Gson()

    fun loadResumes() {
        viewModelScope.launch {
            when (val result = resumeRepo.getResumes()) {
                is Result.Success -> _resumes.value = result.data
                else -> _resumes.value = emptyList()
            }
        }
    }

    fun loadVideoSessions() {
        _isLoading.value = true
        viewModelScope.launch {
            when (val result = videoRepo.listVideoSessions()) {
                is Result.Success -> {
                    _videoSessions.value = result.data
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                }
                else -> {}
            }
            _isLoading.value = false
        }
    }

    fun createVideoSession(resumeId: String?, role: String, type: String, difficulty: Float, numQuestions: Int, jobDescription: String? = null) {
        _isLoading.value = true
        viewModelScope.launch {
            when (val result = videoRepo.createVideoSession(resumeId, role, type, difficulty, numQuestions, jobDescription)) {
                is Result.Success -> {
                    val session = result.data
                    _activeSession.value = session
                    _state.value = VideoState.RECORDING
                    
                    // Connect WebSockets
                    connectWebSockets(session.id)
                    startTimer()
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                }
                else -> {}
            }
            _isLoading.value = false
        }
    }

    fun startVideoSession(sessionId: String) {
        if (_activeSession.value != null && _activeSession.value?.id == sessionId) {
            return
        }
        _isLoading.value = true
        viewModelScope.launch {
            when (val result = videoRepo.startVideoSession(sessionId)) {
                is Result.Success -> {
                    val session = result.data
                    _activeSession.value = session
                    _state.value = VideoState.RECORDING
                    
                    // Connect WebSockets
                    connectWebSockets(session.id)
                    startTimer()
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                }
                else -> {}
            }
            _isLoading.value = false
        }
    }

    private fun connectWebSockets(sessionId: String) {
        val base = com.aiinterview.BuildConfig.API_BASE_URL
        val hostPort = base.substringAfter("://").substringBefore("/")
        val protocol = if (base.startsWith("https")) "wss" else "ws"
        val baseUrl = "$protocol://$hostPort/ws/video-interview/$sessionId"
        
        // 1. Frames channel
        viewModelScope.launch {
            try {
                val token = tokenDataStore.getAccessToken() ?: ""
                webSocketManager.connect("video_frames", "$baseUrl/frames?token=$token")
                webSocketManager.getEvents("video_frames")?.collect { event ->
                    when (event) {
                        is WebSocketEvent.Message -> {
                            val json = gson.fromJson(event.text, JsonObject::class.java)
                            
                            val posture = json.get("posture_score")?.asFloat ?: 1f
                            _postureScore.value = posture * 100f
                            val currentPostureList = _livePostureHistory.value.toMutableList()
                            currentPostureList.add(posture * 100f)
                            if (currentPostureList.size > 25) currentPostureList.removeAt(0)
                            _livePostureHistory.value = currentPostureList

                            val gaze = json.get("gaze_score")?.asFloat ?: 1f
                            _eyeScore.value = gaze * 100f
                            val currentGazeList = _liveGazeHistory.value.toMutableList()
                            currentGazeList.add(gaze * 100f)
                            if (currentGazeList.size > 25) currentGazeList.removeAt(0)
                            _liveGazeHistory.value = currentGazeList

                            val emotion = json.get("emotion_label")?.asString ?: "Neutral"
                            _emotionLabel.value = emotion
                            val currentEmotionList = _liveEmotionHistory.value.toMutableList()
                            currentEmotionList.add(emotion)
                            if (currentEmotionList.size > 25) currentEmotionList.removeAt(0)
                            _liveEmotionHistory.value = currentEmotionList

                            // Cache frame metric locally to Room
                            val confidence = json.get("composite_score")?.asFloat ?: 1f
                            val eyeContact = json.get("gaze_score")?.asFloat?.let { it > 0.5f } ?: true
                            val metric = FrameMetric(
                                timestamp = durationSeconds * 1000,
                                emotion = emotion,
                                confidence = confidence,
                                eyeContact = eyeContact,
                                postureScore = posture
                            )
                            videoRepo.saveFrameMetricLocally(sessionId, metric)
                        }
                        else -> {}
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // 2. Coach channel
        viewModelScope.launch {
            try {
                val token = tokenDataStore.getAccessToken() ?: ""
                webSocketManager.connect("video_coach", "$baseUrl/coach?token=$token")
                webSocketManager.getEvents("video_coach")?.collect { event ->
                    when (event) {
                        is WebSocketEvent.Message -> {
                            val json = gson.fromJson(event.text, JsonObject::class.java)
                            val tip = json.get("tip")?.asString
                            if (!tip.isNullOrEmpty()) {
                                _coachTip.emit(tip)
                            }
                        }
                        else -> {}
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // 3. Questions channel
        viewModelScope.launch {
            try {
                val token = tokenDataStore.getAccessToken() ?: ""
                webSocketManager.connect("video_questions", "$baseUrl/questions?token=$token")
                webSocketManager.getEvents("video_questions")?.collect { event ->
                    when (event) {
                        is WebSocketEvent.Message -> {
                            val json = gson.fromJson(event.text, JsonObject::class.java)
                            val type = json.get("type")?.asString
                            if (type == "question") {
                                val text = json.get("question")?.asString ?: ""
                                val idx = json.get("index")?.asInt ?: 1
                                val total = json.get("total")?.asInt ?: 5
                                val qId = json.get("id")?.asString
                                
                                _questionText.value = text
                                _questionIndex.value = idx
                                _totalQuestions.value = total
                                _currentQuestionId.value = qId
                                _evaluationResult.value = null
                            } else if (type == "evaluation") {
                                val grade = json.get("grade")?.asFloat ?: 8.5f
                                val feedback = json.get("feedback")?.asString ?: ""
                                _evaluationResult.value = EvaluationResult(grade, feedback)
                            }
                        }
                        else -> {}
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun startTimer() {
        durationSeconds = 0
        recordingTimer?.cancel()
        recordingTimer = object : CountDownTimer(3600 * 1000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                durationSeconds++
                val minutes = durationSeconds / 60
                val seconds = durationSeconds % 60
                _timerText.value = String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)
            }
            override fun onFinish() {}
        }.start()
    }

    fun sendFrame(bytes: ByteArray) {
        val session = _activeSession.value ?: return
        if (_state.value != VideoState.RECORDING) return
        viewModelScope.launch {
            val byteString = bytes.toByteString()
            webSocketManager.send("video_frames", byteString)
        }
    }

    fun submitVoiceAnswer(answerText: String) {
        viewModelScope.launch {
            val payload = mapOf("answer" to answerText)
            webSocketManager.send("video_questions", gson.toJson(payload))
        }
    }

    fun requestNextQuestion() {
        viewModelScope.launch {
            val payload = mapOf("action" to "next")
            webSocketManager.send("video_questions", gson.toJson(payload))
        }
    }

    fun endSession() {
        val session = _activeSession.value ?: return
        _state.value = VideoState.ANALYZING
        recordingTimer?.cancel()
        
        // Disconnect Sockets
        webSocketManager.disconnect("video_frames")
        webSocketManager.disconnect("video_coach")
        webSocketManager.disconnect("video_questions")

        viewModelScope.launch {
            when (val result = videoRepo.endVideoSession(session.id)) {
                is Result.Success -> {
                    loadReports(session.id)
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                    _state.value = VideoState.SETUP
                }
                else -> {}
            }
        }
    }

    fun loadReports(sessionId: String) {
        _isLoading.value = true
        viewModelScope.launch {
            when (val result = videoRepo.getCombinedReport(sessionId)) {
                is Result.Success -> {
                    _combinedReport.value = result.data
                    _state.value = VideoState.COMPLETE
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                }
                else -> {}
            }
            _isLoading.value = false
        }
    }

    fun loadRecordingUrl(sessionId: String) {
        viewModelScope.launch {
            when (val result = videoRepo.getRecordingUrl(sessionId)) {
                is Result.Success -> {
                    _recordingUrl.value = result.data
                }
                else -> {}
            }
        }
    }

    fun requestHint() {
        val session = _activeSession.value ?: return
        val questionId = _currentQuestionId.value ?: return
        val interviewSessionId = session.interviewSessionId ?: return
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = interviewRepo.requestHint(interviewSessionId, questionId)) {
                is Result.Success -> {
                    _hintText.emit(result.data.hint_text)
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                }
                else -> {}
            }
            _isLoading.value = false
        }
    }

    fun uploadRecording(file: java.io.File, callback: (Boolean) -> Unit) {
        val session = _activeSession.value ?: run {
            callback(false)
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = videoRepo.uploadRecording(session.id, file)) {
                is Result.Success -> {
                    callback(true)
                }
                is Result.Error -> {
                    _error.emit(result.exception.userMessage)
                    callback(false)
                }
                else -> {
                    callback(false)
                }
            }
            _isLoading.value = false
        }
    }

    fun resetSessionState() {
        _activeSession.value = null
        _state.value = VideoState.SETUP
    }

    fun deleteVideoSession(sessionId: String) {
        _isLoading.value = true
        viewModelScope.launch {
            try {
                when (val result = videoRepo.deleteVideoSession(sessionId)) {
                    is Result.Success -> {
                        loadVideoSessions()
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
        recordingTimer?.cancel()
        webSocketManager.disconnect("video_frames")
        webSocketManager.disconnect("video_coach")
        webSocketManager.disconnect("video_questions")
    }
}

