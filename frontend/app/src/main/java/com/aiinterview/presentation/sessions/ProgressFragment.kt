package com.aiinterview.presentation.sessions

import android.content.res.ColorStateList
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.viewModels
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentProgressBinding
import com.aiinterview.databinding.ItemAnalyticsRowBinding
import com.aiinterview.domain.model.ProgressDataPoint
import com.aiinterview.domain.model.StrengthCluster
import com.aiinterview.domain.model.TopicCluster
import dagger.hilt.android.AndroidEntryPoint
import java.text.SimpleDateFormat
import java.util.*

@AndroidEntryPoint
class ProgressFragment : BaseFragment<FragmentProgressBinding>() {

    private val viewModel: SessionViewModel by viewModels()
    private var allProgressPoints: List<ProgressDataPoint> = emptyList()
    private var selectedRange: String = "ALL"

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentProgressBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupRangeChips()
        binding.btnBack.setOnClickListener {
            popBackStack()
        }


        observeViewModel()
        viewModel.loadAnalytics()
    }

    private fun setupRangeChips() {
        binding.chipGroupRange.check(R.id.chip_all)
        binding.chipGroupRange.setOnCheckedStateChangeListener { _, checkedIds ->
            selectedRange = when (checkedIds.firstOrNull()) {
                R.id.chip_1w -> "1W"
                R.id.chip_1m -> "1M"
                R.id.chip_3m -> "3M"
                else -> "ALL"
            }
            updateChart()
        }
    }

    private fun observeViewModel() {
        viewModel.isLoading.collectLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLifecycleFlow { err ->
            showError(err)
        }

        viewModel.analyticsState.collectLifecycleFlow { state ->
            if (state.isLoading) return@collectLifecycleFlow

            // Bind Streak
            state.streak?.let {
                binding.tvStreakCount.text = "${it.currentStreak} Days Practice"

            }

            // Bind Timeline data
            allProgressPoints = state.progressData
            updateChart()
            populateCalendarStrip(state.progressData)

            // Bind Weak Areas and Strengths lists
            populateWeakAreas(state.weakAreas)
            populateStrengths(state.strengths)
        }
    }

    private fun updateChart() {
        val filtered = filterProgressData(allProgressPoints, selectedRange)
        binding.lineChart.setData(filtered)
    }

    private fun filterProgressData(points: List<ProgressDataPoint>, range: String): List<ProgressDataPoint> {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val calendar = Calendar.getInstance()
        val cutoff = when (range) {
            "1W" -> { calendar.add(Calendar.DAY_OF_YEAR, -7); calendar.time }
            "1M" -> { calendar.add(Calendar.MONTH, -1); calendar.time }
            "3M" -> { calendar.add(Calendar.MONTH, -3); calendar.time }
            else -> null
        }
        if (cutoff == null) return points

        return points.filter { point ->
            try {
                val pointDate = dateFormat.parse(point.date.take(10))
                pointDate != null && pointDate.after(cutoff)
            } catch (e: Exception) {
                true
            }
        }
    }

    private fun populateCalendarStrip(progressData: List<ProgressDataPoint>) {
        binding.layoutCalendarStrip.removeAllViews()
        val context = requireContext()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val dayFormat = SimpleDateFormat("E", Locale.getDefault())

        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_YEAR, -6) // Back 6 days

        val sessionDates = progressData.mapNotNull { 
            try {
                it.date?.take(10)
            } catch (e: Exception) {
                null
            }
        }.toSet()

        for (i in 0..6) {
            val currentDay = calendar.time
            val dateString = dateFormat.format(currentDay)
            val dayText = dayFormat.format(currentDay).take(1).uppercase()
            val isCompleted = sessionDates.contains(dateString)

            val dayLayout = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            val tvDay = TextView(context).apply {
                text = dayText
                textAlignment = View.TEXT_ALIGNMENT_CENTER
                textSize = 10f
                setTextColor(ContextCompat.getColor(context, R.color.text_muted))
                try {
                    val tf = androidx.core.content.res.ResourcesCompat.getFont(context, R.font.ibm_plex_mono_regular)
                    typeface = tf
                } catch (e: Throwable) {}
            }

            val dot = View(context).apply {
                val size = resources.getDimensionPixelSize(R.dimen.spacing_sm) * 2
                val params = LinearLayout.LayoutParams(size, size).apply {
                    topMargin = 8
                }
                layoutParams = params
                background = ContextCompat.getDrawable(context, R.drawable.bg_circle_badge)
                backgroundTintList = ColorStateList.valueOf(
                    ContextCompat.getColor(
                        context,
                        if (isCompleted) R.color.score_mid else R.color.border_subtle
                    )
                )
            }

            dayLayout.addView(tvDay)
            dayLayout.addView(dot)
            binding.layoutCalendarStrip.addView(dayLayout)

            calendar.add(Calendar.DAY_OF_YEAR, 1)
        }
    }

    private fun populateWeakAreas(weakAreas: List<TopicCluster>) {
        binding.layoutWeakAreas.removeAllViews()
        val context = requireContext()

        for (item in weakAreas) {
            val rowBinding = ItemAnalyticsRowBinding.inflate(layoutInflater, binding.layoutWeakAreas, false)
            
            // Orange accent line
            rowBinding.accentBar.setBackgroundColor(ContextCompat.getColor(context, R.color.score_mid))
            rowBinding.tvTitle.text = item.topic ?: "Focus Area"
            rowBinding.tvSubtitle.text = "Identified in ${item.frequency} mock sessions"
            rowBinding.tvValueBadge.text = String.format(Locale.getDefault(), "%.1f%%", item.averageScore)
            rowBinding.tvValueBadge.setTextColor(ContextCompat.getColor(context, R.color.score_mid))
            rowBinding.tvValueBadge.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(context, R.color.score_mid_bg)
            )

            binding.layoutWeakAreas.addView(rowBinding.root)
        }
    }

    private fun populateStrengths(strengths: List<StrengthCluster>) {
        binding.layoutStrengths.removeAllViews()
        val context = requireContext()

        for (item in strengths) {
            val rowBinding = ItemAnalyticsRowBinding.inflate(layoutInflater, binding.layoutStrengths, false)
            
            // Emerald accent line
            rowBinding.accentBar.setBackgroundColor(ContextCompat.getColor(context, R.color.score_high))
            rowBinding.tvTitle.text = item.topic ?: "Strength"
            rowBinding.tvSubtitle.text = "Showcased in ${item.frequency} sessions"
            rowBinding.tvValueBadge.text = "STRENGTH"
            rowBinding.tvValueBadge.setTextColor(ContextCompat.getColor(context, R.color.score_high))
            rowBinding.tvValueBadge.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(context, R.color.score_high_bg)
            )

            binding.layoutStrengths.addView(rowBinding.root)
        }
    }
}
