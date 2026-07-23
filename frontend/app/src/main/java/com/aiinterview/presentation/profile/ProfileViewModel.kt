package com.aiinterview.presentation.profile

import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import com.aiinterview.core.base.BaseViewModel
import com.aiinterview.core.result.Result
import com.aiinterview.core.storage.UserPrefsDataStore
import com.aiinterview.domain.model.User
import com.aiinterview.domain.model.StreakInfo
import com.aiinterview.domain.repository.AuthRepository
import com.aiinterview.domain.repository.SessionRepository
import com.aiinterview.domain.usecase.auth.LogoutUseCase
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val sessionRepository: SessionRepository,
    private val logoutUseCase: LogoutUseCase,
    private val userPrefs: UserPrefsDataStore
) : BaseViewModel() {

    private val _userProfile = MutableStateFlow<User?>(null)
    val userProfile: StateFlow<User?> = _userProfile.asStateFlow()

    private val _streakInfo = MutableStateFlow<StreakInfo?>(null)
    val streakInfo: StateFlow<StreakInfo?> = _streakInfo.asStateFlow()

    private val _themeMode = MutableStateFlow("dark")
    val themeMode: StateFlow<String> = _themeMode.asStateFlow()

    private val _logoutSuccess = MutableSharedFlow<Unit>(replay = 0, extraBufferCapacity = 64)
    val logoutSuccess: SharedFlow<Unit> = _logoutSuccess.asSharedFlow()

    init {
        loadProfile()
        viewModelScope.launch {
            userPrefs.themeMode.collect { mode ->
                _themeMode.value = mode
                applyTheme(mode)
            }
        }
    }

    fun loadProfile() {
        _isLoading.value = true
        viewModelScope.launch {
            val userResult = authRepository.getCurrentUser()
            val streakResult = sessionRepository.getStreak()

            if (userResult is Result.Success) {
                _userProfile.value = userResult.data
            }
            if (streakResult is Result.Success) {
                _streakInfo.value = streakResult.data
            }
            _isLoading.value = false
        }
    }

    fun uploadAvatar(bytes: ByteArray, filename: String) {
        _isLoading.value = true
        viewModelScope.launch {
            when (val result = authRepository.uploadAvatar(bytes, filename)) {
                is Result.Success -> {
                    _userProfile.value = result.data
                }
                is Result.Error -> _error.emit(result.exception.userMessage)
                else -> {}
            }
            _isLoading.value = false
        }
    }

    fun updateTheme(mode: String) {
        viewModelScope.launch {
            userPrefs.setThemeMode(mode)
            _themeMode.value = mode
            applyTheme(mode)
        }
    }

    fun updateNotificationPreferences(push: Boolean, email: Boolean) {
        viewModelScope.launch {
            // Safe cast Map<String, Any>
            val currentPrefs = _userProfile.value?.preferences ?: emptyMap()
            val updatedPrefs = currentPrefs.toMutableMap().apply {
                put("push_enabled", push)
                put("email_enabled", email)
            }
            when (val result = authRepository.updateProfile(null, updatedPrefs)) {
                is Result.Success -> {
                    _userProfile.value = result.data
                }
                else -> {}
            }
        }
    }

    private fun applyTheme(mode: String) {
        val nightMode = when (mode) {
            "light" -> androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO
            "dark" -> androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES
            else -> androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(nightMode)
    }

    fun changePassword(currentPass: String, newPass: String, onResult: (Result<Unit>) -> Unit) {
        _isLoading.value = true
        viewModelScope.launch {
            val result = authRepository.changePassword(currentPass, newPass)
            onResult(result)
            _isLoading.value = false
        }
    }

    fun enableMfa(onResult: (Result<Pair<String, String>>) -> Unit) {
        _isLoading.value = true
        viewModelScope.launch {
            val result = authRepository.enableMfa()
            onResult(result)
            _isLoading.value = false
        }
    }

    fun verifyMfa(code: String, onResult: (Result<Unit>) -> Unit) {
        _isLoading.value = true
        viewModelScope.launch {
            val result = authRepository.verifyMfa(code)
            if (result is Result.Success) {
                loadProfile()
            }
            onResult(result)
            _isLoading.value = false
        }
    }

    fun deleteAccount(onResult: (Result<Unit>) -> Unit) {
        _isLoading.value = true
        viewModelScope.launch {
            val result = authRepository.deleteAccount()
            onResult(result)
            _isLoading.value = false
        }
    }

    fun logout() {
        safeApiCall(
            block = { logoutUseCase() },
            onSuccess = {
                viewModelScope.launch {
                    _logoutSuccess.emit(Unit)
                }
            }
        )
    }
}
