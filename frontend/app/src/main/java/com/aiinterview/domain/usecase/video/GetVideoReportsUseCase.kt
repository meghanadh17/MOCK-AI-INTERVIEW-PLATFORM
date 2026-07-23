package com.aiinterview.domain.usecase.video

import com.aiinterview.domain.repository.VideoRepository
import javax.inject.Inject

class GetVideoReportsUseCase @Inject constructor(private val repo: VideoRepository) {
    // TODO: suspend operator fun invoke(sessionId: String): Result<SpeechReport>
}
