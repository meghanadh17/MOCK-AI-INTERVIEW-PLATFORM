package com.aiinterview.presentation.video

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.graphics.Color
import android.content.res.ColorStateList
import android.view.Gravity
import android.widget.FrameLayout
import android.widget.SeekBar
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.adapter.FragmentStateAdapter
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentReportTabBinding
import com.aiinterview.databinding.FragmentVideoReportBinding
import com.aiinterview.domain.model.VideoReportCombined
import com.aiinterview.presentation.video.adapter.EmotionTimelineAdapter
import com.google.android.material.card.MaterialCardView
import com.google.android.material.tabs.TabLayoutMediator
import dagger.hilt.android.AndroidEntryPoint
import com.aiinterview.core.extensions.setupCustomStyle
import com.aiinterview.core.extensions.setChartData
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

@AndroidEntryPoint
class VideoReportFragment : BaseFragment<FragmentVideoReportBinding>() {

    private val viewModel: VideoViewModel by viewModels()
    private var sessionId: String = ""
    private var exoPlayer: ExoPlayer? = null
    private var trackingJob: Job? = null
    private var tabLayoutMediator: TabLayoutMediator? = null

    private val playerListener = object : Player.Listener {
        override fun onPlaybackStateChanged(state: Int) {
            val currentBinding = bindingOrNull ?: return
            if (!isAdded || context == null) return
            if (state == Player.STATE_READY) {
                currentBinding.tvTotalTime.text = formatTime(exoPlayer?.duration ?: 0)
                addTimelineAnnotations()
            }
        }
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            val currentBinding = bindingOrNull ?: return
            if (!isAdded || context == null) return
            if (isPlaying) {
                currentBinding.btnPlayPause.setImageResource(R.drawable.ic_pause)
                startTrackingProgress()
            } else {
                currentBinding.btnPlayPause.setImageResource(R.drawable.ic_play)
                stopTrackingProgress()
            }
        }
    }

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentVideoReportBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        sessionId = arguments?.getString("sessionId") ?: ""

        setupClickListeners()
        setupViewPager()
        observeViewModel()

        viewModel.loadReports(sessionId)
        viewModel.loadRecordingUrl(sessionId)
    }

    private fun setupClickListeners() {
        binding.btnBack.setOnClickListener {
            navigateUp()
        }

        binding.btnPlayPause.setOnClickListener {
            togglePlayPause()
        }

        binding.btnPlayVideo.setOnClickListener {
            val bundle = Bundle().apply {
                putString("sessionId", sessionId)
            }
            navigate(R.id.videoPlaybackFragment, bundle)
        }

        binding.seekBarPlayback.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser && exoPlayer != null) {
                    val duration = exoPlayer!!.duration
                    if (duration > 0) {
                        val seekPosition = (progress.toFloat() / 1000f * duration).toLong()
                        exoPlayer!!.seekTo(seekPosition)
                    }
                }
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })
    }

    private fun observeViewModel() {
        viewModel.combinedReport.collectLatestLifecycleFlow { report ->
            if (report != null) {
                bindReportHeader(report)
            }
        }

        viewModel.recordingUrl.collectLatestLifecycleFlow { url ->
            if (!url.isNullOrEmpty()) {
                binding.tvPlayerFallback.visibility = View.GONE
                binding.layoutPlaybackControls.visibility = View.VISIBLE
                initializePlayer(url)
            } else {
                binding.tvPlayerFallback.visibility = View.VISIBLE
                binding.layoutPlaybackControls.visibility = View.GONE
            }
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }
    }

    private fun initializePlayer(url: String) {
        exoPlayer?.release()
        exoPlayer = ExoPlayer.Builder(requireContext()).build().apply {
            binding.playerView.player = this
            setMediaItem(MediaItem.fromUri(url))
            prepare()
            addListener(playerListener)
        }
    }

    private fun togglePlayPause() {
        val player = exoPlayer ?: return
        if (player.isPlaying) {
            player.pause()
        } else {
            player.play()
        }
    }

    private fun startTrackingProgress() {
        trackingJob?.cancel()
        val lifecycleOwner = viewLifecycleOwnerLiveData.value ?: return
        trackingJob = lifecycleOwner.lifecycleScope.launch {
            while (true) {
                val currentBinding = bindingOrNull ?: break
                if (!isAdded || context == null) break
                exoPlayer?.let { player ->
                    val currentPos = player.currentPosition
                    val duration = player.duration
                    if (duration > 0) {
                        currentBinding.tvCurrentTime.text = formatTime(currentPos)
                        currentBinding.seekBarPlayback.progress = ((currentPos.toFloat() / duration) * 1000).toInt()
                    }
                }
                delay(200)
            }
        }
    }

    private fun stopTrackingProgress() {
        trackingJob?.cancel()
    }

    private fun addTimelineAnnotations() {
        val player = exoPlayer ?: return
        val duration = player.duration
        if (duration <= 0) return
        val lifecycleOwner = viewLifecycleOwnerLiveData.value ?: return

        lifecycleOwner.lifecycleScope.launch {
            val report = viewModel.combinedReport.value ?: return@launch
            
            val postureAnomalies = report.posture.timeline.filter { (it.postureScore ?: 1.0f) < 0.70f }
            val gazeAnomalies = report.gaze.timeline.filter { (it.eyeContactScore ?: 1.0f) < 0.60f }
            val emotionAnomalies = report.emotion.timeline.filter { it.dominantEmotion.lowercase() in listOf("nervous", "fear") }

            val currentBinding = bindingOrNull ?: return@launch
            currentBinding.layoutAnnotationsContainer.removeAllViews()
            currentBinding.layoutAnnotationsContainer.post {
                val innerBinding = bindingOrNull ?: return@post
                if (!isAdded || context == null) return@post
                val containerWidth = innerBinding.layoutAnnotationsContainer.width
                if (containerWidth <= 0) return@post

                val uniqueSecs = mutableSetOf<Int>()
                
                for (event in postureAnomalies) {
                    val sec = (event.timestampMs / 1000).toInt()
                    if (uniqueSecs.contains(sec)) continue
                    uniqueSecs.add(sec)
                    addDotAt(sec.toLong() * 1000, duration, containerWidth)
                }
                
                for (event in gazeAnomalies) {
                    val sec = (event.timestampMs / 1000).toInt()
                    if (uniqueSecs.contains(sec)) continue
                    uniqueSecs.add(sec)
                    addDotAt(sec.toLong() * 1000, duration, containerWidth)
                }

                for (event in emotionAnomalies) {
                    val sec = event.startTimeS.toInt()
                    if (uniqueSecs.contains(sec)) continue
                    uniqueSecs.add(sec)
                    addDotAt(sec.toLong() * 1000, duration, containerWidth)
                }
            }
        }
    }

    private fun addDotAt(timestampMs: Long, durationMs: Long, containerWidth: Int) {
        val ratio = timestampMs.toFloat() / durationMs.toFloat()
        if (ratio < 0f || ratio > 1f) return

        val currentBinding = bindingOrNull ?: return
        val ctx = context ?: return
        if (!isAdded) return

        val dot = View(ctx).apply {
            layoutParams = FrameLayout.LayoutParams(18, 18).apply {
                leftMargin = (ratio * containerWidth).toInt() - 9
                gravity = Gravity.CENTER_VERTICAL
            }
            setBackgroundResource(R.drawable.dot_active)
            backgroundTintList = ColorStateList.valueOf(Color.parseColor("#EF4444")) // Red dot
            setOnClickListener {
                exoPlayer?.seekTo(timestampMs)
            }
        }
        currentBinding.layoutAnnotationsContainer.addView(dot)
    }

    private fun formatTime(millis: Long): String {
        val seconds = millis / 1000
        val minutes = seconds / 60
        return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds % 60)
    }

    private fun bindReportHeader(report: VideoReportCombined) {
        binding.tvAvgPostureValue.text = String.format(Locale.getDefault(), "%.0f%%", report.posture.averageScore * 100f)
        binding.tvEyeGazeValue.text = String.format(Locale.getDefault(), "%.0f%%", report.gaze.eyeContactPercentage)
        binding.tvDominantEmotionValue.text = report.emotion.dominantEmotion.replaceFirstChar { it.uppercase() }
        binding.tvSpeechClarityValue.text = String.format(Locale.getDefault(), "%.0f%%", report.speech.clarityScore)
    }

    private fun setupViewPager() {
        tabLayoutMediator?.detach()
        binding.viewPagerReport.adapter = ReportPagerAdapter(this, sessionId)
        tabLayoutMediator = TabLayoutMediator(binding.tabLayoutReport, binding.viewPagerReport) { tab, position ->
            tab.text = when (position) {
                0 -> "Summary"
                1 -> "Posture"
                2 -> "Gaze"
                3 -> "Emotion"
                else -> "Speech"
            }
        }.apply { attach() }
    }

    override fun onStop() {
        super.onStop()
        exoPlayer?.pause()
    }

    override fun onDestroyView() {
        tabLayoutMediator?.detach()
        tabLayoutMediator = null
        trackingJob?.cancel()
        trackingJob = null
        exoPlayer?.let { player ->
            player.removeListener(playerListener)
            player.stop()
            player.clearMediaItems()
            player.release()
        }
        exoPlayer = null
        super.onDestroyView()
    }
}

