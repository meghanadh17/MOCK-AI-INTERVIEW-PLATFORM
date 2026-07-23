package com.aiinterview.domain.usecase.video

import com.aiinterview.domain.repository.VideoRepository
import javax.inject.Inject

class CreateVideoSessionUseCase @Inject constructor(private val repo: VideoRepository) {
    // TODO: suspend operator fun invoke(params: Map<String, Any>): Result<VideoSession>
}
