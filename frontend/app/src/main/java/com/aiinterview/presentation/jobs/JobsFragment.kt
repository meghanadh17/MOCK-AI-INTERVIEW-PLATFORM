package com.aiinterview.presentation.jobs

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.paging.LoadState
import androidx.paging.PagingData
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.DialogFilterJobsBinding
import com.aiinterview.databinding.FragmentJobsBinding
import com.aiinterview.domain.model.Job
import com.aiinterview.domain.model.JobMatch
import com.aiinterview.presentation.jobs.adapter.JobListAdapter
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.tabs.TabLayout
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch

@AndroidEntryPoint
class JobsFragment : BaseFragment<FragmentJobsBinding>() {

    private val viewModel: JobsViewModel by viewModels()
    private lateinit var adapter: JobListAdapter

    private val searchQueryFlow = MutableStateFlow("")
    private var currentFilterLocation: String? = null
    private var currentFilterExperience: String? = null

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentJobsBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupTabs()
        setupRecyclerView()
        setupSearchAndFilters()
        observeViewModel()
    }

    private fun setupTabs() {
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Recommendations"))
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Search"))

        binding.tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                when (tab?.position) {
                    0 -> {
                        // Recommendations Mode
                        binding.containerResumeSelector.visibility = View.VISIBLE
                        binding.containerSearch.visibility = View.GONE
                        val currentRecs = viewModel.jobRecommendations.value.map { it.toJob() }
                        viewLifecycleOwner.lifecycleScope.launch {
                            adapter.submitData(PagingData.from(currentRecs))
                        }
                    }
                    1 -> {
                        // Search Mode
                        binding.containerResumeSelector.visibility = View.GONE
                        binding.containerSearch.visibility = View.VISIBLE
                        // Trigger a search query reset or update
                        viewModel.searchJobs(
                            query = searchQueryFlow.value.ifEmpty { null },
                            location = currentFilterLocation,
                            experienceLevel = currentFilterExperience
                        )
                    }
                }
            }

            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })
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
            }
        )

        binding.rvJobs.apply {
            layoutManager = LinearLayoutManager(context)
            this.adapter = this@JobsFragment.adapter
        }

        // Handle load states
        adapter.addLoadStateListener { loadState ->
            val isEmpty = loadState.source.refresh is LoadState.NotLoading && adapter.itemCount == 0
            val isLoading = loadState.source.refresh is LoadState.Loading

            showLoading(isLoading && binding.tabLayout.selectedTabPosition == 1)

            val errorState = loadState.source.append as? LoadState.Error
                ?: loadState.source.prepend as? LoadState.Error
                ?: loadState.source.refresh as? LoadState.Error
            errorState?.let {
                showError(it.error.message ?: "Failed to query search results")
            }
        }
    }

    private fun setupSearchAndFilters() {
        // Debounced search text observer
        binding.etSearch.addTextChangedListener { text ->
            searchQueryFlow.value = text?.toString()?.trim() ?: ""
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                @OptIn(kotlinx.coroutines.FlowPreview::class)
                searchQueryFlow
                    .debounce(500)
                    .collectLatest { query ->
                        if (binding.tabLayout.selectedTabPosition == 1) {
                            viewModel.searchJobs(
                                query = query.ifEmpty { null },
                                location = currentFilterLocation,
                                experienceLevel = currentFilterExperience
                            )
                        }
                    }
            }
        }

        // Filter action button
        binding.btnFilter.setOnClickListener {
            showFilterBottomSheet()
        }

        // Resume selector Spinner
        binding.spinnerResumes.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val list = viewModel.resumes.value
                if (position in list.indices) {
                    val targetResume = list[position]
                    if (targetResume.id != viewModel.selectedResumeId.value) {
                        viewModel.selectResume(targetResume.id)
                    }
                }
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    private fun showFilterBottomSheet() {
        val bottomSheet = BottomSheetDialog(requireContext())
        val dialogBinding = DialogFilterJobsBinding.inflate(layoutInflater)
        bottomSheet.setContentView(dialogBinding.root)

        // Populate location
        dialogBinding.etLocation.setText(currentFilterLocation)

        // Populate experience check
        when (currentFilterExperience) {
            "Junior" -> dialogBinding.chipJunior.isChecked = true
            "Mid" -> dialogBinding.chipMid.isChecked = true
            "Senior" -> dialogBinding.chipSenior.isChecked = true
            "Lead" -> dialogBinding.chipLead.isChecked = true
            else -> dialogBinding.chipAny.isChecked = true
        }

        dialogBinding.btnApply.setOnClickListener {
            currentFilterLocation = dialogBinding.etLocation.text.toString().trim().ifEmpty { null }
            currentFilterExperience = when (dialogBinding.chipGroupExperience.checkedChipId) {
                R.id.chip_junior -> "Junior"
                R.id.chip_mid -> "Mid"
                R.id.chip_senior -> "Senior"
                R.id.chip_lead -> "Lead"
                else -> null
            }

            viewModel.searchJobs(
                query = searchQueryFlow.value.ifEmpty { null },
                location = currentFilterLocation,
                experienceLevel = currentFilterExperience
            )
            bottomSheet.dismiss()
        }

        bottomSheet.show()
    }

    private fun observeViewModel() {
        // Collect Resumes
        viewModel.resumes.collectLatestLifecycleFlow { resumes ->
            val fileNames = resumes.map { it.filename }
            val spinnerAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, fileNames)
            spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            binding.spinnerResumes.adapter = spinnerAdapter

            val selectedId = viewModel.selectedResumeId.value
            val index = resumes.indexOfFirst { it.id == selectedId }
            if (index >= 0) {
                binding.spinnerResumes.setSelection(index)
            }
        }

        // Collect Recommendations
        viewModel.jobRecommendations.collectLatestLifecycleFlow { recommendations ->
            if (binding.tabLayout.selectedTabPosition == 0) {
                val jobs = recommendations.map { it.toJob() }
                adapter.submitData(PagingData.from(jobs))
            }
        }

        // Collect Search Results
        viewModel.searchResults.collectLatestLifecycleFlow { pagingData ->
            if (binding.tabLayout.selectedTabPosition == 1) {
                adapter.submitData(pagingData)
            }
        }

        // Collect Global Loader & Error States
        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            // Only show full loading overlay for recommendations loading
            if (binding.tabLayout.selectedTabPosition == 0) {
                showLoading(loading)
            }
        }

        viewModel.error.collectLatestLifecycleFlow { errorMessage ->
            showError(errorMessage)
        }
    }

    private fun JobMatch.toJob(): Job = Job(
        id = id,
        title = title,
        company = company,
        description = "",
        requirements = null,
        salaryRange = salaryRange,
        location = location,
        skills = skillsOverlap + missingSkills,
        experienceLevel = null,
        createdAt = "",
        isSaved = isSaved,
        matchScore = matchScore
    )
}
