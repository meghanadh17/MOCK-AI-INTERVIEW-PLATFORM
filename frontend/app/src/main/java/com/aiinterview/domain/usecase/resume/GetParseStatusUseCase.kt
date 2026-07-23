package com.aiinterview.domain.usecase.resume

import com.aiinterview.core.result.Result
import com.aiinterview.data.remote.dto.resume.ParseStatusDto
import com.aiinterview.domain.repository.ResumeRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class GetParseStatusUseCase @Inject constructor(private val repo: ResumeRepository) {
    operator fun invoke(resumeId: String): Flow<Result<ParseStatusDto>> = flow {
        while (true) {
            val result = repo.getParseStatus(resumeId)
            emit(result)
            if (result is Result.Success) {
                val status = result.data.status.uppercase()
                if (status == "SUCCESS" || status == "FAILED") {
                    break
                }
            } else if (result is Result.Error) {
                break
            }
            delay(2000)
        }
    }
}
