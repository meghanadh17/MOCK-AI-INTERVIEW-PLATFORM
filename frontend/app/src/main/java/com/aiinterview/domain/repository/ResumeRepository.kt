package com.aiinterview.domain.repository

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.Resume
import com.aiinterview.domain.model.ResumeAnalysis
import com.aiinterview.data.remote.dto.resume.AtsScoreDto
import com.aiinterview.data.remote.dto.resume.ParseStatusDto

interface ResumeRepository {
    suspend fun getResumes(): Result<List<Resume>>
    suspend fun uploadResume(
        filename: String,
        mimeType: String,
        fileBytes: ByteArray,
        onProgress: (Int) -> Unit
    ): Result<Resume>
    suspend fun getResume(id: String): Result<Resume>
    suspend fun getCachedResume(id: String): Resume?
    suspend fun deleteResume(id: String): Result<Unit>
    suspend fun getParseStatus(id: String): Result<ParseStatusDto>
    suspend fun analyzeResume(id: String): Result<ResumeAnalysis>
    suspend fun getAtsScore(id: String): Result<AtsScoreDto>
    suspend fun setPrimary(id: String): Result<Unit>
    suspend fun enhanceSection(id: String, sectionType: String): Result<com.aiinterview.domain.model.EnhanceResponse>
}
