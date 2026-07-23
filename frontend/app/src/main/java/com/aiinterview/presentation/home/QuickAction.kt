package com.aiinterview.presentation.home

data class QuickAction(
    val title: String,
    val description: String,
    val iconRes: Int,
    val iconTintRes: Int,
    val actionId: Int // Navigation destination ID or a identifier
)
