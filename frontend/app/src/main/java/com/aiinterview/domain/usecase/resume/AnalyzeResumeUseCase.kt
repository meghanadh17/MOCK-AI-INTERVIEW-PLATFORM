package com.aiinterview.domain.usecase.resume

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.ResumeAnalysis
import com.aiinterview.domain.repository.ResumeRepository
import javax.inject.Inject

class AnalyzeResumeUseCase @Inject constructor(private val repo: ResumeRepository) {
    suspend operator fun invoke(resumeId: String): Result<ResumeAnalysis> = repo.analyzeResume(resumeId)
}
