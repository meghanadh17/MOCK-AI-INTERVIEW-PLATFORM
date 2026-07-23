package com.aiinterview.domain.repository

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.User

interface AuthRepository {
    suspend fun login(email: String, password: String): Result<User>
    suspend fun register(name: String, email: String, password: String): Result<User>
    suspend fun logout(): Result<Unit>
    suspend fun getCurrentUser(): Result<User>
    suspend fun forgotPassword(email: String): Result<Unit>
    suspend fun verifyEmail(email: String, otp: String): Result<Unit>
    suspend fun resetPassword(email: String, otp: String, newPassword: String): Result<Unit>
    suspend fun resendVerification(email: String): Result<Unit>
    suspend fun updateProfile(fullName: String?, preferences: Map<String, Any>?): Result<User>
    suspend fun uploadAvatar(bytes: ByteArray, filename: String): Result<User>
    suspend fun changePassword(currentPass: String, newPass: String): Result<Unit>
    suspend fun enableMfa(): Result<Pair<String, String>>
    suspend fun verifyMfa(code: String): Result<Unit>
    suspend fun deleteAccount(): Result<Unit>
}
