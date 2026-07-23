package com.aiinterview.core.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)

    private val prefs: SharedPreferences by lazy {
        EncryptedSharedPreferences.create(
            "secure_tokens",
            masterKey,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    private val _accessToken = MutableStateFlow<String?>(null)
    val accessToken: Flow<String?> = _accessToken.asStateFlow()

    private val _refreshToken = MutableStateFlow<String?>(null)
    val refreshToken: Flow<String?> = _refreshToken.asStateFlow()

    init {
        _accessToken.value = prefs.getString(KEY_ACCESS_TOKEN, null)
        _refreshToken.value = prefs.getString(KEY_REFRESH_TOKEN, null)
    }

    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()
        _accessToken.value = accessToken
        _refreshToken.value = refreshToken
    }

    suspend fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)
    suspend fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)

    suspend fun clearTokens() {
        prefs.edit().clear().apply()
        _accessToken.value = null
        _refreshToken.value = null
    }

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
    }
}
