package com.aiinterview.presentation.interview.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemSessionCardBinding

class SessionListAdapter(
    private val onClick: (Any) -> Unit = {}
) : ListAdapter<Any, SessionListAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemSessionCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: Any) {
            // TODO: Bind data to views
            binding.root.setOnClickListener { onClick(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemSessionCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<Any>() {
        override fun areItemsTheSame(oldItem: Any, newItem: Any) = oldItem === newItem
        override fun areContentsTheSame(oldItem: Any, newItem: Any) = oldItem == newItem
    }
}
