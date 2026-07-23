package com.aiinterview.data.repository

import com.aiinterview.core.result.ApiException
import com.aiinterview.core.result.Result
import com.aiinterview.data.remote.api.QuizApiService
import com.aiinterview.data.mapper.QuizMapper.toDomain
import com.aiinterview.domain.model.*
import com.aiinterview.domain.repository.QuizRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class QuizRepositoryImpl @Inject constructor(
    private val api: QuizApiService
) : QuizRepository {

    override suspend fun getQuizzes(): Result<List<Quiz>> = try {
        val response = api.getQuizzes()
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.map { it.toDomain() })
        } else {
            Result.Error("Failed to fetch quizzes: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun generateQuiz(topic: String, difficulty: String, count: Int): Result<QuizDetail> = try {
        val params = mapOf(
            "topic" to topic,
            "difficulty" to difficulty,
            "count" to count
        )
        val response = api.generateQuiz(params)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Failed to generate quiz: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getQuizDetail(id: String): Result<QuizDetail> = try {
        val response = api.getQuizDetail(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Failed to load quiz details: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun startQuiz(id: String): Result<AttemptStartResponse> = try {
        val response = api.startQuiz(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Failed to start quiz attempt: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun submitAnswer(
        quizId: String,
        attemptId: String,
        questionId: String,
        selectedAnswer: String
    ): Result<AnswerSubmitResponse> = try {
        val body = mapOf(
            "attempt_id" to attemptId,
            "question_id" to questionId,
            "selected_answer" to selectedAnswer
        )
        val response = api.submitAnswer(quizId, body)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Failed to submit answer: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun finishAttempt(quizId: String, attemptId: String): Result<QuizResult> = try {
        val body = mapOf(
            "attempt_id" to attemptId
        )
        val response = api.finishAttempt(quizId, body)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Failed to finish quiz attempt: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getAttemptResult(quizId: String, attemptId: String): Result<QuizResult> = try {
        val response = api.getAttemptResult(quizId, attemptId)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Failed to load attempt result: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getGlobalLeaderboard(): Result<List<LeaderboardEntry>> = try {
        val response = api.getGlobalLeaderboard()
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.leaderboard.map { it.toDomain() })
        } else {
            Result.Error("Failed to load global leaderboard: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getWeeklyLeaderboard(): Result<List<LeaderboardEntry>> = try {
        val response = api.getWeeklyLeaderboard()
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.leaderboard.map { it.toDomain() })
        } else {
            Result.Error("Failed to load weekly leaderboard: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getQuizLeaderboard(id: String): Result<List<LeaderboardEntry>> = try {
        val response = api.getQuizLeaderboard(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.leaderboard.map { it.toDomain() })
        } else {
            Result.Error("Failed to load quiz leaderboard: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getMyRank(): Result<UserRank> = try {
        val response = api.getMyRank()
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Failed to load user rank: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getStats(): Result<QuizStats> = try {
        val response = api.getStats()
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Failed to load stats: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getQuizTopics(): Result<List<QuizTopic>> = try {
        val response = api.getQuizTopics()
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.map { it.toDomain() })
        } else {
            Result.Error("Failed to load quiz topics: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getMyAttempts(): Result<List<UserAttempt>> = try {
        val response = api.getMyAttempts()
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.map { it.toDomain() })
        } else {
            Result.Error("Failed to load attempt history: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun deleteAttempt(attemptId: String): Result<Unit> = try {
        val response = api.deleteAttempt(attemptId)
        if (response.isSuccessful) {
            Result.Success(Unit)
        } else {
            Result.Error("Failed to delete attempt: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }
}


