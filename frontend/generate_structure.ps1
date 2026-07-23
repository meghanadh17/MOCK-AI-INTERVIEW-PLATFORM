$base = "e:\MocrAI\frontend\app\src\main"
$javaBase = "$base\java\com\aiinterview"
$resBase = "$base\res"
$pkg = "com.aiinterview"

function MkFile($path, $content) {
    $dir = Split-Path $path -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Set-Content -Path $path -Value $content -Encoding UTF8
}

# ═══════════════════════════════════════════════════════════════
# ROOT FILES
# ═══════════════════════════════════════════════════════════════

MkFile "$javaBase\AiInterviewApp.kt" @"
package $pkg

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class AiInterviewApp : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
"@

MkFile "$javaBase\MainActivity.kt" @"
package $pkg

import android.os.Bundle
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.bottomnavigation.BottomNavigationView
import dagger.hilt.android.AndroidEntryPoint
import ${pkg}.core.base.BaseActivity
import ${pkg}.databinding.ActivityMainBinding

@AndroidEntryPoint
class MainActivity : BaseActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        binding.bottomNav.setupWithNavController(navController)
    }
}
"@

# ═══════════════════════════════════════════════════════════════
# CORE / BASE
# ═══════════════════════════════════════════════════════════════

MkFile "$javaBase\core\base\BaseFragment.kt" @"
package ${pkg}.core.base

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.viewbinding.ViewBinding
import com.google.android.material.snackbar.Snackbar

abstract class BaseFragment<VB : ViewBinding> : Fragment() {

    private var _binding: VB? = null
    protected val binding get() = _binding!!

    abstract fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?): VB
    abstract fun onViewReady(savedInstanceState: Bundle?)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        _binding = inflateBinding(inflater, container)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        onViewReady(savedInstanceState)
    }

    protected fun showLoading(show: Boolean) {
        // Override in subclass to show/hide loading overlay
    }

    protected fun showError(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG).show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
"@

MkFile "$javaBase\core\base\BaseViewModel.kt" @"
package ${pkg}.core.base

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import ${pkg}.core.result.Result

abstract class BaseViewModel : ViewModel() {

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    protected fun <T> safeApiCall(
        onLoading: () -> Unit = { _isLoading.value = true },
        onSuccess: (T) -> Unit = {},
        onError: (String) -> Unit = { _error.value = it },
        block: suspend () -> Result<T>
    ) {
        viewModelScope.launch {
            onLoading()
            when (val result = block()) {
                is Result.Success -> {
                    _isLoading.value = false
                    onSuccess(result.data)
                }
                is Result.Error -> {
                    _isLoading.value = false
                    onError(result.message)
                }
                is Result.Loading -> { /* handled by onLoading */ }
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
"@

MkFile "$javaBase\core\base\BaseActivity.kt" @"
package ${pkg}.core.base

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat

abstract class BaseActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
    }
}
"@

# ═══════════════════════════════════════════════════════════════
# CORE / NETWORK
# ═══════════════════════════════════════════════════════════════

MkFile "$javaBase\core\network\ApiClient.kt" @"
package ${pkg}.core.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApiClient @Inject constructor(
    private val authInterceptor: AuthInterceptor,
    private val tokenRefreshInterceptor: TokenRefreshInterceptor
) {
    companion object {
        const val BASE_URL = "https://api.mocrai.com/"
        private const val TIMEOUT_SECONDS = 30L
    }

    val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(tokenRefreshInterceptor)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .build()
    }

    val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}
"@

MkFile "$javaBase\core\network\AuthInterceptor.kt" @"
package ${pkg}.core.network

import ${pkg}.core.storage.TokenDataStore
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
        val request = chain.request().newBuilder().apply {
            token?.let { addHeader("Authorization", "Bearer `$it`") }
        }.build()
        return chain.proceed(request)
    }
}
"@

MkFile "$javaBase\core\network\TokenRefreshInterceptor.kt" @"
package ${pkg}.core.network

import ${pkg}.core.storage.TokenDataStore
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenRefreshInterceptor @Inject constructor(
    private val tokenDataStore: TokenDataStore
) : Interceptor {

    private val mutex = Mutex()

    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())

        if (response.code == 401) {
            response.close()
            return runBlocking {
                mutex.withLock {
                    // TODO: Implement token refresh logic
                    // 1. Call refresh token endpoint
                    // 2. Save new tokens
                    // 3. Retry original request with new token
                    chain.proceed(chain.request())
                }
            }
        }

        return response
    }
}
"@

MkFile "$javaBase\core\network\NetworkMonitor.kt" @"
package ${pkg}.core.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NetworkMonitor @Inject constructor(
    @ApplicationContext private val context: Context
) {
    val isConnected: Flow<Boolean> = callbackFlow {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { trySend(true) }
            override fun onLost(network: Network) { trySend(false) }
            override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) {
                trySend(caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET))
            }
        }
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager.registerNetworkCallback(request, callback)
        awaitClose { connectivityManager.unregisterNetworkCallback(callback) }
    }
}
"@

# ═══════════════════════════════════════════════════════════════
# CORE / WEBSOCKET
# ═══════════════════════════════════════════════════════════════

MkFile "$javaBase\core\websocket\WebSocketClient.kt" @"
package ${pkg}.core.websocket

import okhttp3.*
import okio.ByteString
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WebSocketClient @Inject constructor(
    private val okHttpClient: OkHttpClient
) {
    private var webSocket: WebSocket? = null
    private val _events = MutableSharedFlow<WebSocketEvent>(replay = 0, extraBufferCapacity = 64)
    val events: SharedFlow<WebSocketEvent> = _events.asSharedFlow()

    fun connect(url: String) {
        val request = Request.Builder().url(url).build()
        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _events.tryEmit(WebSocketEvent.Connected)
            }
            override fun onMessage(webSocket: WebSocket, text: String) {
                _events.tryEmit(WebSocketEvent.Message(text))
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _events.tryEmit(WebSocketEvent.Error(t))
            }
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                _events.tryEmit(WebSocketEvent.Closed(code, reason))
            }
        })
    }

    fun send(message: String): Boolean = webSocket?.send(message) ?: false

    fun close(code: Int = 1000, reason: String = "Normal closure") {
        webSocket?.close(code, reason)
        webSocket = null
    }
}
"@

MkFile "$javaBase\core\websocket\WebSocketEvent.kt" @"
package ${pkg}.core.websocket

sealed class WebSocketEvent {
    object Connected : WebSocketEvent()
    data class Message(val text: String) : WebSocketEvent()
    data class Error(val throwable: Throwable) : WebSocketEvent()
    data class Closed(val code: Int, val reason: String) : WebSocketEvent()
}
"@

MkFile "$javaBase\core\websocket\WebSocketManager.kt" @"
package ${pkg}.core.websocket

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WebSocketManager @Inject constructor(
    private val webSocketClient: WebSocketClient
) {
    private var reconnectJob: Job? = null
    private var currentUrl: String? = null
    private val maxRetries = 5
    private val baseDelayMs = 1000L

    val events: SharedFlow<WebSocketEvent> = webSocketClient.events

    fun connect(url: String) {
        currentUrl = url
        webSocketClient.connect(url)
        observeForReconnect()
    }

    private fun observeForReconnect() {
        reconnectJob?.cancel()
        reconnectJob = CoroutineScope(Dispatchers.IO).launch {
            webSocketClient.events.collect { event ->
                if (event is WebSocketEvent.Error || event is WebSocketEvent.Closed) {
                    retryWithBackoff()
                }
            }
        }
    }

    private suspend fun retryWithBackoff() {
        val url = currentUrl ?: return
        for (attempt in 0 until maxRetries) {
            val delay = baseDelayMs * (1L shl attempt) // exponential backoff
            delay(delay)
            webSocketClient.connect(url)
            // Wait briefly to see if connection succeeded
            delay(2000)
        }
    }

    fun send(message: String) = webSocketClient.send(message)

    fun disconnect() {
        reconnectJob?.cancel()
        webSocketClient.close()
        currentUrl = null
    }
}
"@

# ═══════════════════════════════════════════════════════════════
# CORE / STORAGE
# ═══════════════════════════════════════════════════════════════

MkFile "$javaBase\core\storage\TokenDataStore.kt" @"
package ${pkg}.core.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import dagger.hilt.android.qualifiers.ApplicationContext
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

    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()
    }

    suspend fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)
    suspend fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)

    suspend fun clearTokens() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
    }
}
"@

MkFile "$javaBase\core\storage\UserPrefsDataStore.kt" @"
package ${pkg}.core.storage

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
        prefs[THEME_MODE] ?: "dark"
    }

    suspend fun setOnboardingComplete(complete: Boolean) {
        context.dataStore.edit { it[ONBOARDING_COMPLETE] = complete }
    }

    suspend fun setThemeMode(mode: String) {
        context.dataStore.edit { it[THEME_MODE] = mode }
    }
}
"@

MkFile "$javaBase\core\storage\AppDatabase.kt" @"
package ${pkg}.core.storage

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import ${pkg}.data.local.dao.*
import ${pkg}.data.local.entity.*

@Database(
    entities = [
        UserEntity::class,
        ResumeEntity::class,
        InterviewSessionEntity::class,
        QuizAttemptEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun resumeDao(): ResumeDao
    abstract fun interviewSessionDao(): InterviewSessionDao
    abstract fun quizAttemptDao(): QuizAttemptDao
}
"@

# ═══════════════════════════════════════════════════════════════
# CORE / DI
# ═══════════════════════════════════════════════════════════════

MkFile "$javaBase\core\di\NetworkModule.kt" @"
package ${pkg}.core.di

import ${pkg}.core.network.ApiClient
import ${pkg}.data.remote.api.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides @Singleton
    fun provideOkHttpClient(apiClient: ApiClient): OkHttpClient = apiClient.okHttpClient

    @Provides @Singleton
    fun provideRetrofit(apiClient: ApiClient): Retrofit = apiClient.retrofit

    @Provides @Singleton
    fun provideAuthApiService(retrofit: Retrofit): AuthApiService =
        retrofit.create(AuthApiService::class.java)

    @Provides @Singleton
    fun provideResumeApiService(retrofit: Retrofit): ResumeApiService =
        retrofit.create(ResumeApiService::class.java)

    @Provides @Singleton
    fun provideInterviewApiService(retrofit: Retrofit): InterviewApiService =
        retrofit.create(InterviewApiService::class.java)

    @Provides @Singleton
    fun provideVideoApiService(retrofit: Retrofit): VideoApiService =
        retrofit.create(VideoApiService::class.java)

    @Provides @Singleton
    fun provideSessionApiService(retrofit: Retrofit): SessionApiService =
        retrofit.create(SessionApiService::class.java)

    @Provides @Singleton
    fun provideQuizApiService(retrofit: Retrofit): QuizApiService =
        retrofit.create(QuizApiService::class.java)

    @Provides @Singleton
    fun provideJobsApiService(retrofit: Retrofit): JobsApiService =
        retrofit.create(JobsApiService::class.java)
}
"@

MkFile "$javaBase\core\di\DatabaseModule.kt" @"
package ${pkg}.core.di

import android.content.Context
import androidx.room.Room
import ${pkg}.core.storage.AppDatabase
import ${pkg}.data.local.dao.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "mocrai_db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideUserDao(db: AppDatabase): UserDao = db.userDao()
    @Provides fun provideResumeDao(db: AppDatabase): ResumeDao = db.resumeDao()
    @Provides fun provideInterviewSessionDao(db: AppDatabase): InterviewSessionDao = db.interviewSessionDao()
    @Provides fun provideQuizAttemptDao(db: AppDatabase): QuizAttemptDao = db.quizAttemptDao()
}
"@

MkFile "$javaBase\core\di\RepositoryModule.kt" @"
package ${pkg}.core.di

import ${pkg}.data.repository.*
import ${pkg}.domain.repository.*
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds @Singleton abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository
    @Binds @Singleton abstract fun bindResumeRepository(impl: ResumeRepositoryImpl): ResumeRepository
    @Binds @Singleton abstract fun bindInterviewRepository(impl: InterviewRepositoryImpl): InterviewRepository
    @Binds @Singleton abstract fun bindVideoRepository(impl: VideoRepositoryImpl): VideoRepository
    @Binds @Singleton abstract fun bindSessionRepository(impl: SessionRepositoryImpl): SessionRepository
    @Binds @Singleton abstract fun bindQuizRepository(impl: QuizRepositoryImpl): QuizRepository
    @Binds @Singleton abstract fun bindJobsRepository(impl: JobsRepositoryImpl): JobsRepository
}
"@

