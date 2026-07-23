package com.aiinterview.domain.usecase.resume

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.Resume
import com.aiinterview.domain.repository.ResumeRepository
import javax.inject.Inject

class GetResumeDetailUseCase @Inject constructor(private val repo: ResumeRepository) {
    suspend operator fun invoke(id: String): Result<Resume> = repo.getResume(id)
    suspend fun getCachedResume(id: String): Resume? = repo.getCachedResume(id)
}
