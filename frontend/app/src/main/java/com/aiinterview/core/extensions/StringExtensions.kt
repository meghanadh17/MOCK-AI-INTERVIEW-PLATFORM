package com.aiinterview.core.extensions

import android.util.Patterns

fun String.isValidEmail(): Boolean =
    Patterns.EMAIL_ADDRESS.matcher(this).matches()

fun String.maskEmail(): String {
    val parts = split("@")
    if (parts.size != 2) return this
    val name = parts[0]
    val masked = if (name.length > 2) name.take(2) + "*".repeat(name.length - 2) else name
    return "$masked@${parts[1]}"
}

fun String.capitalizeWords(): String =
    split(" ").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }

fun String.truncate(maxLength: Int, suffix: String = "..."): String =
    if (length <= maxLength) this else take(maxLength - suffix.length) + suffix

fun String.parseMarkdownHtml(): android.text.Spanned {
    val boldPattern = java.util.regex.Pattern.compile("\\*\\*(.*?)\\*\\*")
    val boldMatcher = boldPattern.matcher(this)
    var html = boldMatcher.replaceAll("<b>$1</b>")

    val underscorePattern = java.util.regex.Pattern.compile("__(.*?)__")
    val underscoreMatcher = underscorePattern.matcher(html)
    html = underscoreMatcher.replaceAll("<b>$1</b>")

    html = html.replace("\n", "<br/>")

    return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
        android.text.Html.fromHtml(html, android.text.Html.FROM_HTML_MODE_COMPACT)
    } else {
        @Suppress("DEPRECATION")
        android.text.Html.fromHtml(html)
    }
}
