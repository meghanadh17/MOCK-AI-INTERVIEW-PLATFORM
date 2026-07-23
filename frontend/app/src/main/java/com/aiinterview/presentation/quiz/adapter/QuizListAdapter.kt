package com.aiinterview.presentation.quiz.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.domain.model.Quiz
import com.aiinterview.databinding.ItemQuizCardBinding

class QuizListAdapter(
    private val onClick: (Quiz) -> Unit = {}
) : ListAdapter<Quiz, QuizListAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemQuizCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: Quiz) {
            binding.tvTopic.text = item.title
            binding.tvDifficulty.text = item.difficulty.uppercase()
            binding.tvQuestionCount.text = "${item.totalQuestions} Questions"
            binding.root.setOnClickListener { onClick(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemQuizCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<Quiz>() {
        override fun areItemsTheSame(oldItem: Quiz, newItem: Quiz) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: Quiz, newItem: Quiz) = oldItem == newItem
    }
}
