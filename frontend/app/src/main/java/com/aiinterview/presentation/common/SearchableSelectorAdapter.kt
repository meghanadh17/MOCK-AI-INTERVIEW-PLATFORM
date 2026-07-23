package com.aiinterview.presentation.common

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemSelectorOptionBinding

data class SelectorOption(
    val id: String,
    val text: String,
    val isSelected: Boolean = false
)

class SearchableSelectorAdapter(
    private val onSelected: (SelectorOption) -> Unit
) : ListAdapter<SelectorOption, SearchableSelectorAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(private val binding: ItemSelectorOptionBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: SelectorOption) {
            binding.tvOptionText.text = item.text
            binding.ivSelected.visibility = if (item.isSelected) View.VISIBLE else View.GONE
            binding.root.setOnClickListener {
                onSelected(item)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemSelectorOptionBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    companion object DiffCallback : DiffUtil.ItemCallback<SelectorOption>() {
        override fun areItemsTheSame(oldItem: SelectorOption, newItem: SelectorOption): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: SelectorOption, newItem: SelectorOption): Boolean {
            return oldItem == newItem
        }
    }
}
