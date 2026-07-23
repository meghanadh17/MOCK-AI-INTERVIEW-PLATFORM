package com.aiinterview.core.network

import com.aiinterview.core.storage.TokenDataStore
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenDataStore: TokenDataStore
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { tokenDataStore.getAccessToken() }
        val request = chain.request()
        val url = request.url.encodedPath
        
        val isAuthEndpoint = url.contains("/auth/login") || 
                             url.contains("/auth/register") || 
                             url.contains("/auth/refresh")

        val newRequest = request.newBuilder().apply {
            if (!isAuthEndpoint) {
                token?.let { addHeader("Authorization", "Bearer $it") }
            }
        }.build()
        return chain.proceed(newRequest)
    }
}
