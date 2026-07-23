package com.aiinterview.presentation.quiz.adapter

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.domain.model.LeaderboardEntry
import com.aiinterview.databinding.ItemLeaderboardRowBinding

class LeaderboardAdapter : ListAdapter<LeaderboardEntry, LeaderboardAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemLeaderboardRowBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: LeaderboardEntry) {
            binding.tvRank.text = item.rank.toString()
            binding.tvUsername.text = item.name
            binding.tvScore.text = "${item.score.toInt()}%"

            // Highlight current user
            if (item.isCurrentUser) {
                binding.root.strokeColor = Color.parseColor("#818CF8") // Indigo border
                binding.root.setCardBackgroundColor(ColorStateList.valueOf(Color.parseColor("#18182B"))) // Subtle indigo highlight
            } else {
                binding.root.strokeColor = Color.parseColor("#27272A") // border_def
                binding.root.setCardBackgroundColor(ColorStateList.valueOf(Color.parseColor("#040406"))) // bg_surface
            }

            // Style rank badges differently for top positions if shown in list
            when (item.rank) {
                1 -> {
                    binding.tvRank.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#3D2E0A"))
                    binding.tvRank.setTextColor(Color.parseColor("#F59E0B"))
                }
                2 -> {
                    binding.tvRank.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#27272A"))
                    binding.tvRank.setTextColor(Color.parseColor("#A1A1AA"))
                }
                3 -> {
                    binding.tvRank.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#25170B"))
                    binding.tvRank.setTextColor(Color.parseColor("#CD7F32"))
                }
                else -> {
                    binding.tvRank.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#1F1F2E"))
                    binding.tvRank.setTextColor(Color.parseColor("#FFFFFF"))
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemLeaderboardRowBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<LeaderboardEntry>() {
        override fun areItemsTheSame(oldItem: LeaderboardEntry, newItem: LeaderboardEntry) = oldItem.userId == newItem.userId
        override fun areContentsTheSame(oldItem: LeaderboardEntry, newItem: LeaderboardEntry) = oldItem == newItem
    }
}
