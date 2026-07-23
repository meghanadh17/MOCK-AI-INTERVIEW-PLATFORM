package com.aiinterview.domain.repository

import com.aiinterview.core.result.Result
import com.aiinterview.data.remote.dto.interview.*

interface InterviewRepository {
    suspend fun createSession(
        resumeId: String?,
        role: String,
        type: String,
        difficulty: Double,
        numQuestions: Int,
        jobDescription: String?,
        title: String?
    ): Result<SessionDto>

    suspend fun getSession(id: String): Result<SessionDto>
    suspend fun submitAnswer(id: String, answerText: String): Result<AnswerSubmitResponseDto>
    suspend fun getReport(id: String): Result<ReportDto>
    suspend fun requestHint(id: String, questionId: String): Result<HintResponseDto>
    suspend fun skipQuestion(id: String, questionId: String): Result<SkipResponseDto>
    suspend fun getQuestions(id: String): Result<List<QuestionDto>>
    suspend fun getRoles(): Result<List<RoleDto>>
    suspend fun startSession(id: String): Result<QuestionDto>
    suspend fun endSession(id: String): Result<SessionDto>
}
