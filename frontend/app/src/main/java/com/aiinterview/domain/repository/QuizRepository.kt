package com.aiinterview.domain.repository

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.*

interface QuizRepository {
    suspend fun getQuizzes(): Result<List<Quiz>>
    suspend fun generateQuiz(topic: String, difficulty: String, count: Int): Result<QuizDetail>
    suspend fun getQuizDetail(id: String): Result<QuizDetail>
    
    suspend fun startQuiz(id: String): Result<AttemptStartResponse>
    suspend fun submitAnswer(quizId: String, attemptId: String, questionId: String, selectedAnswer: String): Result<AnswerSubmitResponse>
    suspend fun finishAttempt(quizId: String, attemptId: String): Result<QuizResult>
    suspend fun getAttemptResult(quizId: String, attemptId: String): Result<QuizResult>
    
    suspend fun getGlobalLeaderboard(): Result<List<LeaderboardEntry>>
    suspend fun getWeeklyLeaderboard(): Result<List<LeaderboardEntry>>
    suspend fun getQuizLeaderboard(id: String): Result<List<LeaderboardEntry>>
    suspend fun getMyRank(): Result<UserRank>
    suspend fun getStats(): Result<QuizStats>
    suspend fun getQuizTopics(): Result<List<QuizTopic>>
    suspend fun getMyAttempts(): Result<List<UserAttempt>>
    suspend fun deleteAttempt(attemptId: String): Result<Unit>
}

