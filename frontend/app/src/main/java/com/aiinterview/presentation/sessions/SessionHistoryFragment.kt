package com.aiinterview.presentation.sessions

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.paging.LoadState
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.DialogFilterSessionsBinding
import com.aiinterview.databinding.FragmentSessionHistoryBinding
import com.aiinterview.domain.model.InterviewSession
import com.aiinterview.presentation.sessions.adapter.SessionHistoryAdapter
import com.google.android.material.bottomsheet.BottomSheetDialog
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

@AndroidEntryPoint
class SessionHistoryFragment : BaseFragment<FragmentSessionHistoryBinding>() {

    private val viewModel: SessionViewModel by viewModels()
    private lateinit var adapter: SessionHistoryAdapter

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentSessionHistoryBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupRecyclerView()
        setupSearchAndFilters()
        observeViewModel()
    }

    private fun setupRecyclerView() {
        adapter = SessionHistoryAdapter(
            onClick = { session ->
                if (session.type.lowercase(java.util.Locale.getDefault()) == "video") {
                    val bundle = Bundle().apply {
                        putString("sessionId", session.id)
                    }
                    navigate(R.id.videoReportFragment, bundle)
                } else {
                    navigateToDetail(session.id)
                }
            },
            onDeleteClick = { session ->
                viewModel.deleteSession(session.id) {
                    adapter.refresh()
                }
            }
        )

        binding.rvSessions.apply {
            layoutManager = LinearLayoutManager(context)
            this.adapter = this@SessionHistoryFragment.adapter
        }


        // Setup pull-to-refresh
        binding.swipeRefresh.setOnRefreshListener {
            adapter.refresh()
        }

        // Paging load state listener to handle empty states and loading indicator
        adapter.addLoadStateListener { loadState ->
            val isEmpty = loadState.source.refresh is LoadState.NotLoading &&
                    adapter.itemCount == 0
            val isLoading = loadState.source.refresh is LoadState.Loading

            binding.swipeRefresh.isRefreshing = isLoading
            binding.layoutEmptyState.visibility = if (isEmpty) android.view.View.VISIBLE else android.view.View.GONE
            binding.rvSessions.visibility = if (isEmpty) android.view.View.GONE else android.view.View.VISIBLE

            // Show error if refresh fails
            val errorState = loadState.source.append as? LoadState.Error
                ?: loadState.source.prepend as? LoadState.Error
                ?: loadState.source.refresh as? LoadState.Error
            errorState?.let {
                showError(it.error.message ?: "Failed to load history")
            }
        }

        // Swipe-to-Share helper callback
        val swipeCallback = object : ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.RIGHT or ItemTouchHelper.LEFT) {
            override fun onMove(
                recyclerView: RecyclerView,
                viewHolder: RecyclerView.ViewHolder,
                target: RecyclerView.ViewHolder
            ): Boolean = false

            override fun onSwiped(viewHolder: RecyclerView.ViewHolder, direction: Int) {
                val position = viewHolder.bindingAdapterPosition
                val session = adapter.peek(position)
                if (session != null) {
                    shareSession(session)
                }
                adapter.notifyItemChanged(position)
            }
        }
        ItemTouchHelper(swipeCallback).attachToRecyclerView(binding.rvSessions)
    }

    private fun setupSearchAndFilters() {
        // Search text listener
        binding.etSearch.addTextChangedListener { text ->
            viewModel.searchQuery.value = text?.toString() ?: ""
        }

        // Filter bottom sheet trigger
        binding.btnFilter.setOnClickListener {
            showFilterBottomSheet()
        }

        // Progress screen direct navigation shortcut
        binding.btnProgress.setOnClickListener {
            navigate(R.id.action_sessionHistoryFragment_to_progressFragment)
        }
    }

    private fun showFilterBottomSheet() {
        val context = requireContext()
        val dialog = BottomSheetDialog(context)
        val dialogBinding = DialogFilterSessionsBinding.inflate(layoutInflater)
        dialog.setContentView(dialogBinding.root)

        // Set checked button based on current state
        when (viewModel.filterType.value) {
            "Text" -> dialogBinding.rbText.isChecked = true
            "Video" -> dialogBinding.rbVideo.isChecked = true
            else -> dialogBinding.rbAll.isChecked = true
        }

        dialogBinding.btnApply.setOnClickListener {
            val selectedType = when (dialogBinding.rgType.checkedRadioButtonId) {
                R.id.rb_text -> "Text"
                R.id.rb_video -> "Video"
                else -> "All"
            }
            viewModel.filterType.value = selectedType
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun observeViewModel() {
        // Collect paging flow
        viewModel.sessionHistoryFlow.collectLatestLifecycleFlow { pagingData ->
            adapter.submitData(pagingData)
        }
    }

    private fun navigateToDetail(sessionId: String) {
        val bundle = Bundle().apply {
            putString("id", sessionId)
            putString("sessionId", sessionId)
        }
        navigate(R.id.action_sessionHistoryFragment_to_sessionDetailFragment, bundle)
    }

    private fun shareSession(session: InterviewSession) {
        viewModel.shareSession(session.id) { url ->
            val shareIntent = Intent().apply {
                action = Intent.ACTION_SEND
                type = "text/plain"
                putExtra(Intent.EXTRA_SUBJECT, "My Mock Interview Session Review")
                putExtra(Intent.EXTRA_TEXT, "Hey! Check out my evaluation report for the mock interview '${session.title}': $url")
            }
            startActivity(Intent.createChooser(shareIntent, "Share report via"))
        }
    }
}
