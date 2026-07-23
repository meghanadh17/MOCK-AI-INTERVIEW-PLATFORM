package com.aiinterview.presentation.resume

import androidx.lifecycle.viewModelScope
import com.aiinterview.core.base.BaseViewModel
import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.Resume
import com.aiinterview.domain.model.ResumeAnalysis
import com.aiinterview.data.remote.dto.resume.AtsScoreDto
import com.aiinterview.data.remote.dto.resume.ParseStatusDto
import com.aiinterview.domain.usecase.resume.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class UploadUiState {
    object Idle : UploadUiState()
    data class Progress(val percentage: Int) : UploadUiState()
    data class Success(val resume: Resume) : UploadUiState()
    data class Error(val message: String) : UploadUiState()
}

@HiltViewModel
class ResumeViewModel @Inject constructor(
    private val getResumeListUseCase: GetResumeListUseCase,
    private val uploadResumeUseCase: UploadResumeUseCase,
    private val getParseStatusUseCase: GetParseStatusUseCase,
    private val analyzeResumeUseCase: AnalyzeResumeUseCase,
    private val deleteResumeUseCase: DeleteResumeUseCase,
    private val getAtsScoreUseCase: GetAtsScoreUseCase,
    private val getResumeDetailUseCase: GetResumeDetailUseCase,
    private val setPrimaryResumeUseCase: SetPrimaryResumeUseCase,
    private val enhanceSectionUseCase: EnhanceSectionUseCase
) : BaseViewModel() {

    private val _resumeList = MutableStateFlow<List<Resume>>(emptyList())
    val resumeList: StateFlow<List<Resume>> = _resumeList.asStateFlow()

    private val _uploadState = MutableStateFlow<UploadUiState>(UploadUiState.Idle)
    val uploadState: StateFlow<UploadUiState> = _uploadState.asStateFlow()

    private val _parseStatus = MutableStateFlow<ParseStatusDto?>(null)
    val parseStatus: StateFlow<ParseStatusDto?> = _parseStatus.asStateFlow()

    private val _resumeDetail = MutableStateFlow<Resume?>(null)
    val resumeDetail: StateFlow<Resume?> = _resumeDetail.asStateFlow()

    private val _atsScore = MutableStateFlow<AtsScoreDto?>(null)
    val atsScore: StateFlow<AtsScoreDto?> = _atsScore.asStateFlow()

    private val _analysisState = MutableStateFlow<ResumeAnalysis?>(null)
    val analysisState: StateFlow<ResumeAnalysis?> = _analysisState.asStateFlow()

    private val _enhanceResult = MutableStateFlow<com.aiinterview.domain.model.EnhanceResponse?>(null)
    val enhanceResult: StateFlow<com.aiinterview.domain.model.EnhanceResponse?> = _enhanceResult.asStateFlow()

    private val _enhancingSections = MutableStateFlow<Set<String>>(emptySet())
    val enhancingSections: StateFlow<Set<String>> = _enhancingSections.asStateFlow()

    private val _isEnhancing = MutableStateFlow(false)
    val isEnhancing: StateFlow<Boolean> = _isEnhancing.asStateFlow()

    fun clearParseStatus() {
        _parseStatus.value = null
    }

    fun loadResumeList() {
        _isLoading.value = true
        viewModelScope.launch {
            when (val result = getResumeListUseCase()) {
                is Result.Success -> _resumeList.value = result.data
                is Result.Error -> _resumeList.value = emptyList()
                else -> {}
            }
            _isLoading.value = false
        }
    }

    fun uploadResume(filename: String, mimeType: String, fileBytes: ByteArray) {
        _uploadState.value = UploadUiState.Progress(0)
        _parseStatus.value = null
        viewModelScope.launch {
            val result = uploadResumeUseCase(filename, mimeType, fileBytes) { percentage ->
                _uploadState.value = UploadUiState.Progress(percentage)
            }
            when (result) {
                is Result.Success -> {
                    val resume = result.data
                    _uploadState.value = UploadUiState.Success(resume)
                    pollParseStatus(resume.id)
                }
                is Result.Error -> {
                    _uploadState.value = UploadUiState.Error(result.exception.userMessage)
                }
                else -> {}
            }
        }
    }

    private fun pollParseStatus(resumeId: String) {
        viewModelScope.launch {
            getParseStatusUseCase(resumeId).collect { result ->
                when (result) {
                    is Result.Success -> {
                        _parseStatus.value = result.data
                    }
                    is Result.Error -> {
                        // Polling ends
                    }
                    else -> {}
                }
            }
        }
    }

    fun deleteResume(id: String) {
        viewModelScope.launch {
            if (deleteResumeUseCase(id) is Result.Success) {
                loadResumeList()
            }
        }
    }

    fun loadResumeDetail(id: String) {
        _isLoading.value = true
        viewModelScope.launch {
            val cached = getResumeDetailUseCase.getCachedResume(id)
            if (cached != null) {
                _resumeDetail.value = cached
                if (cached.suitableRoles.isNotEmpty() || cached.strengths.isNotEmpty() || cached.gaps.isNotEmpty()) {
                    _analysisState.value = ResumeAnalysis(
                        resumeId = cached.id,
                        atsScore = cached.atsScore ?: 0,
                        strengths = cached.strengths,
                        gaps = cached.gaps,
                        improvementSuggestions = cached.improvementSuggestions,
                        quantificationScore = cached.quantificationScore ?: 0,
                        actionVerbScore = cached.actionVerbScore ?: 0,
                        seniorityLevel = cached.seniorityLevel ?: "unknown",
                        yearsOfExperience = cached.yearsOfExperience ?: 0,
                        suitableRoles = cached.suitableRoles,
                        redFlags = cached.redFlags
                    )
                }
            }

            val detailResult = getResumeDetailUseCase(id)
            val atsResult = getAtsScoreUseCase(id)

            if (detailResult is Result.Success) {
                val freshDetail = detailResult.data
                _resumeDetail.value = freshDetail
                if (freshDetail.suitableRoles.isNotEmpty() || freshDetail.strengths.isNotEmpty() || freshDetail.gaps.isNotEmpty()) {
                    _analysisState.value = ResumeAnalysis(
                        resumeId = freshDetail.id,
                        atsScore = freshDetail.atsScore ?: 0,
                        strengths = freshDetail.strengths,
                        gaps = freshDetail.gaps,
                        improvementSuggestions = freshDetail.improvementSuggestions,
                        quantificationScore = freshDetail.quantificationScore ?: 0,
                        actionVerbScore = freshDetail.actionVerbScore ?: 0,
                        seniorityLevel = freshDetail.seniorityLevel ?: "unknown",
                        yearsOfExperience = freshDetail.yearsOfExperience ?: 0,
                        suitableRoles = freshDetail.suitableRoles,
                        redFlags = freshDetail.redFlags
                    )
                }
            }
            if (atsResult is Result.Success) {
                _atsScore.value = atsResult.data
            }
            _isLoading.value = false
        }
    }

    fun loadAnalysis(id: String) {
        _isLoading.value = true
        viewModelScope.launch {
            val cached = getResumeDetailUseCase.getCachedResume(id)
            if (cached != null && (cached.suitableRoles.isNotEmpty() || cached.strengths.isNotEmpty() || cached.gaps.isNotEmpty())) {
                _analysisState.value = ResumeAnalysis(
                    resumeId = cached.id,
                    atsScore = cached.atsScore ?: 0,
                    strengths = cached.strengths,
                    gaps = cached.gaps,
                    improvementSuggestions = cached.improvementSuggestions,
                    quantificationScore = cached.quantificationScore ?: 0,
                    actionVerbScore = cached.actionVerbScore ?: 0,
                    seniorityLevel = cached.seniorityLevel ?: "unknown",
                    yearsOfExperience = cached.yearsOfExperience ?: 0,
                    suitableRoles = cached.suitableRoles,
                    redFlags = cached.redFlags
                )
            }

            val result = analyzeResumeUseCase(id)
            if (result is Result.Success) {
                _analysisState.value = result.data
            }
            _isLoading.value = false
        }
    }

    fun setPrimary(id: String) {
        viewModelScope.launch {
            if (setPrimaryResumeUseCase(id) is Result.Success) {
                loadResumeList()
                _resumeDetail.value?.let { currentDetail ->
                    if (currentDetail.id == id) {
                        _resumeDetail.value = currentDetail.copy(isPrimary = true)
                    }
                }
            }
        }
    }

    fun enhanceSection(id: String, sectionType: String) {
        val typeLower = sectionType.lowercase().trim()
        _enhancingSections.value = _enhancingSections.value + typeLower
        _isEnhancing.value = true
        viewModelScope.launch {
            try {
                when (val result = enhanceSectionUseCase(id, sectionType)) {
                    is Result.Success -> {
                        _enhanceResult.value = result.data
                    }
                    is Result.Error -> {
                        _error.emit(result.exception.userMessage)
                    }
                    else -> {}
                }
            } finally {
                _enhancingSections.value = _enhancingSections.value - typeLower
                _isEnhancing.value = _enhancingSections.value.isNotEmpty()
            }
        }
    }

    fun clearEnhanceResult() {
        _enhanceResult.value = null
    }
}
