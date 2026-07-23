package com.aiinterview.presentation.quiz

import android.animation.ObjectAnimator
import android.app.AlertDialog
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.R
import android.content.res.ColorStateList
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentQuizAttemptBinding
import com.aiinterview.domain.model.AnswerSubmitResponse
import com.aiinterview.presentation.quiz.adapter.QuizOptionAdapter
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.combine

@AndroidEntryPoint
class QuizAttemptFragment : BaseFragment<FragmentQuizAttemptBinding>() {

    private val viewModel: QuizViewModel by activityViewModels()
    private lateinit var optionAdapter: QuizOptionAdapter
    private var quizId: String = ""
    private var attemptId: String = ""
    private var maxTimeSeconds: Int = 300
    private var pulseAnimator: ObjectAnimator? = null

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentQuizAttemptBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        quizId = arguments?.getString("quizId") ?: ""
        attemptId = arguments?.getString("attemptId") ?: ""

        setupRecyclerView()
        setupActions()
        observeViewModel()

        if (quizId.isNotEmpty() && attemptId.isNotEmpty()) {
            viewModel.resumeQuiz(quizId, attemptId)
        }
    }

    private fun setupRecyclerView() {
        optionAdapter = QuizOptionAdapter { option ->
            viewModel.selectOption(option)
        }
        binding.rvOptions.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = optionAdapter
        }
    }

    private fun setupActions() {
        binding.btnQuit.setOnClickListener {
            showQuitConfirmationDialog()
        }

        binding.btnAction.setOnClickListener {
            val submitted = viewModel.isAnswerSubmitted.value
            val submitting = viewModel.isSubmittingAnswer.value
            if (submitting) return@setOnClickListener

            if (submitted) {
                viewModel.nextQuestion()
            } else {
                viewModel.submitAnswer()
            }
        }
    }

    private fun observeViewModel() {
        viewModel.currentQuestionIndex.collectLatestLifecycleFlow { index ->
            val total = viewModel.activeQuizDetail.value?.totalQuestions ?: 5
            binding.tvQuestionProgress.text = "Q ${index + 1}/$total"
        }

        viewModel.currentQuestion.collectLatestLifecycleFlow { question ->
            if (question != null) {
                binding.tvQuestion.text = question.questionText
                optionAdapter.submitList(question.options)
            }
        }

        // Single combined observer for all button-related state
        combine(
            viewModel.selectedOption,
            viewModel.answerResult,
            viewModel.isAnswerSubmitted,
            viewModel.isSubmittingAnswer
        ) { selected, result, submitted, submitting ->
            ButtonState(selected, result, submitted, submitting)
        }.collectLatestLifecycleFlow { state ->
            optionAdapter.updateStates(state.selected, state.result?.correctAnswer, state.submitted)
            updateActionButton(state)

            if (state.submitted && state.result != null) {
                showInlineFeedback(state.result)
            } else {
                hideInlineFeedback()
            }
        }

        viewModel.timeLeft.collectLatestLifecycleFlow { time ->
            updateTimerUi(time)
        }

        viewModel.navigationEvent.collectLatestLifecycleFlow { event ->
            if (event is QuizNavigationEvent.ViewQuizResult) {
                val bundle = Bundle().apply {
                    putString("quizId", event.quizId)
                    putString("attemptId", event.attemptId)
                }
                val navOptions = androidx.navigation.NavOptions.Builder()
                    .setPopUpTo(R.id.quizHomeFragment, false)
                    .build()
                showSuccess("Quiz completed!")
                navigate(R.id.quizResultFragment, bundle, navOptions)
            }
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLifecycleFlow { msg ->
            showError(msg)
        }
    }

    private data class ButtonState(
        val selected: String?,
        val result: AnswerSubmitResponse?,
        val submitted: Boolean,
        val submitting: Boolean
    )

    private fun updateActionButton(state: ButtonState) {
        when {
            state.submitting -> {
                binding.btnAction.isEnabled = false
                binding.btnAction.text = "Submitting..."
            }
            state.submitted -> {
                binding.btnAction.isEnabled = true
                val total = viewModel.activeQuizDetail.value?.totalQuestions ?: 5
                val isLast = (viewModel.currentQuestionIndex.value + 1) >= total
                binding.btnAction.text = if (isLast) "Finish Quiz" else "Next Question →"
            }
            else -> {
                binding.btnAction.isEnabled = state.selected != null
                binding.btnAction.text = "Submit"
            }
        }
    }

    private fun showInlineFeedback(result: AnswerSubmitResponse) {
        binding.scrollQuestionContainer.visibility = View.GONE
        binding.layoutFeedbackContainer.visibility = View.VISIBLE

        // Set question text in feedback review card
        val currentQuestion = viewModel.currentQuestion.value
        binding.tvFeedbackQuestionText.text = currentQuestion?.questionText ?: ""

        // Set result status
        if (result.isCorrect) {
            binding.tvFeedbackResultIcon.text = "✅"
            binding.tvFeedbackResultLabel.text = "Correct!"
            binding.tvFeedbackResultLabel.setTextColor(Color.parseColor("#10B981"))
            binding.tvFeedbackResultSubtitle.text = "Great job! You got it right."
            binding.cardFeedbackResultStatus.strokeColor = Color.parseColor("#10B981")
            binding.cardFeedbackResultStatus.setCardBackgroundColor(ColorStateList.valueOf(Color.parseColor("#14352A")))
        } else {
            binding.tvFeedbackResultIcon.text = "❌"
            binding.tvFeedbackResultLabel.text = "Incorrect"
            binding.tvFeedbackResultLabel.setTextColor(Color.parseColor("#EF4444"))
            binding.tvFeedbackResultSubtitle.text = "Don't worry, keep learning!"
            binding.cardFeedbackResultStatus.strokeColor = Color.parseColor("#EF4444")
            binding.cardFeedbackResultStatus.setCardBackgroundColor(ColorStateList.valueOf(Color.parseColor("#3B1414")))
        }

        // Set your answer
        binding.tvFeedbackYourAnswer.text = result.selectedAnswer
        if (result.isCorrect) {
            binding.tvFeedbackYourAnswer.setTextColor(Color.parseColor("#10B981"))
        } else {
            binding.tvFeedbackYourAnswer.setTextColor(Color.parseColor("#EF4444"))
        }

        // Set correct answer section
        if (!result.isCorrect) {
            binding.layoutFeedbackCorrectAnswer.visibility = View.VISIBLE
            binding.tvFeedbackCorrectAnswer.text = result.correctAnswer
        } else {
            binding.layoutFeedbackCorrectAnswer.visibility = View.GONE
        }

        // Set explanation
        if (!result.explanation.isNullOrBlank()) {
            binding.layoutFeedbackExplanation.visibility = View.VISIBLE
            binding.tvFeedbackExplanationText.text = result.explanation
        } else {
            binding.layoutFeedbackExplanation.visibility = View.GONE
        }
    }

    private fun hideInlineFeedback() {
        binding.scrollQuestionContainer.visibility = View.VISIBLE
        binding.layoutFeedbackContainer.visibility = View.GONE
    }

    private fun updateTimerUi(timeSeconds: Int) {
        val totalTime = viewModel.activeAttempt.value?.timeLimitS ?: 300
        maxTimeSeconds = if (totalTime > 0) totalTime else 300

        val minutes = timeSeconds / 60
        val seconds = timeSeconds % 60
        binding.tvTimer.text = String.format("%02d:%02d", minutes, seconds)

        // Progress bar percentage
        val progressPercentage = (timeSeconds * 100) / maxTimeSeconds
        binding.timerProgressBar.progress = progressPercentage

        // Style progress bar and text based on remaining time percentage
        when {
            progressPercentage >= 50 -> {
                stopPulseAnimation()
                binding.timerProgressBar.setIndicatorColor(Color.parseColor("#10B981")) // emerald
                binding.tvTimer.setTextColor(Color.WHITE)
            }
            progressPercentage >= 30 -> {
                stopPulseAnimation()
                binding.timerProgressBar.setIndicatorColor(Color.parseColor("#F59E0B")) // amber
                binding.tvTimer.setTextColor(Color.parseColor("#F59E0B"))
            }
            progressPercentage >= 10 -> {
                stopPulseAnimation()
                binding.timerProgressBar.setIndicatorColor(Color.parseColor("#F97316")) // orange
                binding.tvTimer.setTextColor(Color.parseColor("#F97316"))
            }
            else -> {
                // <10% remaining -> Rose pulse
                startPulseAnimation()
                binding.timerProgressBar.setIndicatorColor(Color.parseColor("#EF4444")) // rose
                binding.tvTimer.setTextColor(Color.parseColor("#EF4444"))
            }
        }
    }

    private fun startPulseAnimation() {
        if (pulseAnimator == null) {
            pulseAnimator = ObjectAnimator.ofFloat(binding.tvTimer, "alpha", 1f, 0.3f, 1f).apply {
                duration = 800
                repeatCount = ObjectAnimator.INFINITE
                start()
            }
        }
    }

    private fun stopPulseAnimation() {
        pulseAnimator?.cancel()
        pulseAnimator = null
        // Use safe access — binding may be null during onDestroyView
        try {
            binding.tvTimer.alpha = 1f
        } catch (_: Exception) {}
    }

    private fun showQuitConfirmationDialog() {
        AlertDialog.Builder(requireContext())
            .setTitle("Quit Quiz")
            .setMessage("Are you sure you want to quit? Your current score will be submitted as-is.")
            .setPositiveButton("Quit") { _, _ ->
                viewModel.finishQuiz()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onDestroyView() {
        // Cancel animation first, before binding is nullified
        pulseAnimator?.cancel()
        pulseAnimator = null
        super.onDestroyView()
    }
}
