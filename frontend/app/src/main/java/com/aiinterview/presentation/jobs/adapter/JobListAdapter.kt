package com.aiinterview.presentation.jobs.adapter

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.paging.PagingDataAdapter
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.databinding.ItemJobCardBinding
import com.aiinterview.domain.model.Job

class JobListAdapter(
    private val onJobClick: (Job) -> Unit,
    private val onSaveClick: (Job) -> Unit
) : PagingDataAdapter<Job, JobListAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemJobCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(job: Job?) {
            if (job == null) return
            val context = binding.root.context

            // Bind basic text views
            binding.tvJobTitle.text = job.title
            binding.tvCompany.text = job.company

            // Bind location chip
            if (!job.location.isNullOrEmpty()) {
                binding.tvLocation.text = job.location
                binding.tvLocation.visibility = View.VISIBLE
            } else {
                binding.tvLocation.visibility = View.GONE
            }

            // Bind salary / type chip
            if (!job.salaryRange.isNullOrEmpty()) {
                binding.tvJobType.text = job.salaryRange
                binding.tvJobType.visibility = View.VISIBLE
            } else if (!job.experienceLevel.isNullOrEmpty()) {
                binding.tvJobType.text = job.experienceLevel
                binding.tvJobType.visibility = View.VISIBLE
            } else {
                binding.tvJobType.visibility = View.GONE
            }

            // Bind match score with dynamic colors
            val score = job.matchScore
            if (score != null) {
                binding.tvMatchScore.visibility = View.VISIBLE
                binding.tvMatchScore.text = "${score.toInt()}% Match"

                val (bgColor, textColor) = when {
                    score >= 80f -> {
                        ContextCompat.getColor(context, R.color.score_high_bg) to
                                ContextCompat.getColor(context, R.color.score_high)
                    }
                    score >= 50f -> {
                        ContextCompat.getColor(context, R.color.score_mid_bg) to
                                ContextCompat.getColor(context, R.color.score_mid)
                    }
                    else -> {
                        ContextCompat.getColor(context, R.color.score_low_bg) to
                                ContextCompat.getColor(context, R.color.score_low)
                    }
                }
                binding.tvMatchScore.backgroundTintList = ColorStateList.valueOf(bgColor)
                binding.tvMatchScore.setTextColor(textColor)
            } else {
                binding.tvMatchScore.visibility = View.GONE
            }

            // Bind Heart/Bookmark save state with animations
            if (job.isSaved) {
                binding.btnSave.setImageResource(R.drawable.ic_heart_filled)
                binding.btnSave.imageTintList = ColorStateList.valueOf(
                    ContextCompat.getColor(context, R.color.destructive)
                )
            } else {
                binding.btnSave.setImageResource(R.drawable.ic_heart)
                binding.btnSave.imageTintList = ColorStateList.valueOf(
                    ContextCompat.getColor(context, R.color.text_muted)
                )
            }

            binding.btnSave.setOnClickListener {
                // Heart Pulse/Spring Scale Animation: 1f -> 1.3f -> 1f
                binding.btnSave.animate()
                    .scaleX(1.3f)
                    .scaleY(1.3f)
                    .setDuration(120)
                    .withEndAction {
                        binding.btnSave.animate()
                            .scaleX(1.0f)
                            .scaleY(1.0f)
                            .setDuration(120)
                            .start()
                    }
                    .start()

                onSaveClick(job)
            }

            binding.root.setOnClickListener {
                onJobClick(job)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemJobCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    companion object DiffCallback : DiffUtil.ItemCallback<Job>() {
        override fun areItemsTheSame(oldItem: Job, newItem: Job): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Job, newItem: Job): Boolean {
            return oldItem == newItem
        }
    }
}
