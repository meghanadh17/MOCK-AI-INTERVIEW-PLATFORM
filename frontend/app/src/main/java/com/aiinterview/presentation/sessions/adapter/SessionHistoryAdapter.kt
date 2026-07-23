package com.aiinterview.presentation.sessions.adapter

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.paging.PagingDataAdapter
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.databinding.ItemSessionCardBinding
import com.aiinterview.domain.model.InterviewSession
import java.text.SimpleDateFormat
import java.util.Locale

class SessionHistoryAdapter(
    private val onClick: (InterviewSession) -> Unit,
    private val onDeleteClick: (InterviewSession) -> Unit
) : PagingDataAdapter<InterviewSession, SessionHistoryAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemSessionCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: InterviewSession) {
            val context = binding.root.context
            binding.tvType.text = item.title

            // Format date
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            val fallbackInputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val outputFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())

            val formattedDate = try {
                val parsed = try {
                    inputFormat.parse(item.createdAt)
                } catch (e: Exception) {
                    fallbackInputFormat.parse(item.createdAt.take(10))
                }
                parsed?.let { outputFormat.format(it) } ?: item.createdAt
            } catch (e: Exception) {
                item.createdAt
            }

            binding.tvDetail.text = "${item.type.uppercase()} • $formattedDate"

            // Bind type icon and module colors
            if (item.type.lowercase() == "video") {
                binding.ivIcon.setImageResource(R.drawable.ic_video)
                binding.ivIcon.imageTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.primary))
                binding.iconContainer.background = ContextCompat.getDrawable(context, R.drawable.bg_circle_badge)
                binding.iconContainer.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.border_def))
            } else {
                binding.ivIcon.setImageResource(R.drawable.ic_interview)
                binding.ivIcon.imageTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.text_sec))
                binding.iconContainer.background = ContextCompat.getDrawable(context, R.drawable.bg_circle_badge)
                binding.iconContainer.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.bg_elevated))
            }

            // Bind score range colors
            val score = item.overallScore ?: 0f
            val (textColor, bgColor) = when {
                score >= 80f -> Pair(
                    ContextCompat.getColor(context, R.color.score_high),
                    ContextCompat.getColor(context, R.color.score_high_bg)
                )
                score >= 50f -> Pair(
                    ContextCompat.getColor(context, R.color.score_mid),
                    ContextCompat.getColor(context, R.color.score_mid_bg)
                )
                else -> Pair(
                    ContextCompat.getColor(context, R.color.score_low),
                    ContextCompat.getColor(context, R.color.score_low_bg)
                )
            }
            binding.tvScore.setTextColor(textColor)
            binding.tvScore.backgroundTintList = ColorStateList.valueOf(bgColor)
            binding.tvScore.text = String.format(Locale.getDefault(), "%.1f", score)

            binding.root.setOnClickListener { onClick(item) }
            binding.btnOptions.setOnClickListener { view ->
                com.aiinterview.presentation.common.PopupUtils.showDeletePopupMenu(
                    context = context,
                    anchorView = view,
                    onDeleteClicked = { onDeleteClick(item) }
                )
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemSessionCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        getItem(position)?.let { holder.bind(it) }
    }

    companion object DiffCallback : DiffUtil.ItemCallback<InterviewSession>() {
        override fun areItemsTheSame(oldItem: InterviewSession, newItem: InterviewSession) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: InterviewSession, newItem: InterviewSession) = oldItem == newItem
    }
}
