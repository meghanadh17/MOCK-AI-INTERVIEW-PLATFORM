package com.aiinterview.data.repository

import com.aiinterview.core.result.ApiException
import com.aiinterview.core.result.Result
import com.aiinterview.core.network.CountingRequestBody
import com.aiinterview.data.local.dao.ResumeDao
import com.aiinterview.data.remote.api.ResumeApiService
import com.aiinterview.data.mapper.ResumeMapper.toDomain
import com.aiinterview.data.mapper.ResumeMapper.toEntity
import com.aiinterview.domain.model.Resume
import com.aiinterview.domain.model.ResumeAnalysis
import com.aiinterview.domain.repository.ResumeRepository
import com.aiinterview.data.remote.dto.resume.AtsScoreDto
import com.aiinterview.data.remote.dto.resume.ParseStatusDto
import kotlinx.coroutines.flow.firstOrNull
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ResumeRepositoryImpl @Inject constructor(
    private val api: ResumeApiService,
    private val dao: ResumeDao
) : ResumeRepository {

    override suspend fun getResumes(): Result<List<Resume>> = try {
        val response = api.getResumes()
        if (response.isSuccessful) {
            val dtoList = response.body() ?: emptyList()
            android.util.Log.d("ResumeRepo", "getResumes success: ${dtoList.size} items")
            // Cache to local Room database
            dao.clear()
            dao.upsertAll(dtoList.map { it.toEntity() })
            Result.Success(dtoList.map { it.toDomain() })
        } else {
            android.util.Log.e("ResumeRepo", "getResumes error: ${response.code()} ${response.errorBody()?.string()}")
            // Fallback to local cache if network call fails
            val localResumes = dao.observeAll().firstOrNull() ?: emptyList()
            if (localResumes.isNotEmpty()) {
                Result.Success(localResumes.map { it.toDomain() })
            } else {
                Result.Error("Failed to fetch resumes: ${response.code()}")
            }
        }
    } catch (e: Exception) {
        android.util.Log.e("ResumeRepo", "getResumes exception occurred", e)
        val localResumes = dao.observeAll().firstOrNull() ?: emptyList()
        if (localResumes.isNotEmpty()) {
            Result.Success(localResumes.map { it.toDomain() })
        } else {
            Result.Error(ApiException.map(e))
        }
    }

    override suspend fun uploadResume(
        filename: String,
        mimeType: String,
        fileBytes: ByteArray,
        onProgress: (Int) -> Unit
    ): Result<Resume> = try {
        val mediaType = mimeType.toMediaTypeOrNull()
        val rawBody = fileBytes.toRequestBody(mediaType)
        val progressBody = CountingRequestBody(rawBody, onProgress)
        val part = MultipartBody.Part.createFormData("file", filename, progressBody)

        val response = api.uploadResume(part)
        if (response.isSuccessful && response.body() != null) {
            val dto = response.body()!!
            Result.Success(dto.toDomain())
        } else {
            Result.Error("Upload failed: ${response.message()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getResume(id: String): Result<Resume> = try {
        val response = api.getResume(id)
        if (response.isSuccessful && response.body() != null) {
            val dto = response.body()!!
            dao.insert(dto.toEntity())
            Result.Success(dto.toDomain())
        } else {
            val cached = dao.getResumeById(id)
            if (cached != null) {
                Result.Success(cached.toDomain())
            } else {
                Result.Error("Failed to fetch resume: ${response.code()}")
            }
        }
    } catch (e: Exception) {
        val cached = dao.getResumeById(id)
        if (cached != null) {
            Result.Success(cached.toDomain())
        } else {
            Result.Error(ApiException.map(e))
        }
    }

    override suspend fun getCachedResume(id: String): Resume? = try {
        dao.getResumeById(id)?.toDomain()
    } catch (e: Exception) {
        null
    }

    override suspend fun deleteResume(id: String): Result<Unit> = try {
        val response = api.deleteResume(id)
        if (response.isSuccessful) {
            Result.Success(Unit)
        } else {
            Result.Error("Delete failed: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getParseStatus(id: String): Result<ParseStatusDto> = try {
        val response = api.getParseStatus(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("Status fetch failed: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun analyzeResume(id: String): Result<ResumeAnalysis> = try {
        val response = api.analyzeResume(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Analysis failed: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getAtsScore(id: String): Result<AtsScoreDto> = try {
        val response = api.getAtsScore(id)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!)
        } else {
            Result.Error("ATS Score failed: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun setPrimary(id: String): Result<Unit> = try {
        val response = api.setPrimary(id)
        if (response.isSuccessful) {
            Result.Success(Unit)
        } else {
            Result.Error("Failed to set primary resume: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun enhanceSection(id: String, sectionType: String): Result<com.aiinterview.domain.model.EnhanceResponse> = try {
        val request = com.aiinterview.data.remote.dto.resume.EnhanceRequest(sectionType)
        val response = api.enhanceSection(id, request)
        if (response.isSuccessful && response.body() != null) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("AI Enhance failed: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }
}
