package com.aiinterview.core.network

import com.aiinterview.core.storage.TokenDataStore
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenRefreshInterceptor @Inject constructor(
    private val tokenDataStore: TokenDataStore
) : Interceptor {

    private val mutex = Mutex()

    private data class TokenRefreshResult(
        val access_token: String,
        val refresh_token: String
    )

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val originalToken = originalRequest.header("Authorization")?.substringAfter("Bearer ")
        
        val response = chain.proceed(originalRequest)

        if (response.code == 401) {
            response.close()
            return runBlocking {
                mutex.withLock {
                    val currentToken = tokenDataStore.getAccessToken()
                    if (currentToken != null && currentToken != originalToken) {
                        // Already refreshed by another thread, retry request with new token
                        val newRequest = originalRequest.newBuilder()
                            .header("Authorization", "Bearer $currentToken")
                            .build()
                        chain.proceed(newRequest)
                    } else {
                        // Needs token refresh
                        val refreshToken = tokenDataStore.getRefreshToken()
                        if (refreshToken == null) {
                            tokenDataStore.clearTokens()
                            return@runBlocking chain.proceed(originalRequest)
                        }

                        val refreshResult = performRefreshCall(refreshToken)
                        if (refreshResult != null) {
                            tokenDataStore.saveTokens(refreshResult.access_token, refreshResult.refresh_token)
                            val newRequest = originalRequest.newBuilder()
                                .header("Authorization", "Bearer ${refreshResult.access_token}")
                                .build()
                            chain.proceed(newRequest)
                        } else {
                            // On failure: clear tokens
                            tokenDataStore.clearTokens()
                            chain.proceed(originalRequest)
                        }
                    }
                }
            }
        }

        return response
    }

    private fun performRefreshCall(refreshToken: String): TokenRefreshResult? {
        val client = OkHttpClient()
        val baseUrl = com.aiinterview.BuildConfig.API_BASE_URL
        val refreshUrl = if (baseUrl.endsWith("/api/v1/")) {
            baseUrl + "auth/refresh"
        } else if (baseUrl.endsWith("/")) {
            baseUrl + "api/v1/auth/refresh"
        } else {
            baseUrl + "/api/v1/auth/refresh"
        }

        val mediaType = "application/json; charset=utf-8".toMediaType()
        val json = "{\"refresh_token\":\"$refreshToken\"}"
        val body = json.toRequestBody(mediaType)
        
        val request = Request.Builder()
            .url(refreshUrl)
            .addHeader("Authorization", "Bearer $refreshToken")
            .post(body)
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val bodyString = response.body?.string()
                    if (bodyString != null) {
                        com.google.gson.Gson().fromJson(bodyString, TokenRefreshResult::class.java)
                    } else null
                } else null
            }
        } catch (e: Exception) {
            null
        }
    }
}
