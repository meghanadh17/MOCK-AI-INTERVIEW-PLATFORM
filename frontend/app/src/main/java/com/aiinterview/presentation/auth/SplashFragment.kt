package com.aiinterview.presentation.auth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.navigation.navOptions
import dagger.hilt.android.AndroidEntryPoint
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentSplashBinding

@AndroidEntryPoint
class SplashFragment : BaseFragment<FragmentSplashBinding>() {

    private val viewModel: AuthViewModel by viewModels()

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentSplashBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        // Observe navigation state flow reactively
        viewModel.navigationState.collectLifecycleFlow { state ->
            val navOptions = navOptions {
                popUpTo(R.id.splashFragment) { inclusive = true }
            }
            when (state) {
                is AuthNavigationState.Onboarding -> {
                    navigate(R.id.onboardingFragment, null, navOptions)
                }
                is AuthNavigationState.Login -> {
                    navigate(R.id.loginFragment, null, navOptions)
                }
                is AuthNavigationState.Main -> {
                    navigate(R.id.homeFragment, null, navOptions)
                }
                else -> { /* no-op */ }
            }
        }

        // Start checking auth status
        viewModel.checkAuthStatus()
    }
}
