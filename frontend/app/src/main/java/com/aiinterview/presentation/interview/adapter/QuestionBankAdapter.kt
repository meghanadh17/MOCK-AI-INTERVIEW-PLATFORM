package com.aiinterview.presentation.interview.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.R
import com.aiinterview.data.remote.dto.interview.QuestionDto
import com.aiinterview.databinding.ItemQuestionBankBinding

class QuestionBankAdapter(
    private val onClick: (QuestionDto) -> Unit = {}
) : ListAdapter<QuestionDto, QuestionBankAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemQuestionBankBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: QuestionDto) {
            binding.tvQuestion.text = item.text
            binding.tvCategory.text = item.category ?: "General"
            binding.ivIcon.setImageResource(R.drawable.ic_hint)

            binding.root.setOnClickListener { onClick(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemQuestionBankBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<QuestionDto>() {
        override fun areItemsTheSame(oldItem: QuestionDto, newItem: QuestionDto) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: QuestionDto, newItem: QuestionDto) = oldItem == newItem
    }
}
