package com.aiinterview.core.extensions

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
        minutes < 60 -> "${minutes}m ago"
        hours < 24 -> "${hours}h ago"
        days < 7 -> "${days}d ago"
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

fun String.toDisplayDateFromIso(): String {
    val formats = listOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSS",
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSS",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
        "yyyy-MM-dd'T'HH:mm:ss"
    )
    for (format in formats) {
        try {
            val sdf = SimpleDateFormat(format, Locale.getDefault())
            if (format.contains("'Z'")) {
                sdf.timeZone = TimeZone.getTimeZone("UTC")
            }
            val date = sdf.parse(this)
            if (date != null) {
                val outSdf = SimpleDateFormat("MMM dd, yyyy · hh:mm a", Locale.getDefault())
                return outSdf.format(date)
            }
        } catch (e: Exception) {}
    }
    return this
}
