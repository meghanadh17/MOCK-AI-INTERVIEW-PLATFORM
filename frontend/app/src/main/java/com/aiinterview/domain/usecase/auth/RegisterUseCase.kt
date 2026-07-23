package com.aiinterview.domain.usecase.auth

import com.aiinterview.core.result.Result
import com.aiinterview.domain.model.User
import com.aiinterview.domain.repository.AuthRepository
import javax.inject.Inject

class RegisterUseCase @Inject constructor(private val repo: AuthRepository) {
    suspend operator fun invoke(name: String, email: String, password: String): Result<User> = repo.register(name, email, password)
}
