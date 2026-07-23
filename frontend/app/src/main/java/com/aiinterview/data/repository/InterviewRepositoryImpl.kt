package com.aiinterview.data.repository

import com.aiinterview.core.result.ApiException
import com.aiinterview.core.result.Result
import com.aiinterview.data.remote.api.InterviewApiService
import com.aiinterview.data.remote.dto.interview.*
import com.aiinterview.domain.repository.InterviewRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InterviewRepositoryImpl @Inject constructor(
    private val api: InterviewApiService
) : InterviewRepository {

    override suspend fun createSession(
        resumeId: String?,
        role: String,
        type: String,
        difficulty: Double,
        numQuestions: Int,
        jobDescription: String?,
        title: String?
    ): Result<SessionDto> = try {
        val params = mutableMapOf<String, Any>(
            "role" to role,
            "type" to type,
            "difficulty" to difficulty,
            "num_questions" to numQuestions
        )
        if (!resumeId.isNullOrEmpty()) {
            params["resume_id"] = resumeId
        }
        if (!jobDescription.isNullOrEmpty()) {
            params["job_description"] = jobDescription
        }
        if (!title.isNullOrEmpty()) {
            params["title"] = title
        }
        val response = api.createSession(params)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("Failed to create session: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getSession(id: String): Result<SessionDto> = try {
        val response = api.getSession(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("Failed to fetch session: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun submitAnswer(id: String, answerText: String): Result<AnswerSubmitResponseDto> = try {
        val body = AnswerSubmitRequest(user_transcript = answerText)
        val response = api.submitAnswer(id, body)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("Failed to submit answer: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getRoles(): Result<List<RoleDto>> = try {
        val response = api.getRoles()
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.roles)
        } else {
            Result.Error("Failed to fetch roles: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getReport(id: String): Result<ReportDto> = try {
        val response = api.getReport(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("Failed to load report: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun requestHint(id: String, questionId: String): Result<HintResponseDto> = try {
        val response = api.requestHint(id, questionId)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("Failed to fetch hint: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun skipQuestion(id: String, questionId: String): Result<SkipResponseDto> = try {
        val response = api.skipQuestion(id, questionId)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("Failed to skip question: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getQuestions(id: String): Result<List<QuestionDto>> = try {
        val response = api.getQuestions(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("Failed to fetch questions: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun startSession(id: String): Result<QuestionDto> = try {
        val response = api.startSession(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("Failed to start session: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun endSession(id: String): Result<SessionDto> = try {
        val response = api.endSession(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("Failed to end session: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }
}

