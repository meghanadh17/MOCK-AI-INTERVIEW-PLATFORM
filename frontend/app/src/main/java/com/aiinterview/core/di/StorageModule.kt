package com.aiinterview.core.di

import android.content.Context
import com.aiinterview.core.storage.TokenDataStore
import com.aiinterview.core.storage.UserPrefsDataStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object StorageModule {

    @Provides @Singleton
    fun provideTokenDataStore(@ApplicationContext context: Context): TokenDataStore =
        TokenDataStore(context)

    @Provides @Singleton
    fun provideUserPrefsDataStore(@ApplicationContext context: Context): UserPrefsDataStore =
        UserPrefsDataStore(context)
}
