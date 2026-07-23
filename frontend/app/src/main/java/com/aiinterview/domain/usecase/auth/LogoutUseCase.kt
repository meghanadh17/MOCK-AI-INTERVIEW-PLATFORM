package com.aiinterview.domain.usecase.auth

import com.aiinterview.core.result.Result
import com.aiinterview.domain.repository.AuthRepository
import javax.inject.Inject

class LogoutUseCase @Inject constructor(private val repo: AuthRepository) {
    suspend operator fun invoke(): Result<Unit> = repo.logout()
}
