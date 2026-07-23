
package com.aiinterview.presentation.profile.adapter

import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.appcompat.widget.TooltipCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.databinding.ItemAchievementBinding

data class Achievement(
    val id: String,
    val title: String,
    val description: String,
    val iconRes: Int,
    val unlockedAt: String? = null // null means locked
)

class AchievementAdapter(
    private val onClick: (Achievement) -> Unit = {}
) : ListAdapter<Achievement, AchievementAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemAchievementBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: Achievement) {
            binding.tvAchievementTitle.text = item.title
            binding.ivBadge.setImageResource(item.iconRes)

            val isUnlocked = item.unlockedAt != null
            if (isUnlocked) {
                binding.tvAchievementDate.text = item.unlockedAt
                binding.tvAchievementDate.setTextColor(Color.parseColor("#10B981")) // Emerald text
                
                // Show colorful badge and gradient container background
                binding.cardBadgeContainer.setBackgroundResource(R.drawable.gradient_interview)
                binding.ivBadge.colorFilter = null
                binding.ivBadge.alpha = 1.0f
            } else {
                binding.tvAchievementDate.text = "LOCKED"
                binding.tvAchievementDate.setTextColor(Color.parseColor("#71717A")) // Grey text
                
                // Reset card background and apply grayscale filter
                binding.cardBadgeContainer.setBackgroundResource(0)
                binding.cardBadgeContainer.setCardBackgroundColor(Color.parseColor("#18181B"))
                
                val matrix = ColorMatrix().apply { setSaturation(0f) }
                binding.ivBadge.colorFilter = ColorMatrixColorFilter(matrix)
                binding.ivBadge.alpha = 0.4f
            }

            // Set tooltip text
            val tooltipText = "${item.title}: ${item.description} ${if (isUnlocked) "(Unlocked)" else "(Locked)"}"
            TooltipCompat.setTooltipText(binding.root, tooltipText)

            binding.root.setOnClickListener {
                onClick(item)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAchievementBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    companion object DiffCallback : DiffUtil.ItemCallback<Achievement>() {
        override fun areItemsTheSame(oldItem: Achievement, newItem: Achievement): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Achievement, newItem: Achievement): Boolean {
            return oldItem == newItem
        }
    }
}
