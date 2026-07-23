package com.aiinterview.presentation.interview.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.databinding.ItemSessionCardBinding
import com.aiinterview.domain.model.InterviewSession
import java.text.SimpleDateFormat
import java.util.Locale

class InterviewHistoryAdapter(
    private val onClick: (InterviewSession) -> Unit
) : ListAdapter<InterviewSession, InterviewHistoryAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemSessionCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: InterviewSession) {
            binding.tvType.text = item.title
            
            val rawDate = item.createdAt
            val formattedDate = try {
                val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val outputFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                val date = inputFormat.parse(rawDate)
                date?.let { outputFormat.format(it) } ?: rawDate
            } catch (e: Exception) {
                rawDate.split("T").firstOrNull() ?: rawDate
            }
            binding.tvDetail.text = "TEXT · ${item.status.uppercase()} · $formattedDate"
            
            if (item.overallScore != null) {
                binding.tvScore.text = String.format(Locale.getDefault(), "%.1f", item.overallScore)
                val colorRes = when {
                    item.overallScore >= 8.0f -> R.color.score_high
                    item.overallScore >= 5.0f -> R.color.score_mid
                    else -> R.color.score_low
                }
                binding.tvScore.setTextColor(ContextCompat.getColor(binding.root.context, colorRes))
            } else {
                binding.tvScore.text = "N/A"
                binding.tvScore.setTextColor(ContextCompat.getColor(binding.root.context, R.color.text_muted))
            }
            
            binding.ivIcon.setImageResource(R.drawable.ic_interview)
            binding.ivIcon.imageTintList = ContextCompat.getColorStateList(binding.root.context, R.color.color_interview)

            binding.root.setOnClickListener { onClick(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemSessionCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<InterviewSession>() {
        override fun areItemsTheSame(oldItem: InterviewSession, newItem: InterviewSession) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: InterviewSession, newItem: InterviewSession) = oldItem == newItem
    }
}
