package com.aiinterview.data.remote.dto.interview

data class AnswerSubmitRequest(
    val user_transcript: String,
    val audio_path: String? = null,
    val video_path: String? = null
)
