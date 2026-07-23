package com.aiinterview.presentation.quiz

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentLeaderboardBinding
import com.aiinterview.presentation.quiz.adapter.LeaderboardAdapter
import com.google.android.material.tabs.TabLayout
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class LeaderboardFragment : BaseFragment<FragmentLeaderboardBinding>() {

    private val viewModel: QuizViewModel by activityViewModels()
    private lateinit var leaderboardAdapter: LeaderboardAdapter
    private var quizId: String? = null

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentLeaderboardBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        quizId = arguments?.getString("quizId")

        setupTabs()
        setupRecyclerView()
        observeViewModel()

        viewModel.loadLeaderboard("Global")
        viewModel.loadMyRank()
    }

    private fun setupTabs() {
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Global"))
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Weekly"))
        if (!quizId.isNullOrEmpty()) {
            binding.tabLayout.addTab(binding.tabLayout.newTab().setText("This Quiz"))
        }

        binding.tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                val scope = tab?.text?.toString() ?: "Global"
                viewModel.loadLeaderboard(scope, quizId)
                updateOwnRankUi()
            }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })
    }

    private fun setupRecyclerView() {
        leaderboardAdapter = LeaderboardAdapter()
        binding.rvLeaderboard.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = leaderboardAdapter
        }
    }

    private fun observeViewModel() {
        viewModel.leaderboardList.collectLatestLifecycleFlow { list ->
            val top1 = list.getOrNull(0)
            val top2 = list.getOrNull(1)
            val top3 = list.getOrNull(2)

            binding.tvPodiumName1.text = top1?.name ?: "--"
            binding.tvPodiumScore1.text = top1?.let { "${it.score.toInt()}%" } ?: "--"
            binding.tvPodiumAvatar1.text = top1?.name?.take(2)?.uppercase() ?: ""

            binding.tvPodiumName2.text = top2?.name ?: "--"
            binding.tvPodiumScore2.text = top2?.let { "${it.score.toInt()}%" } ?: "--"
            binding.tvPodiumAvatar2.text = top2?.name?.take(2)?.uppercase() ?: ""

            binding.tvPodiumName3.text = top3?.name ?: "--"
            binding.tvPodiumScore3.text = top3?.let { "${it.score.toInt()}%" } ?: "--"
            binding.tvPodiumAvatar3.text = top3?.name?.take(2)?.uppercase() ?: ""

            val restList = if (list.size > 3) list.subList(3, list.size) else emptyList()
            leaderboardAdapter.submitList(restList)
        }

        viewModel.myRank.collectLatestLifecycleFlow {
            updateOwnRankUi()
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLifecycleFlow { msg ->
            showError(msg)
        }
    }

    private fun updateOwnRankUi() {
        val myRankData = viewModel.myRank.value ?: return
        val tabText = binding.tabLayout.getTabAt(binding.tabLayout.selectedTabPosition)?.text ?: "Global"
        val rankItem = if (tabText == "Weekly") myRankData.weeklyBoard else myRankData.globalBoard

        binding.tvOwnRank.text = rankItem.rank?.toString() ?: "--"
        binding.tvOwnScore.text = "${rankItem.score.toInt()}%"

        binding.tvSummaryRank.text = if (rankItem.rank != null) "#${rankItem.rank}" else "Unranked"
        binding.tvSummaryBestScore.text = "${rankItem.score.toInt()}%"
        binding.tvSummaryPercentile.text = String.format(java.util.Locale.US, "%.1f%%", rankItem.percentile)
    }
}
