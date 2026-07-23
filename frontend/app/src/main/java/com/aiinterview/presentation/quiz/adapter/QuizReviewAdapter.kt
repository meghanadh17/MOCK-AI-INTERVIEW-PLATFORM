package com.aiinterview.presentation.quiz.adapter

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.domain.model.QuestionExplanation
import com.aiinterview.databinding.ItemQuizReviewBinding

class QuizReviewAdapter : ListAdapter<QuestionExplanation, QuizReviewAdapter.ViewHolder>(DiffCallback) {

    private val expandedStates = mutableMapOf<String, Boolean>()

    inner class ViewHolder(val binding: ItemQuizReviewBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: QuestionExplanation, position: Int) {
            val qNum = position + 1
            binding.tvQuestionText.text = "Q$qNum. ${item.questionText}"
            binding.tvChosenAnswer.text = "Your Answer: ${item.chosenAnswer}"
            binding.tvCorrectAnswer.text = "Correct Answer: ${item.correctAnswer}"
            binding.tvExplanation.text = item.explanation ?: "No explanation provided."

            // Correctness visual indicators
            if (item.isCorrect) {
                binding.tvResultIcon.text = "✓"
                binding.tvResultIcon.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#14352A"))
                binding.tvResultIcon.setTextColor(Color.parseColor("#10B981"))
                binding.root.strokeColor = Color.parseColor("#14352A")
            } else {
                binding.tvResultIcon.text = "✗"
                binding.tvResultIcon.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#3B1414"))
                binding.tvResultIcon.setTextColor(Color.parseColor("#EF4444"))
                binding.root.strokeColor = Color.parseColor("#3B1414")
            }

            // Accordion expand/collapse state
            val isExpanded = expandedStates[item.questionId] == true
            if (isExpanded) {
                binding.layoutExpanded.visibility = View.VISIBLE
                binding.ivExpand.rotation = 90f
            } else {
                binding.layoutExpanded.visibility = View.GONE
                binding.ivExpand.rotation = 0f
            }

            binding.layoutHeader.setOnClickListener {
                val pos = bindingAdapterPosition
                if (pos != RecyclerView.NO_POSITION) {
                    val newState = !isExpanded
                    expandedStates[item.questionId] = newState
                    notifyItemChanged(pos)
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemQuizReviewBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position), position)

    companion object DiffCallback : DiffUtil.ItemCallback<QuestionExplanation>() {
        override fun areItemsTheSame(oldItem: QuestionExplanation, newItem: QuestionExplanation) = oldItem.questionId == newItem.questionId
        override fun areContentsTheSame(oldItem: QuestionExplanation, newItem: QuestionExplanation) = oldItem == newItem
    }
}
