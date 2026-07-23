package com.aiinterview.presentation.video.adapter



import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.aiinterview.databinding.ItemFrameAnnotationBinding
import com.aiinterview.domain.model.FrameMetric
import java.util.Locale

class FrameAnnotationAdapter(
    private val onClick: (FrameMetric) -> Unit = {}
) : ListAdapter<FrameMetric, FrameAnnotationAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(val binding: ItemFrameAnnotationBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: FrameMetric) {
            val seconds = item.timestamp / 1000
            val minutes = seconds / 60
            binding.tvTimestamp.text = String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds % 60)

            val (title, detail) = when {
                item.postureScore < 0.7f -> {
                    "Poor Posture" to "Slouched alignment detected (score: ${(item.postureScore * 100).toInt()}%)"
                }
                !item.eyeContact -> {
                    "Diverted Gaze" to "Eye contact lost with the camera lens"
                }
                item.emotion.lowercase() == "nervous" -> {
                    "Nervousness Detected" to "Facial expression indicating tension (confidence: ${(item.confidence * 100).toInt()}%)"
                }
                item.emotion.lowercase() == "fear" -> {
                    "Stress Expression" to "Facial tension peaks observed"
                }
                else -> {
                    "${item.emotion.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }} State" to "Confidence index at ${(item.confidence * 100).toInt()}%"
                }
            }

            binding.tvEventTitle.text = title
            binding.tvEventDetail.text = detail

            binding.root.setOnClickListener { onClick(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemFrameAnnotationBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<FrameMetric>() {
        override fun areItemsTheSame(oldItem: FrameMetric, newItem: FrameMetric) =
            oldItem.timestamp == newItem.timestamp
        override fun areContentsTheSame(oldItem: FrameMetric, newItem: FrameMetric) =
            oldItem == newItem
    }
}