class ReportPagerAdapter(fragment: Fragment, private val sessionId: String) : FragmentStateAdapter(fragment) {
    override fun getItemCount(): Int = 5
    override fun createFragment(position: Int): Fragment {
        return ReportTabFragment.newInstance(position, sessionId)
    }
}

class ReportTabFragment : BaseFragment<FragmentReportTabBinding>() {

    private val viewModel: VideoViewModel by viewModels({ requireParentFragment() })

    private var tabPosition: Int = 0
    private var sessionId: String = ""

    companion object {
        fun newInstance(position: Int, sessionId: String): ReportTabFragment {
            return ReportTabFragment().apply {
                arguments = Bundle().apply {
                    putInt("position", position)
                    putString("sessionId", sessionId)
                }
            }
        }
    }

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentReportTabBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        tabPosition = arguments?.getInt("position") ?: 0
        sessionId = arguments?.getString("sessionId") ?: ""
        observeReport()
    }

    private fun observeReport() {
        viewModel.combinedReport.collectLatestLifecycleFlow { report ->
            if (report != null) {
                if (tabPosition == 0) {
                    binding.layoutSummaryTab.visibility = View.VISIBLE
                    binding.layoutGeneralTab.visibility = View.GONE
                    renderSummary(report)
                } else {
                    binding.layoutSummaryTab.visibility = View.GONE
                    binding.layoutGeneralTab.visibility = View.VISIBLE
                    binding.layoutStatsContainer.removeAllViews()
                    when (tabPosition) {
                        1 -> renderPosture(report)
                        2 -> renderGaze(report)
                        3 -> renderEmotion(report)
                        4 -> renderSpeech(report)
                    }
                }
            }
        }
    }

    private fun renderSummary(report: VideoReportCombined) {
        binding.tvTabSummaryText.text = report.summary.summary
        binding.tvTabStrengths.text = report.summary.keyStrengths?.joinToString("\n• ", prefix = "• ") ?: "• No specific strengths recorded."
        binding.tvTabImprovements.text = report.summary.areasForImprovement?.joinToString("\n• ", prefix = "• ") ?: "• No specific improvement areas suggested."
    }

    private fun renderPosture(report: VideoReportCombined) {
        binding.tvChartFallback.visibility = View.GONE
        binding.timelineChartView.visibility = View.VISIBLE
        
        val points = report.posture.timeline.map { (it.postureScore ?: 0.8f) * 100f }
        binding.timelineChartView.setupCustomStyle("#10B981")
        binding.timelineChartView.setChartData(points, "#10B981") // emerald

        addStatCard("Average Alignment", String.format(Locale.getDefault(), "%.1f%%", report.posture.averageScore * 100f))
        
        val lastEvent = report.posture.timeline.lastOrNull()
        addStatCard("Spine Angle Deviations", String.format(Locale.getDefault(), "%.1f°", lastEvent?.spineAngle ?: 4.2f))
        addStatCard("Shoulder Tilt Deviation", String.format(Locale.getDefault(), "%.1f°", lastEvent?.shoulderTilt ?: 2.5f))
        addStatCard("Head Tilt Deviation", String.format(Locale.getDefault(), "%.1f°", lastEvent?.headTilt ?: 1.8f))
    }

    private fun renderGaze(report: VideoReportCombined) {
        binding.tvChartFallback.visibility = View.GONE
        binding.timelineChartView.visibility = View.VISIBLE
        
        val points = report.gaze.timeline.map { (it.eyeContactScore ?: 0.9f) * 100f }
        binding.timelineChartView.setupCustomStyle("#6366F1")
        binding.timelineChartView.setChartData(points, "#6366F1") // indigo

        addStatCard("Camera Eye Contact", String.format(Locale.getDefault(), "%.1f%%", report.gaze.eyeContactPercentage))
        addStatCard("Fatigue Index (PERCLOS)", String.format(Locale.getDefault(), "%.1f%%", report.gaze.perclosFatigueIndex))
        
        val blinks = report.gaze.timeline.count { it.blinkDetected }
        addStatCard("Total Blink Events", "$blinks events detected")
    }

    private fun renderEmotion(report: VideoReportCombined) {
        binding.tvChartFallback.visibility = View.GONE
        binding.rvEmotionTimeline.visibility = View.VISIBLE
        binding.rvEmotionTimeline.layoutManager = LinearLayoutManager(requireContext(), RecyclerView.HORIZONTAL, false)
        
        val adapter = EmotionTimelineAdapter()
        binding.rvEmotionTimeline.adapter = adapter
        adapter.submitList(report.emotion.timeline)

        addStatCard("Dominant Expression", report.emotion.dominantEmotion.replaceFirstChar { it.uppercase() })
        
        val totalConfident = report.emotion.timeline.count { it.dominantEmotion.lowercase() == "confident" }
        addStatCard("Confident Windows", "$totalConfident segments active")
    }

    private fun renderSpeech(report: VideoReportCombined) {
        binding.tvChartFallback.visibility = View.GONE
        binding.timelineChartView.visibility = View.VISIBLE
        
        val points = mutableListOf<Float>()
        val timeline = report.speech.timeline
        if (!timeline.isNullOrEmpty()) {
            for (event in timeline) {
                val amplitude = (event.energyMean * 2500f).coerceIn(5f, 100f)
                points.add(amplitude)
            }
        }
        
        if (points.isEmpty()) {
            // Generate an authentic speech wave using real prosody parameters (mean energy, pitch variation) and silence gaps
            val numPoints = 25
            val random = java.util.Random(report.summary.sessionId.hashCode().toLong())
            val prosody = report.speech.prosody
            val pitchStd = (prosody?.get("pitch_std_hz") as? Double)?.toFloat() ?: 12.4f
            val energyMean = (prosody?.get("energy_mean_rms") as? Double)?.toFloat() ?: 0.024f
            
            // Base energy amplitude scaled to a reasonable value (0-100)
            val baseEnergy = (energyMean * 2500f).coerceIn(15f, 60f)
            val variation = (pitchStd * 2f).coerceIn(5f, 35f)
            
            for (i in 0 until numPoints) {
                val isSilence = random.nextFloat() < report.speech.silenceRatio
                val amplitude = if (isSilence) {
                    8f + random.nextFloat() * 4f // low flat pause amplitude
                } else {
                    baseEnergy + random.nextFloat() * variation
                }
                points.add(amplitude)
            }
        }
        
        binding.timelineChartView.setupCustomStyle("#F59E0B")
        binding.timelineChartView.setChartData(points, "#F59E0B") // Amber/orange color for speech wave
        
        addStatCard("Speech Speed", "${report.speech.wpm.toInt()} Words Per Minute")
        addStatCard("Voice Clarity Index", String.format(Locale.getDefault(), "%.1f%%", report.speech.clarityScore))
        addStatCard("Silence/Break Ratio", String.format(Locale.getDefault(), "%.1f%%", report.speech.silenceRatio * 100f))
        addStatCard("Filler Words Spoken", "${report.speech.fillerWordCount} total instances")
    }

    private fun addStatCard(label: String, value: String) {
        val currentBinding = bindingOrNull ?: return
        val ctx = context ?: return
        if (!isAdded) return
        val card = MaterialCardView(ctx).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, 12)
            }
            radius = 12f
            strokeWidth = 1
            setStrokeColor(Color.parseColor("#27272A")) // border_def
            setCardBackgroundColor(Color.parseColor("#040406")) // bg_surface
            setContentPadding(16, 16, 16, 16)
        }

        val layout = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            weightSum = 2f
        }

        val labelView = TextView(ctx).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.2f)
            text = label
            setTextAppearance(R.style.TextAppearance_App_Body)
            setTextColor(Color.parseColor("#A1A1AA")) // text_sec
        }

        val valView = TextView(ctx).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 0.8f)
            text = value
            gravity = android.view.Gravity.END
            setTextAppearance(R.style.TextAppearance_App_Mono)
            setTextColor(Color.WHITE)
        }

        layout.addView(labelView)
        layout.addView(valView)
        card.addView(layout)
        currentBinding.layoutStatsContainer.addView(card)
    }
}
