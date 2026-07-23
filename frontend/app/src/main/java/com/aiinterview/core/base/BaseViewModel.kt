package com.aiinterview.core.base

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiinterview.core.network.NetworkMonitor
import com.aiinterview.core.result.ApiException
import com.aiinterview.core.result.Result
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

abstract class BaseViewModel : ViewModel() {

    @Inject
    lateinit var networkMonitor: NetworkMonitor

    protected val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    protected val _error = MutableSharedFlow<String>(replay = 0, extraBufferCapacity = 64)
    val error: SharedFlow<String> = _error.asSharedFlow()

    private val _isOnline: MutableStateFlow<Boolean> by lazy {
        val flow = MutableStateFlow(true)
        viewModelScope.launch {
            networkMonitor.isConnected.collect { connected ->
                flow.value = connected
            }
        }
        flow
    }
    val isOnline: StateFlow<Boolean> get() = _isOnline.asStateFlow()

    protected fun <T> safeApiCall(
        block: suspend () -> Result<T>,
        onSuccess: (T) -> Unit
    ) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                when (val result = block()) {
                    is Result.Success -> onSuccess(result.data)
                    is Result.Error -> _error.emit(result.exception.userMessage)
                    is Result.Loading -> { /* no-op */ }
                }
            } catch (e: Exception) {
                val apiException = ApiException.map(e)
                _error.emit(apiException.userMessage)
            } finally {
                _isLoading.value = false
            }
        }
    }
}
