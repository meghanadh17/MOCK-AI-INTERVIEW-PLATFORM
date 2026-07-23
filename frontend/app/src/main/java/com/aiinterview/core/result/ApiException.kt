package com.aiinterview.core.result

sealed class ApiException(
    val userMessage: String,
    val statusCode: Int? = null,
    val rawErrorBody: String? = null
) : Exception(userMessage) {

    class Unauthorized(
        message: String = "Session expired. Please login again.",
        errorBody: String? = null
    ) : ApiException(message, 401, errorBody)

    class Forbidden(
        message: String = "Access denied.",
        errorBody: String? = null
    ) : ApiException(message, 403, errorBody)

    class NotFound(
        message: String = "Resource not found.",
        errorBody: String? = null
    ) : ApiException(message, 404, errorBody)

    class ServerError(
        code: Int,
        message: String = "Server error. Please try again later.",
        errorBody: String? = null
    ) : ApiException(message, code, errorBody)

    class NetworkError(
        message: String = "Network error. Check your connection."
    ) : ApiException(message)

    class Timeout(
        message: String = "Request timed out. Please try again."
    ) : ApiException(message)

    class Unknown(
        message: String = "An unknown error occurred.",
        code: Int? = null,
        errorBody: String? = null
    ) : ApiException(message, code, errorBody)

    companion object {
        fun map(throwable: Throwable): ApiException {
            return when (throwable) {
                is ApiException -> throwable
                is retrofit2.HttpException -> {
                    val code = throwable.code()
                    val errorBody = throwable.response()?.errorBody()?.string()
                    when (code) {
                        401 -> Unauthorized(errorBody = errorBody)
                        403 -> Forbidden(errorBody = errorBody)
                        404 -> NotFound(errorBody = errorBody)
                        in 500..599 -> ServerError(code, errorBody = errorBody)
                        else -> Unknown("Unexpected error (HTTP $code).", code, errorBody)
                    }
                }
                is java.net.SocketTimeoutException -> Timeout()
                is java.io.IOException -> NetworkError()
                else -> Unknown(throwable.message ?: "An unknown error occurred.")
            }
        }
    }
}
