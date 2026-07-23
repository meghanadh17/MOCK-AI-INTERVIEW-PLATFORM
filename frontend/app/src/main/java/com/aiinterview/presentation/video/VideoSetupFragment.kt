package com.aiinterview.presentation.video

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentVideoSetupBinding
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Random

@AndroidEntryPoint
class VideoSetupFragment : BaseFragment<FragmentVideoSetupBinding>() {

    private val viewModel: VideoViewModel by viewModels()
    private var questionCount = 5
    private var cameraProvider: ProcessCameraProvider? = null
    private var micSimJob: Job? = null
    private var selectedResumeId: String? = null
    private var selectedRoleName: String = ""
    private var selectedFocusType: String = "technical"
    private lateinit var historyAdapter: com.aiinterview.presentation.video.adapter.VideoSessionHistoryAdapter


    private val requestPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[Manifest.permission.CAMERA] ?: false
        val audioGranted = permissions[Manifest.permission.RECORD_AUDIO] ?: false
        if (cameraGranted && audioGranted) {
            updatePermissionUi(true)
            startCameraPreview()
            startMicLevelSimulation()
        } else {
            updatePermissionUi(false)
            showError("Camera and Audio permissions are required for Video Interview.")
        }
    }

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentVideoSetupBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupHistoryRecyclerView()
        setupClickListeners()
        setupDifficultySlider()
        observeViewModel()
        checkPermissions()
        viewModel.loadResumes()
        viewModel.loadVideoSessions()
    }

    private fun setupHistoryRecyclerView() {
        historyAdapter = com.aiinterview.presentation.video.adapter.VideoSessionHistoryAdapter(
            onClick = { session ->
                val bundle = Bundle().apply {
                    putString("sessionId", session.id)
                }
                navigate(R.id.videoReportFragment, bundle)
            },
            onDeleteClick = { session ->
                viewModel.deleteVideoSession(session.id)
            }
        )
        binding.rvSessionHistory.apply {
            layoutManager = androidx.recyclerview.widget.LinearLayoutManager(requireContext())
            adapter = historyAdapter
        }
    }


    private fun checkPermissions() {
        val hasCamera = ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        val hasAudio = ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        if (hasCamera && hasAudio) {
            updatePermissionUi(true)
            startCameraPreview()
            startMicLevelSimulation()
        } else {
            updatePermissionUi(false)
        }
    }

    private fun updatePermissionUi(granted: Boolean) {
        if (granted) {
            binding.layoutPermissionPrompt.visibility = View.GONE
            binding.cameraSetupPreview.visibility = View.VISIBLE
        } else {
            binding.layoutPermissionPrompt.visibility = View.VISIBLE
            binding.cameraSetupPreview.visibility = View.GONE
        }
    }

    private fun startCameraPreview() {
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
            it.surfaceProvider = binding.cameraSetupPreview.surfaceProvider
        }

        val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

        try {
            provider.bindToLifecycle(viewLifecycleOwner, cameraSelector, preview)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startMicLevelSimulation() {
        micSimJob?.cancel()
        val random = Random()
        micSimJob = viewLifecycleOwner.lifecycleScope.launch {
            while (true) {
                // Generate natural mic volume waves between 10 and 65
                val currentVol = 15 + random.nextInt(40)
                binding.progressMicLevel.progress = currentVol
                delay(120)
            }
        }
    }

    private fun setupClickListeners() {
        binding.btnBack.setOnClickListener {
            navigateUp()
        }

        binding.btnGrantPermission.setOnClickListener {
            requestPermissionsLauncher.launch(
                arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
            )
        }

        binding.btnQuestionDec.setOnClickListener {
            if (questionCount > 3) {
                questionCount--
                binding.tvQuestionCount.text = questionCount.toString()
            }
        }

        binding.btnQuestionInc.setOnClickListener {
            if (questionCount < 10) {
                questionCount++
                binding.tvQuestionCount.text = questionCount.toString()
            }
        }

        binding.selectResumeContainer.setOnClickListener {
            val resumesList = viewModel.resumes.value
            val options = mutableListOf<com.aiinterview.presentation.common.SelectorOption>()
            options.add(
                com.aiinterview.presentation.common.SelectorOption(
                    id = "none",
                    text = "-- No Resume Context (General Questions) --",
                    isSelected = (selectedResumeId == null)
                )
            )
            options.addAll(resumesList.map { resume ->
                com.aiinterview.presentation.common.SelectorOption(
                    id = resume.id,
                    text = resume.filename,
                    isSelected = (resume.id == selectedResumeId)
                )
            })

            com.aiinterview.presentation.common.SearchableSelectorDialog.show(
                context = requireContext(),
                title = "Select Resume",
                options = options
            ) { option ->
                if (option.id == "none") {
                    selectedResumeId = null
                    binding.tvSelectedResume.text = option.text
                } else {
                    selectedResumeId = option.id
                    binding.tvSelectedResume.text = option.text
                }
            }
        }

        binding.selectRoleContainer.setOnClickListener {
            val suggestedRoles = listOf(
                "Android Developer",
                "iOS Developer",
                "Frontend Engineer",
                "Backend Engineer",
                "Full Stack Developer",
                "Product Manager",
                "Data Scientist",
                "DevOps Engineer",
                "System Architect",
                "QA Engineer"
            )
            val options = suggestedRoles.map { role ->
                com.aiinterview.presentation.common.SelectorOption(
                    id = role,
                    text = role,
                    isSelected = (role == selectedRoleName)
                )
            }

            com.aiinterview.presentation.common.SearchableSelectorDialog.show(
                context = requireContext(),
                title = "Select Target Role",
                options = options,
                enableCustomInput = true
            ) { option ->
                selectedRoleName = option.text
                binding.tvSelectedRole.text = option.text
            }
        }

        binding.selectFocusContainer.setOnClickListener {
            val focuses = listOf(
                Pair("technical", "Technical Focus"),
                Pair("behavioral", "Behavioral Focus"),
                Pair("hr", "HR Focus"),
                Pair("system_design", "System Design Focus")
            )
            val options = focuses.map { focus ->
                com.aiinterview.presentation.common.SelectorOption(
                    id = focus.first,
                    text = focus.second,
                    isSelected = (focus.first == selectedFocusType)
                )
            }

            com.aiinterview.presentation.common.SearchableSelectorDialog.show(
                context = requireContext(),
                title = "Select Evaluation Focus",
                options = options
            ) { option ->
                selectedFocusType = option.id
                binding.tvSelectedFocus.text = option.text
            }
        }

        binding.btnBeginInterview.setOnClickListener {
            val resumeId = selectedResumeId
            val role = selectedRoleName.trim()
            val type = selectedFocusType
            val jobDesc = binding.etJobDescription.text?.toString()?.trim()
            
            // Map 0-3 slider to difficulty Float (e.g. 0.25, 0.5, 0.75, 1.0)
            val difficultyVal = when (binding.sliderDifficulty.value.toInt()) {
                0 -> 0.25f
                1 -> 0.5f
                2 -> 0.75f
                else -> 1.0f
            }

            if (role.isEmpty()) {
                showError("Please select or enter your target role.")
                return@setOnClickListener
            }

            viewModel.createVideoSession(resumeId, role, type, difficultyVal, questionCount, jobDesc)
        }
    }

    private fun setupDifficultySlider() {
        binding.sliderDifficulty.addOnChangeListener { _, value, _ ->
            binding.tvDifficultyLabel.text = when (value.toInt()) {
                0 -> "Junior"
                1 -> "Intermediate"
                2 -> "Senior"
                else -> "Expert"
            }
        }
    }



    private fun observeViewModel() {
        viewModel.activeSession.collectLatestLifecycleFlow { session ->
            if (session != null) {
                val bundle = Bundle().apply {
                    putString("sessionId", session.id)
                }
                navigate(R.id.videoInterviewFragment, bundle)
                viewModel.resetSessionState()
            }
        }

        viewModel.videoSessions.collectLatestLifecycleFlow { sessions ->
            if (sessions.isEmpty()) {
                binding.tvHistoryEmpty.visibility = View.VISIBLE
                binding.rvSessionHistory.visibility = View.GONE
            } else {
                binding.tvHistoryEmpty.visibility = View.GONE
                binding.rvSessionHistory.visibility = View.VISIBLE
                historyAdapter.submitList(sessions)
            }
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        micSimJob?.cancel()
        cameraProvider?.unbindAll()
    }
}
