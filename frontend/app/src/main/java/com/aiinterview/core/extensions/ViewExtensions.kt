package com.aiinterview.core.extensions

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
