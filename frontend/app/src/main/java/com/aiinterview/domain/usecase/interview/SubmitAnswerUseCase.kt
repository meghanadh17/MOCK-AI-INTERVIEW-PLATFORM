package com.aiinterview.domain.usecase.interview

import com.aiinterview.domain.repository.InterviewRepository
import javax.inject.Inject

class SubmitAnswerUseCase @Inject constructor(private val repo: InterviewRepository) {
    // TODO: suspend operator fun invoke(sessionId: String, index: Int, answer: String): Result<AnswerFeedback>
}
