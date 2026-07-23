package com.aiinterview.presentation.quiz

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentQuizResultBinding
import com.aiinterview.presentation.quiz.adapter.QuizReviewAdapter
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class QuizResultFragment : BaseFragment<FragmentQuizResultBinding>() {

    private val viewModel: QuizViewModel by activityViewModels()
    private lateinit var reviewAdapter: QuizReviewAdapter
    private var quizId: String = ""
    private var attemptId: String = ""

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentQuizResultBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        quizId = arguments?.getString("quizId") ?: ""
        attemptId = arguments?.getString("attemptId") ?: ""

        setupRecyclerView()
        setupActions()
        observeViewModel()

        if (quizId.isNotEmpty() && attemptId.isNotEmpty()) {
            viewModel.loadResults(quizId, attemptId)
        }
    }

    private fun setupRecyclerView() {
        reviewAdapter = QuizReviewAdapter()
        binding.rvReviews.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = reviewAdapter
        }
    }

    private fun setupActions() {
        binding.btnBack.setOnClickListener {
            navigate(R.id.quizHomeFragment)
        }

        binding.btnBackHome.setOnClickListener {
            navigate(R.id.quizHomeFragment)
        }
    }

    private fun observeViewModel() {
        viewModel.quizResult.collectLatestLifecycleFlow { result ->
            if (result != null) {
                binding.tvTitle.text = "Attempt Results"
                binding.donutScore.setLabel("Score")
                binding.donutScore.setScore(result.score.toInt())

                binding.tvScorePercentage.text = "Score: ${result.score.toInt()}%"
                binding.tvCorrectStats.text = "Correct Answers: ${result.correctCount} / ${result.breakdown.size}"
                binding.tvTimeTaken.text = "Time Taken: ${result.timeTakenS / 60}m ${result.timeTakenS % 60}s"

                reviewAdapter.submitList(result.breakdown)
            }
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLifecycleFlow { msg ->
            showError(msg)
        }
    }
}
