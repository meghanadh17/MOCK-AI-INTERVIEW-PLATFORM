package com.aiinterview.domain.model

data class AnswerFeedback(val score: Int, val feedback: String, val strengths: List<String>, val improvements: List<String>, val modelAnswer: String?)
