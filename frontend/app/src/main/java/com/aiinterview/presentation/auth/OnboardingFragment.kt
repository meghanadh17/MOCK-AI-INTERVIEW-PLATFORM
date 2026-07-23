package com.aiinterview.presentation.auth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.fragment.app.viewModels
import androidx.navigation.navOptions
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.tabs.TabLayoutMediator
import dagger.hilt.android.AndroidEntryPoint
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentOnboardingBinding

@AndroidEntryPoint
class OnboardingFragment : BaseFragment<FragmentOnboardingBinding>() {

    private val viewModel: AuthViewModel by viewModels()

    private val pages = listOf(
        OnboardingPage(
            title = "AI Mock Interviews",
            description = "Practice with realistic AI-driven text & video interviews built for tech candidates.",
            illustrationResId = R.drawable.ic_interview
        ),
        OnboardingPage(
            title = "Real-Time Feedback",
            description = "Get live posture, gaze, speech pacing and emotion feedback as you practice.",
            illustrationResId = R.drawable.ic_video
        ),
        OnboardingPage(
            title = "Adaptive Quizzes",
            description = "Enhance your software engineering skills with customized quizzes and real-time rank tracking.",
            illustrationResId = R.drawable.ic_quiz
        )
    )

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentOnboardingBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupViewPager()
        setupButtons()
        observeNavigation()
    }

    private fun setupViewPager() {
        binding.viewPager.adapter = OnboardingAdapter(pages)
        
        TabLayoutMediator(binding.tabLayout, binding.viewPager) { _, _ -> 
            // Dots are configured through selector drawables in layout
        }.attach()

        binding.viewPager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                if (position == pages.lastIndex) {
                    binding.btnNext.text = "GET STARTED"
                } else {
                    binding.btnNext.text = "NEXT"
                }
            }
        })
    }

    private fun setupButtons() {
        binding.btnNext.setOnClickListener {
            val current = binding.viewPager.currentItem
            if (current == pages.lastIndex) {
                viewModel.setOnboardingComplete()
            } else {
                binding.viewPager.currentItem = current + 1
            }
        }

        binding.btnSkip.setOnClickListener {
            viewModel.setOnboardingComplete()
        }
    }

    private fun observeNavigation() {
        viewModel.navigationState.collectLifecycleFlow { state ->
            if (state is AuthNavigationState.Login) {
                val navOptions = navOptions {
                    popUpTo(R.id.onboardingFragment) { inclusive = true }
                }
                navigate(R.id.loginFragment, null, navOptions)
            }
        }
    }

    private data class OnboardingPage(
        val title: String,
        val description: String,
        val illustrationResId: Int
    )

    private class OnboardingAdapter(
        private val pages: List<OnboardingPage>
    ) : RecyclerView.Adapter<OnboardingAdapter.PageViewHolder>() {

        class PageViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val ivIllustration: ImageView = view.findViewById(R.id.iv_illustration)
            val tvTitle: TextView = view.findViewById(R.id.tv_title)
            val tvDescription: TextView = view.findViewById(R.id.tv_description)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PageViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_onboarding_page, parent, false)
            return PageViewHolder(view)
        }

        override fun onBindViewHolder(holder: PageViewHolder, position: Int) {
            val page = pages[position]
            holder.ivIllustration.setImageResource(page.illustrationResId)
            holder.tvTitle.text = page.title
            holder.tvDescription.text = page.description
        }

        override fun getItemCount() = pages.size
    }
}
