package com.aiinterview.presentation.video.adapter



import android.graphics.Color
import android.view.Gravity
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.PopupWindow
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemEmotionSegmentBinding
import com.aiinterview.domain.model.EmotionWindow

class EmotionTimelineAdapter(
    private val onClick: (EmotionWindow) -> Unit = {}
) : ListAdapter<EmotionWindow, EmotionTimelineAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemEmotionSegmentBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: EmotionWindow) {
            val colorStr = when (item.dominantEmotion.lowercase()) {
                "confident" -> "#10B981" // emerald
                "happy" -> "#F59E0B"     // amber
                "nervous" -> "#F97316"   // orange
                "neutral" -> "#6366F1"   // indigo
                "fear" -> "#F43F5E"      // rose
                else -> "#6366F1"        // neutral default
            }
            binding.viewColorBar.setBackgroundColor(Color.parseColor(colorStr))
            binding.root.setOnClickListener { onClick(item) }

            binding.root.setOnLongClickListener { view ->
                val context = view.context
                val tooltipText = "${item.dominantEmotion} (${(item.averageConfidence * 100).toInt()}%)"
                val popupView = TextView(context).apply {
                    text = tooltipText
                    setBackgroundColor(Color.parseColor("#18181B")) // bg_elevated
                    setTextColor(Color.WHITE)
                    setPadding(16, 8, 16, 8)
                    textSize = 12f
                }
                val popupWindow = PopupWindow(
                    popupView,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    true
                )
                popupWindow.showAsDropDown(view, 0, -view.height - 40, Gravity.CENTER)
                true
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemEmotionSegmentBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<EmotionWindow>() {
        override fun areItemsTheSame(oldItem: EmotionWindow, newItem: EmotionWindow) =
            oldItem.startTimeS == newItem.startTimeS
        override fun areContentsTheSame(oldItem: EmotionWindow, newItem: EmotionWindow) =
            oldItem == newItem
    }
}
