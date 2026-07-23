package com.aiinterview.domain.usecase.quiz

import com.aiinterview.domain.repository.QuizRepository
import javax.inject.Inject

class StartQuizUseCase @Inject constructor(private val repo: QuizRepository) {
    // TODO: suspend operator fun invoke(quizId: String): Result<QuizAttempt>
}
