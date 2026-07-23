package com.aiinterview.presentation.quiz

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.activityViewModels
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentQuizDetailBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class QuizDetailFragment : BaseFragment<FragmentQuizDetailBinding>() {

    private val viewModel: QuizViewModel by activityViewModels()
    private var quizId: String = ""

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentQuizDetailBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        quizId = arguments?.getString("quizId") ?: ""

        setupActions()
        observeViewModel()

        if (quizId.isNotEmpty()) {
            viewModel.loadQuizDetail(quizId)
        }
    }

    private fun setupActions() {
        binding.btnBack.setOnClickListener {
            navigateUp()
        }

        binding.btnStartQuiz.setOnClickListener {
            if (quizId.isNotEmpty()) {
                viewModel.startQuiz(quizId)
            }
        }
    }

    private fun observeViewModel() {
        viewModel.activeQuizDetail.collectLatestLifecycleFlow { detail ->
            if (detail != null) {
                binding.tvTitle.text = detail.title
                binding.tvTopic.text = detail.topic
                binding.tvDifficulty.text = detail.difficulty.uppercase()
                binding.tvQuestionCount.text = "${detail.totalQuestions} Questions"
                
                val limit = detail.timeLimitS ?: 300
                binding.tvTimeLimit.text = "${limit / 60} Minutes"
                binding.tvAttempts.text = "${detail.attemptCount} times"
            }
        }

        viewModel.navigationEvent.collectLatestLifecycleFlow { event ->
            if (event is QuizNavigationEvent.StartQuizAttempt) {
                val bundle = Bundle().apply {
                    putString("quizId", event.quizId)
                    putString("attemptId", event.attemptId)
                }
                navigate(R.id.quizAttemptFragment, bundle)
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
