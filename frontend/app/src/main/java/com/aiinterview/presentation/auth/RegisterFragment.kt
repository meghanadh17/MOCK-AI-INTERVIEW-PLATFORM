package com.aiinterview.presentation.auth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import dagger.hilt.android.AndroidEntryPoint
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentRegisterBinding

@AndroidEntryPoint
class RegisterFragment : BaseFragment<FragmentRegisterBinding>() {

    private val viewModel: AuthViewModel by viewModels()

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentRegisterBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        // Set underlined login link text
        binding.tvLoginLink.text = android.text.Html.fromHtml(
            "Already have an account? <u>Login</u>",
            android.text.Html.FROM_HTML_MODE_LEGACY
        )

        setupListeners()
        observeViewModel()
    }

    private fun setupListeners() {
        binding.btnRegister.setOnClickListener {
            val name = binding.etName.text.toString().trim()
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString()
            val confirmPassword = binding.etConfirmPassword.text.toString()

            if (name.isEmpty()) {
                binding.tilName.error = "Name is required"
                return@setOnClickListener
            } else {
                binding.tilName.error = null
            }

            if (email.isEmpty()) {
                binding.tilEmail.error = "Email is required"
                return@setOnClickListener
            } else {
                binding.tilEmail.error = null
            }

            if (password.length < 6) {
                binding.tilPassword.error = "Password must be at least 6 characters"
                return@setOnClickListener
            } else {
                binding.tilPassword.error = null
            }

            if (password != confirmPassword) {
                binding.tilConfirmPassword.error = "Passwords do not match"
                return@setOnClickListener
            } else {
                binding.tilConfirmPassword.error = null
            }

            if (!binding.cbTerms.isChecked) {
                showError("Please accept the Terms & Conditions")
                return@setOnClickListener
            }

            viewModel.register(name, email, password)
        }

        binding.tvLoginLink.setOnClickListener {
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
                showSuccess("Registration successful! Verification code sent.")
                val bundle = Bundle().apply {
                    putString("email", state.email)
                    putString("mode", state.mode.name)
                }
                navigate(R.id.otpVerificationFragment, bundle)
            }
        }
    }
}
