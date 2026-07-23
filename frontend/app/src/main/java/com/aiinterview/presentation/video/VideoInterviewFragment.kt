package com.aiinterview.presentation.video

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import android.os.Bundle
import android.os.SystemClock
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.LayoutInflater
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.VideoCapture
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.VideoRecordEvent
import androidx.camera.video.QualitySelector
import androidx.camera.video.Quality
import androidx.core.content.ContextCompat
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentVideoInterviewBinding
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import java.util.Locale
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.aiinterview.core.extensions.setupCustomStyle
import com.aiinterview.core.extensions.setChartData

@AndroidEntryPoint
class VideoInterviewFragment : BaseFragment<FragmentVideoInterviewBinding>() {

    private val viewModel: VideoViewModel by viewModels()
    private var sessionId: String = ""
    private var cameraProvider: ProcessCameraProvider? = null
    private var cameraExecutor: ExecutorService? = null
    private var speechRecognizer: SpeechRecognizer? = null

    private var videoCapture: VideoCapture<Recorder>? = null
    private var activeRecording: Recording? = null
    private var localVideoFile: java.io.File? = null
    private var isEndingSession = false
    private var isTextMode = false
    private var isDrawerOpen = false
    private var isQuestionMinimized = false
    private var isListeningSpeech = false
    private var baseText = ""
    private var isFirstSpeechStart = true
    private lateinit var questionBehavior: BottomSheetBehavior<View>
    private lateinit var telemetryBehavior: BottomSheetBehavior<View>
    private lateinit var coachBehavior: BottomSheetBehavior<View>
    private var micAnimator: android.animation.AnimatorSet? = null

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentVideoInterviewBinding.inflate(inflater, container, false)

    private fun showSessionLoading(show: Boolean) {
        if (isEndingSession) {
            showLoading(true)
        } else {
            showLoading(show)
        }
    }

    override fun onViewReady(savedInstanceState: Bundle?) {
        sessionId = arguments?.getString("sessionId") ?: ""
        cameraExecutor = Executors.newSingleThreadExecutor()
        binding.chartPosture.setupCustomStyle("#6366F1")

        // Initialize Bottom Sheets
        questionBehavior = BottomSheetBehavior.from(binding.cardQuestionSheet)
        telemetryBehavior = BottomSheetBehavior.from(binding.cardTelemetryDrawer)
        coachBehavior = BottomSheetBehavior.from(binding.cardCoachSheet)

        questionBehavior.state = BottomSheetBehavior.STATE_HIDDEN
        telemetryBehavior.state = BottomSheetBehavior.STATE_HIDDEN
        coachBehavior.state = BottomSheetBehavior.STATE_HIDDEN

        val sheetCallback = object : BottomSheetBehavior.BottomSheetCallback() {
            override fun onStateChanged(bottomSheet: View, newState: Int) {
                updateDrawerButtonStyles()
            }
            override fun onSlide(bottomSheet: View, slideOffset: Float) {}
        }
        questionBehavior.addBottomSheetCallback(sheetCallback)
        coachBehavior.addBottomSheetCallback(sheetCallback)

        telemetryBehavior.addBottomSheetCallback(object : BottomSheetBehavior.BottomSheetCallback() {
            override fun onStateChanged(bottomSheet: View, newState: Int) {
                isDrawerOpen = (newState == BottomSheetBehavior.STATE_EXPANDED)
                val rotation = if (isDrawerOpen) 180f else 0f
                binding.ivDrawerToggleIcon.animate().rotation(rotation).setDuration(200).start()
                updateDrawerButtonStyles()
            }
            override fun onSlide(bottomSheet: View, slideOffset: Float) {
                binding.ivDrawerToggleIcon.rotation = slideOffset * 180f
            }
        })

        // Apply initial styles
        updateDrawerButtonStyles()

        setupClickListeners()
        setupSpeechRecognizer()
        observeViewModel()
        startCamera()
        viewModel.startVideoSession(sessionId)
    }

