package com.aiinterview.presentation.auth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import dagger.hilt.android.AndroidEntryPoint
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentForgotPasswordBinding

@AndroidEntryPoint
class ForgotPasswordFragment : BaseFragment<FragmentForgotPasswordBinding>() {

    private val viewModel: AuthViewModel by viewModels()

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentForgotPasswordBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        // Set underlined back button text
        binding.btnBack.text = android.text.Html.fromHtml(
            "Back to <u>Login</u>",
            android.text.Html.FROM_HTML_MODE_LEGACY
        )
        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        binding.btnSend.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()

            if (email.isEmpty()) {
                binding.tilEmail.error = "Email is required"
                return@setOnClickListener
            } else {
                binding.tilEmail.error = null
            }

            viewModel.forgotPassword(email)
        }

        binding.btnBack.setOnClickListener {
            navigateUp()
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
            if (state is AuthNavigationState.OtpVerification) {
                showSuccess("Password reset code sent to your email.")
                val bundle = Bundle().apply {
                    putString("email", state.email)
                    putString("mode", state.mode.name)
                }
                navigate(R.id.otpVerificationFragment, bundle)
            }
        }
    }
}
