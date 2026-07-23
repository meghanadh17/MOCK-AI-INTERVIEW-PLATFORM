package com.aiinterview.core.extensions

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import com.github.mikephil.charting.charts.LineChart
import com.github.mikephil.charting.data.Entry
import com.github.mikephil.charting.data.LineData
import com.github.mikephil.charting.data.LineDataSet

fun LineChart.setupCustomStyle(lineColorHex: String) {
    description.isEnabled = false
    legend.isEnabled = false
    setTouchEnabled(false)
    setDrawGridBackground(false)
    
    xAxis.apply {
        isEnabled = false
        setDrawGridLines(false)
        setDrawAxisLine(false)
    }
    
    axisLeft.apply {
        isEnabled = false
        setDrawGridLines(false)
        setDrawAxisLine(false)
        axisMinimum = 0f
        axisMaximum = 100f
    }
    
    axisRight.apply {
        isEnabled = false
    }
    
    setViewPortOffsets(0f, 0f, 0f, 0f)
    invalidate()
}

fun LineChart.setChartData(points: List<Float>, lineColorHex: String) {
    if (points.isEmpty()) {
        clear()
        return
    }
    
    val entries = points.mapIndexed { index, value ->
        Entry(index.toFloat(), value)
    }
    
    val color = Color.parseColor(lineColorHex)
    
    val dataSet = LineDataSet(entries, "Metrics").apply {
        mode = LineDataSet.Mode.CUBIC_BEZIER
        cubicIntensity = 0.2f
        setDrawFilled(true)
        setDrawCircles(false)
        lineWidth = 3f
        this.color = color
        
        // Setup gradient fill
        val gradientDrawable = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(
                Color.argb(80, Color.red(color), Color.green(color), Color.blue(color)),
                Color.argb(0, Color.red(color), Color.green(color), Color.blue(color))
            )
        )
        fillDrawable = gradientDrawable
        
        setDrawValues(false)
    }
    
    this.data = LineData(dataSet)
    invalidate()
}
