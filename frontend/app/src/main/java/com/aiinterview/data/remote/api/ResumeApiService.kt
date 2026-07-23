package com.aiinterview.data.remote.api

import com.aiinterview.data.remote.dto.resume.*
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

interface ResumeApiService {
    @GET("resume/list") suspend fun getResumes(): Response<List<ResumeDto>>
    @Multipart @POST("resume/upload") suspend fun uploadResume(@Part file: MultipartBody.Part): Response<ResumeDto>
    @GET("resume/{id}") suspend fun getResume(@Path("id") id: String): Response<ResumeDto>
    @DELETE("resume/{id}") suspend fun deleteResume(@Path("id") id: String): Response<Unit>
    @GET("resume/{id}/parse-status") suspend fun getParseStatus(@Path("id") id: String): Response<ParseStatusDto>
    @GET("resume/{id}/analyze") suspend fun analyzeResume(@Path("id") id: String): Response<ResumeAnalysisDto>
    @GET("resume/{id}/ats-score") suspend fun getAtsScore(@Path("id") id: String): Response<AtsScoreDto>
    @PUT("resume/{id}/set-primary") suspend fun setPrimary(@Path("id") id: String): Response<Unit>
    @POST("resume/{id}/enhance") suspend fun enhanceSection(@Path("id") id: String, @Body request: EnhanceRequest): Response<EnhanceResponseDto>
}
