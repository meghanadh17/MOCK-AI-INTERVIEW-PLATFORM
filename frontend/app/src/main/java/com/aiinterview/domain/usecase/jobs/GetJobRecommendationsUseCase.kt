package com.aiinterview.domain.usecase.jobs

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.JobMatch
import com.aiinterview.domain.repository.JobsRepository
import javax.inject.Inject

class GetJobRecommendationsUseCase @Inject constructor(
    private val repo: JobsRepository
) {
    suspend operator fun invoke(resumeId: String, limit: Int? = null): Result<List<JobMatch>> =
        repo.getRecommendations(resumeId, limit)
}
