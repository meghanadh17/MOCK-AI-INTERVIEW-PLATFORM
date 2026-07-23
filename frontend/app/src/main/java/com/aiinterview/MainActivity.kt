package com.aiinterview

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.animation.OvershootInterpolator
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import dagger.hilt.android.AndroidEntryPoint
import com.aiinterview.core.base.BaseActivity
import com.aiinterview.databinding.ActivityMainBinding

@AndroidEntryPoint
class MainActivity : BaseActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        binding.bottomNav.setupWithNavController(navController)

        var isMainDestination = false
        var isKeyboardOpen = false

        fun updateBottomNavVisibility() {
            if (isMainDestination && !isKeyboardOpen) {
                binding.bottomNavContainer.visibility = View.VISIBLE
                navController.currentDestination?.id?.let { animateIndicator(it) }
            } else {
                binding.bottomNavContainer.visibility = View.GONE
            }
        }

        // Show bottom navigation ONLY on main dashboard/tab screens
        navController.addOnDestinationChangedListener { _, destination, _ ->
            isMainDestination = when (destination.id) {
                R.id.homeFragment,
                R.id.interviewSetupFragment,
                R.id.quizHomeFragment,
                R.id.jobsFragment,
                R.id.profileFragment -> true
                else -> false
            }
            updateBottomNavVisibility()
        }

        // Hide bottom navigation when keyboard is open
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { v, insets ->
            val imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())
            val imeHeight = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
            val keyboardVisible = imeVisible || imeHeight > 0
            if (keyboardVisible != isKeyboardOpen) {
                isKeyboardOpen = keyboardVisible
                updateBottomNavVisibility()
            }
            ViewCompat.onApplyWindowInsets(v, insets)
        }
    }

    private fun animateIndicator(destinationId: Int) {
        val index = when (destinationId) {
            R.id.homeFragment -> 0
            R.id.interviewSetupFragment -> 1
            R.id.quizHomeFragment -> 2
            R.id.jobsFragment -> 3
            R.id.profileFragment -> 4
            else -> -1
        }

        if (index == -1) {
            binding.navActiveIndicator.visibility = View.INVISIBLE
            return
        }

        binding.bottomNav.post {
            val menuView = binding.bottomNav.getChildAt(0) as? ViewGroup ?: return@post
            if (index < menuView.childCount) {
                val itemView = menuView.getChildAt(index) ?: return@post
                itemView.post {
                    val indicator = binding.navActiveIndicator
                    val indicatorWidth = indicator.width

                    // Calculate horizontal position center aligned to itemView
                    val targetX = itemView.left + (itemView.width - indicatorWidth) / 2f

                    if (indicator.visibility != View.VISIBLE) {
                        indicator.visibility = View.VISIBLE
                        indicator.translationX = targetX
                        indicator.alpha = 0f
                        indicator.animate()
                            .alpha(1f)
                            .setDuration(200)
                            .start()
                    } else {
                        indicator.animate()
                            .translationX(targetX)
                            .setDuration(300)
                            .setInterpolator(OvershootInterpolator(0.8f))
                            .start()
                    }
                }
            }
        }
    }
}
