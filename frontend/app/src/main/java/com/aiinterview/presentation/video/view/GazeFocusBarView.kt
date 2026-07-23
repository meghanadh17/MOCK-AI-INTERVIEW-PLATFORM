package com.aiinterview.presentation.video.view

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View

class GazeFocusBarView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.parseColor("#1F2937") // Default dark/empty track
    }

    private val segmentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val markerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 4f
        color = Color.WHITE
    }

    private var points: List<Float> = emptyList()

    fun setData(newPoints: List<Float>) {
        this.points = newPoints
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return

        // Define bar dimensions (centered vertically, e.g. 16dp thick)
        val density = resources.displayMetrics.density
        val barHeight = 16f * density
        val top = (h - barHeight) / 2f
        val bottom = top + barHeight
        val rectF = RectF(0f, top, w, bottom)
        val rx = 8f * density

        // 1. Draw rounded background track
        canvas.drawRoundRect(rectF, rx, rx, bgPaint)

        if (points.isEmpty()) return

        // 2. Draw segments
        val size = points.size
        val segmentWidth = w / size

        // Use a clip path to keep segments inside the rounded track bounds
        val clipPath = Path().apply {
            addRoundRect(rectF, rx, rx, Path.Direction.CW)
        }
        canvas.save()
        canvas.clipPath(clipPath)

        for (i in 0 until size) {
            val score = points[i]
            // Map score to color
            val colorStr = when {
                score > 75f -> "#FFFFFF" // Focused (White)
                score > 40f -> "#6B7280" // Neutral (Medium Gray)
                else -> "#374151"        // Distracted (Dark Gray)
            }
            segmentPaint.color = Color.parseColor(colorStr)
            val left = i * segmentWidth
            val right = left + segmentWidth
            canvas.drawRect(left, top, right, bottom, segmentPaint)
        }
        canvas.restore()

        // 3. Draw thin vertical current time marker on the right edge of latest data
        val markerX = w
        canvas.drawLine(markerX - 2f, top - 4f, markerX - 2f, bottom + 4f, markerPaint)
    }
}
