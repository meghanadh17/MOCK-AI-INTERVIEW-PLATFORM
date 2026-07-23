package com.aiinterview.presentation.interview

import android.animation.ObjectAnimator
import androidx.appcompat.app.AlertDialog
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentInterviewSessionBinding
import dagger.hilt.android.AndroidEntryPoint
import android.speech.SpeechRecognizer
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import android.view.MotionEvent
import android.content.Intent
import java.util.Locale
import android.content.res.ColorStateList
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.collectLatest

@AndroidEntryPoint
class InterviewSessionFragment : BaseFragment<FragmentInterviewSessionBinding>() {

    private val viewModel: InterviewViewModel by viewModels()
    private var sessionId: String = ""
    private var evaluationDialog: AlertDialog? = null
    private var speechRecognizer: SpeechRecognizer? = null
    private lateinit var dotsAdapter: com.aiinterview.presentation.interview.adapter.QuestionDotsAdapter

    private val requestPermissionLauncher = registerForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            showSuccess("Audio permission granted! Tap the mic button to speak.")
        } else {
            showError("Audio permission is required for voice input.")
        }
    }

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentInterviewSessionBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        sessionId = arguments?.getString("sessionId") ?: ""

        setupDotsRecyclerView()
        setupActions()
        setupSpeechRecognizer()
        observeViewModel()

        if (sessionId.isNotEmpty() && (viewModel.activeSession.value == null || viewModel.activeSession.value?.id != sessionId)) {
            viewModel.loadActiveSession(sessionId)
        }
    }

    private fun setupDotsRecyclerView() {
        dotsAdapter = com.aiinterview.presentation.interview.adapter.QuestionDotsAdapter { _, position ->
            viewModel.selectQuestionAtIndex(position)
        }
        binding.rvQuestionDots.adapter = dotsAdapter
    }

    private fun hideKeyboard() {
        val imm = requireContext().getSystemService(android.content.Context.INPUT_METHOD_SERVICE) as android.view.inputmethod.InputMethodManager
        imm.hideSoftInputFromWindow(binding.etAnswer.windowToken, 0)
        binding.etAnswer.clearFocus()
    }

    private fun updateSubmitButtonText(index: Int, totalQuestions: Int) {
        val total = if (totalQuestions > 0) totalQuestions else 5
        val isLast = (index + 1) >= total
        if (viewModel.isSubmitting.value == true) {
            binding.btnSubmit.text = "Submitting..."
        } else {
            binding.btnSubmit.text = if (isLast) "SUBMIT TEST" else "SUBMIT"
        }
    }

    private fun setupActions() {
        binding.btnHint.setOnClickListener {
            viewModel.requestHint()
        }

        binding.btnSkip.setOnClickListener {
            viewModel.skipQuestion()
            binding.etAnswer.text.clear()
            hideKeyboard()
        }

        binding.btnSubmit.setOnClickListener {
            val answerText = binding.etAnswer.text.toString().trim()
            if (answerText.isEmpty()) {
                showError("Please enter your answer before submitting.")
                return@setOnClickListener
            }
            viewModel.submitAnswer(answerText)
            hideKeyboard()
        }

        binding.btnNext.setOnClickListener {
            binding.btnNext.visibility = View.GONE
            binding.btnSubmit.visibility = View.VISIBLE
            showInfo("Moving to next question...")
            viewModel.advanceAfterFeedback()
            binding.etAnswer.text.clear()
            hideKeyboard()
        }

        binding.btnEnd.setOnClickListener {
            showEndConfirmationDialog()
        }

        binding.etAnswer.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val len = s?.length ?: 0
                binding.tvCharCounter.text = "$len characters"
            }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    private fun observeViewModel() {
        viewModel.questions.collectLatestLifecycleFlow { questionList ->
            dotsAdapter.submitList(questionList)
        }

        viewModel.currentQuestion.collectLatestLifecycleFlow { question ->
            if (question != null) {
                binding.tvQuestion.text = question.text
                binding.tvQuestion.visibility = View.VISIBLE
                binding.tvQuestionCategory.text = (question.category ?: "General").uppercase()
                binding.tvQuestionDifficulty.text = question.difficultyLabel.uppercase()

                // Slide-in animation
                binding.cardQuestion.alpha = 0f
                binding.cardQuestion.translationY = 30f
                binding.cardQuestion.animate()
                    .alpha(1f)
                    .translationY(0f)
                    .setDuration(350)
                    .start()

                // Check answered/skipped states for this question
                val isAnswered = !question.user_transcript.isNullOrEmpty()
                val isSkipped = question.is_skipped

                if (isAnswered) {
                    binding.etAnswer.setText(question.user_transcript)
                    binding.etAnswer.isEnabled = false
                    binding.btnSubmit.visibility = View.GONE
                    
                    val session = viewModel.activeSession.value
                    val total = if ((session?.total_questions ?: 0) > 0) session!!.total_questions else (session?.questions?.size ?: 5)
                    val isLast = (viewModel.currentQuestionIndex.value + 1) >= total
                    if (!isLast) {
                        binding.btnNext.visibility = View.VISIBLE
                    } else {
                        binding.btnNext.visibility = View.GONE
                    }
                    binding.fabVoice.isEnabled = false
                } else if (isSkipped) {
                    binding.etAnswer.setText("Skipped")
                    binding.etAnswer.isEnabled = false
                    binding.btnSubmit.visibility = View.GONE
                    
                    val session = viewModel.activeSession.value
                    val total = if ((session?.total_questions ?: 0) > 0) session!!.total_questions else (session?.questions?.size ?: 5)
                    val isLast = (viewModel.currentQuestionIndex.value + 1) >= total
                    if (!isLast) {
                        binding.btnNext.visibility = View.VISIBLE
                    } else {
                        binding.btnNext.visibility = View.GONE
                    }
                    binding.fabVoice.isEnabled = false
                } else {
                    binding.etAnswer.setText("")
                    binding.etAnswer.isEnabled = true
                    binding.btnSubmit.visibility = View.VISIBLE
                    binding.btnNext.visibility = View.GONE
                    binding.fabVoice.isEnabled = true
                }
            }
        }

        viewModel.currentQuestionIndex.collectLatestLifecycleFlow { index ->
            val session = viewModel.activeSession.value
            val total = if ((session?.total_questions ?: 0) > 0) session!!.total_questions else (session?.questions?.size ?: 5)
            updateQuestionProgress(index, total)
            updateSubmitButtonText(index, total)
            dotsAdapter.setActiveIndex(index)
        }

        viewModel.activeSession.collectLatestLifecycleFlow { session ->
            if (session != null) {
                val total = if (session.total_questions > 0) session.total_questions else (session.questions?.size ?: 5)
                updateQuestionProgress(viewModel.currentQuestionIndex.value, total)
                updateSubmitButtonText(viewModel.currentQuestionIndex.value, total)
            }
        }

        viewModel.timerText.collectLatestLifecycleFlow { time ->
            binding.tvTimer.text = time
        }

        viewModel.hintText.collectLatestLifecycleFlow { hint ->
            if (!hint.isNullOrEmpty()) {
                binding.tvHintText.text = "💡 Hint: $hint"
                binding.layoutHintCollapsible.visibility = View.VISIBLE
            } else {
                binding.layoutHintCollapsible.visibility = View.GONE
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.state.collectLatest { state ->
                if (state == InterviewState.COMPLETED) {
                    val bundle = Bundle().apply {
                        putString("sessionId", sessionId)
                    }
                    showSuccess("Session completed!")
                    navigate(R.id.interviewReportFragment, bundle)
                }
            }
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        // Per-action loading states
        viewModel.isSubmitting.collectLatestLifecycleFlow { submitting ->
            binding.btnSubmit.isEnabled = !submitting
            binding.btnSubmit.alpha = if (submitting) 0.6f else 1f
            val session = viewModel.activeSession.value
            val total = if ((session?.total_questions ?: 0) > 0) session!!.total_questions else (session?.questions?.size ?: 5)
            updateSubmitButtonText(viewModel.currentQuestionIndex.value, total)
        }

        viewModel.isHintLoading.collectLatestLifecycleFlow { loading ->
            binding.btnHint.isEnabled = !loading
            binding.btnHint.text = if (loading) "Loading..." else "Hint"
            binding.btnHint.alpha = if (loading) 0.6f else 1f
        }

        viewModel.isSkipping.collectLatestLifecycleFlow { skipping ->
            binding.btnSkip.isEnabled = !skipping
            binding.btnSkip.text = if (skipping) "Skipping..." else "Skip"
            binding.btnSkip.alpha = if (skipping) 0.6f else 1f
        }

        viewModel.isEnding.collectLatestLifecycleFlow { ending ->
            binding.btnEnd.isEnabled = !ending
            binding.btnEnd.text = if (ending) "Ending..." else "End"
            binding.btnEnd.alpha = if (ending) 0.6f else 1f
        }

        viewModel.evaluationFeedback.collectLifecycleFlow { feedback ->
            showSuccess("Answer submitted! View feedback and move to the next question.")
            showEvaluationDialog(feedback)
        }
    }

    private fun showEvaluationDialog(feedback: com.aiinterview.data.remote.dto.interview.AnswerSubmitResponseDto) {
        evaluationDialog?.dismiss()
        val dialogViewBinding = com.aiinterview.databinding.DialogEvaluationFeedbackBinding.inflate(layoutInflater)
        
        val dialog = AlertDialog.Builder(requireContext(), R.style.Theme_App_FullscreenDialog)
            .setView(dialogViewBinding.root)
            .setCancelable(false)
            .create()
            
        evaluationDialog = dialog

        dialogViewBinding.tvScoreValue.text = feedback.score.toInt().toString()

        val feedbackDetail = feedback.feedback
        if (feedbackDetail != null) {
            dialogViewBinding.tvWhatWorkedText.text = feedbackDetail.what_was_good ?: "Good response layout and technical explanations."
            
            dialogViewBinding.chipGroupHit.removeAllViews()
            feedbackDetail.keywords_hit?.forEach { keyword ->
                val chip = com.google.android.material.chip.Chip(requireContext()).apply {
                    text = "✓ $keyword"
                    chipBackgroundColor = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#14352A"))
                    setTextColor(android.graphics.Color.parseColor("#10B981"))
                    chipStrokeColor = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#1A352A"))
                    chipStrokeWidth = 1f
                }
                dialogViewBinding.chipGroupHit.addView(chip)
            }

            dialogViewBinding.tvCouldImproveText.text = feedbackDetail.critical_gap ?: "Consider explaining target areas and tradeoffs in detail."
            
            dialogViewBinding.chipGroupMissed.removeAllViews()
            feedbackDetail.keywords_missed?.forEach { keyword ->
                val chip = com.google.android.material.chip.Chip(requireContext()).apply {
                    text = "⚠ $keyword"
                    chipBackgroundColor = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#3B1414"))
                    setTextColor(android.graphics.Color.parseColor("#EF4444"))
                    chipStrokeColor = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#4B1414"))
                    chipStrokeWidth = 1f
                }
                dialogViewBinding.chipGroupMissed.addView(chip)
            }

            if (!feedbackDetail.model_answer_outline.isNullOrEmpty()) {
                dialogViewBinding.tvModelOutlineText.text = feedbackDetail.model_answer_outline
                dialogViewBinding.layoutModelOutline.visibility = View.VISIBLE
            } else {
                dialogViewBinding.layoutModelOutline.visibility = View.GONE
            }
        } else {
            dialogViewBinding.tvWhatWorkedText.text = "No detailed feedback available."
            dialogViewBinding.tvCouldImproveText.text = "No improvement points available."
            dialogViewBinding.layoutModelOutline.visibility = View.GONE
        }

        val session = viewModel.activeSession.value
        val total = if ((session?.total_questions ?: 0) > 0) session!!.total_questions else (session?.questions?.size ?: 5)
        val isLast = (viewModel.currentQuestionIndex.value + 1) >= total || feedback.next_question == null
        if (isLast) {
            dialogViewBinding.btnNextAction.text = "SUBMIT TEST"
        } else {
            dialogViewBinding.btnNextAction.text = "Close & Move to Next Question"
        }

        dialogViewBinding.btnNextAction.setOnClickListener {
            dialog.dismiss()
            viewModel.clearFeedback()
            binding.etAnswer.text.clear()
            binding.btnNext.visibility = View.GONE
            binding.btnSubmit.visibility = View.VISIBLE
            if (isLast) {
                viewModel.endSession()
            } else {
                showInfo("Moving to next question...")
                viewModel.advanceAfterFeedback()
            }
        }

        dialogViewBinding.btnClose.setOnClickListener {
            dialog.dismiss()
            viewModel.clearFeedback()
            // Show Next button in the bottom bar as an alternative to advance
            if (!isLast) {
                binding.btnNext.visibility = View.VISIBLE
                binding.btnSubmit.visibility = View.GONE
                showInfo("Check evaluation details. Tap 'Next' to move to the next question.")
            } else {
                binding.etAnswer.text.clear()
                viewModel.endSession()
            }
        }

        dialog.show()
    }

    private fun updateQuestionProgress(index: Int, totalQuestions: Int) {
        val total = if (totalQuestions > 0) totalQuestions else 5
        binding.tvQuestionProgress.text = "Q ${index + 1}/$total"
        binding.sessionProgressBar.progress = ((index + 1) * 100) / total
    }

    private fun showEndConfirmationDialog() {
        AlertDialog.Builder(requireContext())
            .setTitle("End Session")
            .setMessage("Are you sure you want to end this interview session immediately? Your progress will be saved up to this point.")
            .setPositiveButton("Confirm") { _, _ ->
                viewModel.endSession()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private var isListening = false
    private var baseText = ""

    private fun setupSpeechRecognizer() {
        if (SpeechRecognizer.isRecognitionAvailable(requireContext())) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(requireContext()).apply {
                setRecognitionListener(object : android.speech.RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        baseText = binding.etAnswer.text.toString()
                        showInfo("Listening...")
                    }
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {}
                    override fun onError(error: Int) {
                        isListening = false
                        binding.fabVoice.backgroundTintList = ColorStateList.valueOf(
                            ContextCompat.getColor(requireContext(), android.R.color.white)
                        )
                        val errorMessage = when (error) {
                            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                            SpeechRecognizer.ERROR_NETWORK -> "Network error"
                            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                            SpeechRecognizer.ERROR_NO_MATCH -> "No speech detected"
                            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Speech recognizer is busy"
                            SpeechRecognizer.ERROR_SERVER -> "Server error"
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
                            else -> "Unknown error"
                        }
                        if (error != SpeechRecognizer.ERROR_NO_MATCH && error != SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                            showError("$errorMessage. Please try again.")
                        }
                    }
                    override fun onResults(results: Bundle?) {
                        isListening = false
                        binding.fabVoice.backgroundTintList = ColorStateList.valueOf(
                            ContextCompat.getColor(requireContext(), android.R.color.white)
                        )
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val spokenText = matches[0]
                            if (baseText.isEmpty()) {
                                binding.etAnswer.setText(spokenText)
                            } else {
                                binding.etAnswer.setText("$baseText $spokenText")
                            }
                            binding.etAnswer.setSelection(binding.etAnswer.text.length)
                        }
                    }
                    override fun onPartialResults(partialResults: Bundle?) {
                        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val partialText = matches[0]
                            if (baseText.isEmpty()) {
                                binding.etAnswer.setText(partialText)
                            } else {
                                binding.etAnswer.setText("$baseText $partialText")
                            }
                            binding.etAnswer.setSelection(binding.etAnswer.text.length)
                        }
                    }
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }
        }

        binding.fabVoice.setOnClickListener {
            val permission = Manifest.permission.RECORD_AUDIO
            if (ContextCompat.checkSelfPermission(requireContext(), permission) == PackageManager.PERMISSION_GRANTED) {
                if (isListening) {
                    stopSpeechRecognition()
                } else {
                    startSpeechRecognition()
                }
            } else {
                requestPermissionLauncher.launch(permission)
            }
        }
    }

    private fun startSpeechRecognition() {
        isListening = true
        binding.fabVoice.backgroundTintList = ColorStateList.valueOf(
            ContextCompat.getColor(requireContext(), R.color.score_high)
        )
        binding.fabVoice.imageTintList = ColorStateList.valueOf(
            ContextCompat.getColor(requireContext(), R.color.bg_void)
        )
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
        speechRecognizer?.startListening(intent) ?: showError("Speech recognition not available on this device.")
    }

    private fun stopSpeechRecognition() {
        isListening = false
        binding.fabVoice.backgroundTintList = ColorStateList.valueOf(
            ContextCompat.getColor(requireContext(), android.R.color.white)
        )
        binding.fabVoice.imageTintList = ColorStateList.valueOf(
            ContextCompat.getColor(requireContext(), R.color.bg_void)
        )
        speechRecognizer?.stopListening()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        evaluationDialog?.dismiss()
        evaluationDialog = null
        speechRecognizer?.destroy()
    }
}
