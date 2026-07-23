package com.aiinterview.core.websocket

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

@Singleton
class WebSocketManager @Inject constructor(
    private val clientProvider: Provider<WebSocketClient>
) {
    private val connections = mutableMapOf<String, WebSocketClient>()
    private val reconnectJobs = mutableMapOf<String, Job>()
    private val sessionContexts = mutableMapOf<String, Any>()
    
    private val baseDelayMs = 1000L

    // Backward compatibility aliases
    val events: SharedFlow<WebSocketEvent>
        get() = connections["default"]?.events ?: MutableSharedFlow<WebSocketEvent>().asSharedFlow()

    fun connect(url: String) {
        connect("default", url)
    }

    fun send(message: String): Boolean {
        return send("default", message)
    }

    fun disconnect() {
        disconnect("default")
    }

    // Named connection support (key -> WebSocketClient)
    fun getEvents(key: String): SharedFlow<WebSocketEvent>? {
        return connections[key]?.events
    }

    @Synchronized
    fun connect(key: String, url: String, token: String? = null) {
        disconnect(key)

        val client = clientProvider.get()
        connections[key] = client
        client.connect(url, token)
        observeForReconnect(key, url, token, client)
    }

    private fun observeForReconnect(key: String, url: String, token: String?, client: WebSocketClient) {
        reconnectJobs[key]?.cancel()
        reconnectJobs[key] = CoroutineScope(Dispatchers.IO).launch {
            client.events.collect { event ->
                if (event is WebSocketEvent.Error || event is WebSocketEvent.Closed) {
                    retryWithBackoff(key, url, token, client)
                }
            }
        }
    }

    private suspend fun retryWithBackoff(key: String, url: String, token: String?, client: WebSocketClient) {
        var attempt = 0
        while (currentCoroutineContext().isActive) {
            val delayMs = minOf(baseDelayMs * (1L shl attempt), 30000L) // exponential backoff max 30s
            delay(delayMs)
            
            if (connections[key] != client) break
            
            client.connect(url, token)
            attempt++
            
            delay(2000)
        }
    }

    @Synchronized
    fun send(key: String, message: String): Boolean {
        return connections[key]?.send(message) ?: false
    }

    @Synchronized
    fun send(key: String, bytes: okio.ByteString): Boolean {
        return connections[key]?.send(bytes) ?: false
    }

    @Synchronized
    fun disconnect(key: String) {
        reconnectJobs[key]?.cancel()
        reconnectJobs.remove(key)
        connections[key]?.disconnect()
        connections.remove(key)
    }

    @Synchronized
    fun disconnectAll() {
        connections.keys.toList().forEach { key ->
            disconnect(key)
        }
        sessionContexts.clear()
    }

    // Tracks session context per key
    @Synchronized
    fun putSessionContext(key: String, context: Any) {
        sessionContexts[key] = context
    }

    @Synchronized
    fun getSessionContext(key: String): Any? {
        return sessionContexts[key]
    }

    @Synchronized
    fun removeSessionContext(key: String): Any? {
        return sessionContexts.remove(key)
    }
}
