package com.aiinterview.data.remote.dto.video

data class SpeechReportDto(val wpm: Int, val filler_count: Int, val clarity_score: Float, val emotion_timeline: List<FrameMetricDto>, val overall_score: Int)
