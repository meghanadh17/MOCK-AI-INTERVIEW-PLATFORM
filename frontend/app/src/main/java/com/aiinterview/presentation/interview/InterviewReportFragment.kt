package com.aiinterview.presentation.interview

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentInterviewReportBinding
import com.aiinterview.presentation.interview.adapter.FeedbackAccordionAdapter
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class InterviewReportFragment : BaseFragment<FragmentInterviewReportBinding>() {

    private val viewModel: InterviewViewModel by viewModels()
    private var sessionId: String = ""
    private lateinit var accordionAdapter: FeedbackAccordionAdapter

    private var detailsDialog: androidx.appcompat.app.AlertDialog? = null

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentInterviewReportBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        sessionId = arguments?.getString("sessionId") ?: ""

        setupActions()
        setupRecyclerView()
        observeViewModel()

        if (sessionId.isNotEmpty()) {
            viewModel.loadReport(sessionId)
        }
    }

    private fun setupActions() {
        binding.btnBack.setOnClickListener {
            navigate(R.id.homeFragment)
        }

        binding.btnShare.setOnClickListener {
            showSuccess("Report link copied to clipboard!")
        }
    }

    private fun setupRecyclerView() {
        accordionAdapter = FeedbackAccordionAdapter()
        binding.rvFeedbackAccordion.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = accordionAdapter
        }
    }

    private fun observeViewModel() {
        viewModel.sessionReport.collectLatestLifecycleFlow { report ->
            if (report != null) {
                binding.donutOverallScore.setScore(report.overall_score.toInt())
                binding.tvReportSummary.text = report.summary

                val dimensions = floatArrayOf(
                    (report.dimension_scores["communication"] ?: 50.0).toFloat(),
                    (report.dimension_scores["depth"] ?: 50.0).toFloat(),
                    (report.dimension_scores["structure"] ?: 50.0).toFloat(),
                    (report.dimension_scores["relevance"] ?: 50.0).toFloat(),
                    (report.dimension_scores["technical_accuracy"] ?: 50.0).toFloat()
                )
                binding.radarChartDimensions.setValues(dimensions)

                // Populate improvement plan if available
                val improvementText = report.improvement_plan?.joinToString("\n") { "• $it" } ?: ""
                if (improvementText.isNotEmpty()) {
                    binding.tvReportSummary.text = "${report.summary}\n\n$improvementText"
                }

                // Bind time spent
                val duration = report.duration_seconds ?: 0
                val min = duration / 60
                val sec = duration % 60
                binding.tvStatsTime.text = "Time Spent: ${min}m ${sec}s"
            }
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.questions.collectLatestLifecycleFlow { list ->
            accordionAdapter.submitList(list)
            binding.tvStatsQuestions.text = "Questions Answered: ${list.size}"
        }
    }



    override fun onDestroyView() {
        super.onDestroyView()
        detailsDialog?.dismiss()
        detailsDialog = null
    }
}
