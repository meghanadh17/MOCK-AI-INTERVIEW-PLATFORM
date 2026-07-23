package com.aiinterview.presentation.video.view

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View

class TimelineChartView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 4f
        color = Color.parseColor("#6366F1")
        strokeCap = Paint.Cap.ROUND
    }

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f
        color = Color.parseColor("#2D3748") // Subtle dark grid color
        pathEffect = DashPathEffect(floatArrayOf(10f, 10f), 0f)
    }

    private val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.WHITE
    }

    private val dotOuterPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3f
        color = Color.parseColor("#6366F1")
    }

    private var points: List<Float> = emptyList()
    private val path = Path()
    private val fillPath = Path()

    fun setData(newPoints: List<Float>, colorStr: String = "#6366F1") {
        this.points = newPoints
        linePaint.color = Color.parseColor(colorStr)
        dotOuterPaint.color = Color.parseColor(colorStr)
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return

        // 1. Draw vertical dashed grid lines
        val numGridLines = 5
        for (i in 1..numGridLines) {
            val gridX = (w / (numGridLines + 1)) * i
            canvas.drawLine(gridX, 0f, gridX, h, gridPaint)
        }

        if (points.isEmpty()) return
        val size = points.size

        path.reset()
        fillPath.reset()

        val stepX = if (size > 1) w / (size - 1) else w
        val maxVal = 100f
        
        for (i in 0 until size) {
            val rawVal = points[i]
            val clampedVal = rawVal.coerceIn(0f, maxVal)
            val x = i * stepX
            val y = h - (clampedVal / maxVal) * (h - 20f) - 10f
            
            if (i == 0) {
                path.moveTo(x, y)
                fillPath.moveTo(x, h)
                fillPath.lineTo(x, y)
            } else {
                path.lineTo(x, y)
                fillPath.lineTo(x, y)
            }
        }
        
        if (size > 0) {
            fillPath.lineTo((size - 1) * stepX, h)
            fillPath.close()
        }

        val gradient = LinearGradient(
            0f, 0f, 0f, h,
            linePaint.color, Color.TRANSPARENT,
            Shader.TileMode.CLAMP
        )
        fillPaint.shader = gradient
        fillPaint.alpha = 30

        canvas.drawPath(fillPath, fillPaint)
        canvas.drawPath(path, linePaint)

        // 2. Draw circular dot markers over the path nodes
        for (i in 0 until size) {
            val rawVal = points[i]
            val clampedVal = rawVal.coerceIn(0f, maxVal)
            val x = i * stepX
            val y = h - (clampedVal / maxVal) * (h - 20f) - 10f
            canvas.drawCircle(x, y, 6f, dotOuterPaint)
            canvas.drawCircle(x, y, 3f, dotPaint)
        }
    }
}
