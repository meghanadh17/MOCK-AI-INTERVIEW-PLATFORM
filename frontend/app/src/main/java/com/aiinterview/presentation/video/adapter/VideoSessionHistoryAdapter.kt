package com.aiinterview.presentation.video.adapter

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.databinding.ItemSessionCardBinding
import com.aiinterview.domain.model.VideoSession
import java.text.SimpleDateFormat
import java.util.Locale

class VideoSessionHistoryAdapter(
    private val onClick: (VideoSession) -> Unit,
    private val onDeleteClick: (VideoSession) -> Unit
) : ListAdapter<VideoSession, VideoSessionHistoryAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemSessionCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: VideoSession) {
            val context = binding.root.context
            
            // Set session title or default
            binding.tvType.text = item.title ?: "Video Practice Session"

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

            // Build details string: Posture, Gaze, Emotion details
            val postureText = item.avgPostureScore?.let { String.format(Locale.getDefault(), "Posture: %.0f%%", it * 100f) } ?: "Posture: --"
            val gazeText = item.avgEyeContact?.let { String.format(Locale.getDefault(), "Gaze: %.0f%%", it) } ?: "Gaze: --"
            val emotionText = item.dominantEmotion?.let { "Emotion: ${it.replaceFirstChar { c -> c.uppercase() }}" } ?: "Emotion: --"

            binding.tvDetail.text = "$formattedDate • $postureText • $gazeText • $emotionText"

            // Bind type icon and module colors
            binding.ivIcon.setImageResource(R.drawable.ic_video)
            binding.ivIcon.imageTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.primary))
            binding.iconContainer.background = ContextCompat.getDrawable(context, R.drawable.bg_circle_badge)
            binding.iconContainer.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(context, R.color.border_def))

            // Bind score range colors using composite score or average of posture + gaze
            val score = item.avgConfidence?.let { it * 100f }
                ?: if (item.avgPostureScore != null && item.avgEyeContact != null) {
                    ((item.avgPostureScore * 100f) + item.avgEyeContact) / 2f
                } else {
                    80f // Fallback default
                }

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
        holder.bind(getItem(position))
    }

    companion object DiffCallback : DiffUtil.ItemCallback<VideoSession>() {
        override fun areItemsTheSame(oldItem: VideoSession, newItem: VideoSession) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: VideoSession, newItem: VideoSession) = oldItem == newItem
    }
}