MkFile "$javaBase\core\di\StorageModule.kt" @"
package ${pkg}.core.di

import android.content.Context
import ${pkg}.core.storage.TokenDataStore
import ${pkg}.core.storage.UserPrefsDataStore
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
"@

# ═══════════════════════════════════════════════════════════════
# CORE / RESULT
# ═══════════════════════════════════════════════════════════════

MkFile "$javaBase\core\result\Result.kt" @"
package ${pkg}.core.result

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val code: Int? = null) : Result<Nothing>()
    object Loading : Result<Nothing>()

    val isSuccess: Boolean get() = this is Success
    val isError: Boolean get() = this is Error
    val isLoading: Boolean get() = this is Loading

    fun getOrNull(): T? = (this as? Success)?.data
}
"@

MkFile "$javaBase\core\result\ApiException.kt" @"
package ${pkg}.core.result

import retrofit2.HttpException
import java.io.IOException

object ApiException {
    fun map(throwable: Throwable): Result.Error = when (throwable) {
        is HttpException -> {
            val code = throwable.code()
            val msg = when (code) {
                400 -> "Bad request. Please check your input."
                401 -> "Session expired. Please login again."
                403 -> "Access denied."
                404 -> "Resource not found."
                422 -> "Validation error."
                429 -> "Too many requests. Please slow down."
                in 500..599 -> "Server error. Please try again later."
                else -> "Unexpected error (HTTP `$code`)."
            }
            Result.Error(msg, code)
        }
        is IOException -> Result.Error("Network error. Check your connection.")
        else -> Result.Error(throwable.message ?: "An unknown error occurred.")
    }
}
"@

# ═══════════════════════════════════════════════════════════════
# CORE / EXTENSIONS
# ═══════════════════════════════════════════════════════════════

MkFile "$javaBase\core\extensions\ViewExtensions.kt" @"
package ${pkg}.core.extensions

import android.view.View
import com.google.android.material.snackbar.Snackbar

fun View.show() { visibility = View.VISIBLE }
fun View.hide() { visibility = View.GONE }
fun View.invisible() { visibility = View.INVISIBLE }

fun View.showSnackbar(message: String, duration: Int = Snackbar.LENGTH_SHORT) {
    Snackbar.make(this, message, duration).show()
}

fun View.setDebouncedClickListener(debounceMs: Long = 500L, action: (View) -> Unit) {
    var lastClickTime = 0L
    setOnClickListener { view ->
        val now = System.currentTimeMillis()
        if (now - lastClickTime >= debounceMs) {
            lastClickTime = now
            action(view)
        }
    }
}
"@

MkFile "$javaBase\core\extensions\FlowExtensions.kt" @"
package ${pkg}.core.extensions

import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

fun <T> Fragment.collectLatestLifecycle(
    flow: Flow<T>,
    state: Lifecycle.State = Lifecycle.State.STARTED,
    collector: suspend (T) -> Unit
) {
    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(state) {
            flow.collectLatest(collector)
        }
    }
}

fun Fragment.repeatOnStarted(block: suspend () -> Unit) {
    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            block()
        }
    }
}
"@

MkFile "$javaBase\core\extensions\StringExtensions.kt" @"
package ${pkg}.core.extensions

import android.util.Patterns

fun String.isValidEmail(): Boolean =
    Patterns.EMAIL_ADDRESS.matcher(this).matches()

fun String.maskEmail(): String {
    val parts = split("@")
    if (parts.size != 2) return this
    val name = parts[0]
    val masked = if (name.length > 2) name.take(2) + "*".repeat(name.length - 2) else name
    return "`$masked`@`${parts[1]}`"
}

fun String.capitalizeWords(): String =
    split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }

fun String.truncate(maxLength: Int, suffix: String = "..."): String =
    if (length <= maxLength) this else take(maxLength - suffix.length) + suffix
"@

MkFile "$javaBase\core\extensions\DateExtensions.kt" @"
package ${pkg}.core.extensions

import java.text.SimpleDateFormat
import java.util.*

fun Long.toDisplayDate(pattern: String = "MMM dd, yyyy"): String {
    val sdf = SimpleDateFormat(pattern, Locale.getDefault())
    return sdf.format(Date(this))
}

fun Long.toRelativeTime(): String {
    val diff = System.currentTimeMillis() - this
    val seconds = diff / 1000
    val minutes = seconds / 60
    val hours = minutes / 60
    val days = hours / 24

    return when {
        seconds < 60 -> "just now"
        minutes < 60 -> "`${minutes}`m ago"
        hours < 24 -> "`${hours}`h ago"
        days < 7 -> "`${days}`d ago"
        else -> toDisplayDate()
    }
}

fun String.parseIsoTimestamp(): Long {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        sdf.parse(this)?.time ?: 0L
    } catch (e: Exception) { 0L }
}
"@

Write-Host "Core layer created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# DATA / REMOTE / API
# ═══════════════════════════════════════════════════════════════

$apiServices = @{
    "AuthApiService" = @"
package ${pkg}.data.remote.api

import ${pkg}.data.remote.dto.auth.*
import retrofit2.Response
import retrofit2.http.*

interface AuthApiService {
    @POST("auth/login") suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    @POST("auth/register") suspend fun register(@Body request: RegisterRequest): Response<LoginResponse>
    @POST("auth/logout") suspend fun logout(): Response<Unit>
    @GET("auth/me") suspend fun getCurrentUser(): Response<UserDto>
    @POST("auth/refresh") suspend fun refreshToken(@Body refreshToken: String): Response<LoginResponse>
    @POST("auth/forgot-password") suspend fun forgotPassword(@Body email: String): Response<Unit>
    @POST("auth/verify-otp") suspend fun verifyOtp(@Body otp: String): Response<Unit>
}
"@
    "ResumeApiService" = @"
package ${pkg}.data.remote.api

import ${pkg}.data.remote.dto.resume.*
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

interface ResumeApiService {
    @GET("resume/list") suspend fun getResumes(): Response<List<ResumeDto>>
    @Multipart @POST("resume/upload") suspend fun uploadResume(@Part file: MultipartBody.Part): Response<ResumeDto>
    @GET("resume/{id}") suspend fun getResume(@Path("id") id: String): Response<ResumeDto>
    @DELETE("resume/{id}") suspend fun deleteResume(@Path("id") id: String): Response<Unit>
    @GET("resume/{id}/parse-status") suspend fun getParseStatus(@Path("id") id: String): Response<ParseStatusDto>
    @POST("resume/{id}/analyze") suspend fun analyzeResume(@Path("id") id: String): Response<ResumeAnalysisDto>
    @POST("resume/{id}/ats-score") suspend fun getAtsScore(@Path("id") id: String): Response<AtsScoreDto>
    @PUT("resume/{id}/set-primary") suspend fun setPrimary(@Path("id") id: String): Response<Unit>
}
"@
    "InterviewApiService" = @"
package ${pkg}.data.remote.api

import ${pkg}.data.remote.dto.interview.*
import retrofit2.Response
import retrofit2.http.*

interface InterviewApiService {
    @POST("interview/sessions") suspend fun createSession(@Body params: Map<String, Any>): Response<SessionDto>
    @GET("interview/sessions/{id}") suspend fun getSession(@Path("id") id: String): Response<SessionDto>
    @POST("interview/sessions/{id}/answer") suspend fun submitAnswer(@Path("id") id: String, @Body answer: AnswerSubmitRequest): Response<FeedbackDto>
    @GET("interview/sessions/{id}/report") suspend fun getReport(@Path("id") id: String): Response<ReportDto>
    @POST("interview/sessions/{id}/hint") suspend fun requestHint(@Path("id") id: String, @Body questionIndex: Int): Response<String>
    @GET("interview/sessions/{id}/questions") suspend fun getQuestions(@Path("id") id: String): Response<List<QuestionDto>>
}
"@
    "VideoApiService" = @"
package ${pkg}.data.remote.api

import ${pkg}.data.remote.dto.video.*
import retrofit2.Response
import retrofit2.http.*

interface VideoApiService {
    @POST("video-interview/sessions") suspend fun createVideoSession(@Body params: Map<String, Any>): Response<VideoSessionDto>
    @GET("video-interview/sessions/{id}") suspend fun getVideoSession(@Path("id") id: String): Response<VideoSessionDto>
    @POST("video-interview/sessions/{id}/frame") suspend fun submitFrame(@Path("id") id: String, @Body frameData: Map<String, Any>): Response<FrameMetricDto>
    @GET("video-interview/sessions/{id}/report") suspend fun getVideoReport(@Path("id") id: String): Response<SpeechReportDto>
}
"@
    "SessionApiService" = @"
package ${pkg}.data.remote.api

import ${pkg}.data.remote.dto.interview.SessionDto
import retrofit2.Response
import retrofit2.http.*

interface SessionApiService {
    @GET("sessions") suspend fun getAllSessions(): Response<List<SessionDto>>
    @GET("sessions/{id}") suspend fun getSessionDetail(@Path("id") id: String): Response<SessionDto>
    @DELETE("sessions/{id}") suspend fun deleteSession(@Path("id") id: String): Response<Unit>
    @GET("sessions/analytics") suspend fun getSessionAnalytics(): Response<Map<String, Any>>
}
"@
    "QuizApiService" = @"
package ${pkg}.data.remote.api

import ${pkg}.data.remote.dto.quiz.*
import retrofit2.Response
import retrofit2.http.*

interface QuizApiService {
    @GET("quiz/list") suspend fun getQuizzes(): Response<List<QuizDto>>
    @POST("quiz/generate") suspend fun generateQuiz(@Body params: Map<String, Any>): Response<QuizDto>
    @POST("quiz/{id}/start") suspend fun startQuiz(@Path("id") id: String): Response<AttemptDto>
    @POST("quiz/attempts/{id}/answer") suspend fun submitAnswer(@Path("id") id: String, @Body answer: Map<String, Any>): Response<Map<String, Any>>
    @GET("quiz/attempts/{id}/result") suspend fun getResult(@Path("id") id: String): Response<QuizResultDto>
    @GET("quiz/leaderboard") suspend fun getLeaderboard(@Query("scope") scope: String): Response<List<LeaderboardDto>>
}
"@
    "JobsApiService" = @"
package ${pkg}.data.remote.api

import ${pkg}.data.remote.dto.jobs.*
import retrofit2.Response
import retrofit2.http.*

interface JobsApiService {
    @GET("jobs/recommendations") suspend fun getRecommendations(@Query("resume_id") resumeId: String): Response<List<JobDto>>
    @GET("jobs/search") suspend fun searchJobs(@QueryMap filters: Map<String, String>): Response<List<JobDto>>
    @GET("jobs/{id}") suspend fun getJobDetail(@Path("id") id: String): Response<JobDto>
    @POST("jobs/{id}/match") suspend fun getMatchScore(@Path("id") id: String, @Query("resume_id") resumeId: String): Response<JobMatchDto>
    @POST("jobs/{id}/save") suspend fun saveJob(@Path("id") id: String): Response<Unit>
    @DELETE("jobs/{id}/save") suspend fun unsaveJob(@Path("id") id: String): Response<Unit>
    @GET("jobs/saved") suspend fun getSavedJobs(): Response<List<JobDto>>
}
"@
}

foreach ($name in $apiServices.Keys) {
    MkFile "$javaBase\data\remote\api\$name.kt" $apiServices[$name]
}

Write-Host "API services created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# DATA / REMOTE / DTO
# ═══════════════════════════════════════════════════════════════

# Auth DTOs
MkFile "$javaBase\data\remote\dto\auth\LoginRequest.kt" "package ${pkg}.data.remote.dto.auth`n`ndata class LoginRequest(val email: String, val password: String)"
MkFile "$javaBase\data\remote\dto\auth\LoginResponse.kt" "package ${pkg}.data.remote.dto.auth`n`ndata class LoginResponse(val access_token: String, val refresh_token: String, val user: UserDto)"
MkFile "$javaBase\data\remote\dto\auth\RegisterRequest.kt" "package ${pkg}.data.remote.dto.auth`n`ndata class RegisterRequest(val full_name: String, val email: String, val password: String)"
MkFile "$javaBase\data\remote\dto\auth\UserDto.kt" "package ${pkg}.data.remote.dto.auth`n`ndata class UserDto(val id: String, val email: String, val full_name: String, val avatar_url: String?, val created_at: String)"

