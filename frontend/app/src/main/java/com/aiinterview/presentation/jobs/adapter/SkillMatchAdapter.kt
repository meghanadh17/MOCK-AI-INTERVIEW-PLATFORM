package com.aiinterview.presentation.jobs.adapter

import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.databinding.ItemSkillChipBinding

data class SkillChipItem(
    val name: String,
    val isMatched: Boolean,
    val isOverflow: Boolean = false,
    val overflowCount: Int = 0
)

class SkillMatchAdapter : ListAdapter<SkillChipItem, SkillMatchAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemSkillChipBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: SkillChipItem) {
            val context = binding.root.context
            val density = context.resources.displayMetrics.density

            if (item.isOverflow) {
                // Style for the overflow "+N MORE" chip
                binding.tvSkillName.text = "+${item.overflowCount} MORE"
                binding.root.setCardBackgroundColor(Color.parseColor("#18181B"))
                binding.root.strokeColor = Color.parseColor("#27272A")
                binding.tvSkillName.setTextColor(ContextCompat.getColor(context, R.color.text_muted))
                binding.tvSkillName.setCompoundDrawables(null, null, null, null)
            } else {
                binding.tvSkillName.text = item.name

                val (bgColor, strokeColor, textColor, iconRes) = if (item.isMatched) {
                    // MATCHED: Emerald colors
                    val bg = ContextCompat.getColor(context, R.color.score_high_bg)
                    val stroke = ContextCompat.getColor(context, R.color.score_high)
                    val text = ContextCompat.getColor(context, R.color.score_high)
                    val icon = R.drawable.ic_check
                    Quadruple(bg, stroke, text, icon)
                } else {
                    // MISSING: Rose/Red colors
                    val bg = ContextCompat.getColor(context, R.color.score_low_bg)
                    val stroke = ContextCompat.getColor(context, R.color.score_low)
                    val text = ContextCompat.getColor(context, R.color.score_low)
                    val icon = R.drawable.ic_close
                    Quadruple(bg, stroke, text, icon)
                }

                binding.root.setCardBackgroundColor(bgColor)
                binding.root.strokeColor = strokeColor
                binding.tvSkillName.setTextColor(textColor)

                val drawable = ContextCompat.getDrawable(context, iconRes)?.mutate()
                drawable?.setTint(textColor)
                val iconSize = (12 * density).toInt()
                drawable?.setBounds(0, 0, iconSize, iconSize)
                binding.tvSkillName.setCompoundDrawables(drawable, null, null, null)
                binding.tvSkillName.compoundDrawablePadding = (4 * density).toInt()
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemSkillChipBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    companion object DiffCallback : DiffUtil.ItemCallback<SkillChipItem>() {
        override fun areItemsTheSame(oldItem: SkillChipItem, newItem: SkillChipItem): Boolean {
            return oldItem.name == newItem.name && oldItem.isOverflow == newItem.isOverflow
        }

        override fun areContentsTheSame(oldItem: SkillChipItem, newItem: SkillChipItem): Boolean {
            return oldItem == newItem
        }
    }

    private data class Quadruple<out A, out B, out C, out D>(
        val first: A,
        val second: B,
        val third: C,
        val fourth: D
    )
}
