package com.aiinterview.presentation.sessions.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemImprovementChecklistBinding

data class StudyTask(
    val id: String,
    val displayText: String,
    val isChecked: Boolean
)

class ImprovementAdapter(
    private val onCheckChanged: (StudyTask, Boolean) -> Unit
) : ListAdapter<StudyTask, ImprovementAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemImprovementChecklistBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: StudyTask) {
            binding.tvTaskText.text = item.displayText

            if (item.isChecked) {
                binding.tvTaskText.paintFlags = binding.tvTaskText.paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
                binding.tvTaskText.setTextColor(androidx.core.content.ContextCompat.getColor(binding.root.context, com.aiinterview.R.color.text_muted))
            } else {
                binding.tvTaskText.paintFlags = binding.tvTaskText.paintFlags and android.graphics.Paint.STRIKE_THRU_TEXT_FLAG.inv()
                binding.tvTaskText.setTextColor(androidx.core.content.ContextCompat.getColor(binding.root.context, com.aiinterview.R.color.text_prim))
            }

            // Remove listener before changing checked status to avoid recursive callbacks
            binding.checkbox.setOnCheckedChangeListener(null)
            binding.checkbox.isChecked = item.isChecked

            binding.checkbox.setOnCheckedChangeListener { _, isChecked ->
                onCheckChanged(item, isChecked)
            }

            binding.root.setOnClickListener {
                binding.checkbox.isChecked = !binding.checkbox.isChecked
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemImprovementChecklistBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<StudyTask>() {
        override fun areItemsTheSame(oldItem: StudyTask, newItem: StudyTask) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: StudyTask, newItem: StudyTask) = oldItem == newItem
    }
}
