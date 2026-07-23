package com.aiinterview.presentation.resume.adapter

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemSkillChipBinding
import com.aiinterview.domain.model.Skill

class SkillChipAdapter(
    private val onClick: (Skill) -> Unit = {}
) : ListAdapter<Skill, SkillChipAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemSkillChipBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: Skill) {
            binding.tvSkillName.text = item.name
            
            val bgTint: Int
            val textCol: Int
            val strokeCol: Int

            when (item.level.lowercase()) {
                "beginner" -> {
                    bgTint = 0xFF27272A.toInt() // Zinc-800
                    textCol = 0xFFD4D4D8.toInt() // Muted Zinc-300
                    strokeCol = 0xFF3F3F46.toInt() // Zinc-700
                }
                "intermediate" -> {
                    bgTint = 0xFF1E3A8A.toInt() // Blue-900
                    textCol = 0xFF93C5FD.toInt() // Blue-300
                    strokeCol = 0xFF2563EB.toInt() // Blue-600
                }
                "advanced" -> {
                    bgTint = 0xFF312E81.toInt() // Indigo-900
                    textCol = 0xFFC7D2FE.toInt() // Indigo-200
                    strokeCol = 0xFF4F46E5.toInt() // Indigo-600
                }
                "expert" -> {
                    bgTint = 0xFF78350F.toInt() // Amber-900
                    textCol = 0xFFFDE68A.toInt() // Amber-200
                    strokeCol = 0xFFD97706.toInt() // Amber-600
                }
                else -> {
                    bgTint = 0xFF18181B.toInt()
                    textCol = 0xFFFFFFFF.toInt()
                    strokeCol = 0xFF27272A.toInt()
                }
            }

            binding.root.setCardBackgroundColor(ColorStateList.valueOf(bgTint))
            binding.root.strokeColor = strokeCol
            binding.tvSkillName.setTextColor(textCol)

            binding.root.setOnClickListener { onClick(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemSkillChipBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<Skill>() {
        override fun areItemsTheSame(oldItem: Skill, newItem: Skill) = oldItem.name == newItem.name
        override fun areContentsTheSame(oldItem: Skill, newItem: Skill) = oldItem == newItem
    }
}