    private fun updateDrawerButtonStyles() {
        val activeBgColor = ContextCompat.getColorStateList(requireContext(), R.color.primary)
        val activeIconColor = ContextCompat.getColor(requireContext(), R.color.primary_foreground)
        val inactiveBgColor = ContextCompat.getColorStateList(requireContext(), R.color.overlay_80)
        val inactiveIconColor = ContextCompat.getColor(requireContext(), R.color.text_prim)

        // Question button
        if (questionBehavior.state == BottomSheetBehavior.STATE_EXPANDED) {
            binding.btnDrawerQuestion.backgroundTintList = activeBgColor
            binding.btnDrawerQuestion.imageTintList = android.content.res.ColorStateList.valueOf(activeIconColor)
        } else {
            binding.btnDrawerQuestion.backgroundTintList = inactiveBgColor
            binding.btnDrawerQuestion.imageTintList = android.content.res.ColorStateList.valueOf(inactiveIconColor)
        }

        // Telemetry button
        if (telemetryBehavior.state == BottomSheetBehavior.STATE_EXPANDED) {
            binding.btnDrawerTelemetry.backgroundTintList = activeBgColor
            binding.btnDrawerTelemetry.imageTintList = android.content.res.ColorStateList.valueOf(activeIconColor)
        } else {
            binding.btnDrawerTelemetry.backgroundTintList = inactiveBgColor
            binding.btnDrawerTelemetry.imageTintList = android.content.res.ColorStateList.valueOf(inactiveIconColor)
        }

        // Coach button
        if (coachBehavior.state == BottomSheetBehavior.STATE_EXPANDED) {
            binding.btnDrawerCoach.backgroundTintList = activeBgColor
            binding.btnDrawerCoach.imageTintList = android.content.res.ColorStateList.valueOf(activeIconColor)
        } else {
            binding.btnDrawerCoach.backgroundTintList = inactiveBgColor
            binding.btnDrawerCoach.imageTintList = android.content.res.ColorStateList.valueOf(inactiveIconColor)
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(requireContext())
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }, ContextCompat.getMainExecutor(requireContext()))
    }

    private fun bindCameraUseCases() {
        val provider = cameraProvider ?: return
        provider.unbindAll()

        val preview = Preview.Builder().build().also {
            it.surfaceProvider = binding.cameraPreview.surfaceProvider
        }

        val imageAnalysis = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()

        var lastFrameTime = 0L

        imageAnalysis.setAnalyzer(cameraExecutor!!) { imageProxy ->
            val now = SystemClock.elapsedRealtime()
            if (now - lastFrameTime >= 500) {
                lastFrameTime = now
                try {
                    val jpegBytes = imageProxy.toDownsampledJpegByteArray(70)
                    viewModel.sendFrame(jpegBytes)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            imageProxy.close()
        }

        val recorder = Recorder.Builder()
            .setQualitySelector(QualitySelector.from(Quality.SD))
            .build()
        videoCapture = VideoCapture.withOutput(recorder)

        val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

        try {
            provider.bindToLifecycle(viewLifecycleOwner, cameraSelector, preview, imageAnalysis, videoCapture)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun ImageProxy.toDownsampledJpegByteArray(quality: Int): ByteArray {
        val yBuffer = planes[0].buffer
        val uBuffer = planes[1].buffer
        val vBuffer = planes[2].buffer

        val ySize = yBuffer.remaining()
        val uSize = uBuffer.remaining()
        val vSize = vBuffer.remaining()

        val nv21 = ByteArray(ySize + uSize + vSize)

        yBuffer.get(nv21, 0, ySize)
        vBuffer.get(nv21, ySize, vSize)
        uBuffer.get(nv21, ySize + vSize, uSize)

        val yuvImage = YuvImage(nv21, ImageFormat.NV21, width, height, null)
        val out = ByteArrayOutputStream()
        yuvImage.compressToJpeg(Rect(0, 0, width, height), quality, out)
        val rawBytes = out.toByteArray()

        val options = BitmapFactory.Options()
        val bitmap = BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size, options)
        val scaledBitmap = Bitmap.createScaledBitmap(bitmap, 320, 240, true)
        val scaledOut = ByteArrayOutputStream()
        scaledBitmap.compress(Bitmap.CompressFormat.JPEG, quality, scaledOut)

        bitmap.recycle()
        scaledBitmap.recycle()

        return scaledOut.toByteArray()
    }

    private fun startLocalRecording() {
        val capture = videoCapture ?: return
        activeRecording?.stop()
        activeRecording = null

        val file = java.io.File(requireContext().cacheDir, "${sessionId}.mp4")
        localVideoFile = file
        val fileOutputOptions = FileOutputOptions.Builder(file).build()

        try {
            val pendingRecording = capture.output.prepareRecording(requireContext(), fileOutputOptions)
            
            // We must NOT call pendingRecording.withAudioEnabled() here because Android does not allow concurrent microphone audio capture 
            // by both CameraX's Video Recorder and the SpeechRecognizer. Disabling audio for video recording releases the mic resource 
            // so SpeechRecognizer can capture the speech and convert it to text in real-time.
            activeRecording = pendingRecording.start(ContextCompat.getMainExecutor(requireContext())) { recordEvent ->
                when (recordEvent) {
                    is VideoRecordEvent.Start -> {
                        // Local recording started successfully
                    }
                    is VideoRecordEvent.Finalize -> {
                        if (isEndingSession) {
                            uploadAndFinishSession()
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopAndUploadRecording() {
        showSessionLoading(true)
        val overlaySubtitle = binding.root.findViewById<android.widget.TextView>(R.id.tv_loading_subtitle)
        overlaySubtitle?.text = "Finalizing video session..."
        isEndingSession = true

        if (activeRecording != null) {
            activeRecording?.stop()
            activeRecording = null
        } else {
            uploadAndFinishSession()
        }
    }

    private fun uploadAndFinishSession() {
        val file = localVideoFile
        if (file != null && file.exists() && file.length() > 0) {
            requireActivity().runOnUiThread {
                val overlaySubtitle = binding.root.findViewById<android.widget.TextView>(R.id.tv_loading_subtitle)
                overlaySubtitle?.text = "Uploading practice recording..."
                
                viewModel.uploadRecording(file) { success ->
                    viewModel.endSession()
                }
            }
        } else {
            viewModel.endSession()
        }
    }

    private fun startMicAnimation() {
        stopMicAnimation()
        val scaleX = android.animation.ObjectAnimator.ofFloat(binding.btnHoldSpeak, "scaleX", 1f, 1.15f, 1f)
        val scaleY = android.animation.ObjectAnimator.ofFloat(binding.btnHoldSpeak, "scaleY", 1f, 1.15f, 1f)
        scaleX.repeatCount = android.animation.ValueAnimator.INFINITE
        scaleY.repeatCount = android.animation.ValueAnimator.INFINITE
        
        micAnimator = android.animation.AnimatorSet().apply {
            playTogether(scaleX, scaleY)
            duration = 1200
            interpolator = android.view.animation.AccelerateDecelerateInterpolator()
            start()
        }
    }

    private fun stopMicAnimation() {
        micAnimator?.cancel()
        micAnimator = null
        binding.btnHoldSpeak.scaleX = 1f
        binding.btnHoldSpeak.scaleY = 1f
    }

    private fun setupSpeechRecognizer(useGoogle: Boolean = true) {
        // Use the same simple pattern that works in the text-based InterviewSessionFragment
        if (SpeechRecognizer.isRecognitionAvailable(requireContext())) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(requireContext()).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        baseText = binding.etAnswer.text?.toString() ?: ""
                        binding.btnHoldSpeak.setCardBackgroundColor(ContextCompat.getColorStateList(requireContext(), R.color.score_high))
                        startMicAnimation()
                        isListeningSpeech = true
                        if (isFirstSpeechStart) {
                            Toast.makeText(requireContext(), "Listening... Speak now!", Toast.LENGTH_SHORT).show()
                            isFirstSpeechStart = false
                        }
                    }
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {}
                    override fun onError(error: Int) {
                        val errorMsg = when (error) {
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

                        // If the user wants speech recognition active and it's just a timeout/no-speech, auto-restart to keep it on
                        if (isListeningSpeech && (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT || error == SpeechRecognizer.ERROR_NETWORK_TIMEOUT)) {
                            // Restart speech recognition automatically without resetting UI
                            try {
                                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                                }
                                speechRecognizer?.startListening(intent)
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        } else {
                            // Permanent error or user stopped
                            binding.btnHoldSpeak.setCardBackgroundColor(ContextCompat.getColorStateList(requireContext(), R.color.primary))
                            stopMicAnimation()
                            isListeningSpeech = false
                            if (error != SpeechRecognizer.ERROR_NO_MATCH && error != SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                                Toast.makeText(requireContext(), "$errorMsg. Please try again.", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                    override fun onResults(results: Bundle?) {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val spokenText = matches[0]
                            if (baseText.isEmpty()) {
                                binding.etAnswer.setText(spokenText)
                            } else {
                                binding.etAnswer.setText("$baseText $spokenText")
                            }
                            binding.etAnswer.setSelection(binding.etAnswer.text?.length ?: 0)
                        }
                        binding.cardTextInput.visibility = View.VISIBLE
                        
                        // If user wants speech active, auto-restart to keep it on
                        if (isListeningSpeech) {
                            try {
                                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                                }
                                speechRecognizer?.startListening(intent)
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        } else {
                            binding.btnHoldSpeak.setCardBackgroundColor(ContextCompat.getColorStateList(requireContext(), R.color.primary))
                            stopMicAnimation()
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
                            binding.etAnswer.setSelection(binding.etAnswer.text?.length ?: 0)
                        }
                        binding.cardTextInput.visibility = View.VISIBLE
                    }
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }
        }

        binding.btnHoldSpeak.setOnClickListener {
            if (isTextMode) return@setOnClickListener

            if (ContextCompat.checkSelfPermission(requireContext(), android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(requireContext(), "Microphone permission is required to speak.", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            if (isListeningSpeech) {
                isListeningSpeech = false
                binding.btnHoldSpeak.setCardBackgroundColor(ContextCompat.getColorStateList(requireContext(), R.color.primary))
                stopMicAnimation()
                stopSpeechRecognition()
                Toast.makeText(requireContext(), "Stopped listening", Toast.LENGTH_SHORT).show()
            } else {
                binding.cardTextInput.visibility = View.VISIBLE
                isFirstSpeechStart = true
                startSpeechRecognition()

                // Expand Question sheet on mic click
                questionBehavior.state = BottomSheetBehavior.STATE_EXPANDED
                telemetryBehavior.state = BottomSheetBehavior.STATE_HIDDEN
                coachBehavior.state = BottomSheetBehavior.STATE_HIDDEN
            }
        }
    }

    private fun startSpeechRecognition() {
        isListeningSpeech = true
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
        speechRecognizer?.startListening(intent) ?: run {
            isListeningSpeech = false
            Toast.makeText(requireContext(), "Speech recognition not available on this device.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun stopSpeechRecognition() {
        isListeningSpeech = false
        speechRecognizer?.stopListening()
    }


    private fun setupClickListeners() {
        binding.btnEndSession.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("End Practice Interview")
                .setMessage("Are you sure you want to end your interview recording and calculate your performance score?")
                .setPositiveButton("End & Analyze") { _, _ ->
                    stopAndUploadRecording()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        binding.btnDismissCoach.setOnClickListener {
            coachBehavior.state = BottomSheetBehavior.STATE_HIDDEN
        }

        binding.btnDrawerQuestion.setOnClickListener {
            toggleBottomSheet(questionBehavior)
        }

        binding.btnDrawerTelemetry.setOnClickListener {
            toggleBottomSheet(telemetryBehavior)
        }

        binding.btnDrawerCoach.setOnClickListener {
            toggleBottomSheet(coachBehavior)
        }

        binding.btnCloseCoachSheet.setOnClickListener {
            coachBehavior.state = BottomSheetBehavior.STATE_HIDDEN
        }

        binding.btnMinimizeQuestion.setOnClickListener {
            questionBehavior.state = BottomSheetBehavior.STATE_HIDDEN
        }

        binding.layoutDrawerHeader.setOnClickListener {
            toggleBottomSheet(telemetryBehavior)
        }

        binding.btnCloseDrawer.setOnClickListener {
            telemetryBehavior.state = BottomSheetBehavior.STATE_HIDDEN
        }

        binding.btnHint.setOnClickListener {
            viewModel.requestHint()
        }

        binding.btnCloseHint.setOnClickListener {
            binding.cardHint.visibility = View.GONE
        }

        binding.btnTypeToggle.setOnClickListener {
            isTextMode = !isTextMode
            if (isTextMode) {
                binding.btnTypeToggle.text = "Voice Response"
                binding.btnTypeToggle.setIconResource(R.drawable.ic_mic)
                binding.cardTextInput.visibility = View.VISIBLE
                binding.btnHoldSpeak.visibility = View.GONE
            } else {
                binding.btnTypeToggle.text = "Type Answer"
                binding.btnTypeToggle.setIconResource(R.drawable.ic_settings)
                binding.cardTextInput.visibility = if (isListeningSpeech || binding.etAnswer.text?.isNotEmpty() == true) View.VISIBLE else View.GONE
                binding.btnHoldSpeak.visibility = View.VISIBLE
            }
        }

        binding.btnSubmitText.setOnClickListener {
            val text = binding.etAnswer.text?.toString()?.trim() ?: ""
            if (text.isNotEmpty()) {
                viewModel.submitVoiceAnswer(text)
                binding.etAnswer.text?.clear()
                if (!isTextMode) {
                    binding.cardTextInput.visibility = View.GONE
                }
                Toast.makeText(requireContext(), "Answer submitted. Evaluating...", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(requireContext(), "Please type an answer first.", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnNextQuestion.setOnClickListener {
            binding.cardEvaluationOverlay.visibility = View.GONE
            viewModel.requestNextQuestion()
        }
    }

    private fun toggleBottomSheet(behavior: BottomSheetBehavior<View>) {
        if (behavior.state == BottomSheetBehavior.STATE_EXPANDED) {
            behavior.state = BottomSheetBehavior.STATE_HIDDEN
        } else {
            if (behavior != questionBehavior) questionBehavior.state = BottomSheetBehavior.STATE_HIDDEN
            if (behavior != telemetryBehavior) telemetryBehavior.state = BottomSheetBehavior.STATE_HIDDEN
            if (behavior != coachBehavior) coachBehavior.state = BottomSheetBehavior.STATE_HIDDEN
            behavior.state = BottomSheetBehavior.STATE_EXPANDED
        }
    }

    private fun observeViewModel() {
        viewModel.questionText.collectLatestLifecycleFlow { text ->
            binding.tvQuestionText.text = text
            binding.cardHint.visibility = View.GONE
            binding.cardEvaluationOverlay.visibility = View.GONE
            
            // Auto-maximize question overlay card for new questions
            isQuestionMinimized = false
            binding.layoutQuestionContent.visibility = View.VISIBLE
            binding.btnMinimizeQuestion.setImageResource(R.drawable.ic_minus)
        }
        
        viewLifecycleOwner.lifecycleScope.launch {
            kotlinx.coroutines.flow.combine(viewModel.questionIndex, viewModel.totalQuestions) { index, total ->
                index to total
            }.collectLatest { (index, total) ->
                binding.tvQuestionIndex.text = "Question $index of $total"
                binding.questionProgressBar.max = total
                binding.questionProgressBar.progress = index
            }
        }

        viewModel.postureScore.collectLatestLifecycleFlow { score ->
            // Update live progress in drawer or background logic
        }

        viewModel.eyeScore.collectLatestLifecycleFlow { score ->
            // Move gaze pointer target randomly based on deviation
            val deviation = (100f - score) / 100f
            if (deviation > 0.08f) {
                val maxDrift = 50f * deviation
                val angle = (Math.random() * 2 * Math.PI).toFloat()
                binding.ivGazeDot.animate()
                    .translationX((maxDrift * Math.cos(angle.toDouble())).toFloat())
                    .translationY((maxDrift * Math.sin(angle.toDouble())).toFloat())
                    .setDuration(200)
                    .start()
            } else {
                binding.ivGazeDot.animate()
                    .translationX(0f)
                    .translationY(0f)
                    .setDuration(200)
                    .start()
            }
        }

        viewModel.emotionLabel.collectLatestLifecycleFlow { emotion ->
            binding.tvDrawerEmotion.text = "$emotion Expression"
            val descriptors = when (emotion.lowercase()) {
                "confident", "happy" -> "Focused · Positive · Alert"
                "nervous", "fear" -> "Anxious · High Blinking · Slouched"
                "sad" -> "Low Energy · Distracted"
                "angry" -> "Tense · Intense Gaze"
                else -> "Calm · Attentive · Engaged"
            }
            binding.tvDrawerEmotionSubtitle.text = descriptors

            val iconRes = when (emotion.lowercase()) {
                "confident", "happy" -> R.drawable.ic_star
                "nervous", "fear" -> R.drawable.ic_error
                else -> R.drawable.ic_sparkles
            }
            binding.ivDrawerEmotionIcon.setImageResource(iconRes)

            val colorRes = when (emotion.lowercase()) {
                "confident", "happy" -> R.color.score_high
                "nervous", "fear" -> R.color.score_low
                else -> R.color.primary
            }
            binding.cardDrawerEmotion.strokeColor = ContextCompat.getColor(requireContext(), colorRes)
        }

        lifecycleScope.launch {
            viewModel.coachTip.collect { tip ->
                binding.tvCoachTip.text = tip
                binding.cardCoachTip.visibility = View.VISIBLE
                if (questionBehavior.state != BottomSheetBehavior.STATE_EXPANDED &&
                    telemetryBehavior.state != BottomSheetBehavior.STATE_EXPANDED) {
                    coachBehavior.state = BottomSheetBehavior.STATE_EXPANDED
                    questionBehavior.state = BottomSheetBehavior.STATE_HIDDEN
                    telemetryBehavior.state = BottomSheetBehavior.STATE_HIDDEN
                }
            }
        }

        lifecycleScope.launch {
            viewModel.hintText.collect { hint ->
                binding.tvHintText.text = hint
                binding.cardHint.visibility = View.VISIBLE
            }
        }

        viewModel.livePostureHistory.collectLatestLifecycleFlow { points ->
            binding.chartPosture.setChartData(points, "#6366F1")
        }

        viewModel.liveGazeHistory.collectLatestLifecycleFlow { points ->
            binding.chartGaze.setData(points)
        }

        viewModel.evaluationResult.collectLatestLifecycleFlow { result ->
            if (result != null) {
                binding.tvEvaluationTitle.text = "Evaluation: ${String.format(Locale.getDefault(), "%.1f", result.grade)} / 10"
                binding.tvEvaluationFeedback.text = result.feedback
                binding.cardEvaluationOverlay.visibility = View.VISIBLE
                
                binding.btnHoldSpeak.visibility = View.GONE
                binding.cardTextInput.visibility = View.GONE
                binding.btnTypeToggle.visibility = View.GONE
                binding.btnHint.visibility = View.GONE
            } else {
                binding.cardEvaluationOverlay.visibility = View.GONE
                binding.btnTypeToggle.visibility = View.VISIBLE
                binding.btnHint.visibility = View.VISIBLE
                
                if (isTextMode) {
                    binding.cardTextInput.visibility = View.VISIBLE
                    binding.btnHoldSpeak.visibility = View.GONE
                } else {
                    binding.cardTextInput.visibility = if (isListeningSpeech || binding.etAnswer.text?.isNotEmpty() == true) View.VISIBLE else View.GONE
                    binding.btnHoldSpeak.visibility = View.VISIBLE
                }
            }
        }

        viewModel.timerText.collectLatestLifecycleFlow { timer ->
            binding.btnEndSession.text = "End Session · $timer"
        }

        viewModel.state.collectLatestLifecycleFlow { state ->
            if (state == VideoState.RECORDING) {
                startLocalRecording()
                showSessionLoading(false)
            } else if (state == VideoState.COMPLETE) {
                showSessionLoading(true)
                val bundle = Bundle().apply {
                    putString("sessionId", sessionId)
                }
                val navOptions = androidx.navigation.NavOptions.Builder()
                    .setPopUpTo(R.id.videoSetupFragment, false)
                    .build()
                navigate(R.id.videoReportFragment, bundle, navOptions)
            } else if (state == VideoState.ANALYZING) {
                showSessionLoading(true)
            } else {
                showSessionLoading(false)
            }
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            if (viewModel.state.value != VideoState.ANALYZING && viewModel.state.value != VideoState.COMPLETE) {
                showSessionLoading(loading)
            } else if (loading) {
                showSessionLoading(true)
            }
        }
    }

    override fun onDestroyView() {
        stopMicAnimation()
        super.onDestroyView()
        activeRecording?.stop()
        activeRecording = null
        cameraProvider?.unbindAll()
        cameraExecutor?.shutdown()
        speechRecognizer?.destroy()
    }
}
