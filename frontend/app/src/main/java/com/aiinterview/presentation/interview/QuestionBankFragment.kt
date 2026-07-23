package com.aiinterview.presentation.interview

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentQuestionBankBinding
import com.aiinterview.presentation.interview.adapter.QuestionBankAdapter
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class QuestionBankFragment : BaseFragment<FragmentQuestionBankBinding>() {

    private val viewModel: InterviewViewModel by viewModels()
    private lateinit var bankAdapter: QuestionBankAdapter

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentQuestionBankBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupRecyclerView()
        setupActions()
        observeViewModel()

        viewModel.loadQuestionBank()
    }

    private fun setupRecyclerView() {
        bankAdapter = QuestionBankAdapter { question ->
            showInfo("Question category: ${question.category}")
        }
        binding.rvQuestions.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = bankAdapter
        }
    }

    private fun setupActions() {
        binding.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterQuestions()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        binding.chipGroupFilters.setOnCheckedStateChangeListener { _, _ ->
            filterQuestions()
        }

        binding.fabGenerate.setOnClickListener {
            showSuccess("Requesting new custom AI question generation...")
            viewModel.loadQuestionBank()
        }
    }

    private fun filterQuestions() {
        val keyword = binding.etSearch.text.toString().trim()
        val category = when (binding.chipGroupFilters.checkedChipId) {
            R.id.filter_technical -> "Technical"
            R.id.filter_behavioral -> "Behavioral"
            else -> "All Categories"
        }
        viewModel.loadQuestionBank(
            keyword = if (keyword.isNotEmpty()) keyword else null,
            category = category
        )
    }

    private fun observeViewModel() {
        viewModel.questionBank.collectLatestLifecycleFlow { list ->
            bankAdapter.submitList(list)
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }
    }
}
