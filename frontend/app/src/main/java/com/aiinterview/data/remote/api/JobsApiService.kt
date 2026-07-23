package com.aiinterview.data.remote.api

import com.aiinterview.data.remote.dto.jobs.*
import retrofit2.Response
import retrofit2.http.*

interface JobsApiService {
    @GET("jobs/recommendations/{resume_id}") suspend fun getRecommendations(
        @Path("resume_id") resumeId: String,
        @Query("limit") limit: Int? = null
    ): Response<List<JobRecommendationDto>>

    @GET("jobs/search") suspend fun searchJobs(
        @Query("q") query: String?,
        @Query("location") location: String?,
        @Query("experience_level") experienceLevel: String?,
        @Query("skip") skip: Int,
        @Query("limit") limit: Int
    ): Response<List<JobSearchDto>>

    @GET("jobs/{id}") suspend fun getJobDetail(
        @Path("id") id: String
    ): Response<JobDto>

    @GET("jobs/match-score/{resume_id}/{job_id}") suspend fun getMatchScore(
        @Path("resume_id") resumeId: String,
        @Path("job_id") jobId: String
    ): Response<JobMatchDto>

    @POST("jobs/{id}/save") suspend fun saveJob(
        @Path("id") id: String
    ): Response<GenericStatusResponseDto>

    @DELETE("jobs/{id}/unsave") suspend fun unsaveJob(
        @Path("id") id: String
    ): Response<GenericStatusResponseDto>

    @GET("jobs/saved") suspend fun getSavedJobs(): Response<List<SavedJobDto>>
}
