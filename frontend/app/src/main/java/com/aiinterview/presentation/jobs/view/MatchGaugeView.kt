package com.aiinterview.presentation.jobs.view

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import com.aiinterview.R

class MatchGaugeView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var matchScore: Float = 0f
    private var animatedScore: Float = 0f

    private val density = resources.displayMetrics.density
    private val strokeWidth = 14f * density // Sleek 14dp arc thickness

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#18181B") // Subtle dark slate track
        style = Paint.Style.STROKE
        this.strokeWidth = this@MatchGaugeView.strokeWidth
        strokeCap = Paint.Cap.ROUND
    }

    private val activePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        this.strokeWidth = this@MatchGaugeView.strokeWidth
        strokeCap = Paint.Cap.ROUND
    }

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.text_prim)
        textSize = 28f * resources.displayMetrics.scaledDensity // 28sp score
        textAlign = Paint.Align.CENTER
        try {
            val tf = ResourcesCompat.getFont(context, R.font.ibm_plex_mono_bold)
            setTypeface(tf)
        } catch (e: Throwable) {
            setTypeface(android.graphics.Typeface.MONOSPACE)
        }
    }

    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.text_muted)
        textSize = 10f * resources.displayMetrics.scaledDensity // 10sp label
        textAlign = Paint.Align.CENTER
        try {
            val tf = ResourcesCompat.getFont(context, R.font.dm_sans_bold)
            setTypeface(tf)
        } catch (e: Throwable) {
            setTypeface(android.graphics.Typeface.DEFAULT_BOLD)
        }
    }

    private val arcBounds = RectF()
    private val argbEvaluator = ArgbEvaluator()

    fun setMatchScore(score: Float) {
        matchScore = score.coerceIn(0f, 100f)
        animateScore()
    }

    private fun animateScore() {
        val animator = ValueAnimator.ofFloat(0f, matchScore).apply {
            duration = 1200
            interpolator = DecelerateInterpolator(1.5f)
            addUpdateListener { animation ->
                animatedScore = animation.animatedValue as Float
                invalidate()
            }
        }
        animator.start()
    }

    private fun getInterpolatedColor(score: Float): Int {
        val colorRose = Color.parseColor("#EF4444")
        val colorOrange = Color.parseColor("#F97316")
        val colorAmber = Color.parseColor("#F59E0B")
        val colorEmerald = Color.parseColor("#10B981")

        return when {
            score <= 40f -> {
                val fraction = score / 40f
                argbEvaluator.evaluate(fraction, colorRose, colorOrange) as Int
            }
            score <= 70f -> {
                val fraction = (score - 40f) / 30f
                argbEvaluator.evaluate(fraction, colorOrange, colorAmber) as Int
            }
            score <= 80f -> {
                val fraction = (score - 70f) / 10f
                argbEvaluator.evaluate(fraction, colorAmber, colorEmerald) as Int
            }
            else -> {
                colorEmerald
            }
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val width = width.toFloat()
        val height = height.toFloat()

        // We want the semi-circle arc to fit nicely
        val paddingLeft = paddingLeft.toFloat()
        val paddingRight = paddingRight.toFloat()
        val paddingTop = paddingTop.toFloat()
        val paddingBottom = paddingBottom.toFloat()

        val usableWidth = width - paddingLeft - paddingRight - strokeWidth
        val usableHeight = height - paddingTop - paddingBottom - (strokeWidth / 2f)

        // Semi-circle occupies the top half, so width should be roughly 2 * height
        val radius = minOf(usableWidth / 2f, usableHeight)

        val centerX = width / 2f
        val centerY = height - paddingBottom - (strokeWidth / 2f)

        arcBounds.set(
            centerX - radius,
            centerY - radius,
            centerX + radius,
            centerY + radius
        )

        // Draw track
        canvas.drawArc(arcBounds, 180f, 180f, false, trackPaint)

        // Draw active progress arc
        val sweepAngle = 180f * (animatedScore / 100f)
        activePaint.color = getInterpolatedColor(animatedScore)
        canvas.drawArc(arcBounds, 180f, sweepAngle, false, activePaint)

        // Draw Score Text in the center
        val scoreText = "${animatedScore.toInt()}%"
        // Adjust vertically to place text just above the bottom center
        val textY = centerY - (12f * density)
        canvas.drawText(scoreText, centerX, textY, textPaint)

        // Draw smaller MATCH label below text
        val labelY = textY + (16f * density)
        canvas.drawText("MATCH SCORE", centerX, labelY, labelPaint)
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        // Set height to be roughly half the width plus padding
        val desiredHeight = (width / 2) + paddingBottom.toInt() + paddingTop.toInt()
        val resolvedHeight = resolveSizeAndState(desiredHeight, heightMeasureSpec, 0)
        setMeasuredDimension(width, resolvedHeight)
    }
}
