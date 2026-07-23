package com.aiinterview.presentation.auth

import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import com.aiinterview.core.base.BaseViewModel
import com.aiinterview.core.result.Result
import com.aiinterview.core.storage.TokenDataStore
import com.aiinterview.core.storage.UserPrefsDataStore
import com.aiinterview.domain.usecase.auth.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class OtpMode {
    EmailVerification,
    PasswordReset
}

sealed class AuthNavigationState {
    object Idle : AuthNavigationState()
    object Onboarding : AuthNavigationState()
    object Login : AuthNavigationState()
    class OtpVerification(val email: String, val mode: OtpMode) : AuthNavigationState()
    object Main : AuthNavigationState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val getCurrentUserUseCase: GetCurrentUserUseCase,
    private val tokenDataStore: TokenDataStore,
    private val userPrefsDataStore: UserPrefsDataStore,
    private val loginUseCase: LoginUseCase,
    private val registerUseCase: RegisterUseCase,
    private val forgotPasswordUseCase: ForgotPasswordUseCase,
    private val verifyEmailUseCase: VerifyEmailUseCase,
    private val resetPasswordUseCase: ResetPasswordUseCase,
    private val resendVerificationUseCase: ResendVerificationUseCase
) : BaseViewModel() {

    private val _navigationState = MutableSharedFlow<AuthNavigationState>(replay = 0, extraBufferCapacity = 64)
    val navigationState: SharedFlow<AuthNavigationState> = _navigationState.asSharedFlow()

    fun checkAuthStatus() {
        viewModelScope.launch {
            val startTime = System.currentTimeMillis()

            // 1. Check if onboarding complete
            val onboardingComplete = userPrefsDataStore.isOnboardingComplete.first()

            // 2. Check if access token exists
            val token = tokenDataStore.getAccessToken()

            // 3. Resolve target navigation state
            val nextState = if (!onboardingComplete) {
                AuthNavigationState.Onboarding
            } else if (token.isNullOrEmpty()) {
                AuthNavigationState.Login
            } else {
                when (getCurrentUserUseCase()) {
                    is Result.Success -> AuthNavigationState.Main
                    else -> AuthNavigationState.Login
                }
            }

            // Enforce minimum 2000ms display time for splash logo/animation
            val elapsed = System.currentTimeMillis() - startTime
            val remaining = 2000L - elapsed
            if (remaining > 0) {
                kotlinx.coroutines.delay(remaining)
            }

            _navigationState.emit(nextState)
        }
    }

    fun setOnboardingComplete() {
        viewModelScope.launch {
            userPrefsDataStore.setOnboardingComplete(true)
            _navigationState.emit(AuthNavigationState.Login)
        }
    }

    fun login(email: String, pass: String) {
        safeApiCall(
            block = { loginUseCase(email, pass) },
            onSuccess = {
                viewModelScope.launch {
                    _navigationState.emit(AuthNavigationState.Main)
                }
            }
        )
    }

    fun register(name: String, email: String, pass: String) {
        safeApiCall(
            block = { registerUseCase(name, email, pass) },
            onSuccess = {
                viewModelScope.launch {
                    // Navigate to email verification screen
                    _navigationState.emit(AuthNavigationState.OtpVerification(email, OtpMode.EmailVerification))
                }
            }
        )
    }

    fun forgotPassword(email: String) {
        safeApiCall(
            block = { forgotPasswordUseCase(email) },
            onSuccess = {
                viewModelScope.launch {
                    // Navigate to reset password OTP verification screen
                    _navigationState.emit(AuthNavigationState.OtpVerification(email, OtpMode.PasswordReset))
                }
            }
        )
    }

    fun verifyOtp(email: String, code: String, mode: OtpMode, newPassword: String? = null) {
        safeApiCall(
            block = {
                if (mode == OtpMode.EmailVerification) {
                    verifyEmailUseCase(email, code)
                } else {
                    resetPasswordUseCase(email, code, newPassword ?: "")
                }
            },
            onSuccess = {
                viewModelScope.launch {
                    if (mode == OtpMode.EmailVerification) {
                        _navigationState.emit(AuthNavigationState.Main)
                    } else {
                        _navigationState.emit(AuthNavigationState.Login)
                    }
                }
            }
        )
    }

    fun resendVerification(email: String) {
        safeApiCall(
            block = { resendVerificationUseCase(email) },
            onSuccess = {
                // Handled in fragment via snackbar or general info
            }
        )
    }
}
