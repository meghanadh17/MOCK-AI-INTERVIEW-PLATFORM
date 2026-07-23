package com.aiinterview.domain.usecase.resume

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.Resume
import com.aiinterview.domain.repository.ResumeRepository
import javax.inject.Inject

class GetResumeListUseCase @Inject constructor(private val repo: ResumeRepository) {
    suspend operator fun invoke(): Result<List<Resume>> = repo.getResumes()
}