# Resume DTOs
MkFile "$javaBase\data\remote\dto\resume\ResumeDto.kt" "package ${pkg}.data.remote.dto.resume`n`ndata class ResumeDto(val id: String, val filename: String, val file_url: String?, val is_primary: Boolean, val parse_status: String, val created_at: String)"
MkFile "$javaBase\data\remote\dto\resume\ParseStatusDto.kt" "package ${pkg}.data.remote.dto.resume`n`ndata class ParseStatusDto(val status: String, val progress: Int, val error_message: String?)"
MkFile "$javaBase\data\remote\dto\resume\ResumeAnalysisDto.kt" "package ${pkg}.data.remote.dto.resume`n`ndata class ResumeAnalysisDto(val id: String, val overall_score: Int, val sections: List<Map<String, Any>>, val suggestions: List<String>, val skills: List<String>)"
MkFile "$javaBase\data\remote\dto\resume\AtsScoreDto.kt" "package ${pkg}.data.remote.dto.resume`n`ndata class AtsScoreDto(val score: Int, val keyword_matches: List<String>, val missing_keywords: List<String>, val recommendations: List<String>)"

# Interview DTOs
MkFile "$javaBase\data\remote\dto\interview\SessionDto.kt" "package ${pkg}.data.remote.dto.interview`n`ndata class SessionDto(val id: String, val type: String, val difficulty: String, val status: String, val overall_score: Int?, val questions: List<QuestionDto>?, val created_at: String)"
MkFile "$javaBase\data\remote\dto\interview\QuestionDto.kt" "package ${pkg}.data.remote.dto.interview`n`ndata class QuestionDto(val id: String, val index: Int, val text: String, val category: String, val difficulty: String)"
MkFile "$javaBase\data\remote\dto\interview\AnswerSubmitRequest.kt" "package ${pkg}.data.remote.dto.interview`n`ndata class AnswerSubmitRequest(val question_index: Int, val answer_text: String)"
MkFile "$javaBase\data\remote\dto\interview\FeedbackDto.kt" "package ${pkg}.data.remote.dto.interview`n`ndata class FeedbackDto(val score: Int, val feedback: String, val strengths: List<String>, val improvements: List<String>, val model_answer: String?)"
MkFile "$javaBase\data\remote\dto\interview\ReportDto.kt" "package ${pkg}.data.remote.dto.interview`n`ndata class ReportDto(val session_id: String, val overall_score: Int, val dimension_scores: Map<String, Int>, val question_feedbacks: List<FeedbackDto>, val summary: String)"

# Video DTOs
MkFile "$javaBase\data\remote\dto\video\VideoSessionDto.kt" "package ${pkg}.data.remote.dto.video`n`ndata class VideoSessionDto(val id: String, val status: String, val recording_url: String?, val created_at: String)"
MkFile "$javaBase\data\remote\dto\video\FrameMetricDto.kt" "package ${pkg}.data.remote.dto.video`n`ndata class FrameMetricDto(val timestamp: Long, val emotion: String, val confidence: Float, val eye_contact: Boolean, val posture_score: Float)"
MkFile "$javaBase\data\remote\dto\video\SpeechReportDto.kt" "package ${pkg}.data.remote.dto.video`n`ndata class SpeechReportDto(val wpm: Int, val filler_count: Int, val clarity_score: Float, val emotion_timeline: List<FrameMetricDto>, val overall_score: Int)"

# Quiz DTOs
MkFile "$javaBase\data\remote\dto\quiz\QuizDto.kt" "package ${pkg}.data.remote.dto.quiz`n`ndata class QuizDto(val id: String, val topic: String, val difficulty: String, val question_count: Int, val time_limit_seconds: Int?, val created_at: String)"
MkFile "$javaBase\data\remote\dto\quiz\AttemptDto.kt" "package ${pkg}.data.remote.dto.quiz`n`ndata class AttemptDto(val id: String, val quiz_id: String, val status: String, val current_index: Int, val questions: List<Map<String, Any>>)"
MkFile "$javaBase\data\remote\dto\quiz\QuizResultDto.kt" "package ${pkg}.data.remote.dto.quiz`n`ndata class QuizResultDto(val attempt_id: String, val score: Int, val total: Int, val percentage: Float, val time_taken_seconds: Int, val review: List<Map<String, Any>>)"
MkFile "$javaBase\data\remote\dto\quiz\LeaderboardDto.kt" "package ${pkg}.data.remote.dto.quiz`n`ndata class LeaderboardDto(val rank: Int, val user_name: String, val avatar_url: String?, val score: Int, val quizzes_taken: Int)"

# Jobs DTOs
MkFile "$javaBase\data\remote\dto\jobs\JobDto.kt" "package ${pkg}.data.remote.dto.jobs`n`ndata class JobDto(val id: String, val title: String, val company: String, val location: String, val type: String, val salary_range: String?, val description: String, val url: String?, val posted_at: String)"
MkFile "$javaBase\data\remote\dto\jobs\JobMatchDto.kt" "package ${pkg}.data.remote.dto.jobs`n`ndata class JobMatchDto(val match_score: Int, val skills_overlap: List<String>, val missing_skills: List<String>, val recommendations: List<String>)"

Write-Host "DTOs created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# DATA / LOCAL / DAO + ENTITY
# ═══════════════════════════════════════════════════════════════

MkFile "$javaBase\data\local\dao\UserDao.kt" @"
package ${pkg}.data.local.dao

import androidx.room.*
import ${pkg}.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM users LIMIT 1") fun observeUser(): Flow<UserEntity?>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsert(user: UserEntity)
    @Query("DELETE FROM users") suspend fun clear()
}
"@

MkFile "$javaBase\data\local\dao\ResumeDao.kt" @"
package ${pkg}.data.local.dao

import androidx.room.*
import ${pkg}.data.local.entity.ResumeEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ResumeDao {
    @Query("SELECT * FROM resumes ORDER BY created_at DESC") fun observeAll(): Flow<List<ResumeEntity>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsertAll(resumes: List<ResumeEntity>)
    @Query("DELETE FROM resumes") suspend fun clear()
}
"@

MkFile "$javaBase\data\local\dao\InterviewSessionDao.kt" @"
package ${pkg}.data.local.dao

import androidx.room.*
import ${pkg}.data.local.entity.InterviewSessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface InterviewSessionDao {
    @Query("SELECT * FROM interview_sessions ORDER BY created_at DESC") fun observeAll(): Flow<List<InterviewSessionEntity>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsertAll(sessions: List<InterviewSessionEntity>)
    @Query("DELETE FROM interview_sessions") suspend fun clear()
}
"@

MkFile "$javaBase\data\local\dao\QuizAttemptDao.kt" @"
package ${pkg}.data.local.dao

import androidx.room.*
import ${pkg}.data.local.entity.QuizAttemptEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface QuizAttemptDao {
    @Query("SELECT * FROM quiz_attempts ORDER BY created_at DESC") fun observeAll(): Flow<List<QuizAttemptEntity>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun upsertAll(attempts: List<QuizAttemptEntity>)
    @Query("DELETE FROM quiz_attempts") suspend fun clear()
}
"@

MkFile "$javaBase\data\local\entity\UserEntity.kt" @"
package ${pkg}.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val email: String,
    val full_name: String,
    val avatar_url: String?,
    val created_at: String
)
"@

MkFile "$javaBase\data\local\entity\ResumeEntity.kt" @"
package ${pkg}.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "resumes")
data class ResumeEntity(
    @PrimaryKey val id: String,
    val filename: String,
    val file_url: String?,
    val is_primary: Boolean,
    val parse_status: String,
    val created_at: String
)
"@

MkFile "$javaBase\data\local\entity\InterviewSessionEntity.kt" @"
package ${pkg}.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "interview_sessions")
data class InterviewSessionEntity(
    @PrimaryKey val id: String,
    val type: String,
    val difficulty: String,
    val status: String,
    val overall_score: Int?,
    val created_at: String
)
"@

MkFile "$javaBase\data\local\entity\QuizAttemptEntity.kt" @"
package ${pkg}.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "quiz_attempts")
data class QuizAttemptEntity(
    @PrimaryKey val id: String,
    val quiz_id: String,
    val score: Int,
    val total: Int,
    val created_at: String
)
"@

Write-Host "Local DB layer created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# DATA / MAPPER
# ═══════════════════════════════════════════════════════════════

