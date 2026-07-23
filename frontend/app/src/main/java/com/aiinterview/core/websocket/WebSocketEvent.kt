package com.aiinterview.core.websocket

sealed class WebSocketEvent {
    object Connected : WebSocketEvent()
    data class Message(val text: String) : WebSocketEvent()
    data class Error(val throwable: Throwable) : WebSocketEvent()
    data class Closed(val code: Int, val reason: String) : WebSocketEvent()
}
