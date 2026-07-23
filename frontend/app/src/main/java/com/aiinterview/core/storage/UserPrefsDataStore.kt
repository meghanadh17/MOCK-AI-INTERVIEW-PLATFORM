package com.aiinterview.core.storage

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_prefs")

@Singleton
class UserPrefsDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val ONBOARDING_COMPLETE = booleanPreferencesKey("onboarding_complete")
    private val THEME_MODE = stringPreferencesKey("theme_mode")

    val isOnboardingComplete: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[ONBOARDING_COMPLETE] ?: false
    }

    val themeMode: Flow<String> = context.dataStore.data.map { prefs ->
        val saved = prefs[THEME_MODE]
        if (saved == "light") "dark" else (saved ?: "dark")
    }

    suspend fun setOnboardingComplete(complete: Boolean) {
        context.dataStore.edit { it[ONBOARDING_COMPLETE] = complete }
    }

    suspend fun setThemeMode(mode: String) {
        context.dataStore.edit { it[THEME_MODE] = mode }
    }

    fun getCheckedImprovements(sessionId: String): Flow<Set<String>> {
        val key = stringSetPreferencesKey("improvements_$sessionId")
        return context.dataStore.data.map { prefs ->
            prefs[key] ?: emptySet()
        }
    }

    suspend fun setCheckedImprovements(sessionId: String, checkedIds: Set<String>) {
        val key = stringSetPreferencesKey("improvements_$sessionId")
        context.dataStore.edit { prefs ->
            prefs[key] = checkedIds
        }
    }
}
