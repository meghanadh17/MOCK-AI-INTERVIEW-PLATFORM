package com.aiinterview.presentation.interview.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.data.remote.dto.interview.QuestionDto
import com.aiinterview.databinding.ItemQuestionAccordionBinding

class FeedbackAccordionAdapter(
    private val onItemClick: ((QuestionDto) -> Unit)? = null
) : ListAdapter<QuestionDto, FeedbackAccordionAdapter.ViewHolder>(DiffCallback) {

    private val expandedIds = mutableSetOf<String>()

    inner class ViewHolder(val binding: ItemQuestionAccordionBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: QuestionDto) {
            val scoreVal = if (item.is_skipped) 0 else ((item.ai_score ?: 0.0) * 10).toInt()
            binding.tvScoreBadge.text = scoreVal.toString()
            binding.tvQuestionText.text = item.text
            
            val isExpanded = expandedIds.contains(item.id)
            binding.layoutExpanded.visibility = if (isExpanded) View.VISIBLE else View.GONE
            
            // 90 degrees points down, 270 degrees points up
            binding.ivExpand.rotation = if (isExpanded) 270f else 90f

            binding.tvQuestionText.maxLines = if (isExpanded) 100 else 2
            binding.tvQuestionText.ellipsize = if (isExpanded) null else android.text.TextUtils.TruncateAt.END

            val feedbackDetail = item.evaluation_feedback
            if (feedbackDetail != null) {
                binding.tvWorkedContent.text = feedbackDetail.what_was_good ?: item.ai_feedback ?: "Good response layout and technical explanations."
                binding.tvGapsContent.text = feedbackDetail.critical_gap ?: "No critical gaps identified."
                binding.tvModelContent.text = feedbackDetail.model_answer_outline ?: item.ideal_outline ?: "No outline available."
            } else {
                binding.tvWorkedContent.text = item.ai_feedback ?: "No detailed feedback available."
                binding.tvGapsContent.text = if (item.is_skipped) "Question was skipped." else "No critical gaps identified."
                binding.tvModelContent.text = item.ideal_outline ?: "No outline available."
            }

            binding.layoutHeader.setOnClickListener {
                val pos = bindingAdapterPosition
                if (pos != RecyclerView.NO_POSITION) {
                    val currentItem = getItem(pos)
                    if (expandedIds.contains(currentItem.id)) {
                        expandedIds.remove(currentItem.id)
                    } else {
                        expandedIds.add(currentItem.id)
                    }
                    notifyItemChanged(pos)
                    onItemClick?.invoke(currentItem)
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemQuestionAccordionBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<QuestionDto>() {
        override fun areItemsTheSame(oldItem: QuestionDto, newItem: QuestionDto) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: QuestionDto, newItem: QuestionDto) = oldItem == newItem
    }
}
