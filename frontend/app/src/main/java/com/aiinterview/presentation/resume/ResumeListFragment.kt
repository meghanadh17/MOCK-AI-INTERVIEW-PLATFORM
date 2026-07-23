package com.aiinterview.presentation.resume

import android.content.Context
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.DialogFilterResumesBinding
import com.aiinterview.databinding.FragmentResumeListBinding
import com.aiinterview.domain.model.Resume
import com.aiinterview.presentation.resume.adapter.ResumeListAdapter
import com.google.android.material.bottomsheet.BottomSheetDialog
import dagger.hilt.android.AndroidEntryPoint

enum class SortOption {
    NEWEST, OLDEST, HIGHEST_ATS_SCORE
}

@AndroidEntryPoint
class ResumeListFragment : BaseFragment<FragmentResumeListBinding>() {

    private val viewModel: ResumeViewModel by viewModels()
    private lateinit var adapter: ResumeListAdapter

    private var rawResumeList: List<Resume> = emptyList()
    private var searchQuery: String = ""
    private var selectedSort: SortOption = SortOption.NEWEST
    private var isPrimaryOnly: Boolean = false

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentResumeListBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupRecyclerView()
        setupActions()
        observeViewModel()
        viewModel.loadResumeList()
    }

    private fun setupRecyclerView() {
        adapter = ResumeListAdapter(
            onClick = { resume ->
                val bundle = Bundle().apply {
                    putString("resumeId", resume.id)
                }
                navigate(R.id.resumeDetailFragment, bundle)
            },
            onMenuClick = { view, resume ->
                showPopupMenu(view, resume)
            }
        )
        binding.rvResumes.apply {
            layoutManager = LinearLayoutManager(context)
            this.adapter = this@ResumeListFragment.adapter
        }
    }

    private fun showPopupMenu(anchorView: View, resume: Resume) {
        val context = context ?: return
        val popupBinding = com.aiinterview.databinding.LayoutResumePopMenuBinding.inflate(LayoutInflater.from(context))
        
        val popupWindow = android.widget.PopupWindow(
            popupBinding.root,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            true
        ).apply {
            setBackgroundDrawable(android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT))
            elevation = 16f
        }

        popupBinding.btnDelete.setOnClickListener {
            showDeleteConfirmationDialog(resume)
            popupWindow.dismiss()
        }

        val density = context.resources.displayMetrics.density
        val popupWidth = (160 * density).toInt()
        val xOffset = -(popupWidth - anchorView.width + (8 * density).toInt())
        val yOffset = (4 * density).toInt()
        popupWindow.showAsDropDown(anchorView, xOffset, yOffset)
    }

    private fun showDeleteConfirmationDialog(resume: Resume) {
        val context = context ?: return
        com.google.android.material.dialog.MaterialAlertDialogBuilder(context)
            .setTitle("Delete Resume")
            .setMessage("Are you sure you want to delete \"${resume.filename}\"?")
            .setPositiveButton("Delete") { dialog, _ ->
                viewModel.deleteResume(resume.id)
                dialog.dismiss()
            }
            .setNegativeButton("Cancel") { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    private fun setupActions() {
        binding.fabUpload.setOnClickListener {
            navigate(R.id.resumeUploadFragment)
        }
        binding.btnUploadEmpty.setOnClickListener {
            navigate(R.id.resumeUploadFragment)
        }

        // Search Button Action
        binding.btnSearch.setOnClickListener {
            if (binding.layoutSearchBar.visibility == View.GONE) {
                binding.layoutSearchBar.visibility = View.VISIBLE
                binding.etSearch.requestFocus()
                val imm = requireContext().getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
                imm.showSoftInput(binding.etSearch, InputMethodManager.SHOW_IMPLICIT)
            } else {
                binding.layoutSearchBar.visibility = View.GONE
                binding.etSearch.text?.clear()
                searchQuery = ""
                updateListDisplay()
                val imm = requireContext().getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
                imm.hideSoftInputFromWindow(binding.etSearch.windowToken, 0)
            }
        }

        // Clear Search Action
        binding.btnClearSearch.setOnClickListener {
            binding.etSearch.text?.clear()
            searchQuery = ""
            updateListDisplay()
        }

        // Search Edit Text Input Action
        binding.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                searchQuery = s?.toString()?.trim() ?: ""
                binding.btnClearSearch.visibility = if (searchQuery.isNotEmpty()) View.VISIBLE else View.GONE
                updateListDisplay()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        // Filter Button Action
        binding.btnFilter.setOnClickListener {
            showFilterBottomSheet()
        }
    }

    private fun showFilterBottomSheet() {
        val context = context ?: return
        val dialog = BottomSheetDialog(context)
        val dialogBinding = DialogFilterResumesBinding.inflate(layoutInflater)
        dialog.setContentView(dialogBinding.root)

        // Set active option state on UI
        when (selectedSort) {
            SortOption.NEWEST -> dialogBinding.rgSort.check(R.id.rb_newest)
            SortOption.OLDEST -> dialogBinding.rgSort.check(R.id.rb_oldest)
            SortOption.HIGHEST_ATS_SCORE -> dialogBinding.rgSort.check(R.id.rb_ats_score)
        }
        dialogBinding.cbPrimaryOnly.isChecked = isPrimaryOnly

        // Apply action
        dialogBinding.btnApply.setOnClickListener {
            selectedSort = when (dialogBinding.rgSort.checkedRadioButtonId) {
                R.id.rb_newest -> SortOption.NEWEST
                R.id.rb_oldest -> SortOption.OLDEST
                R.id.rb_ats_score -> SortOption.HIGHEST_ATS_SCORE
                else -> SortOption.NEWEST
            }
            isPrimaryOnly = dialogBinding.cbPrimaryOnly.isChecked
            updateListDisplay()
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun observeViewModel() {
        viewModel.resumeList.collectLatestLifecycleFlow { list ->
            rawResumeList = list
            updateListDisplay()
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }
    }

    private fun updateListDisplay() {
        var filteredList = rawResumeList

        // 1. Filter by Search Query
        if (searchQuery.isNotEmpty()) {
            filteredList = filteredList.filter {
                it.filename.contains(searchQuery, ignoreCase = true)
            }
        }

        // 2. Filter by Primary only
        if (isPrimaryOnly) {
            filteredList = filteredList.filter { it.isPrimary }
        }

        // 3. Apply Sorting
        filteredList = when (selectedSort) {
            SortOption.NEWEST -> filteredList.sortedByDescending { it.createdAt }
            SortOption.OLDEST -> filteredList.sortedBy { it.createdAt }
            SortOption.HIGHEST_ATS_SCORE -> filteredList.sortedByDescending { it.atsScore ?: 0 }
        }

        // 4. Submit List
        if (filteredList.isEmpty()) {
            binding.layoutEmptyState.visibility = View.VISIBLE
            binding.rvResumes.visibility = View.GONE
        } else {
            binding.layoutEmptyState.visibility = View.GONE
            binding.rvResumes.visibility = View.VISIBLE
            adapter.submitList(filteredList)
        }
    }
}
