package com.aiinterview.domain.usecase.quiz

import com.aiinterview.domain.repository.QuizRepository
import javax.inject.Inject

class SubmitQuizAnswerUseCase @Inject constructor(private val repo: QuizRepository) {
    // TODO: suspend operator fun invoke(attemptId: String, answer: Map<String, Any>): Result<Any>
}
