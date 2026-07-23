package com.aiinterview.presentation.quiz.adapter

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemAttemptCardBinding
import com.aiinterview.domain.model.UserAttempt
import java.text.SimpleDateFormat
import java.util.*

class QuizAttemptAdapter(
    private val onClick: (UserAttempt) -> Unit,
    private val onDeleteClick: (UserAttempt) -> Unit
) : ListAdapter<UserAttempt, QuizAttemptAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemAttemptCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: UserAttempt) {
            val scoreVal = item.score
            binding.tvAttemptScore.text = "${scoreVal.toInt()}% Score"

            // Colors based on score
            when {
                scoreVal >= 80.0 -> {
                    binding.tvAttemptScore.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#14352A"))
                    binding.tvAttemptScore.setTextColor(Color.parseColor("#10B981"))
                }
                scoreVal >= 50.0 -> {
                    binding.tvAttemptScore.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#1A1D36"))
                    binding.tvAttemptScore.setTextColor(Color.parseColor("#818CF8"))
                }
                else -> {
                    binding.tvAttemptScore.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#3B1414"))
                    binding.tvAttemptScore.setTextColor(Color.parseColor("#EF4444"))
                }
            }

            // Duration format
            val min = item.timeTakenS / 60
            val sec = item.timeTakenS % 60
            binding.tvAttemptTime.text = "Duration: ${min}m ${sec}s"

            binding.tvAttemptTitle.text = item.quizTitle

            // Format date
            binding.tvAttemptDate.text = formatDate(item.completedAt)

            binding.root.setOnClickListener { onClick(item) }
            binding.btnOptions.setOnClickListener { view ->
                val context = binding.root.context
                com.aiinterview.presentation.common.PopupUtils.showDeletePopupMenu(
                    context = context,
                    anchorView = view,
                    onDeleteClicked = { onDeleteClick(item) }
                )
            }
        }
    }

    private fun formatDate(isoString: String): String {
        return try {
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val date = inputFormat.parse(isoString) ?: return isoString
            val outputFormat = SimpleDateFormat("MMM dd, yyyy · hh:mm a", Locale.getDefault())
            outputFormat.format(date)
        } catch (e: Exception) {
            // Fallback substring parsing
            try {
                if (isoString.contains("T")) {
                    val datePart = isoString.substringBefore("T")
                    val timePart = isoString.substringAfter("T").substring(0, 5)
                    "$datePart $timePart"
                } else {
                    isoString
                }
            } catch (ex: Exception) {
                isoString
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemAttemptCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<UserAttempt>() {
        override fun areItemsTheSame(oldItem: UserAttempt, newItem: UserAttempt) = oldItem.attemptId == newItem.attemptId
        override fun areContentsTheSame(oldItem: UserAttempt, newItem: UserAttempt) = oldItem == newItem
    }
}
