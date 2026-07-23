package com.aiinterview.data.remote.dto.interview

data class FeedbackDto(val score: Int, val feedback: String, val strengths: List<String>, val improvements: List<String>, val model_answer: String?)
