package com.aiinterview.presentation.sessions

import android.content.res.ColorStateList
import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.text.Spannable
import android.text.SpannableString
import android.text.style.ForegroundColorSpan
import android.text.style.StyleSpan
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentSessionDetailBinding
import com.aiinterview.databinding.ItemScoreDimensionBinding
import com.aiinterview.presentation.sessions.adapter.ImprovementAdapter
import com.aiinterview.presentation.sessions.adapter.StudyTask
import com.google.android.material.tabs.TabLayout
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import java.util.Locale

@AndroidEntryPoint
class SessionDetailFragment : BaseFragment<FragmentSessionDetailBinding>() {

    private val viewModel: SessionViewModel by viewModels()
    private lateinit var checklistAdapter: ImprovementAdapter
    private var sessionId: String = ""

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentSessionDetailBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        sessionId = arguments?.getString("sessionId") ?: arguments?.getString("id") ?: ""
        if (sessionId.isBlank()) {
            showError("Invalid Session ID")
            popBackStack()
            return
        }

        setupTabs()
        setupChecklistRecyclerView()
        setupActionButtons()
        observeViewModel()

        viewModel.loadSessionDetail(sessionId)
    }

    private fun setupTabs() {
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Summary"))
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Score"))
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Improvements"))

        binding.tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                when (tab?.position) {
                    0 -> {
                        binding.layoutSummary.visibility = View.VISIBLE
                        binding.layoutScore.visibility = View.GONE
                        binding.layoutImprovements.visibility = View.GONE
                    }
                    1 -> {
                        binding.layoutSummary.visibility = View.GONE
                        binding.layoutScore.visibility = View.VISIBLE
                        binding.layoutImprovements.visibility = View.GONE
                        binding.radarChart.animateData()
                    }
                    2 -> {
                        binding.layoutSummary.visibility = View.GONE
                        binding.layoutScore.visibility = View.GONE
                        binding.layoutImprovements.visibility = View.VISIBLE
                    }
                }
            }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })
    }

    private fun setupChecklistRecyclerView() {
        checklistAdapter = ImprovementAdapter { task, isChecked ->
            // Save state to DataStore
            lifecycleScope.launch {
                viewModel.getCheckedImprovements(sessionId).firstOrNull()?.let { currentSet ->
                    val updatedSet = if (isChecked) {
                        currentSet + task.id
                    } else {
                        currentSet - task.id
                    }
                    viewModel.setCheckedImprovements(sessionId, updatedSet)
                }
            }
        }

        binding.rvChecklist.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = checklistAdapter
        }
    }

    private fun setupActionButtons() {
        binding.btnBack.setOnClickListener {
            popBackStack()
        }

        binding.btnShare.setOnClickListener {
            viewModel.shareSession(sessionId) { url ->
                val intent = Intent().apply {
                    action = Intent.ACTION_SEND
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, "Shared AI Interview Performance Report")
                    putExtra(Intent.EXTRA_TEXT, "Here is my mock interview review report: $url")
                }
                startActivity(Intent.createChooser(intent, "Share via"))
            }
        }

        binding.btnExport.setOnClickListener {
            viewModel.exportSessions("pdf") { downloadUrl ->
                showSuccess("Report export generated!")
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl))
                startActivity(intent)
            }
        }
    }

    private fun observeViewModel() {
        viewModel.isLoading.collectLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLifecycleFlow { err ->
            showError(err)
        }

        viewModel.sessionDetail.collectLifecycleFlow { state ->
            state?.let {
                bindSummaryTab(it)
                bindScoreTab(it)
                bindImprovementsTab(it)
            }
        }
    }

    private fun bindSummaryTab(state: SessionDetailState) {
        val summary = state.summary ?: return
        
        binding.tvTitle.text = "Session Review"
        binding.tvDetailScore.text = String.format(Locale.getDefault(), "%.1f", summary.overallPerformanceGrade)

        // Color key phrases in summary text
        binding.tvAiSummary.text = highlightKeyPhrases(summary.summary)
        binding.tvWhatWentWell.text = summary.whatWentWell
        binding.tvWhatToImprove.text = summary.whatToImprove
    }

    private fun bindScoreTab(state: SessionDetailState) {
        val score = state.score ?: return

        // Set values for custom RadarChartView
        binding.radarChart.setValues(
            floatArrayOf(
                score.technical,
                score.communication,
                score.confidence,
                score.structure,
                score.relevance
            )
        )

        // Dynamically add score progress rows using existing item_score_dimension.xml
        binding.layoutScoreDimensions.removeAllViews()
        val dimensions = listOf(
            Triple("Technical Score", score.technical, R.color.primary),
            Triple("Communication Score", score.communication, R.color.score_high),
            Triple("Confidence Level", score.confidence, R.color.score_mid),
            Triple("Answer Structure", score.structure, R.color.score_high),
            Triple("Question Relevance", score.relevance, R.color.primary)
        )

        for (dim in dimensions) {
            val dimBinding = ItemScoreDimensionBinding.inflate(
                layoutInflater,
                binding.layoutScoreDimensions,
                false
            )
            dimBinding.tvDimension.text = dim.first
            dimBinding.progressBar.progress = dim.second.toInt()
            dimBinding.progressBar.progressTintList = ColorStateList.valueOf(
                ContextCompat.getColor(requireContext(), dim.third)
            )
            dimBinding.tvScoreValue.text = String.format(Locale.getDefault(), "%.1f%%", dim.second)
            binding.layoutScoreDimensions.addView(dimBinding.root)
        }
    }

    private fun bindImprovementsTab(state: SessionDetailState) {
        val improvements = state.improvements ?: return

        // Combine study checklist items with checked states from preferences
        viewModel.getCheckedImprovements(sessionId).collectLifecycleFlow { checkedIds ->
            val tasksList = mutableListOf<StudyTask>()
            
            // Flatten the map studyPlan30d e.g. "Week 1" -> listOf("Study isolation levels", ...)
            improvements.studyPlan30d.forEach { (week, tasks) ->
                tasks.forEachIndexed { index, taskText ->
                    val taskId = "${week}_$index"
                    tasksList.add(
                        StudyTask(
                            id = taskId,
                            displayText = "$week: $taskText",
                            isChecked = checkedIds.contains(taskId)
                        )
                    )
                }
            }
            checklistAdapter.submitList(tasksList)
        }
    }

    private fun highlightKeyPhrases(text: String): SpannableString {
        val spannable = SpannableString(text)
        val context = requireContext()
        val emerald = ContextCompat.getColor(context, R.color.score_high)
        val orange = ContextCompat.getColor(context, R.color.score_mid)

        val positiveWords = listOf("strength", "excellent", "great", "strong", "well", "command", "clarity", "sound")
        val negativeWords = listOf("weakness", "concurrency", "improve", "locking", "isolation", "depth", "deepen")

        for (word in positiveWords) {
            var index = text.indexOf(word, ignoreCase = true)
            while (index >= 0) {
                spannable.setSpan(
                    ForegroundColorSpan(emerald),
                    index,
                    index + word.length,
                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                )
                spannable.setSpan(
                    StyleSpan(Typeface.BOLD),
                    index,
                    index + word.length,
                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                )
                index = text.indexOf(word, index + word.length, ignoreCase = true)
            }
        }

        for (word in negativeWords) {
            var index = text.indexOf(word, ignoreCase = true)
            while (index >= 0) {
                spannable.setSpan(
                    ForegroundColorSpan(orange),
                    index,
                    index + word.length,
                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                )
                spannable.setSpan(
                    StyleSpan(Typeface.BOLD),
                    index,
                    index + word.length,
                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                )
                index = text.indexOf(word, index + word.length, ignoreCase = true)
            }
        }
        return spannable
    }
}
