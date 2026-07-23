package com.aiinterview.data.repository

import com.aiinterview.core.result.ApiException
import com.aiinterview.core.result.Result
import com.aiinterview.data.remote.api.JobsApiService
import com.aiinterview.domain.model.Job
import com.aiinterview.domain.model.JobMatch
import com.aiinterview.domain.repository.JobsRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class JobsRepositoryImpl @Inject constructor(
    private val api: JobsApiService
) : JobsRepository {

    override suspend fun getRecommendations(resumeId: String, limit: Int?): Result<List<JobMatch>> = try {
        val response = api.getRecommendations(resumeId, limit)
        if (response.isSuccessful) {
            val dtoList = response.body() ?: emptyList()
            val domainList = dtoList.map { dto ->
                JobMatch(
                    id = dto.job.id,
                    title = dto.job.title,
                    company = dto.job.company,
                    location = dto.job.location,
                    salaryRange = dto.job.salary_range,
                    matchScore = dto.match_score,
                    skillsOverlap = dto.skills_overlap,
                    missingSkills = dto.missing_skills,
                    isSaved = false
                )
            }
            Result.Success(domainList)
        } else {
            Result.Error("Failed to fetch recommendations: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun saveJob(jobId: String): Result<Unit> = try {
        val response = api.saveJob(jobId)
        if (response.isSuccessful) Result.Success(Unit)
        else Result.Error("Failed to save job: ${response.code()}")
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun unsaveJob(jobId: String): Result<Unit> = try {
        val response = api.unsaveJob(jobId)
        if (response.isSuccessful) Result.Success(Unit)
        else Result.Error("Failed to unsave job: ${response.code()}")
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun searchJobs(
        query: String?,
        location: String?,
        experienceLevel: String?,
        skip: Int,
        limit: Int
    ): Result<List<Job>> = try {
        val response = api.searchJobs(query, location, experienceLevel, skip, limit)
        if (response.isSuccessful) {
            val dtoList = response.body() ?: emptyList()
            val domainList = dtoList.map { dto ->
                Job(
                    id = dto.job.id,
                    title = dto.job.title,
                    company = dto.job.company,
                    description = dto.job.description,
                    requirements = dto.job.requirements,
                    salaryRange = dto.job.salary_range,
                    location = dto.job.location,
                    skills = dto.job.skills,
                    experienceLevel = dto.job.experience_level,
                    createdAt = dto.job.created_at,
                    isSaved = false,
                    matchScore = dto.matchScore
                )
            }
            Result.Success(domainList)
        } else {
            Result.Error("Failed to search jobs: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getJobDetail(jobId: String): Result<Job> = try {
        val response = api.getJobDetail(jobId)
        if (response.isSuccessful && response.body() != null) {
            val dto = response.body()!!
            val job = Job(
                id = dto.id,
                title = dto.title,
                company = dto.company,
                description = dto.description,
                requirements = dto.requirements,
                salaryRange = dto.salary_range,
                location = dto.location,
                skills = dto.skills,
                experienceLevel = dto.experience_level,
                createdAt = dto.created_at,
                isSaved = false
            )
            Result.Success(job)
        } else {
            Result.Error("Failed to fetch job details: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getMatchScore(resumeId: String, jobId: String): Result<JobMatch> = try {
        val response = api.getMatchScore(resumeId, jobId)
        if (response.isSuccessful && response.body() != null) {
            val dto = response.body()!!
            val match = JobMatch(
                id = jobId,
                title = "",
                company = "",
                location = "",
                salaryRange = "",
                matchScore = dto.matchScore,
                skillsOverlap = dto.skillsOverlap,
                missingSkills = dto.missingSkills,
                isSaved = false
            )
            Result.Success(match)
        } else {
            Result.Error("Failed to fetch match score: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }

    override suspend fun getSavedJobs(): Result<List<Job>> = try {
        val response = api.getSavedJobs()
        if (response.isSuccessful) {
            val dtoList = response.body() ?: emptyList()
            val domainList = dtoList.map { dto ->
                Job(
                    id = dto.job.id,
                    title = dto.job.title,
                    company = dto.job.company,
                    description = dto.job.description,
                    requirements = dto.job.requirements,
                    salaryRange = dto.job.salary_range,
                    location = dto.job.location,
                    skills = dto.job.skills,
                    experienceLevel = dto.job.experience_level,
                    createdAt = dto.createdAt,
                    isSaved = true,
                    matchScore = dto.matchScore
                )
            }
            Result.Success(domainList)
        } else {
            Result.Error("Failed to fetch saved jobs: ${response.code()}")
        }
    } catch (e: Exception) {
        Result.Error(ApiException.map(e))
    }
}
