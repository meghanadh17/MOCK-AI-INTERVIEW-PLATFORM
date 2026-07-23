package com.aiinterview.presentation.quiz

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentQuizHomeBinding
import com.aiinterview.domain.model.Quiz
import com.aiinterview.domain.model.QuizTopic
import com.aiinterview.domain.model.UserAttempt
import androidx.fragment.app.activityViewModels
import com.aiinterview.presentation.quiz.QuizNavigationEvent
import com.aiinterview.presentation.quiz.adapter.QuizListAdapter
import com.aiinterview.presentation.quiz.adapter.QuizAttemptAdapter
import com.google.android.material.chip.Chip
import com.google.android.material.tabs.TabLayout
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class QuizHomeFragment : BaseFragment<FragmentQuizHomeBinding>() {

    private val viewModel: QuizViewModel by activityViewModels()
    private lateinit var quizAdapter: QuizListAdapter
    private lateinit var attemptAdapter: QuizAttemptAdapter
    private var allQuizzes: List<Quiz> = emptyList()

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentQuizHomeBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupTabs()
        setupCustomSelectors()
        setupRecyclerViews()
        setupActions()
        observeViewModel()

        viewModel.loadQuizHome()
    }

    private fun setupTabs() {
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Browse"))
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("AI Generator"))
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("History"))

        binding.tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                when (tab?.position) {
                    0 -> {
                        binding.layoutTabBrowse.visibility = View.VISIBLE
                        binding.layoutTabGenerator.visibility = View.GONE
                        binding.layoutTabHistory.visibility = View.GONE
                    }
                    1 -> {
                        binding.layoutTabBrowse.visibility = View.GONE
                        binding.layoutTabGenerator.visibility = View.VISIBLE
                        binding.layoutTabHistory.visibility = View.GONE
                    }
                    2 -> {
                        binding.layoutTabBrowse.visibility = View.GONE
                        binding.layoutTabGenerator.visibility = View.GONE
                        binding.layoutTabHistory.visibility = View.VISIBLE
                    }
                }
            }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })
    }

    private fun setupCustomSelectors() {
        binding.selectDifficultyContainer.setOnClickListener {
            val diffItems = listOf("easy", "medium", "hard", "expert")
            val currentVal = binding.tvSelectedDifficulty.text.toString()
            val options = diffItems.map { diff ->
                com.aiinterview.presentation.common.SelectorOption(
                    id = diff,
                    text = diff,
                    isSelected = (diff == currentVal)
                )
            }
            com.aiinterview.presentation.common.SearchableSelectorDialog.show(
                context = requireContext(),
                title = "Select Difficulty",
                options = options
            ) { option ->
                binding.tvSelectedDifficulty.text = option.text
            }
        }

        binding.selectCountContainer.setOnClickListener {
            val countItems = listOf("5 Questions", "10 Questions", "15 Questions", "20 Questions")
            val currentVal = binding.tvSelectedCount.text.toString()
            val options = countItems.map { count ->
                com.aiinterview.presentation.common.SelectorOption(
                    id = count,
                    text = count,
                    isSelected = (count == currentVal)
                )
            }
            com.aiinterview.presentation.common.SearchableSelectorDialog.show(
                context = requireContext(),
                title = "Questions Count",
                options = options
            ) { option ->
                binding.tvSelectedCount.text = option.text
            }
        }
    }

    private fun setupRecyclerViews() {
        // Browse adapter
        quizAdapter = QuizListAdapter { quiz ->
            val bundle = Bundle().apply {
                putString("quizId", quiz.id)
            }
            navigate(R.id.quizDetailFragment, bundle)
        }
        binding.rvQuizzes.apply {
            layoutManager = androidx.recyclerview.widget.LinearLayoutManager(context)
            adapter = quizAdapter
        }

        // History adapter
        attemptAdapter = QuizAttemptAdapter(
            onClick = { attempt ->
                val bundle = Bundle().apply {
                    putString("quizId", attempt.quizId)
                    putString("attemptId", attempt.attemptId)
                }
                navigate(R.id.quizResultFragment, bundle)
            },
            onDeleteClick = { attempt ->
                viewModel.deleteAttempt(attempt.attemptId)
            }
        )
        binding.rvHistory.apply {
            layoutManager = androidx.recyclerview.widget.LinearLayoutManager(context)
            adapter = attemptAdapter
        }

    }

    private fun setupActions() {
        binding.btnViewLeaderboard.setOnClickListener {
            navigate(R.id.leaderboardFragment)
        }

        binding.btnGenerateSubmit.setOnClickListener {
            val topic = binding.etGenTopic.text.toString().trim()
            val diff = binding.tvSelectedDifficulty.text.toString()
            val countStr = binding.tvSelectedCount.text.toString().substringBefore(" ")
            val count = countStr.toIntOrNull() ?: 10

            if (topic.isEmpty()) {
                showError("Please enter a quiz topic")
                return@setOnClickListener
            }
            viewModel.generateQuiz(topic, diff, count)
        }

        binding.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterQuizzes()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        binding.chipGroupDifficulty.setOnCheckedChangeListener { _, _ ->
            filterQuizzes()
        }
    }

    private fun observeViewModel() {
        viewModel.quizList.collectLatestLifecycleFlow { list ->
            allQuizzes = list
            filterQuizzes()
        }

        viewModel.userStats.collectLatestLifecycleFlow { stats ->
            if (stats != null) {
                binding.tvStatAvg.text = "${stats.avgScore.toInt()}%"
                val practiceHours = stats.totalTimeS / 3600
                val practiceMinutes = (stats.totalTimeS % 3600) / 60
                binding.tvStatTime.text = if (practiceHours > 0) "${practiceHours}h ${practiceMinutes}m" else "${practiceMinutes}m"
                binding.tvStatStreak.text = "${stats.streak} days"
            }
        }

        viewModel.myRank.collectLatestLifecycleFlow { rankInfo ->
            if (rankInfo != null) {
                val rank = rankInfo.globalBoard.rank
                binding.tvStatRank.text = if (rank != null) "#$rank" else "Unranked"
            }
        }

        viewModel.quizTopics.collectLatestLifecycleFlow { topics ->
            populatePopularTopics(topics)
        }

        viewModel.myAttempts.collectLatestLifecycleFlow { attempts ->
            attemptAdapter.submitList(attempts)
            if (attempts.isEmpty()) {
                binding.tvEmptyHistory.visibility = View.VISIBLE
                binding.rvHistory.visibility = View.GONE
            } else {
                binding.tvEmptyHistory.visibility = View.GONE
                binding.rvHistory.visibility = View.VISIBLE
            }
        }

        viewModel.navigationEvent.collectLatestLifecycleFlow { event ->
            if (event is QuizNavigationEvent.StartQuizAttempt) {
                val bundle = Bundle().apply {
                    putString("quizId", event.quizId)
                    putString("attemptId", event.attemptId)
                }
                navigate(R.id.quizAttemptFragment, bundle)
            }
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLifecycleFlow { msg ->
            showError(msg)
        }
    }

    private fun filterQuizzes() {
        val query = binding.etSearch.text.toString().trim()
        val checkedChipId = binding.chipGroupDifficulty.checkedChipId
        val difficultyFilter = when (checkedChipId) {
            R.id.chip_easy -> "easy"
            R.id.chip_medium -> "medium"
            R.id.chip_hard -> "hard"
            else -> "all"
        }

        val filtered = allQuizzes.filter { quiz ->
            val matchesSearch = quiz.topic.contains(query, ignoreCase = true) || quiz.title.contains(query, ignoreCase = true)
            val matchesDifficulty = difficultyFilter == "all" || quiz.difficulty.lowercase() == difficultyFilter
            matchesSearch && matchesDifficulty
        }
        quizAdapter.submitList(filtered)
    }

    private fun populatePopularTopics(topics: List<QuizTopic>) {
        binding.chipGroupPopular.removeAllViews()
        topics.take(8).forEach { quizTopic ->
            val chip = Chip(requireContext()).apply {
                text = "${quizTopic.topic} (${quizTopic.quizCount})"
                isClickable = true
                isCheckable = false
                setTextColor(resources.getColor(R.color.text_prim, null))
                setChipBackgroundColorResource(R.color.bg_surface)
                setChipStrokeColorResource(R.color.border_subtle)
                chipStrokeWidth = 1f
                setTextAppearance(R.style.TextAppearance_App_Label)
                setOnClickListener {
                    binding.etGenTopic.setText(quizTopic.topic)
                    binding.etGenTopic.requestFocus()
                }
            }
            binding.chipGroupPopular.addView(chip)
        }
    }
}
