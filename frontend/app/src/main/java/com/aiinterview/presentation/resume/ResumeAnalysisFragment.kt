package com.aiinterview.presentation.resume

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.viewModels
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.DialogAiEnhanceBinding
import com.aiinterview.databinding.FragmentResumeAnalysisBinding
import com.aiinterview.databinding.ItemSectionExpandableBinding
import com.aiinterview.domain.model.EnhanceResponse
import dagger.hilt.android.AndroidEntryPoint
import com.aiinterview.core.extensions.parseMarkdownHtml
import com.aiinterview.R

@AndroidEntryPoint
class ResumeAnalysisFragment : BaseFragment<FragmentResumeAnalysisBinding>() {

    private val viewModel: ResumeViewModel by viewModels()
    private var resumeId: String = ""

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentResumeAnalysisBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        resumeId = arguments?.getString("resumeId") ?: ""

        setupActions()
        observeViewModel()
        startShimmerAnimation()

        if (resumeId.isNotEmpty()) {
            viewModel.loadAnalysis(resumeId)
        }
    }

    private fun setupActions() {
        binding.btnBack.setOnClickListener {
            navigateUp()
        }
    }

    private fun startShimmerAnimation() {
        val animation = AlphaAnimation(0.3f, 1.0f).apply {
            duration = 800
            repeatMode = Animation.REVERSE
            repeatCount = Animation.INFINITE
        }
        binding.layoutShimmer.startAnimation(animation)
    }

    private fun observeViewModel() {
        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            if (loading) {
                binding.layoutShimmer.visibility = View.VISIBLE
                binding.scrollContent.visibility = View.GONE
            } else {
                binding.layoutShimmer.clearAnimation()
                binding.layoutShimmer.visibility = View.GONE
                binding.scrollContent.visibility = View.VISIBLE
            }
        }

        viewModel.enhancingSections.collectLatestLifecycleFlow { activeSections ->
            for (i in 0 until binding.layoutSuggestions.childCount) {
                val child = binding.layoutSuggestions.getChildAt(i)
                val sectionTag = child.tag as? String ?: continue
                val btnEnhance = child.findViewById<View>(R.id.btn_ai_enhance)
                val progressEnhance = child.findViewById<View>(R.id.progress_ai_enhance)
                if (btnEnhance != null && progressEnhance != null) {
                    if (activeSections.contains(sectionTag)) {
                        btnEnhance.visibility = View.GONE
                        progressEnhance.visibility = View.VISIBLE
                    } else {
                        btnEnhance.visibility = View.VISIBLE
                        progressEnhance.visibility = View.GONE
                    }
                }
            }
        }

        viewModel.enhanceResult.collectLatestLifecycleFlow { result ->
            if (result != null) {
                showEnhanceDialog(result)
                viewModel.clearEnhanceResult()
            }
        }

        viewModel.analysisState.collectLatestLifecycleFlow { analysis ->
            if (analysis != null) {
                // Bind top metric row
                binding.tvQuantificationValue.text = "${analysis.quantificationScore}%"
                binding.tvActionVerbValue.text = "${analysis.actionVerbScore}%"
                binding.tvSeniorityValue.text = "${analysis.seniorityLevel.uppercase()}\n(${analysis.yearsOfExperience} YRS EXP)"

                // Bind red flags
                if (analysis.redFlags.isNotEmpty()) {
                    binding.cardRedFlags.visibility = View.VISIBLE
                    val redFlagsText = analysis.redFlags.joinToString("\n") { "• $it" }
                    binding.tvRedFlagsContent.text = redFlagsText.parseMarkdownHtml()
                } else {
                    binding.cardRedFlags.visibility = View.GONE
                }

                // Bind strengths and gaps
                val strengthsText = if (analysis.strengths.isNotEmpty()) {
                    analysis.strengths.joinToString("\n") { "• $it" }
                } else {
                    "No specific strengths recorded."
                }
                binding.tvStrengthsContent.text = strengthsText.parseMarkdownHtml()

                val gapsText = if (analysis.gaps.isNotEmpty()) {
                    analysis.gaps.joinToString("\n") { "• $it" }
                } else {
                    "No critical gaps found."
                }
                binding.tvGapsContent.text = gapsText.parseMarkdownHtml()

                binding.layoutSuggestions.removeAllViews()

                val inflater = LayoutInflater.from(context)
                analysis.improvementSuggestions.forEach { suggestion ->
                    val accordionBinding = ItemSectionExpandableBinding.inflate(inflater, binding.layoutSuggestions, false)
                    accordionBinding.tvSectionTitle.text = "${suggestion.section.uppercase()} SUGGESTION"
                    
                    val suggestionContent = "Current:\n${suggestion.current}\n\nSuggested:\n${suggestion.suggested}\n\nImpact: ${suggestion.impact.uppercase()}"
                    accordionBinding.tvSectionContent.text = suggestionContent.parseMarkdownHtml()
                    
                    val sectionLower = suggestion.section.lowercase().trim()
                    val isSectionEnhancing = viewModel.enhancingSections.value.contains(sectionLower)
                    accordionBinding.btnAiEnhance.visibility = if (isSectionEnhancing) View.GONE else View.VISIBLE
                    accordionBinding.progressAiEnhance.visibility = if (isSectionEnhancing) View.VISIBLE else View.GONE
                    
                    var isExpanded = false
                    accordionBinding.layoutHeader.setOnClickListener {
                        isExpanded = !isExpanded
                        if (isExpanded) {
                            accordionBinding.tvSectionContent.visibility = View.VISIBLE
                            accordionBinding.dividerLine.visibility = View.VISIBLE
                            accordionBinding.ivExpand.rotation = 90f
                        } else {
                            accordionBinding.tvSectionContent.visibility = View.GONE
                            accordionBinding.dividerLine.visibility = View.GONE
                            accordionBinding.ivExpand.rotation = 0f
                        }
                    }

                    accordionBinding.btnAiEnhance.setOnClickListener {
                        viewModel.enhanceSection(resumeId, suggestion.section)
                    }

                    accordionBinding.root.tag = sectionLower
                    binding.layoutSuggestions.addView(accordionBinding.root)
                }
            }
        }
    }

    private fun showEnhanceDialog(result: EnhanceResponse) {
        val context = context ?: return
        val dialogBinding = DialogAiEnhanceBinding.inflate(LayoutInflater.from(context))
        
        // 1. Set visibilities and texts dynamically
        if (!result.originalText.isNullOrBlank()) {
            dialogBinding.tvOriginalHeader.visibility = View.VISIBLE
            dialogBinding.cardOriginal.visibility = View.VISIBLE
            dialogBinding.tvOriginalText.text = result.originalText.parseMarkdownHtml()
        } else {
            dialogBinding.tvOriginalHeader.visibility = View.GONE
            dialogBinding.cardOriginal.visibility = View.GONE
        }

        if (!result.enhancedText.isNullOrBlank()) {
            dialogBinding.tvEnhancedHeader.visibility = View.VISIBLE
            dialogBinding.cardEnhanced.visibility = View.VISIBLE
            dialogBinding.tvEnhancedText.text = result.enhancedText.parseMarkdownHtml()
        } else {
            dialogBinding.tvEnhancedHeader.visibility = View.GONE
            dialogBinding.cardEnhanced.visibility = View.GONE
        }

        if (result.suggestions.isNotEmpty()) {
            dialogBinding.tvImpactHeader.visibility = View.VISIBLE
            dialogBinding.cardImpact.visibility = View.VISIBLE
            val suggestionsMarkdown = result.suggestions.joinToString("\n") { "• $it" }
            dialogBinding.tvImpactAnalysis.text = suggestionsMarkdown.parseMarkdownHtml()
        } else {
            dialogBinding.tvImpactHeader.visibility = View.GONE
            dialogBinding.cardImpact.visibility = View.GONE
        }

        val dialog = AlertDialog.Builder(context)
            .setView(dialogBinding.root)
            .create()

        // 2. Custom window background and width to support neomorphic curves
        dialog.window?.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT))

        dialogBinding.btnClose.setOnClickListener {
            dialog.dismiss()
        }
        dialogBinding.btnCloseIcon.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()

        val width = (context.resources.displayMetrics.widthPixels * 0.9).toInt()
        dialog.window?.setLayout(width, android.view.ViewGroup.LayoutParams.WRAP_CONTENT)
    }
}
