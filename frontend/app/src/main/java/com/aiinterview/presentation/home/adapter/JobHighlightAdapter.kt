package com.aiinterview.presentation.home.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.databinding.ItemJobCardBinding
import com.aiinterview.domain.model.JobMatch
import java.util.Locale

class JobHighlightAdapter(
    private val onClick: (JobMatch) -> Unit,
    private val onSaveToggle: (JobMatch) -> Unit
) : ListAdapter<JobMatch, JobHighlightAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemJobCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: JobMatch) {
            binding.tvJobTitle.text = item.title
            binding.tvCompany.text = item.company
            binding.tvLocation.text = item.location ?: "Remote"
            binding.tvJobType.text = item.salaryRange ?: "N/A"
            
            binding.tvMatchScore.text = String.format(Locale.getDefault(), "%.0f%% Match", item.matchScore)
            
            if (item.isSaved) {
                binding.btnSave.setImageResource(R.drawable.ic_bookmark_filled)
                binding.btnSave.imageTintList = ContextCompat.getColorStateList(binding.root.context, R.color.primary)
            } else {
                binding.btnSave.setImageResource(R.drawable.ic_bookmark)
                binding.btnSave.imageTintList = ContextCompat.getColorStateList(binding.root.context, R.color.text_muted)
            }
            
            binding.btnSave.setOnClickListener {
                onSaveToggle(item)
            }
            
            binding.root.setOnClickListener {
                onClick(item)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemJobCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        val density = parent.context.resources.displayMetrics.density
        val layoutParams = binding.root.layoutParams ?: ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
        layoutParams.width = (280 * density).toInt()
        layoutParams.height = (175 * density).toInt()
        binding.root.layoutParams = layoutParams
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<JobMatch>() {
        override fun areItemsTheSame(oldItem: JobMatch, newItem: JobMatch) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: JobMatch, newItem: JobMatch) = oldItem == newItem
    }
}
