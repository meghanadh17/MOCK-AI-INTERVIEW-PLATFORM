package com.aiinterview.domain.usecase.resume

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.EnhanceResponse
import com.aiinterview.domain.repository.ResumeRepository
import javax.inject.Inject

class EnhanceSectionUseCase @Inject constructor(
    private val repository: ResumeRepository
) {
    suspend operator fun invoke(id: String, sectionType: String): Result<EnhanceResponse> {
        return repository.enhanceSection(id, sectionType)
    }
}
