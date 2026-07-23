package com.aiinterview.core.extensions

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.LayoutInflater
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.aiinterview.R

enum class ToastType {
    SUCCESS,
    ERROR,
    INFO,
    LOGIN,
    LOGOUT
}

fun Context.showCustomToast(message: String, type: ToastType, duration: Int = Toast.LENGTH_SHORT) {
    try {
        val inflater = LayoutInflater.from(this)
        val view = inflater.inflate(R.layout.layout_custom_toast, null)

        val container = view.findViewById<LinearLayout>(R.id.toast_container)
        val iconView = view.findViewById<ImageView>(R.id.toast_icon)
        val textView = view.findViewById<TextView>(R.id.toast_message)

        // Set message text
        textView.text = message

        // Determine icon, icon tint, and stroke color based on type
        val iconRes = when (type) {
            ToastType.SUCCESS -> R.drawable.ic_check
            ToastType.ERROR -> R.drawable.ic_error
            ToastType.LOGIN -> R.drawable.ic_lock
            ToastType.LOGOUT -> R.drawable.ic_logout
            ToastType.INFO -> R.drawable.ic_info
        }

        val strokeColor = when (type) {
            ToastType.SUCCESS -> ContextCompat.getColor(this, R.color.score_high)
            ToastType.ERROR -> ContextCompat.getColor(this, R.color.destructive)
            ToastType.LOGIN, ToastType.LOGOUT -> ContextCompat.getColor(this, R.color.text_prim)
            ToastType.INFO -> ContextCompat.getColor(this, R.color.border_accent)
        }

        val iconTint = when (type) {
            ToastType.SUCCESS -> ContextCompat.getColor(this, R.color.score_high)
            ToastType.ERROR -> ContextCompat.getColor(this, R.color.destructive)
            ToastType.LOGIN, ToastType.LOGOUT -> ContextCompat.getColor(this, R.color.text_prim)
            ToastType.INFO -> ContextCompat.getColor(this, R.color.text_muted)
        }

        // Set icon & tint
        iconView.setImageResource(iconRes)
        iconView.imageTintList = ColorStateList.valueOf(iconTint)

        // Mutate and set stroke color on shape background dynamically
        val background = container.background?.mutate() as? GradientDrawable
        if (background != null) {
            val strokeWidthPx = TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                1.5f,
                resources.displayMetrics
            ).toInt()
            background.setStroke(strokeWidthPx, strokeColor)
        }

        // Build and display Toast
        val toast = Toast(this)
        toast.duration = duration
        toast.view = view
        
        // Show in bottom area with offset
        toast.setGravity(Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL, 0, 100)
        toast.show()
    } catch (e: Exception) {
        // Fallback to standard Toast if custom layout inflation fails
        Toast.makeText(this, message, duration).show()
    }
}

fun Fragment.showCustomToast(message: String, type: ToastType, duration: Int = Toast.LENGTH_SHORT) {
    context?.showCustomToast(message, type, duration)
}
