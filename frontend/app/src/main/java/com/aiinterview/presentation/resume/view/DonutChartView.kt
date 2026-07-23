package com.aiinterview.presentation.resume.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.core.content.ContextCompat
import com.aiinterview.R
import java.util.Locale

class DonutChartView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var score: Int = 0
    private var animatedScore: Float = 0f
    private var label: String = "ATS Score"

    private val strokeWidthSize = 16f

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = strokeWidthSize
        color = 0x1AFFFFFF.toInt() // 10% white background track
    }

    private val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = strokeWidthSize
        strokeCap = Paint.Cap.ROUND
    }

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
        color = ContextCompat.getColor(context, R.color.text_prim)
        textSize = 50f
        try {
            val typeface = androidx.core.content.res.ResourcesCompat.getFont(context, R.font.dm_sans_bold)
            setTypeface(typeface)
        } catch (e: Throwable) {}
    }

    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER
        color = ContextCompat.getColor(context, R.color.text_muted)
        textSize = 24f
        try {
            val typeface = androidx.core.content.res.ResourcesCompat.getFont(context, R.font.ibm_plex_sans_regular)
            setTypeface(typeface)
        } catch (e: Throwable) {}
    }

    private val ovalRect = RectF()

    init {
        progressPaint.color = ContextCompat.getColor(context, R.color.primary)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        val padding = strokeWidthSize / 2f + 4f
        ovalRect.set(padding, padding, w - padding, w - padding) // Make it a circle using width
        textPaint.textSize = w * 0.22f
        labelPaint.textSize = w * 0.08f
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // Draw track
        canvas.drawArc(ovalRect, 0f, 360f, false, trackPaint)

        // Choose color based on animatedScore
        progressPaint.color = when {
            animatedScore >= 80f -> 0xFF10B981.toInt() // emerald (score_high)
            animatedScore >= 50f -> 0xFFF59E0B.toInt() // amber/orange (score_mid)
            else -> 0xFFEF4444.toInt() // red (score_low)
        }

        // Draw progress arc
        val sweepAngle = (animatedScore / 100f) * 360f
        canvas.drawArc(ovalRect, -90f, sweepAngle, false, progressPaint)

        // Draw text score in center
        val scoreStr = String.format(Locale.getDefault(), "%.0f", animatedScore)
        val textHeight = textPaint.descent() - textPaint.ascent()
        val textOffset = textHeight / 2 - textPaint.descent()
        
        // Draw score
        canvas.drawText(
            scoreStr,
            width / 2f,
            height / 2f + textOffset - (height * 0.05f),
            textPaint
        )

        // Draw label in center below score
        canvas.drawText(
            label,
            width / 2f,
            height / 2f + textOffset + (height * 0.15f),
            labelPaint
        )
    }

    fun setLabel(text: String) {
        label = text
        invalidate()
    }

    fun setScore(targetScore: Int, animate: Boolean = true) {
        score = targetScore.coerceIn(0, 100)
        if (animate) {
            val animator = ValueAnimator.ofFloat(animatedScore, score.toFloat()).apply {
                duration = 1000
                interpolator = DecelerateInterpolator()
                addUpdateListener { animation ->
                    animatedScore = animation.animatedValue as Float
                    invalidate()
                }
            }
            animator.start()
        } else {
            animatedScore = score.toFloat()
            invalidate()
        }
    }
}
