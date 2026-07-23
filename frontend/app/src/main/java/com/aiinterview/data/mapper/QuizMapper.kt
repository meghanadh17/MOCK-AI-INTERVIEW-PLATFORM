package com.aiinterview.data.mapper

import com.aiinterview.data.remote.dto.quiz.*
import com.aiinterview.domain.model.*

object QuizMapper {

    fun QuizDto.toDomain() = Quiz(
        id = id,
        title = title,
        topic = topic,
        difficulty = difficulty,
        totalQuestions = totalQuestions,
        timeLimitS = timeLimitS,
        rating = rating,
        attemptCount = attemptCount,
        createdAt = createdAt
    )

    fun QuizQuestionOutDto.toDomain() = QuizQuestion(
        id = id,
        quizId = quizId,
        questionText = questionText,
        options = options,
        orderIndex = orderIndex
    )

    fun QuizOutDto.toDomain() = QuizDetail(
        id = id,
        userId = userId,
        title = title,
        topic = topic,
        difficulty = difficulty,
        totalQuestions = totalQuestions,
        timeLimitS = timeLimitS,
        rating = rating,
        attemptCount = attemptCount,
        createdAt = createdAt,
        questions = questions.map { it.toDomain() }
    )

    fun AttemptDto.toDomain() = AttemptStartResponse(
        attemptId = attemptId,
        quizId = quizId,
        startedAt = startedAt,
        timeLimitS = timeLimitS
    )

    fun AnswerSubmitResponseDto.toDomain() = AnswerSubmitResponse(
        questionId = questionId,
        selectedAnswer = selectedAnswer,
        isCorrect = isCorrect,
        correctAnswer = correctAnswer,
        explanation = explanation
    )

    fun QuestionExplanationItemDto.toDomain() = QuestionExplanation(
        questionId = questionId,
        questionText = questionText,
        chosenAnswer = chosenAnswer,
        correctAnswer = correctAnswer,
        isCorrect = isCorrect,
        explanation = explanation
    )

    fun QuizResultDto.toDomain() = QuizResult(
        attemptId = attemptId,
        quizId = quizId,
        score = score,
        correctCount = correctCount,
        timeTakenS = timeTakenS,
        completedAt = completedAt,
        breakdown = breakdown.map { it.toDomain() }
    )

    fun LeaderboardUserItemDto.toDomain() = LeaderboardEntry(
        rank = rank,
        userId = userId,
        name = name,
        score = score,
        isCurrentUser = isCurrentUser
    )

    fun UserRankItemDto.toDomain() = UserRankItem(
        rank = rank,
        score = score,
        percentile = percentile
    )

    fun UserRankResponseDto.toDomain() = UserRank(
        globalBoard = globalBoard.toDomain(),
        weeklyBoard = weeklyBoard.toDomain()
    )

    fun QuizStatsResponseDto.toDomain() = QuizStats(
        avgScore = avgScore,
        bestScore = bestScore,
        totalTimeS = totalTimeS,
        streak = streak
    )

    fun QuizTopicItemDto.toDomain() = QuizTopic(
        topic = topic,
        questionCount = questionCount,
        quizCount = quizCount
    )

    fun UserAttemptItemDto.toDomain() = UserAttempt(
        attemptId = attemptId,
        quizId = quizId,
        quizTitle = quizTitle,
        score = score,
        timeTakenS = timeTakenS,
        completedAt = completedAt
    )
}

