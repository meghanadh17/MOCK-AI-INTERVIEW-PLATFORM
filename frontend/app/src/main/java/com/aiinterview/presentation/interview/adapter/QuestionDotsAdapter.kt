package com.aiinterview.presentation.interview.adapter

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.data.remote.dto.interview.QuestionDto
import com.aiinterview.databinding.ItemQuestionDotBinding

class QuestionDotsAdapter(
    private val onQuestionClick: (QuestionDto, Int) -> Unit
) : ListAdapter<QuestionDto, QuestionDotsAdapter.ViewHolder>(DiffCallback) {

    private var activeIndex: Int = 0

    fun setActiveIndex(index: Int) {
        val oldIndex = activeIndex
        activeIndex = index
        notifyItemChanged(oldIndex)
        notifyItemChanged(activeIndex)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemQuestionDotBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position), position)
    }

    inner class ViewHolder(private val binding: ItemQuestionDotBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(question: QuestionDto, position: Int) {
            val context = binding.root.context
            binding.tvDotNumber.text = (position + 1).toString()

            val isActive = position == activeIndex
            val isAnswered = !question.user_transcript.isNullOrEmpty()
            val isSkipped = question.is_skipped

            when {
                isActive -> {
                    // Active Question: filled primary background with dark text
                    binding.root.setCardBackgroundColor(
                        ContextCompat.getColor(context, R.color.primary)
                    )
                    binding.root.setStrokeColor(
                        ContextCompat.getColor(context, R.color.primary)
                    )
                    binding.tvDotNumber.setTextColor(
                        ContextCompat.getColor(context, R.color.primary_foreground)
                    )
                }
                isAnswered -> {
                    // Answered Question: subtle green theme
                    binding.root.setCardBackgroundColor(Color.parseColor("#14352A"))
                    binding.root.setStrokeColor(Color.parseColor("#1A352A"))
                    binding.tvDotNumber.setTextColor(Color.parseColor("#10B981"))
                }
                isSkipped -> {
                    // Skipped Question: subtle red theme
                    binding.root.setCardBackgroundColor(Color.parseColor("#3B1414"))
                    binding.root.setStrokeColor(Color.parseColor("#4B1414"))
                    binding.tvDotNumber.setTextColor(Color.parseColor("#EF4444"))
                }
                else -> {
                    // Default/Unanswered Upcoming Question: default card colors
                    binding.root.setCardBackgroundColor(
                        ContextCompat.getColor(context, R.color.bg_surface)
                    )
                    binding.root.setStrokeColor(
                        ContextCompat.getColor(context, R.color.border_def)
                    )
                    binding.tvDotNumber.setTextColor(
                        ContextCompat.getColor(context, R.color.text_sec)
                    )
                }
            }

            binding.root.setOnClickListener {
                onQuestionClick(question, position)
            }
        }
    }

    companion object DiffCallback : DiffUtil.ItemCallback<QuestionDto>() {
        override fun areItemsTheSame(oldItem: QuestionDto, newItem: QuestionDto): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: QuestionDto, newItem: QuestionDto): Boolean {
            return oldItem == newItem
        }
    }
}
