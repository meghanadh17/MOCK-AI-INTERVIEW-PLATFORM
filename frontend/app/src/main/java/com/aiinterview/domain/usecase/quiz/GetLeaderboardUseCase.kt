package com.aiinterview.domain.usecase.quiz

import com.aiinterview.domain.repository.QuizRepository
import javax.inject.Inject

class GetLeaderboardUseCase @Inject constructor(private val repo: QuizRepository) {
    // TODO: suspend operator fun invoke(scope: String): Result<List<LeaderboardEntry>>
}
