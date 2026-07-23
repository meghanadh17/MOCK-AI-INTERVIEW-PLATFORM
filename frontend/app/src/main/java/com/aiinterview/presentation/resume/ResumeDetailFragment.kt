package com.aiinterview.presentation.resume

import android.content.res.ColorStateList
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentResumeDetailBinding
import com.aiinterview.databinding.PageResumeOverviewBinding
import com.aiinterview.databinding.PageResumeSectionsBinding
import com.aiinterview.databinding.PageResumeSkillsBinding
import com.aiinterview.domain.model.ResumeSection
import com.aiinterview.domain.model.Skill
import com.aiinterview.presentation.resume.adapter.SectionAdapter
import com.google.android.material.chip.Chip
import com.google.android.material.tabs.TabLayoutMediator
import dagger.hilt.android.AndroidEntryPoint
import com.aiinterview.core.extensions.parseMarkdownHtml
import androidx.lifecycle.findViewTreeLifecycleOwner
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@AndroidEntryPoint
class ResumeDetailFragment : BaseFragment<FragmentResumeDetailBinding>() {

    private val viewModel: ResumeViewModel by viewModels()
    private var resumeId: String = ""

    private lateinit var sectionsAdapter: SectionAdapter

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentResumeDetailBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        resumeId = arguments?.getString("resumeId") ?: ""
        
        setupActions()
        setupViewPager()
        observeViewModel()
        
