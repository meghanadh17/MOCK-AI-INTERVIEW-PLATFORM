package com.aiinterview.presentation.profile

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavOptions
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.BuildConfig
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentProfileBinding
import com.aiinterview.domain.model.User
import com.aiinterview.presentation.profile.adapter.Achievement
import com.aiinterview.presentation.profile.adapter.AchievementAdapter
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.CircleCrop
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import dagger.hilt.android.AndroidEntryPoint
import java.io.ByteArrayOutputStream

@AndroidEntryPoint
class ProfileFragment : BaseFragment<FragmentProfileBinding>() {

    private val viewModel: ProfileViewModel by viewModels()

    private lateinit var achievementAdapter: AchievementAdapter

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            try {
                val inputStream = requireContext().contentResolver.openInputStream(uri)
                val bytes = inputStream?.readBytes()
                if (bytes != null) {
                    val croppedBytes = cropToSquare(bytes)
                    viewModel.uploadAvatar(croppedBytes, "avatar_${System.currentTimeMillis()}.jpg")
                }
            } catch (e: Exception) {
                showError("Failed to process image: ${e.message}")
            }
        }
    }

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentProfileBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupRecyclerView()
        setupClickListeners()
        observeViewModel()
    }

    private fun setupRecyclerView() {
        achievementAdapter = AchievementAdapter { achievement ->
            Toast.makeText(context, "${achievement.title}: ${achievement.description}", Toast.LENGTH_SHORT).show()
        }

        binding.rvAchievements.apply {
            layoutManager = LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false)
            adapter = achievementAdapter
        }
    }

    private fun setupClickListeners() {
        binding.ivAvatar.setOnClickListener {
            pickImageLauncher.launch("image/*")
        }

        binding.btnSettings.setOnClickListener {
            navigate(R.id.settingsFragment)
        }

        binding.btnLogout.setOnClickListener {
            showLogoutConfirmation()
        }
    }

    private fun observeViewModel() {
        viewModel.userProfile.collectLatestLifecycleFlow { user ->
            if (user != null) {
                bindUserProfile(user)
                loadLocalAchievements(user)
            }
        }

        viewModel.logoutSuccess.collectLatestLifecycleFlow {
            navigate(
                R.id.loginFragment,
                null,
                NavOptions.Builder().setPopUpTo(R.id.nav_graph, true).build()
            )
        }

        viewModel.isLoading.collectLatestLifecycleFlow { loading ->
            showLoading(loading)
        }

        viewModel.error.collectLatestLifecycleFlow { errorMsg ->
            showError(errorMsg)
        }
    }

    private fun bindUserProfile(user: User) {
        binding.tvName.text = user.fullName ?: "Candidate"
        binding.tvEmail.text = user.email

        // Member since formatting
        val dateString = user.createdAt
        val formattedDate = try {
            // Expected format: YYYY-MM-DD...
            val dateOnly = dateString.substringBefore("T")
            val parts = dateOnly.split("-")
            if (parts.size == 3) {
                val year = parts[0]
                val monthInt = parts[1].toIntOrNull() ?: 1
                val months = arrayOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
                val month = months.getOrElse(monthInt - 1) { "Jan" }
                "$month $year"
            } else {
                dateOnly
            }
        } catch (e: Exception) {
            "Joined"
        }
        binding.tvMemberSince.text = "Member since $formattedDate"

        // Load Avatar with Glide using circleCrop
        val avatarUrl = user.avatarUrl
        if (!avatarUrl.isNullOrEmpty()) {
            val baseUrl = BuildConfig.API_BASE_URL.substringBefore("/api/v1/")
            val fullUrl = if (avatarUrl.startsWith("http")) avatarUrl else "$baseUrl$avatarUrl"
            Glide.with(this)
                .load(fullUrl)
                .transform(CircleCrop())
                .placeholder(R.drawable.ic_profile)
                .error(R.drawable.ic_profile)
                .into(binding.ivAvatar)
        } else {
            binding.ivAvatar.setImageResource(R.drawable.ic_profile)
        }

        // Bind stats counts
        val stats = user.stats
        binding.tvStatInterviews.text = (stats?.interviewsTaken ?: 0).toString()
        binding.tvStatStreak.text = (stats?.activeStreak ?: 0).toString()
        binding.tvStatQuizzes.text = (stats?.quizzesTaken ?: 0).toString()
    }

    private fun loadLocalAchievements(user: User) {
        val list = mutableListOf<Achievement>()
        val stats = user.stats
        val totalSessions = stats?.interviewsTaken ?: 0

        list.add(
            Achievement(
                id = "mock_beginner",
                title = "Mock Beginner",
                description = "Completed your first mock interview session.",
                iconRes = R.drawable.ic_star,
                unlockedAt = if (totalSessions >= 1) "UNLOCKED" else null
            )
        )
        list.add(
            Achievement(
                id = "mock_master",
                title = "Mock Master",
                description = "Completed 10 or more mock interview sessions.",
                iconRes = R.drawable.ic_trophy,
                unlockedAt = if (totalSessions >= 10) "UNLOCKED" else null
            )
        )
        list.add(
            Achievement(
                id = "streak_starter",
                title = "Streak Starter",
                description = "Maintained an active streak of 3 or more days.",
                iconRes = R.drawable.ic_timer,
                unlockedAt = if ((stats?.activeStreak ?: 0) >= 3) "UNLOCKED" else null
            )
        )
        list.add(
            Achievement(
                id = "ats_champion",
                title = "ATS Champion",
                description = "Achieved an average evaluation score of 80% or more.",
                iconRes = R.drawable.ic_medal,
                unlockedAt = if ((stats?.avgScore ?: 0f) >= 80f) "UNLOCKED" else null
            )
        )

        achievementAdapter.submitList(list)
    }

    private fun cropToSquare(bytes: ByteArray): ByteArray {
        return try {
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return bytes
            val width = bitmap.width
            val height = bitmap.height
            val size = minOf(width, height)
            val x = (width - size) / 2
            val y = (height - size) / 2
            val croppedBitmap = Bitmap.createBitmap(bitmap, x, y, size, size)
            val outputStream = ByteArrayOutputStream()
            croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
            outputStream.toByteArray()
        } catch (e: Exception) {
            bytes
        }
    }

    private fun showLogoutConfirmation() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Logout")
            .setMessage("Are you sure you want to log out from your account?")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Logout") { _, _ ->
                viewModel.logout()
            }
            .show()
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadProfile()
    }
}
