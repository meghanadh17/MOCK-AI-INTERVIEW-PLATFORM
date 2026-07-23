package com.aiinterview.domain.usecase.auth

import com.aiinterview.core.result.Result
import com.aiinterview.domain.repository.AuthRepository
import javax.inject.Inject

class VerifyEmailUseCase @Inject constructor(private val repo: AuthRepository) {
    suspend operator fun invoke(email: String, otp: String): Result<Unit> = repo.verifyEmail(email, otp)
}