$mappers = @(
    @{ Name="AuthMapper"; Content=@"
package ${pkg}.data.mapper

import ${pkg}.data.remote.dto.auth.UserDto
import ${pkg}.data.local.entity.UserEntity
import ${pkg}.domain.model.User

object AuthMapper {
    fun UserDto.toDomain() = User(id = id, email = email, fullName = full_name, avatarUrl = avatar_url, createdAt = created_at)
    fun UserDto.toEntity() = UserEntity(id = id, email = email, full_name = full_name, avatar_url = avatar_url, created_at = created_at)
    fun UserEntity.toDomain() = User(id = id, email = email, fullName = full_name, avatarUrl = avatar_url, createdAt = created_at)
}
"@ }
    @{ Name="ResumeMapper"; Content="package ${pkg}.data.mapper`n`nimport ${pkg}.data.remote.dto.resume.ResumeDto`nimport ${pkg}.data.local.entity.ResumeEntity`nimport ${pkg}.domain.model.Resume`n`nobject ResumeMapper {`n    fun ResumeDto.toDomain() = Resume(id = id, filename = filename, fileUrl = file_url, isPrimary = is_primary, parseStatus = parse_status, createdAt = created_at)`n    fun ResumeDto.toEntity() = ResumeEntity(id = id, filename = filename, file_url = file_url, is_primary = is_primary, parse_status = parse_status, created_at = created_at)`n    fun ResumeEntity.toDomain() = Resume(id = id, filename = filename, fileUrl = file_url, isPrimary = is_primary, parseStatus = parse_status, createdAt = created_at)`n}" }
    @{ Name="InterviewMapper"; Content="package ${pkg}.data.mapper`n`nimport ${pkg}.data.remote.dto.interview.SessionDto`nimport ${pkg}.domain.model.InterviewSession`n`nobject InterviewMapper {`n    fun SessionDto.toDomain() = InterviewSession(id = id, type = type, difficulty = difficulty, status = status, overallScore = overall_score, createdAt = created_at)`n}" }
    @{ Name="VideoMapper"; Content="package ${pkg}.data.mapper`n`nimport ${pkg}.data.remote.dto.video.*`nimport ${pkg}.domain.model.*`n`nobject VideoMapper {`n    fun VideoSessionDto.toDomain() = VideoSession(id = id, status = status, recordingUrl = recording_url, createdAt = created_at)`n    fun FrameMetricDto.toDomain() = FrameMetric(timestamp = timestamp, emotion = emotion, confidence = confidence, eyeContact = eye_contact, postureScore = posture_score)`n}" }
    @{ Name="QuizMapper"; Content="package ${pkg}.data.mapper`n`nimport ${pkg}.data.remote.dto.quiz.*`nimport ${pkg}.domain.model.*`n`nobject QuizMapper {`n    fun QuizDto.toDomain() = Quiz(id = id, topic = topic, difficulty = difficulty, questionCount = question_count, timeLimitSeconds = time_limit_seconds, createdAt = created_at)`n    fun LeaderboardDto.toDomain() = LeaderboardEntry(rank = rank, userName = user_name, avatarUrl = avatar_url, score = score, quizzesTaken = quizzes_taken)`n}" }
    @{ Name="JobsMapper"; Content="package ${pkg}.data.mapper`n`nimport ${pkg}.data.remote.dto.jobs.*`nimport ${pkg}.domain.model.JobMatch`n`nobject JobsMapper {`n    fun JobMatchDto.toDomain() = JobMatch(matchScore = match_score, skillsOverlap = skills_overlap, missingSkills = missing_skills, recommendations = recommendations)`n}" }
)
foreach ($m in $mappers) { MkFile "$javaBase\data\mapper\$($m.Name).kt" $m.Content }

Write-Host "Mappers created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# DATA / REPOSITORY IMPL
# ═══════════════════════════════════════════════════════════════

$repoImpls = @(
    @{ N="AuthRepositoryImpl"; Content=@"
package ${pkg}.data.repository

import ${pkg}.core.result.ApiException
import ${pkg}.core.result.Result
import ${pkg}.core.storage.TokenDataStore
import ${pkg}.data.mapper.AuthMapper.toDomain
import ${pkg}.data.remote.api.AuthApiService
import ${pkg}.data.remote.dto.auth.LoginRequest
import ${pkg}.data.remote.dto.auth.RegisterRequest
import ${pkg}.domain.model.User
import ${pkg}.domain.repository.AuthRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val api: AuthApiService,
    private val tokenStore: TokenDataStore
) : AuthRepository {
    override suspend fun login(email: String, password: String): Result<User> = try {
        val response = api.login(LoginRequest(email, password))
        if (response.isSuccessful) {
            val body = response.body()!!
            tokenStore.saveTokens(body.access_token, body.refresh_token)
            Result.Success(body.user.toDomain())
        } else Result.Error("Login failed: `${response.code()}`")
    } catch (e: Exception) { ApiException.map(e) }

    override suspend fun register(name: String, email: String, password: String): Result<User> = try {
        val response = api.register(RegisterRequest(name, email, password))
        if (response.isSuccessful) {
            val body = response.body()!!
            tokenStore.saveTokens(body.access_token, body.refresh_token)
            Result.Success(body.user.toDomain())
        } else Result.Error("Registration failed: `${response.code()}`")
    } catch (e: Exception) { ApiException.map(e) }

    override suspend fun logout(): Result<Unit> = try {
        api.logout(); tokenStore.clearTokens(); Result.Success(Unit)
    } catch (e: Exception) { ApiException.map(e) }

    override suspend fun getCurrentUser(): Result<User> = try {
        val response = api.getCurrentUser()
        if (response.isSuccessful) Result.Success(response.body()!!.toDomain())
        else Result.Error("Failed to fetch user")
    } catch (e: Exception) { ApiException.map(e) }
}
"@ }
    @{ N="ResumeRepositoryImpl"; Content="package ${pkg}.data.repository`n`nimport ${pkg}.domain.repository.ResumeRepository`nimport ${pkg}.data.remote.api.ResumeApiService`nimport javax.inject.Inject`nimport javax.inject.Singleton`n`n@Singleton`nclass ResumeRepositoryImpl @Inject constructor(private val api: ResumeApiService) : ResumeRepository {`n    // TODO: Implement all ResumeRepository methods`n}" }
    @{ N="InterviewRepositoryImpl"; Content="package ${pkg}.data.repository`n`nimport ${pkg}.domain.repository.InterviewRepository`nimport ${pkg}.data.remote.api.InterviewApiService`nimport javax.inject.Inject`nimport javax.inject.Singleton`n`n@Singleton`nclass InterviewRepositoryImpl @Inject constructor(private val api: InterviewApiService) : InterviewRepository {`n    // TODO: Implement all InterviewRepository methods`n}" }
    @{ N="VideoRepositoryImpl"; Content="package ${pkg}.data.repository`n`nimport ${pkg}.domain.repository.VideoRepository`nimport ${pkg}.data.remote.api.VideoApiService`nimport javax.inject.Inject`nimport javax.inject.Singleton`n`n@Singleton`nclass VideoRepositoryImpl @Inject constructor(private val api: VideoApiService) : VideoRepository {`n    // TODO: Implement all VideoRepository methods`n}" }
    @{ N="SessionRepositoryImpl"; Content="package ${pkg}.data.repository`n`nimport ${pkg}.domain.repository.SessionRepository`nimport ${pkg}.data.remote.api.SessionApiService`nimport javax.inject.Inject`nimport javax.inject.Singleton`n`n@Singleton`nclass SessionRepositoryImpl @Inject constructor(private val api: SessionApiService) : SessionRepository {`n    // TODO: Implement all SessionRepository methods`n}" }
    @{ N="QuizRepositoryImpl"; Content="package ${pkg}.data.repository`n`nimport ${pkg}.domain.repository.QuizRepository`nimport ${pkg}.data.remote.api.QuizApiService`nimport javax.inject.Inject`nimport javax.inject.Singleton`n`n@Singleton`nclass QuizRepositoryImpl @Inject constructor(private val api: QuizApiService) : QuizRepository {`n    // TODO: Implement all QuizRepository methods`n}" }
    @{ N="JobsRepositoryImpl"; Content="package ${pkg}.data.repository`n`nimport ${pkg}.domain.repository.JobsRepository`nimport ${pkg}.data.remote.api.JobsApiService`nimport javax.inject.Inject`nimport javax.inject.Singleton`n`n@Singleton`nclass JobsRepositoryImpl @Inject constructor(private val api: JobsApiService) : JobsRepository {`n    // TODO: Implement all JobsRepository methods`n}" }
)
foreach ($r in $repoImpls) { MkFile "$javaBase\data\repository\$($r.N).kt" $r.Content }

Write-Host "Repository implementations created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# DOMAIN / MODEL
# ═══════════════════════════════════════════════════════════════

$models = @{
    "User" = "data class User(val id: String, val email: String, val fullName: String, val avatarUrl: String?, val createdAt: String)"
    "Resume" = "data class Resume(val id: String, val filename: String, val fileUrl: String?, val isPrimary: Boolean, val parseStatus: String, val createdAt: String)"
    "ResumeAnalysis" = "data class ResumeAnalysis(val id: String, val overallScore: Int, val sections: List<Map<String, Any>>, val suggestions: List<String>, val skills: List<String>)"
    "InterviewSession" = "data class InterviewSession(val id: String, val type: String, val difficulty: String, val status: String, val overallScore: Int?, val createdAt: String)"
    "InterviewQuestion" = "data class InterviewQuestion(val id: String, val index: Int, val text: String, val category: String, val difficulty: String)"
    "AnswerFeedback" = "data class AnswerFeedback(val score: Int, val feedback: String, val strengths: List<String>, val improvements: List<String>, val modelAnswer: String?)"
    "VideoSession" = "data class VideoSession(val id: String, val status: String, val recordingUrl: String?, val createdAt: String)"
    "FrameMetric" = "data class FrameMetric(val timestamp: Long, val emotion: String, val confidence: Float, val eyeContact: Boolean, val postureScore: Float)"
    "Quiz" = "data class Quiz(val id: String, val topic: String, val difficulty: String, val questionCount: Int, val timeLimitSeconds: Int?, val createdAt: String)"
    "QuizResult" = "data class QuizResult(val attemptId: String, val score: Int, val total: Int, val percentage: Float, val timeTakenSeconds: Int)"
    "LeaderboardEntry" = "data class LeaderboardEntry(val rank: Int, val userName: String, val avatarUrl: String?, val score: Int, val quizzesTaken: Int)"
    "JobMatch" = "data class JobMatch(val matchScore: Int, val skillsOverlap: List<String>, val missingSkills: List<String>, val recommendations: List<String>)"
    "SessionAnalytics" = "data class SessionAnalytics(val totalSessions: Int, val averageScore: Float, val sessionsByType: Map<String, Int>, val improvementTrend: List<Float>)"
}
foreach ($name in $models.Keys) {
    MkFile "$javaBase\domain\model\$name.kt" "package ${pkg}.domain.model`n`n$($models[$name])"
}

Write-Host "Domain models created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# DOMAIN / REPOSITORY (Interfaces)
# ═══════════════════════════════════════════════════════════════

MkFile "$javaBase\domain\repository\AuthRepository.kt" "package ${pkg}.domain.repository`n`nimport ${pkg}.core.result.Result`nimport ${pkg}.domain.model.User`n`ninterface AuthRepository {`n    suspend fun login(email: String, password: String): Result<User>`n    suspend fun register(name: String, email: String, password: String): Result<User>`n    suspend fun logout(): Result<Unit>`n    suspend fun getCurrentUser(): Result<User>`n}"
MkFile "$javaBase\domain\repository\ResumeRepository.kt" "package ${pkg}.domain.repository`n`ninterface ResumeRepository { /* TODO: Define resume repository contract */ }"
MkFile "$javaBase\domain\repository\InterviewRepository.kt" "package ${pkg}.domain.repository`n`ninterface InterviewRepository { /* TODO: Define interview repository contract */ }"
MkFile "$javaBase\domain\repository\VideoRepository.kt" "package ${pkg}.domain.repository`n`ninterface VideoRepository { /* TODO: Define video repository contract */ }"
MkFile "$javaBase\domain\repository\SessionRepository.kt" "package ${pkg}.domain.repository`n`ninterface SessionRepository { /* TODO: Define session repository contract */ }"
MkFile "$javaBase\domain\repository\QuizRepository.kt" "package ${pkg}.domain.repository`n`ninterface QuizRepository { /* TODO: Define quiz repository contract */ }"
MkFile "$javaBase\domain\repository\JobsRepository.kt" "package ${pkg}.domain.repository`n`ninterface JobsRepository { /* TODO: Define jobs repository contract */ }"

Write-Host "Domain repositories created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# DOMAIN / USE CASES
# ═══════════════════════════════════════════════════════════════

$useCases = @(
    # Auth
    @{ Path="auth\LoginUseCase"; Content="package ${pkg}.domain.usecase.auth`n`nimport ${pkg}.core.result.Result`nimport ${pkg}.domain.model.User`nimport ${pkg}.domain.repository.AuthRepository`nimport javax.inject.Inject`n`nclass LoginUseCase @Inject constructor(private val repo: AuthRepository) {`n    suspend operator fun invoke(email: String, password: String): Result<User> = repo.login(email, password)`n}" }
    @{ Path="auth\RegisterUseCase"; Content="package ${pkg}.domain.usecase.auth`n`nimport ${pkg}.core.result.Result`nimport ${pkg}.domain.model.User`nimport ${pkg}.domain.repository.AuthRepository`nimport javax.inject.Inject`n`nclass RegisterUseCase @Inject constructor(private val repo: AuthRepository) {`n    suspend operator fun invoke(name: String, email: String, password: String): Result<User> = repo.register(name, email, password)`n}" }
    @{ Path="auth\LogoutUseCase"; Content="package ${pkg}.domain.usecase.auth`n`nimport ${pkg}.core.result.Result`nimport ${pkg}.domain.repository.AuthRepository`nimport javax.inject.Inject`n`nclass LogoutUseCase @Inject constructor(private val repo: AuthRepository) {`n    suspend operator fun invoke(): Result<Unit> = repo.logout()`n}" }
    @{ Path="auth\GetCurrentUserUseCase"; Content="package ${pkg}.domain.usecase.auth`n`nimport ${pkg}.core.result.Result`nimport ${pkg}.domain.model.User`nimport ${pkg}.domain.repository.AuthRepository`nimport javax.inject.Inject`n`nclass GetCurrentUserUseCase @Inject constructor(private val repo: AuthRepository) {`n    suspend operator fun invoke(): Result<User> = repo.getCurrentUser()`n}" }
    # Resume
    @{ Path="resume\UploadResumeUseCase"; Content="package ${pkg}.domain.usecase.resume`n`nimport ${pkg}.domain.repository.ResumeRepository`nimport javax.inject.Inject`n`nclass UploadResumeUseCase @Inject constructor(private val repo: ResumeRepository) {`n    // TODO: suspend operator fun invoke(file: File): Result<Resume>`n}" }
    @{ Path="resume\GetResumeListUseCase"; Content="package ${pkg}.domain.usecase.resume`n`nimport ${pkg}.domain.repository.ResumeRepository`nimport javax.inject.Inject`n`nclass GetResumeListUseCase @Inject constructor(private val repo: ResumeRepository) {`n    // TODO: suspend operator fun invoke(): Result<List<Resume>>`n}" }
    @{ Path="resume\AnalyzeResumeUseCase"; Content="package ${pkg}.domain.usecase.resume`n`nimport ${pkg}.domain.repository.ResumeRepository`nimport javax.inject.Inject`n`nclass AnalyzeResumeUseCase @Inject constructor(private val repo: ResumeRepository) {`n    // TODO: suspend operator fun invoke(resumeId: String): Result<ResumeAnalysis>`n}" }
    @{ Path="resume\GetParseStatusUseCase"; Content="package ${pkg}.domain.usecase.resume`n`nimport ${pkg}.domain.repository.ResumeRepository`nimport javax.inject.Inject`n`nclass GetParseStatusUseCase @Inject constructor(private val repo: ResumeRepository) {`n    // TODO: suspend operator fun invoke(resumeId: String): Flow<ParseStatus>`n}" }
    # Interview
    @{ Path="interview\CreateSessionUseCase"; Content="package ${pkg}.domain.usecase.interview`n`nimport ${pkg}.domain.repository.InterviewRepository`nimport javax.inject.Inject`n`nclass CreateSessionUseCase @Inject constructor(private val repo: InterviewRepository) {`n    // TODO: suspend operator fun invoke(params: Map<String, Any>): Result<InterviewSession>`n}" }
    @{ Path="interview\SubmitAnswerUseCase"; Content="package ${pkg}.domain.usecase.interview`n`nimport ${pkg}.domain.repository.InterviewRepository`nimport javax.inject.Inject`n`nclass SubmitAnswerUseCase @Inject constructor(private val repo: InterviewRepository) {`n    // TODO: suspend operator fun invoke(sessionId: String, index: Int, answer: String): Result<AnswerFeedback>`n}" }
    @{ Path="interview\GetSessionReportUseCase"; Content="package ${pkg}.domain.usecase.interview`n`nimport ${pkg}.domain.repository.InterviewRepository`nimport javax.inject.Inject`n`nclass GetSessionReportUseCase @Inject constructor(private val repo: InterviewRepository) {`n    // TODO: suspend operator fun invoke(sessionId: String): Result<SessionReport>`n}" }
    @{ Path="interview\RequestHintUseCase"; Content="package ${pkg}.domain.usecase.interview`n`nimport ${pkg}.domain.repository.InterviewRepository`nimport javax.inject.Inject`n`nclass RequestHintUseCase @Inject constructor(private val repo: InterviewRepository) {`n    // TODO: suspend operator fun invoke(sessionId: String, questionIndex: Int): Result<String>`n}" }
    # Video
    @{ Path="video\CreateVideoSessionUseCase"; Content="package ${pkg}.domain.usecase.video`n`nimport ${pkg}.domain.repository.VideoRepository`nimport javax.inject.Inject`n`nclass CreateVideoSessionUseCase @Inject constructor(private val repo: VideoRepository) {`n    // TODO: suspend operator fun invoke(params: Map<String, Any>): Result<VideoSession>`n}" }
    @{ Path="video\GetVideoReportsUseCase"; Content="package ${pkg}.domain.usecase.video`n`nimport ${pkg}.domain.repository.VideoRepository`nimport javax.inject.Inject`n`nclass GetVideoReportsUseCase @Inject constructor(private val repo: VideoRepository) {`n    // TODO: suspend operator fun invoke(sessionId: String): Result<SpeechReport>`n}" }
    # Quiz
    @{ Path="quiz\StartQuizUseCase"; Content="package ${pkg}.domain.usecase.quiz`n`nimport ${pkg}.domain.repository.QuizRepository`nimport javax.inject.Inject`n`nclass StartQuizUseCase @Inject constructor(private val repo: QuizRepository) {`n    // TODO: suspend operator fun invoke(quizId: String): Result<QuizAttempt>`n}" }
    @{ Path="quiz\SubmitQuizAnswerUseCase"; Content="package ${pkg}.domain.usecase.quiz`n`nimport ${pkg}.domain.repository.QuizRepository`nimport javax.inject.Inject`n`nclass SubmitQuizAnswerUseCase @Inject constructor(private val repo: QuizRepository) {`n    // TODO: suspend operator fun invoke(attemptId: String, answer: Map<String, Any>): Result<Any>`n}" }
    @{ Path="quiz\GetLeaderboardUseCase"; Content="package ${pkg}.domain.usecase.quiz`n`nimport ${pkg}.domain.repository.QuizRepository`nimport javax.inject.Inject`n`nclass GetLeaderboardUseCase @Inject constructor(private val repo: QuizRepository) {`n    // TODO: suspend operator fun invoke(scope: String): Result<List<LeaderboardEntry>>`n}" }
    # Jobs
    @{ Path="jobs\GetJobRecommendationsUseCase"; Content="package ${pkg}.domain.usecase.jobs`n`nimport ${pkg}.domain.repository.JobsRepository`nimport javax.inject.Inject`n`nclass GetJobRecommendationsUseCase @Inject constructor(private val repo: JobsRepository) {`n    // TODO: suspend operator fun invoke(resumeId: String): Result<List<Job>>`n}" }
    @{ Path="jobs\SaveJobUseCase"; Content="package ${pkg}.domain.usecase.jobs`n`nimport ${pkg}.domain.repository.JobsRepository`nimport javax.inject.Inject`n`nclass SaveJobUseCase @Inject constructor(private val repo: JobsRepository) {`n    // TODO: suspend operator fun invoke(jobId: String): Result<Unit>`n}" }
)
foreach ($uc in $useCases) { MkFile "$javaBase\domain\usecase\$($uc.Path).kt" $uc.Content }

Write-Host "Use cases created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# PRESENTATION LAYER — Fragments + ViewModels + Adapters
# ═══════════════════════════════════════════════════════════════

# Helper: Generate fragment scaffold
function FragStub($featurePkg, $name, $layoutName) {
@"
package ${pkg}.presentation.${featurePkg}

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import dagger.hilt.android.AndroidEntryPoint
import ${pkg}.core.base.BaseFragment
import ${pkg}.databinding.Fragment${name}Binding

@AndroidEntryPoint
class ${name}Fragment : BaseFragment<Fragment${name}Binding>() {

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        Fragment${name}Binding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        // TODO: Setup UI, observe ViewModel states
    }
}
"@
}

