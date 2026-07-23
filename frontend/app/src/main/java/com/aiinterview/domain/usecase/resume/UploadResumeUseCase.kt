package com.aiinterview.domain.usecase.resume

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.Resume
import com.aiinterview.domain.repository.ResumeRepository
import javax.inject.Inject

class UploadResumeUseCase @Inject constructor(private val repo: ResumeRepository) {
    suspend operator fun invoke(
        filename: String,
        mimeType: String,
        fileBytes: ByteArray,
        onProgress: (Int) -> Unit
    ): Result<Resume> = repo.uploadResume(filename, mimeType, fileBytes, onProgress)
}
