package com.aiinterview.presentation.auth

import android.os.Bundle
import android.os.CountDownTimer
import android.text.Editable
import android.text.TextWatcher
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import androidx.fragment.app.viewModels
import androidx.navigation.navOptions
import dagger.hilt.android.AndroidEntryPoint
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentOtpVerificationBinding

@AndroidEntryPoint
class OtpVerificationFragment : BaseFragment<FragmentOtpVerificationBinding>() {

    private val viewModel: AuthViewModel by viewModels()

    private var email: String = ""
    private var modeString: String = ""
    private lateinit var mode: OtpMode
    private var countDownTimer: CountDownTimer? = null
    private lateinit var otpEdits: List<EditText>

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentOtpVerificationBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        email = arguments?.getString("email") ?: ""
        modeString = arguments?.getString("mode") ?: OtpMode.EmailVerification.name
        mode = OtpMode.valueOf(modeString)

        otpEdits = listOf(
            binding.etOtp1, binding.etOtp2, binding.etOtp3,
            binding.etOtp4, binding.etOtp5, binding.etOtp6
        )

        setupUI()
        setupOtpInputs()
        setupListeners()
        observeViewModel()
        startTimer()
    }

    private fun setupUI() {
        if (mode == OtpMode.PasswordReset) {
            binding.llResetFields.visibility = View.VISIBLE
            binding.tvSubtitle.text = "Enter the 6-digit reset code and choose a new password."
        } else {
            binding.llResetFields.visibility = View.GONE
            binding.tvSubtitle.text = "We have sent a 6-digit verification code to $email."
        }
    }

    private fun setupOtpInputs() {
        for (i in otpEdits.indices) {
            otpEdits[i].addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                    if (s?.length == 1 && i < otpEdits.lastIndex) {
                        otpEdits[i + 1].requestFocus()
                    }
                }
                override fun afterTextChanged(s: Editable?) {}
            })

            otpEdits[i].setOnKeyListener { _, keyCode, event ->
                if (event.action == KeyEvent.ACTION_DOWN &&
                    keyCode == KeyEvent.KEYCODE_DEL &&
                    otpEdits[i].text.isEmpty() && i > 0
                ) {
                    otpEdits[i - 1].requestFocus()
                    otpEdits[i - 1].setText("")
                    true
                } else {
                    false
                }
            }
        }
    }

    private fun setupListeners() {
        binding.btnVerify.setOnClickListener {
            val otp = otpEdits.joinToString("") { it.text.toString().trim() }
            if (otp.length < 6) {
                showError("Please enter the full 6-digit OTP code")
                return@setOnClickListener
            }

            var newPassword: String? = null
            if (mode == OtpMode.PasswordReset) {
                val pass = binding.etNewPassword.text.toString()
                val confirm = binding.etConfirmPassword.text.toString()

                if (pass.length < 6) {
                    binding.tilNewPassword.error = "Password must be at least 6 characters"
                    return@setOnClickListener
                } else {
                    binding.tilNewPassword.error = null
                }

                if (pass != confirm) {
                    binding.tilConfirmPassword.error = "Passwords do not match"
                    return@setOnClickListener
                } else {
                    binding.tilConfirmPassword.error = null
                }
                newPassword = pass
            }

            viewModel.verifyOtp(email, otp, mode, newPassword)
        }

        binding.btnResend.setOnClickListener {
            viewModel.resendVerification(email)
            showSuccess("A new code has been sent to your email.")
            startTimer()
        }
    }

    private fun startTimer() {
        binding.btnResend.visibility = View.GONE
        binding.tvTimer.visibility = View.VISIBLE

        countDownTimer?.cancel()
        countDownTimer = object : CountDownTimer(60000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                binding.tvTimer.text = "Resend code in ${millisUntilFinished / 1000}s"
            }
            override fun onFinish() {
                binding.tvTimer.visibility = View.GONE
                binding.btnResend.visibility = View.VISIBLE
            }
        }.start()
    }

    private fun observeViewModel() {
        viewModel.isLoading.collectLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLifecycleFlow { message ->
            showError(message)
        }

        viewModel.navigationState.collectLifecycleFlow { state ->
            val navOptions = navOptions {
                popUpTo(R.id.otpVerificationFragment) { inclusive = true }
            }
            when (state) {
                is AuthNavigationState.Main -> {
                    showSuccess("Email verified successfully!")
                    navigate(R.id.homeFragment, null, navOptions)
                }
                is AuthNavigationState.Login -> {
                    showSuccess("Password reset successful!")
                    navigate(R.id.loginFragment, null, navOptions)
                }
                else -> { /* no-op */ }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        countDownTimer?.cancel()
    }
}
