package com.aiinterview.presentation.auth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.navigation.navOptions
import dagger.hilt.android.AndroidEntryPoint
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentLoginBinding

import com.aiinterview.core.extensions.ToastType

@AndroidEntryPoint
class LoginFragment : BaseFragment<FragmentLoginBinding>() {

    private val viewModel: AuthViewModel by viewModels()

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentLoginBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        // Set underlined register link text
        binding.tvRegisterLink.text = android.text.Html.fromHtml(
            "Don't have an account? <u>Register</u>",
            android.text.Html.FROM_HTML_MODE_LEGACY
        )

        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        binding.btnLogin.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString()

            if (email.isEmpty()) {
                binding.tilEmail.error = "Email is required"
                return@setOnClickListener
            } else {
                binding.tilEmail.error = null
            }

            if (password.isEmpty()) {
                binding.tilPassword.error = "Password is required"
                return@setOnClickListener
            } else {
                binding.tilPassword.error = null
            }

            viewModel.login(email, password)
        }

        binding.tvForgot.setOnClickListener {
            navigate(R.id.forgotPasswordFragment)
        }

        binding.tvRegisterLink.setOnClickListener {
            navigate(R.id.registerFragment)
        }
    }

    private fun observeViewModel() {
        viewModel.isLoading.collectLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLifecycleFlow { message ->
            showError(message)
        }

        viewModel.navigationState.collectLifecycleFlow { state ->
            when (state) {
                is AuthNavigationState.Main -> {
                    showToast("Login successful", ToastType.LOGIN)
                    val navOptions = navOptions {
                        popUpTo(R.id.loginFragment) { inclusive = true }
                    }
                    navigate(R.id.homeFragment, null, navOptions)
                }
                is AuthNavigationState.OtpVerification -> {
                    val bundle = Bundle().apply {
                        putString("email", state.email)
                        putString("mode", state.mode.name)
                    }
                    navigate(R.id.otpVerificationFragment, bundle)
                }
                else -> { /* no-op */ }
            }
        }
    }
}
