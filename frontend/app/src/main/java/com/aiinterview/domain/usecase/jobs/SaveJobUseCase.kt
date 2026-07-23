package com.aiinterview.domain.usecase.jobs

import com.aiinterview.core.result.Result
import com.aiinterview.domain.repository.JobsRepository
import javax.inject.Inject

class SaveJobUseCase @Inject constructor(
    private val repo: JobsRepository
) {
    suspend operator fun invoke(jobId: String): Result<Unit> =
        repo.saveJob(jobId)
}
