package com.aiinterview.presentation.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentHomeBinding
import com.aiinterview.presentation.home.adapter.JobHighlightAdapter
import com.aiinterview.presentation.home.adapter.QuickActionAdapter
import com.aiinterview.presentation.home.adapter.RecentSessionAdapter
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

@AndroidEntryPoint
class HomeFragment : BaseFragment<FragmentHomeBinding>() {

    private val viewModel: HomeViewModel by viewModels()

    private lateinit var quickActionAdapter: QuickActionAdapter
    private lateinit var recentSessionAdapter: RecentSessionAdapter
    private lateinit var jobHighlightAdapter: JobHighlightAdapter

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentHomeBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupRecyclerViews()
        observeViewModel()
        viewModel.loadDashboardData()
    }

    private fun setupRecyclerViews() {
        // 1. Quick Actions Grid (3x2)
        val quickActionsList = listOf(
            QuickAction("Upload Resume", "Review ATS scores", R.drawable.ic_upload, R.color.color_resume, R.id.resumeListFragment),
            QuickAction("Text Interview", "Text-based AI practice", R.drawable.ic_interview, R.color.color_interview, R.id.interviewSetupFragment),
            QuickAction("Video Interview", "Real-time mock session", R.drawable.ic_video, R.color.color_video, R.id.videoSetupFragment),
            QuickAction("Take a Quiz", "Test domain skills", R.drawable.ic_quiz, R.color.color_quiz, R.id.quizHomeFragment),
            QuickAction("Search Jobs", "Find recommended roles", R.drawable.ic_jobs, R.color.color_jobs, R.id.jobsFragment),
            QuickAction("Session History", "View previous reports", R.drawable.ic_chart, R.color.color_sessions, R.id.sessionHistoryFragment)
        )
        quickActionAdapter = QuickActionAdapter(quickActionsList) { action ->
            navigate(action.actionId)
        }
        binding.rvQuickActions.apply {
            layoutManager = GridLayoutManager(context, 2)
            adapter = quickActionAdapter
            isNestedScrollingEnabled = false
        }

        // 2. Recent Sessions Vertical List
        recentSessionAdapter = RecentSessionAdapter { session ->
            val bundle = Bundle().apply {
                putString("id", session.id)
                putString("sessionId", session.id)
            }
            navigate(R.id.sessionDetailFragment, bundle)
        }
        binding.rvRecentSessions.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = recentSessionAdapter
            isNestedScrollingEnabled = false
        }

        // 3. Job Highlights Horizontal List
        jobHighlightAdapter = JobHighlightAdapter(
            onClick = { job ->
                val bundle = Bundle().apply {
                    putString("id", job.id)
                    putString("jobId", job.id)
                }
                navigate(R.id.jobDetailFragment, bundle)
            },
            onSaveToggle = { job ->
                viewModel.toggleSaveJob(job.id, job.isSaved)
            }
        )
        binding.rvJobHighlights.apply {
            layoutManager = LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false)
            adapter = jobHighlightAdapter
        }
    }

    private fun observeViewModel() {
        viewModel.uiState.collectLatestLifecycleFlow { state ->
            showLoading(state.isLoading)
            
            state.error?.let { message ->
                showError(message)
            }

            // Profile info
            state.user?.let { user ->
                binding.tvGreeting.text = if (!user.fullName.isNullOrBlank()) {
                    "Hello, ${user.fullName}"
                } else {
                    "Welcome back"
                }
                loadAvatar(user.avatarUrl, binding.ivAvatar)

                // Stats values
                user.stats?.let { stats ->
                    binding.tvStreakValue.text = "${stats.activeStreak} Days"
                    binding.tvInterviewsValue.text = "${stats.interviewsTaken}"
                    binding.tvScoreValue.text = String.format(Locale.getDefault(), "%.1f%%", stats.avgScore)
                }
            }

            // Lists
            recentSessionAdapter.submitList(state.recentSessions)
            jobHighlightAdapter.submitList(state.jobMatches)
        }
    }

    private fun loadAvatar(url: String?, imageView: ImageView) {
        if (url.isNullOrEmpty()) {
            imageView.setImageResource(R.drawable.ic_profile)
            return
        }
        viewLifecycleOwner.lifecycleScope.launch(Dispatchers.IO) {
            try {
                val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                connection.doInput = true
                connection.connect()
                val input = connection.inputStream
                val bitmap = android.graphics.BitmapFactory.decodeStream(input)
                withContext(Dispatchers.Main) {
                    imageView.setImageBitmap(bitmap)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    imageView.setImageResource(R.drawable.ic_profile)
                }
            }
        }
    }
}
