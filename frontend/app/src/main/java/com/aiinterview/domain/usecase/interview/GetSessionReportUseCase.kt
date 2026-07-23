package com.aiinterview.domain.usecase.interview

import com.aiinterview.domain.repository.InterviewRepository
import javax.inject.Inject

class GetSessionReportUseCase @Inject constructor(private val repo: InterviewRepository) {
    // TODO: suspend operator fun invoke(sessionId: String): Result<SessionReport>
}