# Helper: Generate ViewModel scaffold
function VmStub($featurePkg, $name) {
@"
package ${pkg}.presentation.${featurePkg}

import dagger.hilt.android.lifecycle.HiltViewModel
import ${pkg}.core.base.BaseViewModel
import javax.inject.Inject

@HiltViewModel
class ${name}ViewModel @Inject constructor() : BaseViewModel() {
    // TODO: Add UI state flows and action methods
}
"@
}

# Helper: Generate Adapter scaffold
function AdapterStub($featurePkg, $name, $itemLayoutName) {
@"
package ${pkg}.presentation.${featurePkg}.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import ${pkg}.databinding.Item${name}Binding

class ${name}Adapter(
    private val onClick: (Any) -> Unit = {}
) : ListAdapter<Any, ${name}Adapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: Item${name}Binding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: Any) {
            // TODO: Bind data to views
            binding.root.setOnClickListener { onClick(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        Item${name}Binding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<Any>() {
        override fun areItemsTheSame(oldItem: Any, newItem: Any) = oldItem === newItem
        override fun areContentsTheSame(oldItem: Any, newItem: Any) = oldItem == newItem
    }
}
"@
}

# ── Auth ──
$authFrags = @("Splash","Onboarding","Login","Register","ForgotPassword","OtpVerification")
foreach ($f in $authFrags) { MkFile "$javaBase\presentation\auth\${f}Fragment.kt" (FragStub "auth" $f "fragment_$($f.ToLower())") }
MkFile "$javaBase\presentation\auth\AuthViewModel.kt" (VmStub "auth" "Auth")

# ── Home ──
MkFile "$javaBase\presentation\home\HomeFragment.kt" (FragStub "home" "Home" "fragment_home")
MkFile "$javaBase\presentation\home\HomeViewModel.kt" (VmStub "home" "Home")
MkFile "$javaBase\presentation\home\adapter\RecentSessionAdapter.kt" (AdapterStub "home" "RecentSession" "item_session_card")
MkFile "$javaBase\presentation\home\adapter\JobHighlightAdapter.kt" (AdapterStub "home" "JobHighlight" "item_job_card")

# ── Resume ──
$resumeFrags = @("ResumeList","ResumeUpload","ResumeDetail","ResumeAnalysis")
foreach ($f in $resumeFrags) { MkFile "$javaBase\presentation\resume\${f}Fragment.kt" (FragStub "resume" $f "fragment_resume") }
MkFile "$javaBase\presentation\resume\ResumeViewModel.kt" (VmStub "resume" "Resume")
MkFile "$javaBase\presentation\resume\adapter\ResumeListAdapter.kt" (AdapterStub "resume" "ResumeList" "item_resume_card")
MkFile "$javaBase\presentation\resume\adapter\SectionAdapter.kt" (AdapterStub "resume" "Section" "item_score_dimension")
MkFile "$javaBase\presentation\resume\adapter\SkillChipAdapter.kt" (AdapterStub "resume" "SkillChip" "item_skill_chip")

# ── Interview ──
$interviewFrags = @("InterviewSetup","InterviewSession","InterviewReport","QuestionBank")
foreach ($f in $interviewFrags) { MkFile "$javaBase\presentation\interview\${f}Fragment.kt" (FragStub "interview" $f "fragment_interview") }
MkFile "$javaBase\presentation\interview\InterviewViewModel.kt" (VmStub "interview" "Interview")
MkFile "$javaBase\presentation\interview\adapter\SessionListAdapter.kt" (AdapterStub "interview" "SessionList" "item_session_card")
MkFile "$javaBase\presentation\interview\adapter\QuestionBankAdapter.kt" (AdapterStub "interview" "QuestionBank" "item_question_bank")
MkFile "$javaBase\presentation\interview\adapter\FeedbackAccordionAdapter.kt" (AdapterStub "interview" "FeedbackAccordion" "item_score_dimension")

# ── Video ──
$videoFrags = @("VideoSetup","VideoInterview","VideoReport","VideoPlayback")
foreach ($f in $videoFrags) { MkFile "$javaBase\presentation\video\${f}Fragment.kt" (FragStub "video" $f "fragment_video") }
MkFile "$javaBase\presentation\video\VideoViewModel.kt" (VmStub "video" "Video")
MkFile "$javaBase\presentation\video\adapter\EmotionTimelineAdapter.kt" (AdapterStub "video" "EmotionTimeline" "item_emotion_segment")
MkFile "$javaBase\presentation\video\adapter\FrameAnnotationAdapter.kt" (AdapterStub "video" "FrameAnnotation" "item_score_dimension")

# ── Sessions ──
$sessionFrags = @("SessionHistory","SessionDetail","Progress")
foreach ($f in $sessionFrags) { MkFile "$javaBase\presentation\sessions\${f}Fragment.kt" (FragStub "sessions" $f "fragment_session") }
MkFile "$javaBase\presentation\sessions\SessionViewModel.kt" (VmStub "sessions" "Session")
MkFile "$javaBase\presentation\sessions\adapter\SessionHistoryAdapter.kt" (AdapterStub "sessions" "SessionHistory" "item_session_card")
MkFile "$javaBase\presentation\sessions\adapter\ImprovementAdapter.kt" (AdapterStub "sessions" "Improvement" "item_score_dimension")

# ── Quiz ──
$quizFrags = @("QuizHome","QuizDetail","QuizAttempt","QuizResult","Leaderboard")
foreach ($f in $quizFrags) { MkFile "$javaBase\presentation\quiz\${f}Fragment.kt" (FragStub "quiz" $f "fragment_quiz") }
MkFile "$javaBase\presentation\quiz\QuizViewModel.kt" (VmStub "quiz" "Quiz")
MkFile "$javaBase\presentation\quiz\adapter\QuizListAdapter.kt" (AdapterStub "quiz" "QuizList" "item_quiz_card")
MkFile "$javaBase\presentation\quiz\adapter\QuizOptionAdapter.kt" (AdapterStub "quiz" "QuizOption" "item_quiz_option")
MkFile "$javaBase\presentation\quiz\adapter\QuizReviewAdapter.kt" (AdapterStub "quiz" "QuizReview" "item_quiz_review")
MkFile "$javaBase\presentation\quiz\adapter\LeaderboardAdapter.kt" (AdapterStub "quiz" "Leaderboard" "item_leaderboard_row")

# ── Jobs ──
$jobsFrags = @("Jobs","JobDetail","SavedJobs")
foreach ($f in $jobsFrags) { MkFile "$javaBase\presentation\jobs\${f}Fragment.kt" (FragStub "jobs" $f "fragment_jobs") }
MkFile "$javaBase\presentation\jobs\JobsViewModel.kt" (VmStub "jobs" "Jobs")
MkFile "$javaBase\presentation\jobs\adapter\JobListAdapter.kt" (AdapterStub "jobs" "JobList" "item_job_card")
MkFile "$javaBase\presentation\jobs\adapter\SkillMatchAdapter.kt" (AdapterStub "jobs" "SkillMatch" "item_skill_chip")

# ── Profile ──
$profileFrags = @("Profile","Settings")
foreach ($f in $profileFrags) { MkFile "$javaBase\presentation\profile\${f}Fragment.kt" (FragStub "profile" $f "fragment_profile") }
MkFile "$javaBase\presentation\profile\ProfileViewModel.kt" (VmStub "profile" "Profile")
MkFile "$javaBase\presentation\profile\adapter\AchievementAdapter.kt" (AdapterStub "profile" "Achievement" "item_achievement")

Write-Host "Presentation layer created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# RES / LAYOUT XML FILES
# ═══════════════════════════════════════════════════════════════

function LayoutXml($name, $label) {
@"
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_void"
    tools:context=".presentation">

    <!-- $label -->

</androidx.constraintlayout.widget.ConstraintLayout>
"@
}

function ItemXml($name) {
@"
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.card.MaterialCardView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:cardBackgroundColor="@color/bg_surface"
    app:cardCornerRadius="12dp"
    app:strokeColor="@color/border_subtle"
    app:strokeWidth="1dp"
    android:layout_margin="8dp">

    <!-- $name item layout -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="16dp" />

</com.google.android.material.card.MaterialCardView>
"@
}

# Activity layout
MkFile "$resBase\layout\activity_main.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/bg_void">

    <androidx.fragment.app.FragmentContainerView
        android:id="@+id/nav_host_fragment"
        android:name="androidx.navigation.fragment.NavHostFragment"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintBottom_toTopOf="@id/bottom_nav"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:defaultNavHost="true"
        app:navGraph="@navigation/nav_graph" />

    <com.google.android.material.bottomnavigation.BottomNavigationView
        android:id="@+id/bottom_nav"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:background="@color/bg_surface"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:menu="@menu/bottom_nav_menu"
        app:labelVisibilityMode="labeled" />

</androidx.constraintlayout.widget.ConstraintLayout>
"@

# Fragment layouts
$fragLayouts = @(
    "fragment_splash", "fragment_onboarding", "fragment_login", "fragment_register",
    "fragment_forgot_password", "fragment_otp_verification", "fragment_home",
    "fragment_resume_list", "fragment_resume_upload", "fragment_resume_detail", "fragment_resume_analysis",
    "fragment_interview_setup", "fragment_interview_session", "fragment_interview_report", "fragment_question_bank",
    "fragment_video_setup", "fragment_video_interview", "fragment_video_report", "fragment_video_playback",
    "fragment_session_history", "fragment_session_detail", "fragment_progress",
    "fragment_quiz_home", "fragment_quiz_detail", "fragment_quiz_attempt", "fragment_quiz_result", "fragment_leaderboard",
    "fragment_jobs", "fragment_job_detail", "fragment_saved_jobs",
    "fragment_profile", "fragment_settings"
)
foreach ($l in $fragLayouts) { MkFile "$resBase\layout\$l.xml" (LayoutXml $l $l.Replace("_"," ")) }

# Item layouts
$itemLayouts = @(
    "item_resume_card", "item_session_card", "item_question_bank", "item_quiz_card",
    "item_quiz_option", "item_quiz_review", "item_job_card", "item_leaderboard_row",
    "item_skill_chip", "item_score_dimension", "item_achievement", "item_emotion_segment"
)
foreach ($l in $itemLayouts) { MkFile "$resBase\layout\$l.xml" (ItemXml $l) }

# Loading overlay
MkFile "$resBase\layout\layout_loading_overlay.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/loading_overlay"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#CC030507"
    android:clickable="true"
    android:focusable="true"
    android:visibility="gone">

    <ProgressBar
        android:layout_width="48dp"
        android:layout_height="48dp"
        android:layout_gravity="center"
        android:indeterminateTint="@color/primary" />

</FrameLayout>
"@

Write-Host "Layout XMLs created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# RES / NAVIGATION
# ═══════════════════════════════════════════════════════════════

MkFile "$resBase\navigation\nav_graph.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<navigation xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:id="@+id/nav_graph"
    app:startDestination="@id/splashFragment">

    <!-- Auth Flow -->
    <fragment android:id="@+id/splashFragment" android:name="com.aiinterview.presentation.auth.SplashFragment" android:label="Splash" tools:layout="@layout/fragment_splash" />
    <fragment android:id="@+id/onboardingFragment" android:name="com.aiinterview.presentation.auth.OnboardingFragment" android:label="Onboarding" tools:layout="@layout/fragment_onboarding" />
    <fragment android:id="@+id/loginFragment" android:name="com.aiinterview.presentation.auth.LoginFragment" android:label="Login" tools:layout="@layout/fragment_login" />
    <fragment android:id="@+id/registerFragment" android:name="com.aiinterview.presentation.auth.RegisterFragment" android:label="Register" tools:layout="@layout/fragment_register" />
    <fragment android:id="@+id/forgotPasswordFragment" android:name="com.aiinterview.presentation.auth.ForgotPasswordFragment" android:label="Forgot Password" tools:layout="@layout/fragment_forgot_password" />
    <fragment android:id="@+id/otpVerificationFragment" android:name="com.aiinterview.presentation.auth.OtpVerificationFragment" android:label="OTP Verification" tools:layout="@layout/fragment_otp_verification" />

    <!-- Home -->
    <fragment android:id="@+id/homeFragment" android:name="com.aiinterview.presentation.home.HomeFragment" android:label="Home" tools:layout="@layout/fragment_home" />

    <!-- Resume Flow -->
    <fragment android:id="@+id/resumeListFragment" android:name="com.aiinterview.presentation.resume.ResumeListFragment" android:label="Resumes" tools:layout="@layout/fragment_resume_list" />
    <fragment android:id="@+id/resumeUploadFragment" android:name="com.aiinterview.presentation.resume.ResumeUploadFragment" android:label="Upload Resume" tools:layout="@layout/fragment_resume_upload" />
    <fragment android:id="@+id/resumeDetailFragment" android:name="com.aiinterview.presentation.resume.ResumeDetailFragment" android:label="Resume Detail" tools:layout="@layout/fragment_resume_detail" />
    <fragment android:id="@+id/resumeAnalysisFragment" android:name="com.aiinterview.presentation.resume.ResumeAnalysisFragment" android:label="Resume Analysis" tools:layout="@layout/fragment_resume_analysis" />

    <!-- Interview Flow -->
    <fragment android:id="@+id/interviewSetupFragment" android:name="com.aiinterview.presentation.interview.InterviewSetupFragment" android:label="Interview Setup" tools:layout="@layout/fragment_interview_setup" />
    <fragment android:id="@+id/interviewSessionFragment" android:name="com.aiinterview.presentation.interview.InterviewSessionFragment" android:label="Interview" tools:layout="@layout/fragment_interview_session" />
    <fragment android:id="@+id/interviewReportFragment" android:name="com.aiinterview.presentation.interview.InterviewReportFragment" android:label="Interview Report" tools:layout="@layout/fragment_interview_report" />
    <fragment android:id="@+id/questionBankFragment" android:name="com.aiinterview.presentation.interview.QuestionBankFragment" android:label="Question Bank" tools:layout="@layout/fragment_question_bank" />

    <!-- Video Flow -->
    <fragment android:id="@+id/videoSetupFragment" android:name="com.aiinterview.presentation.video.VideoSetupFragment" android:label="Video Setup" tools:layout="@layout/fragment_video_setup" />
    <fragment android:id="@+id/videoInterviewFragment" android:name="com.aiinterview.presentation.video.VideoInterviewFragment" android:label="Video Interview" tools:layout="@layout/fragment_video_interview" />
    <fragment android:id="@+id/videoReportFragment" android:name="com.aiinterview.presentation.video.VideoReportFragment" android:label="Video Report" tools:layout="@layout/fragment_video_report" />
    <fragment android:id="@+id/videoPlaybackFragment" android:name="com.aiinterview.presentation.video.VideoPlaybackFragment" android:label="Video Playback" tools:layout="@layout/fragment_video_playback" />

    <!-- Sessions Flow -->
    <fragment android:id="@+id/sessionHistoryFragment" android:name="com.aiinterview.presentation.sessions.SessionHistoryFragment" android:label="Session History" tools:layout="@layout/fragment_session_history" />
    <fragment android:id="@+id/sessionDetailFragment" android:name="com.aiinterview.presentation.sessions.SessionDetailFragment" android:label="Session Detail" tools:layout="@layout/fragment_session_detail" />
    <fragment android:id="@+id/progressFragment" android:name="com.aiinterview.presentation.sessions.ProgressFragment" android:label="Progress" tools:layout="@layout/fragment_progress" />

    <!-- Quiz Flow -->
    <fragment android:id="@+id/quizHomeFragment" android:name="com.aiinterview.presentation.quiz.QuizHomeFragment" android:label="Quiz Home" tools:layout="@layout/fragment_quiz_home" />
    <fragment android:id="@+id/quizDetailFragment" android:name="com.aiinterview.presentation.quiz.QuizDetailFragment" android:label="Quiz Detail" tools:layout="@layout/fragment_quiz_detail" />
    <fragment android:id="@+id/quizAttemptFragment" android:name="com.aiinterview.presentation.quiz.QuizAttemptFragment" android:label="Quiz Attempt" tools:layout="@layout/fragment_quiz_attempt" />
    <fragment android:id="@+id/quizResultFragment" android:name="com.aiinterview.presentation.quiz.QuizResultFragment" android:label="Quiz Result" tools:layout="@layout/fragment_quiz_result" />
    <fragment android:id="@+id/leaderboardFragment" android:name="com.aiinterview.presentation.quiz.LeaderboardFragment" android:label="Leaderboard" tools:layout="@layout/fragment_leaderboard" />

    <!-- Jobs Flow -->
    <fragment android:id="@+id/jobsFragment" android:name="com.aiinterview.presentation.jobs.JobsFragment" android:label="Jobs" tools:layout="@layout/fragment_jobs" />
    <fragment android:id="@+id/jobDetailFragment" android:name="com.aiinterview.presentation.jobs.JobDetailFragment" android:label="Job Detail" tools:layout="@layout/fragment_job_detail" />
    <fragment android:id="@+id/savedJobsFragment" android:name="com.aiinterview.presentation.jobs.SavedJobsFragment" android:label="Saved Jobs" tools:layout="@layout/fragment_saved_jobs" />

    <!-- Profile Flow -->
    <fragment android:id="@+id/profileFragment" android:name="com.aiinterview.presentation.profile.ProfileFragment" android:label="Profile" tools:layout="@layout/fragment_profile" />
    <fragment android:id="@+id/settingsFragment" android:name="com.aiinterview.presentation.profile.SettingsFragment" android:label="Settings" tools:layout="@layout/fragment_settings" />

</navigation>
"@

# ═══════════════════════════════════════════════════════════════
# RES / MENU
# ═══════════════════════════════════════════════════════════════

MkFile "$resBase\menu\bottom_nav_menu.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<menu xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:id="@+id/homeFragment" android:icon="@drawable/ic_home" android:title="Home" />
    <item android:id="@+id/interviewSetupFragment" android:icon="@drawable/ic_interview" android:title="Interview" />
    <item android:id="@+id/quizHomeFragment" android:icon="@drawable/ic_quiz" android:title="Quiz" />
    <item android:id="@+id/jobsFragment" android:icon="@drawable/ic_jobs" android:title="Jobs" />
    <item android:id="@+id/profileFragment" android:icon="@drawable/ic_profile" android:title="Profile" />
</menu>
"@

Write-Host "Navigation and menu created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# RES / VALUES
# ═══════════════════════════════════════════════════════════════

MkFile "$resBase\values\colors.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Carbon Dark Theme Palette -->
    <color name="bg_void">#030507</color>
    <color name="bg_base">#09090B</color>
    <color name="bg_surface">#0F1117</color>
    <color name="bg_elevated">#18181B</color>
    <color name="bg_overlay">#1C1C21</color>
    <color name="bg_muted">#27272A</color>
    <color name="bg_subtle">#3F3F46</color>

    <color name="text_prim">#FAFAFA</color>
    <color name="text_sec">#A1A1AA</color>
    <color name="text_muted">#71717A</color>
    <color name="text_disabled">#3F3F46</color>

    <color name="border_subtle">#1A1A1F</color>
    <color name="border_def">#27272A</color>
    <color name="border_strong">#3F3F46</color>
    <color name="border_accent">#52525B</color>

    <color name="primary">#6366F1</color>
    <color name="primary_foreground">#FAFAFA</color>
    <color name="destructive">#EF4444</color>

    <!-- Module Accent Colors -->
    <color name="color_auth">#3B82F6</color>
    <color name="color_interview">#6366F1</color>
    <color name="color_video">#8B5CF6</color>
    <color name="color_resume">#0EA5E9</color>
    <color name="color_quiz">#10B981</color>
    <color name="color_jobs">#F59E0B</color>
    <color name="color_sessions">#F97316</color>
    <color name="color_profile">#64748B</color>

    <!-- Semantic Badge Colors -->
    <color name="score_high">#10B981</color>
    <color name="score_mid">#F59E0B</color>
    <color name="score_low">#EF4444</color>
</resources>
"@

MkFile "$resBase\values\themes.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.AiInterview" parent="Theme.Material3.Dark.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="colorOnPrimary">@color/primary_foreground</item>
        <item name="colorSurface">@color/bg_surface</item>
        <item name="colorOnSurface">@color/text_prim</item>
        <item name="android:colorBackground">@color/bg_void</item>
        <item name="colorError">@color/destructive</item>
        <item name="android:statusBarColor">@color/bg_void</item>
        <item name="android:navigationBarColor">@color/bg_surface</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>
</resources>
"@

MkFile "$resBase\values\strings.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">MockAI</string>
    <string name="login">Login</string>
    <string name="register">Register</string>
    <string name="email_hint">Email address</string>
    <string name="password_hint">Password</string>
    <string name="forgot_password">Forgot Password?</string>
    <string name="enter_otp">Enter verification code</string>
    <string name="get_started">Get Started</string>
    <string name="upload_resume">Upload Resume</string>
    <string name="start_interview">Start Interview</string>
    <string name="view_report">View Report</string>
    <string name="submit_answer">Submit Answer</string>
    <string name="next_question">Next Question</string>
    <string name="get_hint">Get Hint</string>
    <string name="start_quiz">Start Quiz</string>
    <string name="leaderboard">Leaderboard</string>
    <string name="saved_jobs">Saved Jobs</string>
    <string name="apply_now">Apply Now</string>
    <string name="save_job">Save Job</string>
    <string name="profile">Profile</string>
    <string name="settings">Settings</string>
    <string name="logout">Logout</string>
    <string name="loading">Loading…</string>
    <string name="error_generic">Something went wrong. Please try again.</string>
    <string name="no_internet">No internet connection.</string>
    <string name="retry">Retry</string>
</resources>
"@

MkFile "$resBase\values\dimens.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- 8dp spacing scale -->
    <dimen name="spacing_xs">4dp</dimen>
    <dimen name="spacing_sm">8dp</dimen>
    <dimen name="spacing_md">16dp</dimen>
    <dimen name="spacing_lg">24dp</dimen>
    <dimen name="spacing_xl">32dp</dimen>
    <dimen name="spacing_2xl">48dp</dimen>

    <dimen name="radius_sm">4dp</dimen>
    <dimen name="radius_md">8dp</dimen>
    <dimen name="radius_lg">12dp</dimen>
    <dimen name="radius_xl">16dp</dimen>
    <dimen name="radius_2xl">20dp</dimen>

    <dimen name="text_xs">10sp</dimen>
    <dimen name="text_sm">12sp</dimen>
    <dimen name="text_md">14sp</dimen>
    <dimen name="text_lg">16sp</dimen>
    <dimen name="text_xl">20sp</dimen>
    <dimen name="text_2xl">24sp</dimen>
    <dimen name="text_3xl">30sp</dimen>
</resources>
"@

MkFile "$resBase\values\styles.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Text Appearances -->
    <style name="TextAppearance.App.Heading" parent="TextAppearance.Material3.HeadlineMedium">
        <item name="fontFamily">@font/dm_sans_bold</item>
        <item name="android:textColor">@color/text_prim</item>
    </style>

    <style name="TextAppearance.App.Body" parent="TextAppearance.Material3.BodyMedium">
        <item name="fontFamily">@font/ibm_plex_sans_regular</item>
        <item name="android:textColor">@color/text_sec</item>
    </style>

    <style name="TextAppearance.App.Mono" parent="TextAppearance.Material3.LabelSmall">
        <item name="fontFamily">@font/ibm_plex_mono_regular</item>
        <item name="android:textColor">@color/text_muted</item>
        <item name="android:textAllCaps">true</item>
        <item name="android:letterSpacing">0.08</item>
    </style>

    <!-- Widget Overrides -->
    <style name="Widget.App.Button.Primary" parent="Widget.Material3.Button">
        <item name="backgroundTint">@color/primary</item>
        <item name="android:textColor">@color/primary_foreground</item>
        <item name="cornerRadius">@dimen/radius_lg</item>
    </style>

    <style name="Widget.App.Card" parent="Widget.Material3.CardView.Filled">
        <item name="cardBackgroundColor">@color/bg_surface</item>
        <item name="cardCornerRadius">@dimen/radius_lg</item>
        <item name="strokeColor">@color/border_subtle</item>
        <item name="strokeWidth">1dp</item>
    </style>

    <style name="Widget.App.TextInput" parent="Widget.Material3.TextInputLayout.OutlinedBox">
        <item name="boxBackgroundColor">@color/bg_base</item>
        <item name="boxStrokeColor">@color/border_def</item>
        <item name="boxCornerRadiusTopStart">@dimen/radius_lg</item>
        <item name="boxCornerRadiusTopEnd">@dimen/radius_lg</item>
        <item name="boxCornerRadiusBottomStart">@dimen/radius_lg</item>
        <item name="boxCornerRadiusBottomEnd">@dimen/radius_lg</item>
    </style>
</resources>
"@

MkFile "$resBase\values-night\themes.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- DayNight overrides — force dark theme properties -->
    <style name="Theme.AiInterview" parent="Theme.Material3.Dark.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="colorOnPrimary">@color/primary_foreground</item>
        <item name="colorSurface">@color/bg_surface</item>
        <item name="colorOnSurface">@color/text_prim</item>
        <item name="android:colorBackground">@color/bg_void</item>
        <item name="colorError">@color/destructive</item>
        <item name="android:statusBarColor">@color/bg_void</item>
        <item name="android:navigationBarColor">@color/bg_surface</item>
    </style>
</resources>
"@

Write-Host "Values resources created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# RES / ANIM
# ═══════════════════════════════════════════════════════════════

MkFile "$resBase\anim\slide_in_right.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<set xmlns:android="http://schemas.android.com/apk/res/android">
    <translate android:fromXDelta="100%" android:toXDelta="0%" android:duration="300" android:interpolator="@android:anim/decelerate_interpolator" />
    <alpha android:fromAlpha="0.0" android:toAlpha="1.0" android:duration="300" />
</set>
"@

MkFile "$resBase\anim\slide_out_left.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<set xmlns:android="http://schemas.android.com/apk/res/android">
    <translate android:fromXDelta="0%" android:toXDelta="-100%" android:duration="300" android:interpolator="@android:anim/accelerate_interpolator" />
    <alpha android:fromAlpha="1.0" android:toAlpha="0.0" android:duration="300" />
</set>
"@

MkFile "$resBase\anim\slide_in_left.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<set xmlns:android="http://schemas.android.com/apk/res/android">
    <translate android:fromXDelta="-100%" android:toXDelta="0%" android:duration="300" android:interpolator="@android:anim/decelerate_interpolator" />
    <alpha android:fromAlpha="0.0" android:toAlpha="1.0" android:duration="300" />
</set>
"@

MkFile "$resBase\anim\slide_out_right.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<set xmlns:android="http://schemas.android.com/apk/res/android">
    <translate android:fromXDelta="0%" android:toXDelta="100%" android:duration="300" android:interpolator="@android:anim/accelerate_interpolator" />
    <alpha android:fromAlpha="1.0" android:toAlpha="0.0" android:duration="300" />
</set>
"@

MkFile "$resBase\anim\fade_in.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<alpha xmlns:android="http://schemas.android.com/apk/res/android" android:fromAlpha="0.0" android:toAlpha="1.0" android:duration="250" />
"@

MkFile "$resBase\anim\fade_out.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<alpha xmlns:android="http://schemas.android.com/apk/res/android" android:fromAlpha="1.0" android:toAlpha="0.0" android:duration="250" />
"@

Write-Host "Animations created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# RES / DRAWABLE
# ═══════════════════════════════════════════════════════════════

MkFile "$resBase\drawable\bg_card_dark.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/bg_surface" />
    <corners android:radius="@dimen/radius_lg" />
    <stroke android:width="1dp" android:color="@color/border_subtle" />
</shape>
"@

MkFile "$resBase\drawable\bg_input_dark.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/bg_base" />
    <corners android:radius="@dimen/radius_lg" />
    <stroke android:width="1dp" android:color="@color/border_def" />
</shape>
"@

MkFile "$resBase\drawable\shape_score_badge.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@color/bg_elevated" />
    <corners android:radius="@dimen/radius_md" />
    <padding android:left="8dp" android:top="4dp" android:right="8dp" android:bottom="4dp" />
</shape>
"@

# Module gradients
$gradients = @{
    "gradient_auth"      = @("#3B82F6", "#1E40AF")
    "gradient_interview" = @("#6366F1", "#4338CA")
    "gradient_video"     = @("#8B5CF6", "#6D28D9")
    "gradient_resume"    = @("#0EA5E9", "#0369A1")
    "gradient_quiz"      = @("#10B981", "#047857")
    "gradient_jobs"      = @("#F59E0B", "#B45309")
    "gradient_sessions"  = @("#F97316", "#C2410C")
}

foreach ($gName in $gradients.Keys) {
    $colors = $gradients[$gName]
    MkFile "$resBase\drawable\$gName.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient android:startColor="$($colors[0])" android:endColor="$($colors[1])" android:angle="135" />
    <corners android:radius="@dimen/radius_lg" />
</shape>
"@
}

# Vector icons with proper design paths
$iconPaths = @{
    "ic_home"            = @("M10,20v-6h4v6h5v-8h3L12,3 2,12h3v8z")
    "ic_interview"       = @("M20,2H4C2.9,2 2,2.9 2,4v18l4,-4h14c1.1,0 2,-0.9 2,-2V4C22,2.9 21.1,2 20,2z M18,14H6v-2h12V14z M18,10H6V8h12V10z")
    "ic_quiz"            = @("M18,2h-3.18C14.4,0.84 13.3,0 12,0S9.6,0.84 9.18,2H6c-1.1,0 -2,0.9 -2,2v16c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2V4c0,-1.1 -0.9,-2 -2,-2z M12,2c0.55,0 1,0.45 1,1s-0.45,1 -1,1 -1,-0.45 -1,-1 0.45,-1 1,-1z M14,16H8v-2h6v2z M17,12H8v-2h9v2z M17,8H8V6h9v2z")
    "ic_jobs"            = @("M20,6h-4V4c0,-1.11 -0.89,-2 -2,-2h-4c-1.11,0 -2,0.89 -2,2v2H4c-1.11,0 -1.99,0.89 -1.99,2L2,19c0,1.11 0.89,2 2,2h16c1.11,0 2,-0.89 2,-2V8c0,-1.11 -0.89,-2 -2,-2z M14,6h-4V4h4v2z")
    "ic_profile"         = @("M12,12c2.21,0 4,-1.79 4,-4s-1.79,-4 -4,-4 -4,1.79 -4,4 1.79,4 4,4z M12,14c-2.67,0 -8,1.34 -8,4v2h16v-2c0,-2.66 -5.33,-4 -8,-4z")
    "ic_resume"          = @("M14,2H6C4.9,2 4,2.9 4,4v16c0,1.1 0.9,2 2,2h12c1.1,0 2,-0.9 2,-2V8L14,2z M16,18H8v-2h8v2z M16,14H8v-2h8v2z M13,9V3.5L18.5,9H13z")
    "ic_upload"          = @("M9,16h6v-6h4l-7,-7 -7,7h4v6z M5,18h14v2H5v-2z")
    "ic_camera"          = @("M17,10.5V7c0,-0.55 -0.45,-1 -1,-1H4c,-0.55 0 -1,0.45 -1,1v10c0,0.55 0.45,1 1,1h12c0.55,0 1,-0.45 1,-1v-3.5l4,4v-11l-4,4z")
    "ic_mic"             = @("M12,14c1.66,0 3,-1.34 3,-3V5c0,-1.66 -1.34,-3 -3,-3S9,3.34 9,5v6c0,1.66 1.34,3 3,3z", "M17.3,11c0,3 -2.54,5.1 -5.3,5.1S6.7,14 6.7,11H5c0,3.41 2.72,6.2 6,6.72V21h2v-3.28c3.28,-0.52 6,-3.31 6,-6.72h-1.7z")
    "ic_play"            = @("M8,5v14l11,-7z")
    "ic_pause"           = @("M6,19h4V5H6v14z M14,5v14h4V5h-4z")
    "ic_stop"            = @("M6,6h12v12H6z")
    "ic_timer"           = @("M15,1H9v2h6V1zm-4,13h2V8h-2v6zm8.03,-6.61l1.42,-1.42c-0.43,-0.51 -0.9,-0.99 -1.41,-1.41l-1.42,1.42C16.07,4.74 14.12,4 12,4c-4.97,0 -9,4.03 -9,9s4.03,9 9,9 9,-4.03 9,-9c0,-2.12 -0.74,-4.07 -2.03,-5.61zM12,20c-3.87,0 -7,-3.13 -7,-7s3.13,-7 7,-7 7,3.13 7,7 -3.13,7 -7,7z")
    "ic_check"           = @("M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41,-1.41z")
    "ic_close"           = @("M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12z")
    "ic_arrow_back"      = @("M20,11H7.83l5.59,-5.59L12,4l-8,8 8,8 1.41,-1.41L7.83,13H20v-2z")
    "ic_arrow_forward"   = @("M12,4l-1.41,1.41L16.17,11H4v2h12.17l-5.58,5.59L12,20l8,-8z")
    "ic_search"          = @("M15.5,14h-0.79l-0.28,-0.27C15.41,12.59 16,11.11 16,9.5 16,5.91 13.09,3 9.5,3S3,5.91 3,9.5 5.91,16 9.5,16c1.61,0 3.09,-0.59 4.23,-1.57l0.27,0.28v0.79l5,4.99L20.49,19l-4.99,-5z M9.5,14C7.01,14 5,11.99 5,9.5S7.01,5 9.5,5 14,7.01 14,9.5 11.99,14 9.5,14z")
    "ic_filter"          = @("M10,18h4v-2h-4v2z M3,6v2h18V6H3z M6,13h12v-2H6v2z")
    "ic_sort"            = @("M3,18h6v-2H3V18z M3,6v2h18V6H3z M3,13h12v-2H3V13z")
    "ic_bookmark"        = @("M17,3H7c-1.1,0 -1.99,0.9 -1.99,2L5,21l7,-3 7,3V5c0,-1.1 -0.9,-2 -2,-2z M17,18l-5,-2.18L7,18V5h10v13z")
    "ic_bookmark_filled" = @("M17,3H7c-1.1,0 -1.99,0.9 -1.99,2L5,21l7,-3 7,3V5c0,-1.1 -0.9,-2 -2,-2z")
    "ic_heart"           = @("M16.5,3c-1.74,0 -3.41,0.81 -4.5,2.09C10.91,3.81 9.24,3 7.5,3 4.42,3 2,5.42 2,8.5c0,3.78 3.4,6.86 8.55,11.54L12,21.35l1.45,-1.32C18.6,15.36 22,12.28 22,8.5 22,5.42 19.58,3 16.5,3z M12.1,18.55l-0.1,0.1 -0.1,-0.1C7.14,14.24 4,11.39 4,8.5c0,-2 1.5,-3.5 3.5,-3.5c1.54,0 3.04,0.99 3.57,2.36h1.87C13.46,5.99 14.96,5 16.5,5c2,0 3.5,1.5 3.5,3.5 0,2.89 -3.14,5.74 -7.9,10.05z")
    "ic_heart_filled"    = @("M12,21.35l-1.45,-1.32C5.4,15.36 2,12.28 2,8.5 2,5.42 4.42,3 7.5,3c1.74,0 3.41,0.81 4.5,2.09C13.09,3.81 14.76,3 16.5,3 19.58,3 22,5.42 22,8.5c0,3.78 -3.4,6.86 -8.55,11.54L12,21.35z")
    "ic_share"           = @("M18,16.08c-0.76,0 -1.44,0.3 -1.96,0.77L8.91,12.7c0.05,-0.23 0.09,-0.46 0.09,-0.7s-0.04,-0.47 -0.09,-0.7l7.05,-4.11c0.54,0.5 1.25,0.81 2.04,0.81 1.66,0 3,-1.34 3,-3s-1.34,-3 -3,-3 -3,1.34 -3,3c0,0.24 0.04,0.47 0.09,0.7L8.04,9.81C7.5,9.31 6.79,9 6,9c-1.66,0 -3,1.34 -3,3s1.34,3 3,3c0.79,0 1.5,-0.31 2.04,-0.81l7.12,4.16c-0.05,0.21 -0.08,0.43 -0.08,0.65 0,1.61 1.31,2.92 2.92,2.92 1.61,0 2.92,-1.31 2.92,-2.92s-1.31,-2.92 -2.92,-2.92z")
    "ic_settings"        = @("M19.14,12.94c0.04,-0.3 0.06,-0.61 0.06,-0.94 0,-0.32 -0.02,-0.64 -0.07,-0.94l2.03,-1.58c0.18,-0.14 0.23,-0.41 0.12,-0.61l-1.92,-3.32c-0.12,-0.22 -0.37,-0.29 -0.59,-0.22l-2.39,0.96c-0.5,-0.38 -1.03,-0.7 -1.62,-0.94l-0.36,-2.54c-0.04,-0.24 -0.24,-0.41 -0.48,-0.41h-3.84c-0.24,0 -0.43,0.17 -0.47,0.41l-0.36,2.54c-0.59,0.24 -1.13,0.57 -1.62,0.94l-2.39,-0.96c-0.22,-0.08 -0.47,0 -0.59,0.22L2.74,8.87c-0.12,0.21 -0.08,0.47 0.12,0.61l2.03,1.58c-0.05,0.3 -0.09,0.63 -0.09,0.94s0.02,0.64 0.07,0.94l-2.03,1.58c-0.18,0.14 -0.23,0.41 -0.12,0.61l1.92,3.32c0.12,0.22 0.37,0.29 0.59,0.22l2.39,-0.96c0.5,0.38 1.03,0.7 1.62,0.94l0.36,2.54c0.05,0.24 0.24,0.41 0.48,0.41h3.84c0.24,0 0.44,-0.17 0.47,-0.41l0.36,-2.54c0.59,-0.24 1.13,-0.56 1.62,-0.94l2.39,0.96c0.22,0.08 0.47,0 0.59,-0.22l1.92,-3.32c0.12,-0.22 0.07,-0.47 -0.12,-0.61l-2.01,-1.58z M12,15.6c-1.98,0 -3.6,-1.62 -3.6,-3.6s1.62,-3.6 3.6,-3.6 3.6,1.62 3.6,3.6 -1.62,3.6 -3.6,3.6z")
    "ic_logout"          = @("M17,7l-1.41,1.41L18.17,11H8v2h10.17l-2.58,2.58L17,17l5,-5z M4,5h8V3H4c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h8v-2H4V5z")
    "ic_edit"            = @("M3,17.25V21h3.75L17.81,9.94l-3.75,-3.75L3,17.25z M20.71,7.04c0.39,-0.39 0.39,-1.02 0,-1.41l-2.34,-2.34c-0.39,-0.39 -1.02,-0.39 -1.41,0l-1.83,1.83 3.75,3.75 1.83,-1.83z")
    "ic_delete"          = @("M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2V7H6v12z M19,4h-3.5l-1,-1h-5l-1,1H5v2h14V4z")
    "ic_star"            = @("M12,17.27L18.18,21l-1.64,-7.03L22,9.24l-7.19,-0.61L12,2 9.19,8.63 2,9.24l5.46,4.73L5.82,21z")
    "ic_trophy"          = @("M19,5h-2V3H7v2H5C3.9,5 3,5.9 3,7v3c0,2.44 1.72,4.48 4,4.88V17c0,2.21 1.79,4 4,4h2v2H9v2h6v-2h-2v-2h2c2.21,0 4,-1.79 4,-4v-2.12c2.28,-0.4 4,-2.44 4,-4.88V7c0,-1.1 -0.9,-2 -2,-2z M5,10V7h2v3H5zm14,0h-2V7h2v3z")
    "ic_medal"           = @("M12,13c-2.76,0 -5,-2.24 -5,-5s2.24,-5 5,-5 5,2.24 5,5 -2.24,5 -5,5z", "M12,14v8l-3.5,-2L5,22V14h7z", "M19,14v8l-3.5,-2L12,22V14h7z")
    "ic_chart"           = @("M19,3H5c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2V5c0,-1.1 -0.9,-2 -2,-2z M9,17H7v-7h2v7z M13,17h-2V7h2v10z M17,17h-2v-4h2v4z")
    "ic_video"           = @("M17,10.5V7c0,-0.55 -0.45,-1 -1,-1H4c,-0.55 0 -1,0.45 -1,1v10c0,0.55 0.45,1 1,1h12c0.55,0 1,-0.45 1,-1v-3.5l4,4v-11l-4,4z")
    "ic_hint"            = @("M9,21c0,0.55 0.45,1 1,1h4c0.55,0 1,-0.45 1,-1v-1H9v1z M12,2C8.14,2 5,5.14 5,9c0,2.38 1.19,4.47 3,5.74V17c0,0.55 0.45,1 1,1h6c0.55,0 1,-0.45 1,-1v-2.26c1.81,-1.27 3,-3.36 3,-5.74 0,-3.86 -3.14,-7 -7,-7z M14.85,13.1l-0.85,0.6V16h-4v-2.3l-0.85,-0.6C7.8,12.16 7,10.63 7,9c0,-2.76 2.24,-5 5,-5s5,2.24 5,5c0,1.63 -0.8,3.16 -2.15,4.1z")
}

foreach ($name in $iconPaths.Keys) {
    $paths = $iconPaths[$name]
    $xml = "<?xml version=""1.0"" encoding=""utf-8""?>`n"
    $xml += "<vector xmlns:android=""http://schemas.android.com/apk/res/android""`n"
    $xml += "    android:width=""24dp""`n"
    $xml += "    android:height=""24dp""`n"
    $xml += "    android:viewportWidth=""24""`n"
    $xml += "    android:viewportHeight=""24""`n"
    $xml += "    android:tint=""@color/text_prim"">`n"
    foreach ($p in $paths) {
        $xml += "    <path`n"
        $xml += "        android:fillColor=""@android:color/white""`n"
        $xml += "        android:pathData=""$p"" />`n"
    }
    $xml += "</vector>`n"
    
    MkFile "$resBase\drawable\$name.xml" $xml
}

Write-Host "Drawables created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# RES / FONT (placeholder XML references)
# ═══════════════════════════════════════════════════════════════

$fonts = @(
    "dm_sans_regular", "dm_sans_bold", "dm_sans_extrabold",
    "ibm_plex_sans_regular", "ibm_plex_sans_medium", "ibm_plex_sans_bold",
    "ibm_plex_mono_regular", "ibm_plex_mono_bold"
)

foreach ($font in $fonts) {
    MkFile "$resBase\font\$font.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<font-family xmlns:app="http://schemas.android.com/apk/res-auto">
    <font
        app:fontProviderAuthority="com.google.android.gms.fonts"
        app:fontProviderPackage="com.google.android.gms"
        app:fontProviderQuery="$($font.Replace('_',' '))"
        app:fontProviderCerts="@array/com_google_android_gms_fonts_certs" />
</font-family>
"@
}

Write-Host "Font families created." -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# ANDROID MANIFEST
# ═══════════════════════════════════════════════════════════════

MkFile "$base\AndroidManifest.xml" @"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

    <application
        android:name=".AiInterviewApp"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.AiInterview"
        tools:targetApi="34">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>
"@

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ALL FILES CREATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

# Count all created files
$fileCount = (Get-ChildItem -Path "e:\MocrAI\frontend\app" -Recurse -File).Count
Write-Host "Total files created: $fileCount" -ForegroundColor Yellow
