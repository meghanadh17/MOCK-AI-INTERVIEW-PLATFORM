package com.aiinterview.domain.usecase.auth

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.User
import com.aiinterview.domain.repository.AuthRepository
import javax.inject.Inject

class LoginUseCase @Inject constructor(private val repo: AuthRepository) {
    suspend operator fun invoke(email: String, password: String): Result<User> = repo.login(email, password)
}
