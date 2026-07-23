package com.aiinterview.presentation.interview.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.core.content.ContextCompat
import com.aiinterview.R
import kotlin.math.cos
import kotlin.math.sin

class RadarChartView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var dataValues: FloatArray = floatArrayOf(80f, 75f, 90f, 85f, 70f)
    private val labels = arrayOf("Clarity", "Depth", "Structure", "Relevance", "Confidence")
    
    private var animScale: Float = 0f

    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0x26FFFFFF.toInt() // 15% white
        style = Paint.Style.STROKE
        strokeWidth = 1f
    }

    private val dataStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF4F46E5.toInt() // Indigo-500
        style = Paint.Style.STROKE
        strokeWidth = 4f
    }

    private val dataFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0x334F46E5.toInt() // Indigo-500 with 20% opacity
        style = Paint.Style.FILL
    }

    private val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF4F46E5.toInt() // Indigo-500
        style = Paint.Style.FILL
    }

    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.text_muted)
        textSize = 28f
        textAlign = Paint.Align.CENTER
        try {
            val tf = androidx.core.content.res.ResourcesCompat.getFont(context, R.font.ibm_plex_sans_regular)
            setTypeface(tf)
        } catch (e: Throwable) {}
    }

    private val polygonPath = Path()

    init {
        animateData()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val centerX = width / 2f
        val centerY = height / 2f
        val maxRadius = minOf(width, height) * 0.35f

        val layers = 4
        for (layer in 1..layers) {
            val radius = maxRadius * (layer.toFloat() / layers)
            drawPentagon(canvas, centerX, centerY, radius)
        }

        for (i in 0..4) {
            val angle = -Math.PI / 2 + i * 2 * Math.PI / 5
            val x = centerX + maxRadius * cos(angle).toFloat()
            val y = centerY + maxRadius * sin(angle).toFloat()
            canvas.drawLine(centerX, centerY, x, y, gridPaint)
            
            val labelX = centerX + (maxRadius + 30f) * cos(angle).toFloat()
            val labelY = centerY + (maxRadius + 24f) * sin(angle).toFloat() + 8f
            canvas.drawText(labels[i], labelX, labelY, labelPaint)
        }

        polygonPath.reset()
        for (i in 0..4) {
            val value = dataValues[i]
            val scaleRadius = maxRadius * (value / 100f) * animScale
            val angle = -Math.PI / 2 + i * 2 * Math.PI / 5
            val x = centerX + scaleRadius * cos(angle).toFloat()
            val y = centerY + scaleRadius * sin(angle).toFloat()
            
            if (i == 0) {
                polygonPath.moveTo(x, y)
            } else {
                polygonPath.lineTo(x, y)
            }
        }
        polygonPath.close()
        
        canvas.drawPath(polygonPath, dataFillPaint)
        canvas.drawPath(polygonPath, dataStrokePaint)

        for (i in 0..4) {
            val value = dataValues[i]
            val scaleRadius = maxRadius * (value / 100f) * animScale
            val angle = -Math.PI / 2 + i * 2 * Math.PI / 5
            val x = centerX + scaleRadius * cos(angle).toFloat()
            val y = centerY + scaleRadius * sin(angle).toFloat()
            canvas.drawCircle(x, y, 8f, dotPaint)
        }
    }

    private fun drawPentagon(canvas: Canvas, cx: Float, cy: Float, radius: Float) {
        val path = Path()
        for (i in 0..4) {
            val angle = -Math.PI / 2 + i * 2 * Math.PI / 5
            val x = cx + radius * cos(angle).toFloat()
            val y = cy + radius * sin(angle).toFloat()
            if (i == 0) {
                path.moveTo(x, y)
            } else {
                path.lineTo(x, y)
            }
        }
        path.close()
        canvas.drawPath(path, gridPaint)
    }

    fun setValues(values: FloatArray) {
        if (values.size == 5) {
            dataValues = values
            animateData()
        }
    }

    fun animateData() {
        animScale = 0f
        val animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1200
            interpolator = DecelerateInterpolator()
            addUpdateListener { animation ->
                animScale = animation.animatedValue as Float
                invalidate()
            }
        }
        animator.start()
    }
}
