package com.aiinterview.data.remote.api

import com.aiinterview.data.remote.dto.auth.*
import retrofit2.Response
import retrofit2.http.*

interface AuthApiService {
    @POST("auth/login") suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    @POST("auth/register") suspend fun register(@Body request: RegisterRequest): Response<UserDto>
    @POST("auth/logout") suspend fun logout(): Response<Unit>
    @GET("auth/me") suspend fun getCurrentUser(): Response<UserDto>
    @POST("auth/refresh") suspend fun refreshToken(@Body refreshToken: String): Response<LoginResponse>
    @POST("auth/forgot-password") suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<Unit>
    @POST("auth/verify-email") suspend fun verifyEmail(@Body request: VerifyEmailRequest): Response<Unit>
    @POST("auth/reset-password") suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<Unit>
    @POST("auth/resend-verification") suspend fun resendVerification(@Body request: ResendVerificationRequest): Response<Unit>

    @PATCH("auth/me")
    suspend fun updateProfile(
        @Body request: UserProfileUpdateRequest
    ): Response<UserDto>

    @Multipart
    @PATCH("auth/me")
    suspend fun uploadAvatar(
        @Part avatar: okhttp3.MultipartBody.Part
    ): Response<UserDto>

    @POST("auth/change-password")
    suspend fun changePassword(
        @Body request: ChangePasswordRequest
    ): Response<Unit>

    @POST("auth/mfa/enable")
    suspend fun enableMfa(): Response<MfaEnableResponse>

    @POST("auth/mfa/verify")
    suspend fun verifyMfa(
        @Body request: MfaVerifyRequest
    ): Response<Unit>

    @DELETE("auth/me")
    suspend fun deleteAccount(): Response<Unit>
}
