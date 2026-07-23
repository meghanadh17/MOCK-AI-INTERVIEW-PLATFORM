package com.aiinterview.presentation.profile

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.widget.TooltipCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavOptions
import androidx.navigation.fragment.findNavController
import androidx.preference.ListPreference
import androidx.preference.Preference
import androidx.preference.PreferenceFragmentCompat
import androidx.preference.SwitchPreferenceCompat
import com.aiinterview.R
import com.aiinterview.core.result.Result
import com.aiinterview.databinding.DialogEnableMfaBinding
import com.bumptech.glide.Glide
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

@AndroidEntryPoint
class SettingsFragment : PreferenceFragmentCompat() {

    private val viewModel: ProfileViewModel by viewModels()

    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        setPreferencesFromResource(R.xml.settings_preferences, rootKey)
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val root = inflater.inflate(R.layout.fragment_settings, container, false)
        val settingsContainer = root.findViewById<ViewGroup>(R.id.content_settings)
        val prefView = super.onCreateView(inflater, settingsContainer, savedInstanceState)
        settingsContainer.addView(prefView)
        return root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        view.findViewById<View>(R.id.btn_back)?.setOnClickListener {
            findNavController().navigateUp()
        }

        // Apply M3 Void background aesthetics dynamically to preferences list
        view.setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.bg_void))
        try {
            listView?.setBackgroundColor(ContextCompat.getColor(requireContext(), R.color.bg_void))
        } catch (e: Exception) {
            e.printStackTrace()
        }

        setupThemePreference()
        setupNotificationPreferences()
        setupSecurityPreferences()
    }

    private fun setupThemePreference() {
        val themePref = findPreference<ListPreference>("theme_mode")
        themePref?.setOnPreferenceChangeListener { _, newValue ->
            val mode = newValue as String
            viewModel.updateTheme(mode)
            true
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.themeMode.collect { mode ->
                themePref?.value = mode
            }
        }
    }

    private fun setupNotificationPreferences() {
        val pushPref = findPreference<SwitchPreferenceCompat>("push_notifications")
        val emailPref = findPreference<SwitchPreferenceCompat>("email_notifications")

        val listener = Preference.OnPreferenceChangeListener { _, _ ->
            viewLifecycleOwner.lifecycleScope.launch {
                // Short delay to ensure preferences data is updated
                kotlinx.coroutines.delay(50)
                val pushEnabled = pushPref?.isChecked ?: true
                val emailEnabled = emailPref?.isChecked ?: true
                viewModel.updateNotificationPreferences(pushEnabled, emailEnabled)
            }
            true
        }

        pushPref?.onPreferenceChangeListener = listener
        emailPref?.onPreferenceChangeListener = listener

        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.userProfile.collect { user ->
                user?.preferences?.let { prefs ->
                    val push = prefs["push_enabled"] as? Boolean ?: true
                    val email = prefs["email_enabled"] as? Boolean ?: true
                    pushPref?.isChecked = push
                    emailPref?.isChecked = email
                }
            }
        }
    }

    private fun setupSecurityPreferences() {
        findPreference<Preference>("change_password")?.setOnPreferenceClickListener {
            showChangePasswordDialog()
            true
        }

        findPreference<Preference>("mfa_enable")?.setOnPreferenceClickListener {
            showMfaEnableDialog()
            true
        }

        findPreference<Preference>("delete_account")?.setOnPreferenceClickListener {
            showDeleteAccountConfirmation()
            true
        }
    }

    private fun showChangePasswordDialog() {
        val context = requireContext()
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 24, 48, 24)
        }

        val currentLayout = TextInputLayout(context, null, R.style.Widget_App_TextInput_Outlined).apply {
            hint = "Current Password"
            endIconMode = TextInputLayout.END_ICON_PASSWORD_TOGGLE
            boxStrokeColor = ContextCompat.getColor(context, R.color.border_def)
            defaultHintTextColor = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.text_muted))
        }
        val currentEditText = TextInputEditText(context).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setTextColor(ContextCompat.getColor(context, R.color.text_prim))
        }
        currentLayout.addView(currentEditText)

        val newLayout = TextInputLayout(context, null, R.style.Widget_App_TextInput_Outlined).apply {
            hint = "New Password"
            endIconMode = TextInputLayout.END_ICON_PASSWORD_TOGGLE
            boxStrokeColor = ContextCompat.getColor(context, R.color.border_def)
            defaultHintTextColor = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.text_muted))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 16
            }
        }
        val newEditText = TextInputEditText(context).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setTextColor(ContextCompat.getColor(context, R.color.text_prim))
        }
        newLayout.addView(newEditText)

        layout.addView(currentLayout)
        layout.addView(newLayout)

        MaterialAlertDialogBuilder(context)
            .setTitle("Change Password")
            .setView(layout)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Change") { _, _ ->
                val currentPass = currentEditText.text.toString().trim()
                val newPass = newEditText.text.toString().trim()

                if (currentPass.isEmpty() || newPass.isEmpty()) {
                    Toast.makeText(context, "Password fields cannot be empty", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (newPass.length < 8) {
                    Toast.makeText(context, "New password must be at least 8 characters", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                viewModel.changePassword(currentPass, newPass) { result ->
                    if (result is Result.Success) {
                        Toast.makeText(context, "Password updated successfully!", Toast.LENGTH_SHORT).show()
                    } else {
                        val errorMsg = (result as? Result.Error)?.exception?.userMessage ?: "Failed to change password"
                        Toast.makeText(context, errorMsg, Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }

    private fun showMfaEnableDialog() {
        viewModel.enableMfa { result ->
            when (result) {
                is Result.Success -> {
                    val (secret, provisioningUri) = result.data
                    val dialog = BottomSheetDialog(requireContext())
                    val dialogBinding = DialogEnableMfaBinding.inflate(layoutInflater)
                    dialog.setContentView(dialogBinding.root)

                    dialogBinding.tvSecretKey.text = secret

                    dialogBinding.btnCopySecret.setOnClickListener {
                        val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("MFA Secret Key", secret)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "Secret key copied to clipboard", Toast.LENGTH_SHORT).show()
                    }

                    // Dynamically generate QR code from provisioning Uri using api.qrserver.com loaded inside Glide
                    val qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${java.net.URLEncoder.encode(provisioningUri, "UTF-8")}"
                    Glide.with(this)
                        .load(qrUrl)
                        .placeholder(R.drawable.ic_logo)
                        .into(dialogBinding.ivQrCode)

                    dialogBinding.btnVerifyMfa.setOnClickListener {
                        val code = dialogBinding.etOtp.text.toString().trim()
                        if (code.length != 6) {
                            Toast.makeText(context, "Verification code must be 6 digits", Toast.LENGTH_SHORT).show()
                            return@setOnClickListener
                        }

                        viewModel.verifyMfa(code) { verifyResult ->
                            if (verifyResult is Result.Success) {
                                Toast.makeText(context, "Multi-Factor Authentication enabled successfully!", Toast.LENGTH_SHORT).show()
                                dialog.dismiss()
                            } else {
                                val errorMsg = (verifyResult as? Result.Error)?.exception?.userMessage ?: "Failed to verify MFA code"
                                Toast.makeText(context, errorMsg, Toast.LENGTH_SHORT).show()
                            }
                        }
                    }

                    dialog.show()
                }
                is Result.Error -> {
                    Toast.makeText(context, result.exception.userMessage, Toast.LENGTH_SHORT).show()
                }
                else -> {}
            }
        }
    }

    private fun showDeleteAccountConfirmation() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Delete Account")
            .setMessage("Are you sure you want to permanently delete your candidate profile and mock practice history? This action cannot be undone.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Delete permanently") { _, _ ->
                viewModel.deleteAccount { result ->
                    if (result is Result.Success) {
                        Toast.makeText(context, "Account permanently deleted", Toast.LENGTH_SHORT).show()
                        findNavController().navigate(
                            R.id.loginFragment,
                            null,
                            NavOptions.Builder().setPopUpTo(R.id.nav_graph, true).build()
                        )
                    } else {
                        val errorMsg = (result as? Result.Error)?.exception?.userMessage ?: "Failed to delete account"
                        Toast.makeText(context, errorMsg, Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }
}
