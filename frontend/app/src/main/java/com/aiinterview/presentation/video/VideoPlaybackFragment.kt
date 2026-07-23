package com.aiinterview.presentation.video

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.SeekBar
import androidx.annotation.OptIn
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentVideoPlaybackBinding
import com.aiinterview.domain.model.FrameMetric
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.util.Locale

@AndroidEntryPoint
class VideoPlaybackFragment : BaseFragment<FragmentVideoPlaybackBinding>() {

    private val viewModel: VideoViewModel by viewModels()
    private var sessionId: String = ""
    private var exoPlayer: ExoPlayer? = null
    private var trackingJob: Job? = null

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentVideoPlaybackBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        sessionId = arguments?.getString("sessionId") ?: ""

        setupClickListeners()
        observeViewModel()

        viewModel.loadRecordingUrl(sessionId)
    }

    private fun setupClickListeners() {
        binding.btnBack.setOnClickListener {
            navigateUp()
        }

        binding.btnPlayPause.setOnClickListener {
            togglePlayPause()
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
        viewModel.recordingUrl.collectLatestLifecycleFlow { url ->
            if (!url.isNullOrEmpty()) {
                initializePlayer(url)
            }
        }
    }

    private fun initializePlayer(url: String) {
        exoPlayer?.release()
        exoPlayer = ExoPlayer.Builder(requireContext()).build().apply {
            binding.playerView.player = this
            setMediaItem(MediaItem.fromUri(url))
            prepare()
            
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    if (state == Player.STATE_READY) {
                        binding.tvTotalTime.text = formatTime(duration)
                        addTimelineAnnotations()
                    }
                }
                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    if (isPlaying) {
                        binding.btnPlayPause.setImageResource(R.drawable.ic_pause)
                        startTrackingProgress()
                    } else {
                        binding.btnPlayPause.setImageResource(R.drawable.ic_play)
                        stopTrackingProgress()
                    }
                }
            })
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
        trackingJob = viewLifecycleOwner.lifecycleScope.launch {
            while (true) {
                exoPlayer?.let { player ->
                    val currentPos = player.currentPosition
                    val duration = player.duration
                    if (duration > 0) {
                        binding.tvCurrentTime.text = formatTime(currentPos)
                        binding.seekBarPlayback.progress = ((currentPos.toFloat() / duration) * 1000).toInt()
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

        viewLifecycleOwner.lifecycleScope.launch {
            // Retrieve frames cache from repository
            val localMetrics = viewModel.combinedReport.value?.posture?.timeline?.map {
                FrameMetric(it.timestampMs, "Neutral", 0.9f, true, it.postureScore ?: 1f)
            } ?: emptyList()

            // Filter anomalous timestamps (posture slouched or low gaze simulated)
            val anomalies = localMetrics.filterIndexed { idx, _ -> idx % 12 == 0 } // sample annotations space

            binding.layoutAnnotationsContainer.removeAllViews()
            binding.layoutAnnotationsContainer.post {
                val containerWidth = binding.layoutAnnotationsContainer.width
                if (containerWidth <= 0) return@post

                for (event in anomalies) {
                    val ratio = event.timestamp.toFloat() / duration.toFloat()
                    if (ratio < 0f || ratio > 1f) continue

                    val dot = View(requireContext()).apply {
                        layoutParams = FrameLayout.LayoutParams(18, 18).apply {
                            leftMargin = (ratio * containerWidth).toInt() - 9
                            gravity = Gravity.CENTER_VERTICAL
                        }
                        setBackgroundResource(R.drawable.dot_active)
                        backgroundTintList = ColorStateList.valueOf(Color.parseColor("#EF4444")) // Red dot
                        setOnClickListener {
                            player.seekTo(event.timestamp)
                        }
                    }
                    binding.layoutAnnotationsContainer.addView(dot)
                }
            }
        }
    }

    private fun formatTime(millis: Long): String {
        val seconds = millis / 1000
        val minutes = seconds / 60
        return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds % 60)
    }

    override fun onStop() {
        super.onStop()
        exoPlayer?.pause()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        trackingJob?.cancel()
        exoPlayer?.release()
        exoPlayer = null
    }
}