        if (resumeId.isNotEmpty()) {
            viewModel.loadResumeDetail(resumeId)
            viewModel.loadAnalysis(resumeId)
        }
    }

    private fun setupActions() {
        binding.btnBack.setOnClickListener {
            navigateUp()
        }
        binding.btnMakePrimary.setOnClickListener {
            if (resumeId.isNotEmpty()) {
                viewModel.setPrimary(resumeId)
            }
        }
    }

    private fun setupViewPager() {
        binding.viewPager.adapter = ResumePageAdapter()
        TabLayoutMediator(binding.tabLayout, binding.viewPager) { tab, position ->
            tab.text = when (position) {
                0 -> "Overview"
                1 -> "Sections"
                2 -> "Skills"
                else -> "Preview"
            }
        }.attach()
    }

    private fun observeViewModel() {
        viewModel.resumeDetail.collectLatestLifecycleFlow { resume ->
            if (resume != null) {
                binding.tvFilename.text = resume.filename
                binding.tvUploadDate.text = "Uploaded: ${resume.createdAt}"
                if (resume.isPrimary) {
                    binding.tvPrimaryStatus.visibility = View.VISIBLE
                    binding.btnMakePrimary.visibility = View.GONE
                } else {
                    binding.tvPrimaryStatus.visibility = View.GONE
                    binding.btnMakePrimary.visibility = View.VISIBLE
                }
                binding.viewPager.adapter?.notifyDataSetChanged()
                
                // Force update bound view holders if they are visible
                val recyclerView = binding.viewPager.getChildAt(0) as? RecyclerView
                (recyclerView?.findViewHolderForAdapterPosition(0) as? ResumePageAdapter.OverviewViewHolder)?.bind()
                (recyclerView?.findViewHolderForAdapterPosition(1) as? ResumePageAdapter.SectionsViewHolder)?.bind()
                (recyclerView?.findViewHolderForAdapterPosition(2) as? ResumePageAdapter.SkillsViewHolder)?.bind()
            }
        }

        viewModel.atsScore.collectLatestLifecycleFlow { ats ->
            if (ats != null) {
                binding.donutAtsScore.setScore(ats.score)
                binding.viewPager.adapter?.notifyDataSetChanged()
                
                // Force update Overview tab if it is currently visible
                val recyclerView = binding.viewPager.getChildAt(0) as? RecyclerView
                (recyclerView?.findViewHolderForAdapterPosition(0) as? ResumePageAdapter.OverviewViewHolder)?.bind()
            }
        }

        viewModel.analysisState.collectLatestLifecycleFlow { analysis ->
            if (analysis != null) {
                binding.viewPager.adapter?.notifyDataSetChanged()
                
                // Force update Overview tab if it is currently visible
                val recyclerView = binding.viewPager.getChildAt(0) as? RecyclerView
                (recyclerView?.findViewHolderForAdapterPosition(0) as? ResumePageAdapter.OverviewViewHolder)?.bind()
            }
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.enhancingSections.collectLatestLifecycleFlow { activeSections ->
            if (::sectionsAdapter.isInitialized) {
                sectionsAdapter.updateEnhancingSections(activeSections)
            }
        }

        viewModel.enhanceResult.collectLatestLifecycleFlow { result ->
            if (result != null) {
                showEnhanceDialog(result)
                viewModel.clearEnhanceResult()
            }
        }
    }

    inner class ResumePageAdapter : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

        override fun getItemViewType(position: Int): Int = position

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
            val inflater = LayoutInflater.from(parent.context)
            return when (viewType) {
                0 -> OverviewViewHolder(PageResumeOverviewBinding.inflate(inflater, parent, false))
                1 -> SectionsViewHolder(PageResumeSectionsBinding.inflate(inflater, parent, false))
                2 -> SkillsViewHolder(PageResumeSkillsBinding.inflate(inflater, parent, false))
                else -> PreviewViewHolder(com.aiinterview.databinding.PageResumePreviewBinding.inflate(inflater, parent, false))
            }
        }

        override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
            when (holder) {
                is OverviewViewHolder -> holder.bind()
                is SectionsViewHolder -> holder.bind()
                is SkillsViewHolder -> holder.bind()
                is PreviewViewHolder -> holder.bind()
            }
        }

        override fun getItemCount(): Int = 4

        inner class OverviewViewHolder(val binding: PageResumeOverviewBinding) : RecyclerView.ViewHolder(binding.root) {
            fun bind() {
                binding.btnViewAnalysis.setOnClickListener {
                    val bundle = Bundle().apply {
                        putString("resumeId", resumeId)
                    }
                    navigate(R.id.resumeAnalysisFragment, bundle)
                }

                val ats = viewModel.atsScore.value
                val analysis = viewModel.analysisState.value

                if (ats != null) {
                    val formatting = analysis?.actionVerbScore ?: 80
                    val readability = analysis?.quantificationScore ?: 75
                    val sections = 90
                    val totalFound = ats.keyword_matches.size
                    val totalMissing = ats.missing_keywords.size
                    val keywordsPercent = if (totalFound + totalMissing > 0) {
                        (totalFound * 100) / (totalFound + totalMissing)
                    } else {
                        70
                    }

                    binding.progressFormatting.progress = formatting
                    binding.tvFormattingValue.text = "$formatting%"

                    binding.progressKeywords.progress = keywordsPercent
                    binding.tvKeywordsValue.text = "$keywordsPercent%"

                    binding.progressSections.progress = sections
                    binding.tvSectionsValue.text = "$sections%"

                    binding.progressReadability.progress = readability
                    binding.tvReadabilityValue.text = "$readability%"

                    binding.chipGroupKeywordsFound.removeAllViews()
                    ats.keyword_matches.forEach { kw ->
                        addChip(binding.chipGroupKeywordsFound, kw, isWarning = false)
                    }

                    binding.chipGroupKeywordsMissing.removeAllViews()
                    ats.missing_keywords.forEach { kw ->
                        addChip(binding.chipGroupKeywordsMissing, kw, isWarning = true)
                    }
                }

                if (analysis != null) {
                    binding.chipGroupJobMatches.removeAllViews()
                    analysis.suitableRoles.forEach { role ->
                        addChip(binding.chipGroupJobMatches, role, isWarning = false)
                    }

                    binding.layoutStrengthsList.removeAllViews()
                    analysis.strengths.forEach { strength ->
                        addBulletPoint(binding.layoutStrengthsList, strength, isWarning = false)
                    }

                    binding.layoutGapsList.removeAllViews()
                    analysis.gaps.forEach { gap ->
                        addBulletPoint(binding.layoutGapsList, gap, isWarning = true)
                    }
                }
            }

            private fun addChip(chipGroup: com.google.android.material.chip.ChipGroup, text: String, isWarning: Boolean) {
                val context = chipGroup.context
                val chip = com.google.android.material.chip.Chip(context).apply {
                    this.text = text
                    isCheckable = false
                    isClickable = false
                    chipStrokeWidth = 1f
                    
                    val bgTint: Int
                    val textCol: Int
                    val strokeCol: Int

                    if (isWarning) {
                        bgTint = 0x1AEF4444.toInt() // Red with alpha
                        textCol = 0xFFEF4444.toInt()
                        strokeCol = 0xFFEF4444.toInt()
                    } else {
                        bgTint = 0xFF18181B.toInt()
                        textCol = 0xFFFAFAFA.toInt()
                        strokeCol = 0xFF27272A.toInt()
                    }
                    
                    chipBackgroundColor = ColorStateList.valueOf(bgTint)
                    chipStrokeColor = ColorStateList.valueOf(strokeCol)
                    setTextColor(textCol)
                    
                    try {
                        val typeface = androidx.core.content.res.ResourcesCompat.getFont(context, R.font.ibm_plex_mono_regular)
                        setTypeface(typeface)
                    } catch (e: Throwable) {}
                }
                chipGroup.addView(chip)
            }

            private fun addBulletPoint(layout: android.widget.LinearLayout, text: String, isWarning: Boolean) {
                val context = layout.context
                val textView = android.widget.TextView(context).apply {
                    val bullet = if (isWarning) "⚠ " else "✓ "
                    val textWithBullet = "$bullet$text"
                    this.text = textWithBullet.parseMarkdownHtml()
                    val textCol = if (isWarning) 0xFFFEF3C7.toInt() else 0xFFD1FAE5.toInt()
                    setTextColor(textCol)
                    textSize = 12f
                    val padding = (4 * resources.displayMetrics.density).toInt()
                    setPadding(0, padding, 0, padding)
                    try {
                        val typeface = androidx.core.content.res.ResourcesCompat.getFont(context, R.font.ibm_plex_sans_regular)
                        setTypeface(typeface)
                    } catch (e: Throwable) {}
                }
                layout.addView(textView)
            }
        }

        inner class SectionsViewHolder(val binding: PageResumeSectionsBinding) : RecyclerView.ViewHolder(binding.root) {
            init {
                sectionsAdapter = SectionAdapter(
                    onToggle = {},
                    onEnhance = { section ->
                        viewModel.enhanceSection(resumeId, section.title)
                    }
                )
                binding.rvSections.apply {
                    layoutManager = LinearLayoutManager(context)
                    adapter = sectionsAdapter
                }
            }

            fun bind() {
                val resume = viewModel.resumeDetail.value
                val list = resume?.sections?.ifEmpty { null } ?: listOf(
                    ResumeSection("Professional Summary", "Innovative software developer with 3+ years of building Android applications, specializing in Kotlin, Jetpack Compose, and Hilt. Passionate about crafting premium UI/UX interfaces and writing scalable architecture."),
                    ResumeSection("Work Experience", "Senior Android Engineer at TechCorp (2024-Present)\n- Led refactoring of legacy app to MVVM architecture, improving crash-free rate to 99.8%\n- Optimized network payload caching with local databases resulting in 40% speed-up\n\nAndroid Engineer at AppWorks (2022-2024)\n- Developed 4 consumer-facing features in native Kotlin code\n- Integrated clean code practices and implemented push notification system"),
                    ResumeSection("Education & Credentials", "B.S. in Computer Science - Tech University (2018-2022)\nCertified Android Developer (Google Developer Association)")
                )
                sectionsAdapter.submitList(list)
            }
        }

        inner class SkillsViewHolder(val binding: PageResumeSkillsBinding) : RecyclerView.ViewHolder(binding.root) {
            fun bind() {
                binding.chipGroupSkills.removeAllViews()
                
                val resume = viewModel.resumeDetail.value
                val skills = resume?.skills?.ifEmpty { null } ?: listOf(
                    Skill("Kotlin", "expert"),
                    Skill("Android SDK", "expert"),
                    Skill("Hilt", "advanced"),
                    Skill("MVVM", "advanced"),
                    Skill("Coroutines", "advanced"),
                    Skill("Retrofit", "intermediate"),
                    Skill("Compose", "intermediate"),
                    Skill("Room DB", "beginner")
                )
                
                skills.forEach { skill ->
                    val chip = Chip(binding.root.context).apply {
                        text = "${skill.name} (${skill.level.uppercase()})"
                        isCheckable = false
                        isClickable = false
                        chipStrokeWidth = 1f
                        
                        val bgTint: Int
                        val textCol: Int
                        val strokeCol: Int

                        when (skill.level.lowercase()) {
                            "beginner" -> {
                                bgTint = 0xFF27272A.toInt() // Zinc-800
                                textCol = 0xFFD4D4D8.toInt()
                                strokeCol = 0xFF3F3F46.toInt()
                            }
                            "intermediate" -> {
                                bgTint = 0xFF1E3A8A.toInt() // Blue
                                textCol = 0xFF93C5FD.toInt()
                                strokeCol = 0xFF2563EB.toInt()
                            }
                            "advanced" -> {
                                bgTint = 0xFF312E81.toInt() // Indigo
                                textCol = 0xFFC7D2FE.toInt()
                                strokeCol = 0xFF4F46E5.toInt()
                            }
                            "expert" -> {
                                bgTint = 0xFF78350F.toInt() // Amber
                                textCol = 0xFFFDE68A.toInt()
                                strokeCol = 0xFFD97706.toInt()
                            }
                            else -> {
                                bgTint = 0xFF18181B.toInt()
                                textCol = 0xFFFFFFFF.toInt()
                                strokeCol = 0xFF27272A.toInt()
                            }
                        }
                        
                        chipBackgroundColor = ColorStateList.valueOf(bgTint)
                        chipStrokeColor = ColorStateList.valueOf(strokeCol)
                        setTextColor(textCol)
                        
                        try {
                            val typeface = androidx.core.content.res.ResourcesCompat.getFont(requireContext(), R.font.ibm_plex_mono_regular)
                            setTypeface(typeface)
                        } catch (e: Throwable) {}
                    }
                    binding.chipGroupSkills.addView(chip)
                }
            }
        }
    }

    private fun showEnhanceDialog(result: com.aiinterview.domain.model.EnhanceResponse) {
        val context = context ?: return
        val dialogBinding = com.aiinterview.databinding.DialogAiEnhanceBinding.inflate(LayoutInflater.from(context))
        
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

        val dialog = androidx.appcompat.app.AlertDialog.Builder(context)
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

    inner class PreviewViewHolder(val binding: com.aiinterview.databinding.PageResumePreviewBinding) : RecyclerView.ViewHolder(binding.root) {
        private var isLoaded = false

        fun bind() {
            if (isLoaded) return
            val resume = viewModel.resumeDetail.value ?: return
            val url = resume.fileUrl ?: return
            
            binding.progressLoading.visibility = View.VISIBLE
            binding.scrollPreview.visibility = View.GONE
            binding.layoutError.visibility = View.GONE

            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val tempFile = withContext(Dispatchers.IO) {
                        downloadFile(url)
                    }
                    if (tempFile != null && tempFile.exists()) {
                        renderPdf(tempFile)
                        isLoaded = true
                    } else {
                        showError("Could not retrieve the resume PDF from the server. Check your network connection.")
                    }
                } catch (e: Exception) {
                    showError("Failed to load PDF file: ${e.localizedMessage}")
                }
            }
        }

        private suspend fun downloadFile(urlStr: String): java.io.File? = withContext(Dispatchers.IO) {
            try {
                val client = okhttp3.OkHttpClient()
                val request = okhttp3.Request.Builder().url(urlStr).build()
                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    val body = response.body ?: return@withContext null
                    val tempFile = java.io.File(binding.root.context.cacheDir, "temp_resume_${resumeId}.pdf")
                    tempFile.writeBytes(body.bytes())
                    tempFile
                } else null
            } catch (e: Exception) {
                null
            }
        }

        private fun renderPdf(file: java.io.File) {
            try {
                binding.layoutPagesContainer.removeAllViews()
                
                val fileDescriptor = android.os.ParcelFileDescriptor.open(file, android.os.ParcelFileDescriptor.MODE_READ_ONLY)
                val pdfRenderer = android.graphics.pdf.PdfRenderer(fileDescriptor)
                val density = binding.root.resources.displayMetrics.density
                
                for (i in 0 until pdfRenderer.pageCount) {
                    val page = pdfRenderer.openPage(i)
                    
                    val screenWidth = binding.root.resources.displayMetrics.widthPixels
                    val targetWidth = (screenWidth - (32 * density)).toInt()
                    val targetHeight = (targetWidth * page.height) / page.width
                    
                    val bitmap = android.graphics.Bitmap.createBitmap(targetWidth, targetHeight, android.graphics.Bitmap.Config.ARGB_8888)
                    val canvas = android.graphics.Canvas(bitmap)
                    canvas.drawColor(android.graphics.Color.WHITE)
                    page.render(bitmap, null, null, android.graphics.pdf.PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    page.close()
                    
                    val imageView = android.widget.ImageView(binding.root.context).apply {
                        layoutParams = android.widget.LinearLayout.LayoutParams(
                            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            setMargins(0, 0, 0, (16 * density).toInt())
                        }
                        adjustViewBounds = true
                        setImageBitmap(bitmap)
                        setBackgroundResource(R.drawable.bg_dashed_upload)
                        setPadding((1 * density).toInt(), (1 * density).toInt(), (1 * density).toInt(), (1 * density).toInt())
                    }
                    binding.layoutPagesContainer.addView(imageView)
                }
                pdfRenderer.close()
                fileDescriptor.close()
                
                binding.progressLoading.visibility = View.GONE
                binding.scrollPreview.visibility = View.VISIBLE
            } catch (e: Exception) {
                showError("Failed to render PDF: ${e.localizedMessage}")
            }
        }

        private fun showError(message: String) {
            binding.progressLoading.visibility = View.GONE
            binding.scrollPreview.visibility = View.GONE
            binding.layoutError.visibility = View.VISIBLE
            binding.tvErrorDetails.text = message
        }
    }
}
