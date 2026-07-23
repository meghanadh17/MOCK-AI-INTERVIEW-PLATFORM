package com.aiinterview.domain.usecase.resume

import com.aiinterview.core.result.Result
import com.aiinterview.domain.repository.ResumeRepository
import javax.inject.Inject

class DeleteResumeUseCase @Inject constructor(private val repo: ResumeRepository) {
    suspend operator fun invoke(id: String): Result<Unit> = repo.deleteResume(id)
}
