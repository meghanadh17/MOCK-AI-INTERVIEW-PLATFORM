package com.aiinterview.presentation.common

import android.content.Context
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import androidx.recyclerview.widget.LinearLayoutManager
import com.aiinterview.databinding.LayoutSearchableSelectorBinding
import com.google.android.material.bottomsheet.BottomSheetDialog

object SearchableSelectorDialog {
    fun show(
        context: Context,
        title: String,
        options: List<SelectorOption>,
        enableCustomInput: Boolean = false,
        onSelected: (SelectorOption) -> Unit
    ) {
        val dialog = BottomSheetDialog(context)
        val binding = LayoutSearchableSelectorBinding.inflate(LayoutInflater.from(context))
        dialog.setContentView(binding.root)

        binding.tvTitle.text = title

        val adapter = SearchableSelectorAdapter { option ->
            if (option.id == "CUSTOM_INPUT") {
                // Return clean custom text
                val cleanText = option.text.substringAfter("Use: \"").substringBeforeLast("\"")
                onSelected(SelectorOption(id = "CUSTOM_INPUT", text = cleanText))
            } else {
                onSelected(option)
            }
            dialog.dismiss()
        }

        binding.rvOptions.layoutManager = LinearLayoutManager(context)
        binding.rvOptions.adapter = adapter
        adapter.submitList(options)

        // Filter text logic
        binding.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val query = s?.toString().orEmpty()
                val queryLower = query.lowercase().trim()
                
                val filtered = mutableListOf<SelectorOption>()
                if (enableCustomInput && query.trim().isNotEmpty()) {
                    filtered.add(SelectorOption(id = "CUSTOM_INPUT", text = "Use: \"$query\""))
                }
                
                val matchOptions = if (queryLower.isEmpty()) {
                    options
                } else {
                    options.filter { it.text.lowercase().contains(queryLower) }
                }
                filtered.addAll(matchOptions)
                adapter.submitList(filtered)
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        dialog.show()
    }
}
