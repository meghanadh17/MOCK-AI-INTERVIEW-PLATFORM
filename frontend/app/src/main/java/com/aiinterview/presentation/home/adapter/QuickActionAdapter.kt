package com.aiinterview.presentation.home.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemQuickActionBinding
import com.aiinterview.presentation.home.QuickAction

class QuickActionAdapter(
    private val items: List<QuickAction>,
    private val onClick: (QuickAction) -> Unit
) : RecyclerView.Adapter<QuickActionAdapter.ViewHolder>() {

    inner class ViewHolder(val binding: ItemQuickActionBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: QuickAction) {
            binding.tvTitle.text = item.title
            binding.tvDescription.text = item.description
            binding.ivIcon.setImageResource(item.iconRes)
            binding.ivIcon.imageTintList = ContextCompat.getColorStateList(binding.root.context, item.iconTintRes)
            binding.root.setOnClickListener { onClick(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder = ViewHolder(
        ItemQuickActionBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(items[position])

    override fun getItemCount() = items.size
}
