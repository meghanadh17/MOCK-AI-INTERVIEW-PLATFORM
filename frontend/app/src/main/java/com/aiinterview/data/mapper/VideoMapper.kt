package com.aiinterview.data.mapper

import com.aiinterview.data.remote.dto.video.*
import com.aiinterview.domain.model.*
import com.aiinterview.data.local.entity.VideoSessionEntity
import com.aiinterview.data.local.entity.FrameMetricEntity

object VideoMapper {
    fun VideoSessionDto.toDomain() = VideoSession(
        id = id,
        status = status,
        recordingUrl = recording_url,
        createdAt = created_at,
        interviewSessionId = interview_session_id,
        title = title,
        avgPostureScore = avg_posture_score,
        avgEyeContact = avg_eye_contact,
        avgConfidence = avg_confidence,
        dominantEmotion = dominant_emotion,
        avgWpm = avg_wpm,
        fillerWordCount = filler_word_count,
        silenceRatio = silence_ratio,
        clarityScore = clarity_score,
        recordingDurationS = recording_duration_s
    )

    fun FrameMetricDto.toDomain() = FrameMetric(
        timestamp = timestamp,
        emotion = emotion,
        confidence = confidence,
        eyeContact = eye_contact,
        postureScore = posture_score
    )

    fun FrameMetric.toEntity(sessionId: String) = FrameMetricEntity(
        sessionId = sessionId,
        timestamp = timestamp,
        emotion = emotion,
        confidence = confidence,
        eyeContact = eyeContact,
        postureScore = postureScore
    )

    fun FrameMetricEntity.toDomain() = FrameMetric(
        timestamp = timestamp,
        emotion = emotion,
        confidence = confidence,
        eyeContact = eyeContact,
        postureScore = postureScore
    )

    fun VideoSessionEntity.toDomain() = VideoSession(
        id = id,
        status = status,
        recordingUrl = recordingUrl,
        createdAt = createdAt,
        interviewSessionId = interviewSessionId,
        avgPostureScore = avgPostureScore,
        avgEyeContact = avgEyeContact,
        avgConfidence = avgConfidence,
        dominantEmotion = dominantEmotion
    )

    fun VideoSessionDto.toEntity(
        avgPostureScore: Float? = null,
        avgEyeContact: Float? = null,
        avgConfidence: Float? = null,
        dominantEmotion: String? = null
    ) = VideoSessionEntity(
        id = id,
        status = status,
        recordingUrl = recording_url,
        createdAt = created_at,
        avgPostureScore = avgPostureScore ?: avg_posture_score,
        avgEyeContact = avgEyeContact ?: avg_eye_contact,
        avgConfidence = avgConfidence ?: avg_confidence,
        dominantEmotion = dominantEmotion ?: dominant_emotion,
        interviewSessionId = interview_session_id
    )

    fun PostureTimelineEventDto.toDomain() = PostureTimelineEvent(
        timestampMs = timestamp_ms,
        postureScore = posture_score ?: 0f,
        spineAngle = spine_angle ?: 0f,
        shoulderTilt = shoulder_tilt ?: 0f,
        headTilt = head_tilt ?: 0f,
        forwardLean = forward_lean ?: 0f
    )

    fun PostureReportDto.toDomain() = PostureReport(
        sessionId = session_id,
        averageScore = average_score,
        timeline = timeline.map { it.toDomain() }
    )

    fun GazeTimelineEventDto.toDomain() = GazeTimelineEvent(
        timestampMs = timestamp_ms,
        eyeContactScore = eye_contact_score ?: 0f,
        gazeX = gaze_x ?: 0f,
        gazeY = gaze_y ?: 0f,
        blinkDetected = blink_detected ?: false
    )

    fun GazeReportDto.toDomain() = GazeReport(
        sessionId = session_id,
        eyeContactPercentage = eye_contact_percentage,
        perclosFatigueIndex = perclos_fatigue_index,
        timeline = timeline.map { it.toDomain() }
    )

    fun EmotionWindowDto.toDomain() = EmotionWindow(
        startTimeS = start_time_s,
        endTimeS = end_time_s,
        dominantEmotion = dominant_emotion,
        averageConfidence = average_confidence
    )

    fun EmotionReportDto.toDomain() = EmotionReport(
        sessionId = session_id,
        dominantEmotion = dominant_emotion,
        timeline = timeline.map { it.toDomain() }
    )

    fun SpeechReportResponseDto.toDomain() = SpeechReport(
        sessionId = session_id,
        wpm = wpm,
        fillerWordCount = filler_word_count,
        silenceRatio = silence_ratio,
        clarityScore = clarity_score,
        prosody = prosody
    )

    fun VideoSummaryDto.toDomain() = VideoSummary(
        sessionId = session_id,
        summary = summary,
        keyStrengths = key_strengths,
        areasForImprovement = areas_for_improvement
    )
}
