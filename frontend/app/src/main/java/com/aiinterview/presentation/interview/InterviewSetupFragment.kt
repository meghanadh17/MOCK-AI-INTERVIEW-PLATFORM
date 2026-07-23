package com.aiinterview.presentation.interview

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentInterviewSetupBinding
import com.aiinterview.presentation.interview.adapter.InterviewHistoryAdapter
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class InterviewSetupFragment : BaseFragment<FragmentInterviewSetupBinding>() {

    private val viewModel: InterviewViewModel by viewModels()
    private var questionCount = 5
    private lateinit var historyAdapter: InterviewHistoryAdapter
    private var selectedResumeId: String? = null
    private var selectedRoleName: String = ""

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentInterviewSetupBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        viewModel.resetSessionState()
        setupClickListeners()
        setupDifficultySlider()
        setupRecyclerView()
        observeViewModel()

        viewModel.loadResumes()
        viewModel.loadRoles()
        viewModel.loadHistory()
    }

    private fun setupClickListeners() {
        binding.btnBack.setOnClickListener {
            navigateUp()
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
            val rolesList = viewModel.roles.value
            val options = rolesList.map { role ->
                com.aiinterview.presentation.common.SelectorOption(
                    id = role.name,
                    text = role.name,
                    isSelected = (role.name == selectedRoleName)
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

        binding.btnStartSession.setOnClickListener {
            val resumeId = selectedResumeId
            val role = selectedRoleName.trim()
            val type = when (binding.chipGroupMode.checkedChipId) {
                R.id.chip_behavioral -> "behavioral"
                R.id.chip_system_design -> "system_design"
                R.id.chip_hr -> "HR"
                R.id.chip_case -> "case"
                else -> "technical"
            }

            val difficultyVal = when (binding.sliderDifficulty.value.toInt()) {
                0 -> 0.25
                1 -> 0.5
                2 -> 0.75
                else -> 1.0
            }

            val jd = binding.etJobDescription.text.toString().trim().ifEmpty { null }

            if (role.isEmpty()) {
                showError("Please select or enter your target role.")
                return@setOnClickListener
            }

            viewModel.createSession(
                resumeId = resumeId,
                role = role,
                type = type,
                difficulty = difficultyVal,
                questionCount = questionCount,
                jobDescription = jd
            )
        }
    }

    private fun setupDifficultySlider() {
        binding.sliderDifficulty.addOnChangeListener { _, value, _ ->
            binding.tvDifficultyLabel.text = when (value.toInt()) {
                0 -> "Easy"
                1 -> "Medium"
                2 -> "Hard"
                else -> "Expert"
            }
        }
    }

    private fun setupRecyclerView() {
        historyAdapter = InterviewHistoryAdapter { session ->
            val bundle = Bundle().apply {
                putString("sessionId", session.id)
            }
            if (session.status.lowercase() == "completed" || session.overallScore != null) {
                navigate(R.id.interviewReportFragment, bundle)
            } else {
                navigate(R.id.interviewSessionFragment, bundle)
            }
        }
        binding.rvPracticeHistory.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = historyAdapter
        }
    }

    private fun observeViewModel() {
        viewModel.activeSession.collectLatestLifecycleFlow { session ->
            if (session != null) {
                val bundle = Bundle().apply {
                    putString("sessionId", session.id)
                }
                navigate(R.id.interviewSessionFragment, bundle)
                viewModel.resetSessionState()
            }
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.historyList.collectLatestLifecycleFlow { list ->
            historyAdapter.submitList(list)
            if (list.isEmpty()) {
                binding.layoutEmptyHistory.visibility = View.VISIBLE
                binding.rvPracticeHistory.visibility = View.GONE
            } else {
                binding.layoutEmptyHistory.visibility = View.GONE
                binding.rvPracticeHistory.visibility = View.VISIBLE
            }
        }

        viewModel.error.collectLifecycleFlow { message ->
            showError(message)
        }
    }
}
