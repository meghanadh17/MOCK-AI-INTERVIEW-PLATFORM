package com.aiinterview.presentation.quiz.adapter

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemQuizOptionBinding

class QuizOptionAdapter(
    private val onOptionSelected: (String) -> Unit
) : ListAdapter<String, QuizOptionAdapter.ViewHolder>(DiffCallback) {

    private var selectedOption: String? = null
    private var correctOption: String? = null
    private var isSubmitted: Boolean = false

    fun updateStates(selected: String?, correct: String?, submitted: Boolean) {
        selectedOption = selected
        correctOption = correct
        isSubmitted = submitted
        notifyDataSetChanged()
    }

    inner class ViewHolder(val binding: ItemQuizOptionBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(optionText: String, position: Int) {
            val letter = when (position) {
                0 -> "A"
                1 -> "B"
                2 -> "C"
                else -> "D"
            }
            binding.tvOptionLetter.text = letter
            binding.tvOptionText.text = optionText

            // Set neomorphic styles based on selection/correctness states
            when {
                isSubmitted && optionText == correctOption -> {
                    // Correct answer -> Emerald highlight
                    binding.root.setCardBackgroundColor(ColorStateList.valueOf(Color.parseColor("#14352A")))
                    binding.root.strokeColor = Color.parseColor("#10B981")
                    binding.tvOptionLetter.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#10B981"))
                    binding.tvOptionLetter.setTextColor(Color.parseColor("#09090B"))
                }
                isSubmitted && optionText == selectedOption && selectedOption != correctOption -> {
                    // Incorrect selected answer -> Rose highlight
                    binding.root.setCardBackgroundColor(ColorStateList.valueOf(Color.parseColor("#3B1414")))
                    binding.root.strokeColor = Color.parseColor("#EF4444")
                    binding.tvOptionLetter.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#EF4444"))
                    binding.tvOptionLetter.setTextColor(Color.parseColor("#09090B"))
                }
                optionText == selectedOption -> {
                    // Selected but not yet submitted -> Indigo highlight
                    binding.root.setCardBackgroundColor(ColorStateList.valueOf(Color.parseColor("#1E1B4B")))
                    binding.root.strokeColor = Color.parseColor("#818CF8")
                    binding.tvOptionLetter.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#818CF8"))
                    binding.tvOptionLetter.setTextColor(Color.parseColor("#09090B"))
                }
                else -> {
                    // Default / Unselected state
                    binding.root.setCardBackgroundColor(ColorStateList.valueOf(Color.parseColor("#0D0D14")))
                    binding.root.strokeColor = Color.parseColor("#27272A")
                    binding.tvOptionLetter.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#27272A"))
                    binding.tvOptionLetter.setTextColor(Color.parseColor("#A1A1AA"))
                }
            }

            binding.root.setOnClickListener {
                if (!isSubmitted) {
                    onOptionSelected(optionText)
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemQuizOptionBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position), position)

    companion object DiffCallback : DiffUtil.ItemCallback<String>() {
        override fun areItemsTheSame(oldItem: String, newItem: String) = oldItem == newItem
        override fun areContentsTheSame(oldItem: String, newItem: String) = oldItem == newItem
    }
}
