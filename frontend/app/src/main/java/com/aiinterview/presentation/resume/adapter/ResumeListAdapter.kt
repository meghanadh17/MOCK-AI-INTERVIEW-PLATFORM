package com.aiinterview.presentation.resume.adapter

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemResumeCardBinding
import com.aiinterview.domain.model.Resume

import com.aiinterview.core.extensions.toDisplayDateFromIso

class ResumeListAdapter(
    private val onClick: (Resume) -> Unit = {},
    private val onMenuClick: (view: android.view.View, Resume) -> Unit = { _, _ -> }
) : ListAdapter<Resume, ResumeListAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemResumeCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: Resume) {
            binding.tvFilename.text = item.filename
            binding.tvDate.text = item.createdAt.toDisplayDateFromIso()
            
            val statusText = item.parseStatus.uppercase()
            binding.tvStatus.text = statusText
            
            // Set badge background and text colors based on status
            when (statusText) {
                "SUCCESS" -> {
                    binding.tvStatus.setTextColor(0xFF10B981.toInt()) // Emerald
                    binding.tvStatus.backgroundTintList = ColorStateList.valueOf(0x1A10B981.toInt())
                }
                "FAILED" -> {
                    binding.tvStatus.setTextColor(0xFFEF4444.toInt()) // Red
                    binding.tvStatus.backgroundTintList = ColorStateList.valueOf(0x1AEF4444.toInt())
                }
                "PROCESSING" -> {
                    binding.tvStatus.setTextColor(0xFF3B82F6.toInt()) // Blue
                    binding.tvStatus.backgroundTintList = ColorStateList.valueOf(0x1A3B82F6.toInt())
                }
                else -> { // PENDING
                    binding.tvStatus.setTextColor(0xFF6B7280.toInt()) // Muted Gray
                    binding.tvStatus.backgroundTintList = ColorStateList.valueOf(0x1A6B7280.toInt())
                }
            }

            binding.btnMore.setOnClickListener { onMenuClick(it, item) }
            binding.root.setOnClickListener { onClick(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemResumeCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<Resume>() {
        override fun areItemsTheSame(oldItem: Resume, newItem: Resume) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: Resume, newItem: Resume) = oldItem == newItem
    }
}
