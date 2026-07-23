package com.aiinterview.presentation.common

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.PopupWindow
import com.aiinterview.databinding.PopupMenuDeleteBinding

object PopupUtils {
    fun showDeletePopupMenu(context: Context, anchorView: View, onDeleteClicked: () -> Unit) {
        val inflater = LayoutInflater.from(context)
        val binding = PopupMenuDeleteBinding.inflate(inflater, null, false)
        
        val popupWindow = PopupWindow(
            binding.root,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            true
        )
        
        popupWindow.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        popupWindow.elevation = 8f
        
        binding.btnDelete.setOnClickListener {
            onDeleteClicked()
            popupWindow.dismiss()
        }
        
        binding.root.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED)
        val xOffset = binding.root.measuredWidth - anchorView.width
        popupWindow.showAsDropDown(anchorView, -xOffset, 4)
    }
}
