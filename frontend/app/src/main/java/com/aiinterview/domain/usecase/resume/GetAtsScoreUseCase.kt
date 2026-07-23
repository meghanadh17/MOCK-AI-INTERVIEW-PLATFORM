package com.aiinterview.domain.usecase.resume

import com.aiinterview.core.result.Result
import com.aiinterview.data.remote.dto.resume.AtsScoreDto
import com.aiinterview.domain.repository.ResumeRepository
import javax.inject.Inject

class GetAtsScoreUseCase @Inject constructor(private val repo: ResumeRepository) {
    suspend operator fun invoke(id: String): Result<AtsScoreDto> = repo.getAtsScore(id)
}
