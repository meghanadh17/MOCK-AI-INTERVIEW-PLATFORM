package com.aiinterview.domain.model

data class Quiz(
    val id: String,
    val title: String,
    val topic: String,
    val difficulty: String,
    val totalQuestions: Int,
    val timeLimitS: Int?,
    val rating: Double,
    val attemptCount: Int,
    val createdAt: String
)

data class QuizQuestion(
    val id: String,
    val quizId: String,
    val questionText: String,
    val options: List<String>,
    val orderIndex: Int
)

data class QuizDetail(
    val id: String,
    val userId: String,
    val title: String,
    val topic: String,
    val difficulty: String,
    val totalQuestions: Int,
    val timeLimitS: Int?,
    val rating: Double,
    val attemptCount: Int,
    val createdAt: String,
    val questions: List<QuizQuestion>
)

data class AttemptStartResponse(
    val attemptId: String,
    val quizId: String,
    val startedAt: String,
    val timeLimitS: Int?
)

data class AnswerSubmitResponse(
    val questionId: String,
    val selectedAnswer: String,
    val isCorrect: Boolean,
    val correctAnswer: String,
    val explanation: String?
)

data class QuizTopic(
    val topic: String,
    val questionCount: Int,
    val quizCount: Int
)

data class UserAttempt(
    val attemptId: String,
    val quizId: String,
    val quizTitle: String,
    val score: Double,
    val timeTakenS: Int,
    val completedAt: String
)

