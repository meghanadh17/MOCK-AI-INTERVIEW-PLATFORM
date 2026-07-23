package com.aiinterview.presentation.resume.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemSectionExpandableBinding
import com.aiinterview.domain.model.ResumeSection

class SectionAdapter(
    private val onToggle: (ResumeSection) -> Unit = {},
    private val onEnhance: (ResumeSection) -> Unit = {}
) : ListAdapter<ResumeSection, SectionAdapter.ViewHolder>(DiffCallback) {

    private var enhancingSections: Set<String> = emptySet()

    fun updateEnhancingSections(sections: Set<String>) {
        this.enhancingSections = sections
        notifyDataSetChanged()
    }

    inner class ViewHolder(val binding: ItemSectionExpandableBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: ResumeSection) {
            binding.tvSectionTitle.text = item.title
            binding.tvSectionContent.text = item.content
            
            if (item.isExpanded) {
                binding.tvSectionContent.visibility = View.VISIBLE
                binding.dividerLine.visibility = View.VISIBLE
                binding.ivExpand.rotation = 90f
            } else {
                binding.tvSectionContent.visibility = View.GONE
                binding.dividerLine.visibility = View.GONE
                binding.ivExpand.rotation = 0f
            }

            val isEnhancing = enhancingSections.contains(item.title.lowercase().trim())
            if (isEnhancing) {
                binding.btnAiEnhance.visibility = View.GONE
                binding.progressAiEnhance.visibility = View.VISIBLE
            } else {
                binding.btnAiEnhance.visibility = View.VISIBLE
                binding.progressAiEnhance.visibility = View.GONE
            }

            binding.layoutHeader.setOnClickListener {
                item.isExpanded = !item.isExpanded
                notifyItemChanged(adapterPosition)
                onToggle(item)
            }

            binding.btnAiEnhance.setOnClickListener {
                onEnhance(item)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemSectionExpandableBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<ResumeSection>() {
        override fun areItemsTheSame(oldItem: ResumeSection, newItem: ResumeSection) = oldItem.title == newItem.title
        override fun areContentsTheSame(oldItem: ResumeSection, newItem: ResumeSection) = oldItem == newItem
    }
}
