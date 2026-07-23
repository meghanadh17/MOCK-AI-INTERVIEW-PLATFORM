package com.aiinterview.presentation.jobs

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.paging.PagingData
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentSavedJobsBinding
import com.aiinterview.domain.model.Job
import com.aiinterview.presentation.jobs.adapter.JobListAdapter
import com.google.android.material.snackbar.Snackbar
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class SavedJobsFragment : BaseFragment<FragmentSavedJobsBinding>() {

    private val viewModel: JobsViewModel by viewModels()
    private lateinit var adapter: JobListAdapter
    private var sortByMatch = true

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentSavedJobsBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupRecyclerView()
        setupSort()
        observeViewModel()
    }

    private fun setupRecyclerView() {
        adapter = JobListAdapter(
            onJobClick = { job ->
                val bundle = Bundle().apply {
                    putString("jobId", job.id)
                    putString("resumeId", viewModel.selectedResumeId.value)
                }
                navigate(R.id.jobDetailFragment, bundle)
            },
            onSaveClick = { job ->
                viewModel.toggleSaveJob(job.id)
                showUndoSnackbar(job)
            }
        )

        binding.rvSavedJobs.apply {
            layoutManager = LinearLayoutManager(context)
            this.adapter = this@SavedJobsFragment.adapter
        }

        // Swipe-to-remove callback
        val swipeCallback = object : ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT or ItemTouchHelper.RIGHT) {
            override fun onMove(
                recyclerView: RecyclerView,
                viewHolder: RecyclerView.ViewHolder,
                target: RecyclerView.ViewHolder
            ): Boolean = false

            override fun onSwiped(viewHolder: RecyclerView.ViewHolder, direction: Int) {
                val position = viewHolder.bindingAdapterPosition
                val job = adapter.peek(position)
                if (job != null) {
                    viewModel.toggleSaveJob(job.id)
                    showUndoSnackbar(job)
                } else {
                    adapter.notifyItemChanged(position)
                }
            }
        }
        ItemTouchHelper(swipeCallback).attachToRecyclerView(binding.rvSavedJobs)
    }

    private fun setupSort() {
        binding.btnSort.setOnClickListener {
            sortByMatch = !sortByMatch
            val sortLabel = if (sortByMatch) "Sorted by Match Score" else "Sorted by Date Added"
            showInfo(sortLabel)
            updateList(viewModel.savedJobs.value)
        }
    }

    private fun observeViewModel() {
        viewModel.savedJobs.collectLatestLifecycleFlow { list ->
            updateList(list)
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLatestLifecycleFlow { errorMsg ->
            showError(errorMsg)
        }
    }

    private fun updateList(list: List<Job>) {
        val sortedList = if (sortByMatch) {
            list.sortedWith(compareByDescending { it.matchScore ?: 0f })
        } else {
            // Sort by createdAt / date. Fallback to ID if date is missing
            list.sortedByDescending { it.createdAt.ifEmpty { it.id } }
        }
        viewLifecycleOwner.lifecycleScope.launch {
            adapter.submitData(PagingData.from(sortedList))
        }
    }

    private fun showUndoSnackbar(job: Job) {
        Snackbar.make(binding.root, "Removed ${job.title}", Snackbar.LENGTH_LONG)
            .setAction("Undo") {
                viewModel.toggleSaveJob(job.id)
            }
            .setActionTextColor(resources.getColor(R.color.score_high, null))
            .show()
    }

    override fun onResume() {
        super.onResume()
        // Reload saved list on returning to screen
        viewModel.loadSavedJobs()
    }
}
