package com.aiinterview.domain.model

data class QuestionExplanation(
    val questionId: String,
    val questionText: String,
    val chosenAnswer: String,
    val correctAnswer: String,
    val isCorrect: Boolean,
    val explanation: String?
)

data class QuizResult(
    val attemptId: String,
    val quizId: String,
    val score: Double,
    val correctCount: Int,
    val timeTakenS: Int,
    val completedAt: String,
    val breakdown: List<QuestionExplanation>
)
