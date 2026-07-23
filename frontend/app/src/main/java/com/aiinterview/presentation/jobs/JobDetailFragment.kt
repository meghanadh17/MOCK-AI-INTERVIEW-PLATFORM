package com.aiinterview.presentation.jobs

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.fragment.app.viewModels
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentJobDetailBinding
import com.aiinterview.presentation.jobs.adapter.SkillChipItem
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class JobDetailFragment : BaseFragment<FragmentJobDetailBinding>() {

    private val viewModel: JobsViewModel by viewModels()

    private var jobId: String? = null
    private var isJdExpanded = false

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentJobDetailBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        jobId = arguments?.getString("jobId") ?: return
        val resumeId = arguments?.getString("resumeId") ?: viewModel.selectedResumeId.value

        setupClickListeners()
        observeViewModel()

        // Fetch data
        viewModel.loadJobDetail(jobId!!)
        if (resumeId != null) {
            viewModel.loadMatchScore(resumeId, jobId!!)
        }
    }

    private fun setupClickListeners() {
        binding.btnBack.setOnClickListener {
            navigateUp()
        }

        binding.btnReadMore.setOnClickListener {
            isJdExpanded = !isJdExpanded
            if (isJdExpanded) {
                binding.tvJobDescription.maxLines = Int.MAX_VALUE
                binding.btnReadMore.text = "Read less"
            } else {
                binding.tvJobDescription.maxLines = 5
                binding.btnReadMore.text = "Read more"
            }
        }

        binding.btnDetailSave.setOnClickListener {
            // Pulse Scale Animation
            binding.btnDetailSave.animate()
                .scaleX(1.3f)
                .scaleY(1.3f)
                .setDuration(120)
                .withEndAction {
                    binding.btnDetailSave.animate()
                        .scaleX(1.0f)
                        .scaleY(1.0f)
                        .setDuration(120)
                        .start()
                }
                .start()

            jobId?.let { id ->
                viewModel.toggleSaveJob(id)
            }
        }

        binding.btnApplyNow.setOnClickListener {
            showSuccess("Redirecting to job application portal...")
        }
    }

    private fun observeViewModel() {
        // Observe Job Details
        viewModel.jobDetail.collectLatestLifecycleFlow { job ->
            if (job != null) {
                binding.tvTitle.text = job.title
                binding.tvDetailRole.text = job.title
                binding.tvDetailCompany.text = job.company
                binding.tvDetailLocation.text = job.location ?: "Remote"
                binding.tvDetailSalary.text = job.salaryRange ?: "Competitive Salary"
                binding.tvJobDescription.text = job.description

                if (job.isSaved) {
                    binding.btnDetailSave.setImageResource(R.drawable.ic_heart_filled)
                    binding.btnDetailSave.imageTintList = ColorStateList.valueOf(
                        ContextCompat.getColor(requireContext(), R.color.destructive)
                    )
                } else {
                    binding.btnDetailSave.setImageResource(R.drawable.ic_heart)
                    binding.btnDetailSave.imageTintList = ColorStateList.valueOf(
                        ContextCompat.getColor(requireContext(), R.color.text_muted)
                    )
                }
            }
        }

        // Observe Match Score and Skills alignment
        viewModel.matchScore.collectLatestLifecycleFlow { scoreMatch ->
            if (scoreMatch != null) {
                binding.cardMatchGauge.visibility = View.VISIBLE
                binding.matchGaugeView.setMatchScore(scoreMatch.matchScore)

                val matchedList = prepareSkillChips(scoreMatch.skillsOverlap, isMatched = true)
                populateSkills(binding.cgMatchedSkills, matchedList)
                binding.layoutMatchedSkills.visibility = if (matchedList.isNotEmpty()) View.VISIBLE else View.GONE

                val missingList = prepareSkillChips(scoreMatch.missingSkills, isMatched = false)
                populateSkills(binding.cgMissingSkills, missingList)
                binding.layoutMissingSkills.visibility = if (missingList.isNotEmpty()) View.VISIBLE else View.GONE
            } else {
                binding.cardMatchGauge.visibility = View.GONE
                binding.layoutMatchedSkills.visibility = View.GONE
                binding.layoutMissingSkills.visibility = View.GONE
            }
        }

        // Loading and error states
        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLatestLifecycleFlow { errorMsg ->
            showError(errorMsg)
        }
    }

    private fun populateSkills(chipGroup: com.google.android.material.chip.ChipGroup, items: List<SkillChipItem>) {
        chipGroup.removeAllViews()
        val density = resources.displayMetrics.density
        for (item in items) {
            val itemBinding = com.aiinterview.databinding.ItemSkillChipBinding.inflate(layoutInflater, chipGroup, false)
            if (item.isOverflow) {
                itemBinding.tvSkillName.text = "+${item.overflowCount} MORE"
                itemBinding.root.setCardBackgroundColor(Color.parseColor("#18181B"))
                itemBinding.root.strokeColor = Color.parseColor("#27272A")
                itemBinding.tvSkillName.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_muted))
                itemBinding.tvSkillName.setCompoundDrawables(null, null, null, null)
            } else {
                itemBinding.tvSkillName.text = item.name
                val (colors, res) = if (item.isMatched) {
                    val bg = ContextCompat.getColor(requireContext(), R.color.score_high_bg)
                    val stroke = ContextCompat.getColor(requireContext(), R.color.score_high)
                    val text = ContextCompat.getColor(requireContext(), R.color.score_high)
                    val icon = R.drawable.ic_check
                    Pair(bg, stroke) to Pair(text, icon)
                } else {
                    val bg = ContextCompat.getColor(requireContext(), R.color.score_low_bg)
                    val stroke = ContextCompat.getColor(requireContext(), R.color.score_low)
                    val text = ContextCompat.getColor(requireContext(), R.color.score_low)
                    val icon = R.drawable.ic_close
                    Pair(bg, stroke) to Pair(text, icon)
                }

                itemBinding.root.setCardBackgroundColor(colors.first)
                itemBinding.root.strokeColor = colors.second
                itemBinding.tvSkillName.setTextColor(res.first)

                val drawable = ContextCompat.getDrawable(requireContext(), res.second)?.mutate()
                drawable?.setTint(res.first)
                val iconSize = (12 * density).toInt()
                drawable?.setBounds(0, 0, iconSize, iconSize)
                itemBinding.tvSkillName.setCompoundDrawables(drawable, null, null, null)
                itemBinding.tvSkillName.compoundDrawablePadding = (4 * density).toInt()
            }
            chipGroup.addView(itemBinding.root)
        }
    }

    private fun prepareSkillChips(skills: List<String>, isMatched: Boolean): List<SkillChipItem> {
        if (skills.isEmpty()) return emptyList()
        return if (skills.size > 8) {
            val visible = skills.take(7).map { SkillChipItem(it, isMatched) }
            visible + SkillChipItem("", isMatched, isOverflow = true, overflowCount = skills.size - 7)
        } else {
            skills.map { SkillChipItem(it, isMatched) }
        }
    }
}
