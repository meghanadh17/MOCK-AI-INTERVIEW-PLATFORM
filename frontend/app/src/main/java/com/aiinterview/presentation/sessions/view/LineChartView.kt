package com.aiinterview.presentation.sessions.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.core.content.ContextCompat
import com.aiinterview.R
import com.aiinterview.domain.model.ProgressDataPoint
import java.text.SimpleDateFormat
import java.util.Locale

class LineChartView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var dataPoints: List<ProgressDataPoint> = emptyList()
    private var animScale = 0f

    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 6f
        color = Color.parseColor("#10B981") // Emerald-500
        strokeCap = Paint.Cap.ROUND
    }

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f
        color = 0x1AFFFFFF.toInt() // 10% white
    }

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.text_muted)
        textSize = 24f
        try {
            val tf = androidx.core.content.res.ResourcesCompat.getFont(context, R.font.ibm_plex_mono_regular)
            setTypeface(tf)
        } catch (e: Throwable) {}
    }

    private val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#10B981") // Emerald-500
        style = Paint.Style.FILL
    }

    private val path = Path()
    private val fillPath = Path()

    fun setData(points: List<ProgressDataPoint>) {
        this.dataPoints = points
        animateData()
    }

    fun animateData() {
        animScale = 0f
        val animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1000
            interpolator = DecelerateInterpolator()
            addUpdateListener { animation ->
                animScale = animation.animatedValue as Float
                invalidate()
            }
        }
        animator.start()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (dataPoints.isEmpty()) return

        val paddingLeft = 90f
        val paddingRight = 40f
        val paddingTop = 40f
        val paddingBottom = 60f

        val chartWidth = width - paddingLeft - paddingRight
        val chartHeight = height - paddingTop - paddingBottom

        // Draw horizontal grid levels at 0, 25, 50, 75, 100
        val gridLevels = floatArrayOf(0f, 25f, 50f, 75f, 100f)
        for (level in gridLevels) {
            val y = paddingTop + chartHeight - (level / 100f) * chartHeight
            canvas.drawLine(paddingLeft, y, width - paddingRight, y, gridPaint)
            canvas.drawText("${level.toInt()}%", 10f, y + 8f, textPaint)
        }

        path.reset()
        fillPath.reset()

        val size = dataPoints.size
        val stepX = if (size > 1) chartWidth / (size - 1) else chartWidth

        val points = mutableListOf<PointF>()
        for (i in 0 until size) {
            val x = paddingLeft + i * stepX
            val score = dataPoints[i].avgScore.coerceIn(0f, 100f)
            val y = paddingTop + chartHeight - (score / 100f) * chartHeight * animScale
            points.add(PointF(x, y))
        }

        if (points.isNotEmpty()) {
            path.moveTo(points[0].x, points[0].y)
            fillPath.moveTo(points[0].x, paddingTop + chartHeight)
            fillPath.lineTo(points[0].x, points[0].y)

            for (i in 0 until points.size - 1) {
                val p1 = points[i]
                val p2 = points[i + 1]
                val controlX1 = p1.x + (p2.x - p1.x) / 2
                val controlY1 = p1.y
                val controlX2 = p1.x + (p2.x - p1.x) / 2
                val controlY2 = p2.y
                path.cubicTo(controlX1, controlY1, controlX2, controlY2, p2.x, p2.y)
                fillPath.cubicTo(controlX1, controlY1, controlX2, controlY2, p2.x, p2.y)
            }

            fillPath.lineTo(points.last().x, paddingTop + chartHeight)
            fillPath.close()

            val gradient = LinearGradient(
                0f, paddingTop, 0f, paddingTop + chartHeight,
                Color.parseColor("#3310B981"), Color.TRANSPARENT,
                Shader.TileMode.CLAMP
            )
            fillPaint.shader = gradient
            canvas.drawPath(fillPath, fillPaint)
            canvas.drawPath(path, linePaint)

            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            val fallbackInputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val outputFormat = SimpleDateFormat("MM/dd", Locale.getDefault())

            for (i in points.indices) {
                val p = points[i]
                canvas.drawCircle(p.x, p.y, 8f, dotPaint)

                // Render start, middle, and end dates
                if (i == 0 || i == size - 1 || (size > 2 && i == size / 2)) {
                    val dateStr = dataPoints[i].date ?: ""
                    val formattedDate = try {
                        val parsed = try {
                            inputFormat.parse(dateStr)
                        } catch (e: Exception) {
                            fallbackInputFormat.parse(if (dateStr.length >= 10) dateStr.take(10) else dateStr)
                        }
                        parsed?.let { outputFormat.format(it) } ?: (if (dateStr.length >= 10) dateStr.take(10) else dateStr)
                    } catch (e: Exception) {
                        if (dateStr.length >= 10) dateStr.take(10) else dateStr
                    }
                    canvas.drawText(formattedDate, p.x - 35f, height - 10f, textPaint)
                }
            }
        }
    }
}
