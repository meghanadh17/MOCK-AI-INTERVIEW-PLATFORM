package com.aiinterview.presentation.jobs

import androidx.lifecycle.viewModelScope
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.aiinterview.core.base.BaseViewModel
import com.aiinterview.core.result.Result
import com.aiinterview.data.repository.JobSearchPagingSource
import com.aiinterview.domain.model.Job
import com.aiinterview.domain.model.JobMatch
import com.aiinterview.domain.model.Resume
import com.aiinterview.domain.repository.JobsRepository
import com.aiinterview.domain.repository.ResumeRepository
import com.aiinterview.domain.usecase.jobs.GetJobRecommendationsUseCase
import com.aiinterview.domain.usecase.jobs.SaveJobUseCase
import com.aiinterview.domain.usecase.jobs.UnsaveJobUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class JobsViewModel @Inject constructor(
    private val jobsRepo: JobsRepository,
    private val resumeRepo: ResumeRepository,
    private val getJobRecommendationsUseCase: GetJobRecommendationsUseCase,
    private val saveJobUseCase: SaveJobUseCase,
    private val unsaveJobUseCase: UnsaveJobUseCase
) : BaseViewModel() {

    private val _resumes = MutableStateFlow<List<Resume>>(emptyList())
    val resumes: StateFlow<List<Resume>> = _resumes.asStateFlow()

    private val _selectedResumeId = MutableStateFlow<String?>(null)
    val selectedResumeId: StateFlow<String?> = _selectedResumeId.asStateFlow()

    private val _jobRecommendations = MutableStateFlow<List<JobMatch>>(emptyList())
    val jobRecommendations: StateFlow<List<JobMatch>> = _jobRecommendations.asStateFlow()

    private val _savedJobs = MutableStateFlow<List<Job>>(emptyList())
    val savedJobs: StateFlow<List<Job>> = _savedJobs.asStateFlow()

    private val _jobDetail = MutableStateFlow<Job?>(null)
    val jobDetail: StateFlow<Job?> = _jobDetail.asStateFlow()

    private val _matchScore = MutableStateFlow<JobMatch?>(null)
    val matchScore: StateFlow<JobMatch?> = _matchScore.asStateFlow()

    private val _searchQuery = MutableStateFlow<String?>(null)
    private val _searchLocation = MutableStateFlow<String?>(null)
    private val _searchExperienceLevel = MutableStateFlow<String?>(null)

    @OptIn(ExperimentalCoroutinesApi::class)
    val searchResults: Flow<PagingData<Job>> = combine(
        _searchQuery,
        _searchLocation,
        _searchExperienceLevel
    ) { q, loc, exp ->
        Triple(q, loc, exp)
    }.flatMapLatest { (q, loc, exp) ->
        Pager(
            config = PagingConfig(pageSize = 10, enablePlaceholders = false),
            pagingSourceFactory = { JobSearchPagingSource(jobsRepo, q, loc, exp) }
        ).flow
    }.cachedIn(viewModelScope)

    init {
        loadResumes()
        loadSavedJobs()
    }

    fun loadResumes() {
        viewModelScope.launch {
            when (val result = resumeRepo.getResumes()) {
                is Result.Success -> {
                    _resumes.value = result.data
                    if (_selectedResumeId.value == null && result.data.isNotEmpty()) {
                        val firstId = result.data.first().id
                        _selectedResumeId.value = firstId
                        loadRecommendations(firstId)
                    }
                }
                else -> {}
            }
        }
    }

    fun selectResume(resumeId: String) {
        _selectedResumeId.value = resumeId
        loadRecommendations(resumeId)
    }

    fun loadRecommendations(resumeId: String) {
        _isLoading.value = true
        viewModelScope.launch {
            when (val result = getJobRecommendationsUseCase(resumeId)) {
                is Result.Success -> {
                    val savedIds = _savedJobs.value.map { it.id }.toSet()
                    _jobRecommendations.value = result.data.map { match ->
                        match.copy(isSaved = savedIds.contains(match.id))
                    }
                }
                is Result.Error -> _error.emit(result.exception.userMessage)
                else -> {}
            }
            _isLoading.value = false
        }
    }

    fun searchJobs(query: String?, location: String? = null, experienceLevel: String? = null) {
        _searchQuery.value = if (query.isNullOrEmpty()) null else query
        _searchLocation.value = if (location.isNullOrEmpty()) null else location
        _searchExperienceLevel.value = if (experienceLevel.isNullOrEmpty()) null else experienceLevel
    }

    fun loadJobDetail(jobId: String) {
        _isLoading.value = true
        _jobDetail.value = null
        viewModelScope.launch {
            when (val result = jobsRepo.getJobDetail(jobId)) {
                is Result.Success -> {
                    val savedIds = _savedJobs.value.map { it.id }.toSet()
                    _jobDetail.value = result.data.copy(isSaved = savedIds.contains(jobId))
                }
                is Result.Error -> _error.emit(result.exception.userMessage)
                else -> {}
            }
            _isLoading.value = false
        }
    }

    fun loadMatchScore(resumeId: String, jobId: String) {
        _matchScore.value = null
        viewModelScope.launch {
            when (val result = jobsRepo.getMatchScore(resumeId, jobId)) {
                is Result.Success -> {
                    _matchScore.value = result.data
                }
                else -> {}
            }
        }
    }

    fun loadSavedJobs() {
        viewModelScope.launch {
            when (val result = jobsRepo.getSavedJobs()) {
                is Result.Success -> {
                    _savedJobs.value = result.data
                    val savedIds = result.data.map { it.id }.toSet()
                    _jobRecommendations.value = _jobRecommendations.value.map {
                        it.copy(isSaved = savedIds.contains(it.id))
                    }
                }
                else -> {}
            }
        }
    }

    fun toggleSaveJob(jobId: String) {
        viewModelScope.launch {
            val isCurrentlySaved = _savedJobs.value.any { it.id == jobId }
            val recommendationsList = _jobRecommendations.value
            val savedList = _savedJobs.value
            val detailJob = _jobDetail.value

            _jobRecommendations.value = recommendationsList.map {
                if (it.id == jobId) it.copy(isSaved = !isCurrentlySaved) else it
            }
            if (detailJob?.id == jobId) {
                _jobDetail.value = detailJob.copy(isSaved = !isCurrentlySaved)
            }
            if (isCurrentlySaved) {
                _savedJobs.value = savedList.filter { it.id != jobId }
            } else {
                val match = recommendationsList.firstOrNull { it.id == jobId }
                val newJob = Job(
                    id = jobId,
                    title = match?.title ?: detailJob?.title ?: "Job Listing",
                    company = match?.company ?: detailJob?.company ?: "",
                    description = detailJob?.description ?: "",
                    requirements = detailJob?.requirements,
                    salaryRange = match?.salaryRange ?: detailJob?.salaryRange,
                    location = match?.location ?: detailJob?.location,
                    skills = detailJob?.skills ?: emptyList(),
                    experienceLevel = detailJob?.experienceLevel,
                    createdAt = "",
                    isSaved = true,
                    matchScore = match?.matchScore ?: detailJob?.matchScore
                )
                _savedJobs.value = savedList + newJob
            }

            val result = if (isCurrentlySaved) {
                unsaveJobUseCase(jobId)
            } else {
                saveJobUseCase(jobId)
            }

            if (result is Result.Error) {
                _jobRecommendations.value = recommendationsList
                _savedJobs.value = savedList
                if (detailJob?.id == jobId) {
                    _jobDetail.value = detailJob
                }
                _error.emit(result.exception.userMessage)
            } else {
                loadSavedJobs()
            }
        }
    }
}
