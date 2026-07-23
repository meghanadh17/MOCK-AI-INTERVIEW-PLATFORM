package com.aiinterview.domain.repository

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.Job
import com.aiinterview.domain.model.JobMatch

interface JobsRepository {
    suspend fun getRecommendations(resumeId: String, limit: Int? = null): Result<List<JobMatch>>
    suspend fun saveJob(jobId: String): Result<Unit>
    suspend fun unsaveJob(jobId: String): Result<Unit>
    suspend fun searchJobs(query: String?, location: String?, experienceLevel: String?, skip: Int, limit: Int): Result<List<Job>>
    suspend fun getJobDetail(jobId: String): Result<Job>
    suspend fun getMatchScore(resumeId: String, jobId: String): Result<JobMatch>
    suspend fun getSavedJobs(): Result<List<Job>>
}
