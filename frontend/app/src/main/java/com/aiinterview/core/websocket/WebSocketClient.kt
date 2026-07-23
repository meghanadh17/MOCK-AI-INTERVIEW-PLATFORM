package com.aiinterview.core.websocket

import okhttp3.*
import okio.ByteString
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

class WebSocketClient @Inject constructor(
    private val okHttpClient: OkHttpClient
) {
    private var webSocket: WebSocket? = null
    private val _events = MutableSharedFlow<WebSocketEvent>(replay = 0, extraBufferCapacity = 64)
    val events: SharedFlow<WebSocketEvent> = _events.asSharedFlow()

    fun connect(url: String, token: String? = null) {
        val finalUrl = if (!token.isNullOrEmpty()) {
            val delimiter = if (url.contains("?")) "&" else "?"
            "$url${delimiter}token=$token"
        } else {
            url
        }
        val request = Request.Builder().url(finalUrl).build()
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

    fun send(json: String): Boolean = webSocket?.send(json) ?: false

    fun send(bytes: ByteString): Boolean = webSocket?.send(bytes) ?: false

    fun disconnect() {
        webSocket?.close(1000, "Normal closure")
        webSocket = null
    }

    fun close(code: Int = 1000, reason: String = "Normal closure") {
        webSocket?.close(code, reason)
        webSocket = null
    }
}
