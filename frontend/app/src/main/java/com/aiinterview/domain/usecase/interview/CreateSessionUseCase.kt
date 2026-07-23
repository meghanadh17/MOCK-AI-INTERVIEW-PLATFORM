package com.aiinterview.domain.usecase.interview

import com.aiinterview.domain.repository.InterviewRepository
import javax.inject.Inject

class CreateSessionUseCase @Inject constructor(private val repo: InterviewRepository) {
    // TODO: suspend operator fun invoke(params: Map<String, Any>): Result<InterviewSession>
}
