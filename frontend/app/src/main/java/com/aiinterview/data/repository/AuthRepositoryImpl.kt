package com.aiinterview.data.repository

import com.aiinterview.core.result.ApiException
import com.aiinterview.core.result.Result
import com.aiinterview.core.storage.TokenDataStore
import com.aiinterview.data.mapper.AuthMapper.toDomain
import com.aiinterview.data.remote.api.AuthApiService
import com.aiinterview.data.remote.dto.auth.*
import com.aiinterview.domain.model.User
import com.aiinterview.domain.repository.AuthRepository
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val api: AuthApiService,
    private val tokenStore: TokenDataStore
) : AuthRepository {
    
    override suspend fun login(email: String, password: String): Result<User> = try {
        val response = api.login(LoginRequest(email, password))
        if (response.isSuccessful) {
            val body = response.body()!!
            tokenStore.saveTokens(body.access_token, body.refresh_token)
            val userDto = body.user
            if (userDto != null) {
                Result.Success(userDto.toDomain())
            } else {
                val userResponse = api.getCurrentUser()
                if (userResponse.isSuccessful) {
                    Result.Success(userResponse.body()!!.toDomain())
                } else {
                    Result.Error("Login succeeded, but failed to fetch user profile")
                }
            }
        } else Result.Error("Login failed: ${response.code()}")
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun register(name: String, email: String, password: String): Result<User> = try {
        val response = api.register(RegisterRequest(name, email, password))
        if (response.isSuccessful) {
            val userDto = response.body()!!
            Result.Success(userDto.toDomain())
        } else Result.Error("Registration failed: ${response.code()}")
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun logout(): Result<Unit> = try {
        api.logout(); tokenStore.clearTokens(); Result.Success(Unit)
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun getCurrentUser(): Result<User> = try {
        val response = api.getCurrentUser()
        if (response.isSuccessful) Result.Success(response.body()!!.toDomain())
        else Result.Error("Failed to fetch user")
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun forgotPassword(email: String): Result<Unit> = try {
        val response = api.forgotPassword(ForgotPasswordRequest(email))
        if (response.isSuccessful) Result.Success(Unit)
        else Result.Error("Request failed: ${response.code()}")
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun verifyEmail(email: String, otp: String): Result<Unit> = try {
        val response = api.verifyEmail(VerifyEmailRequest(email, otp))
        if (response.isSuccessful) Result.Success(Unit)
        else Result.Error("Verification failed: ${response.code()}")
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun resetPassword(email: String, otp: String, newPassword: String): Result<Unit> = try {
        val response = api.resetPassword(ResetPasswordRequest(email, otp, newPassword))
        if (response.isSuccessful) Result.Success(Unit)
        else Result.Error("Reset password failed: ${response.code()}")
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun resendVerification(email: String): Result<Unit> = try {
        val response = api.resendVerification(ResendVerificationRequest(email))
        if (response.isSuccessful) Result.Success(Unit)
        else Result.Error("Resend verification failed: ${response.code()}")
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun updateProfile(fullName: String?, preferences: Map<String, Any>?): Result<User> = try {
        val response = api.updateProfile(UserProfileUpdateRequest(fullName, preferences))
        if (response.isSuccessful) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Failed to update profile: ${response.code()}")
        }
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun uploadAvatar(bytes: ByteArray, filename: String): Result<User> = try {
        val mediaType = "image/*".toMediaTypeOrNull()
        val requestBody = okhttp3.RequestBody.create(mediaType, bytes)
        val part = okhttp3.MultipartBody.Part.createFormData("avatar", filename, requestBody)
        val response = api.uploadAvatar(part)
        if (response.isSuccessful) {
            Result.Success(response.body()!!.toDomain())
        } else {
            Result.Error("Failed to upload avatar: ${response.code()}")
        }
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun changePassword(currentPass: String, newPass: String): Result<Unit> = try {
        val response = api.changePassword(ChangePasswordRequest(currentPass, newPass))
        if (response.isSuccessful) Result.Success(Unit)
        else Result.Error("Change password failed: ${response.code()}")
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun enableMfa(): Result<Pair<String, String>> = try {
        val response = api.enableMfa()
        if (response.isSuccessful) {
            val body = response.body()!!
            Result.Success(Pair(body.secret, body.provisioningUri))
        } else {
            Result.Error("Enable MFA failed: ${response.code()}")
        }
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun verifyMfa(code: String): Result<Unit> = try {
        val response = api.verifyMfa(MfaVerifyRequest(code))
        if (response.isSuccessful) Result.Success(Unit)
        else Result.Error("Verify MFA failed: ${response.code()}")
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }

    override suspend fun deleteAccount(): Result<Unit> = try {
        val response = api.deleteAccount()
        if (response.isSuccessful) {
            tokenStore.clearTokens()
            Result.Success(Unit)
        } else {
            Result.Error("Account deletion failed: ${response.code()}")
        }
    } catch (e: Exception) { Result.Error(ApiException.map(e)) }
}
