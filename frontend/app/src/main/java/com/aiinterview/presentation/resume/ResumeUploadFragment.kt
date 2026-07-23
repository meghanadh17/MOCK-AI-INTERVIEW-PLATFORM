package com.aiinterview.presentation.resume

import android.content.res.ColorStateList
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.viewModels
import com.aiinterview.R
import com.aiinterview.core.base.BaseFragment
import com.aiinterview.databinding.FragmentResumeUploadBinding
import dagger.hilt.android.AndroidEntryPoint
import java.io.ByteArrayOutputStream
import androidx.navigation.fragment.findNavController

@AndroidEntryPoint
class ResumeUploadFragment : BaseFragment<FragmentResumeUploadBinding>() {

    private val viewModel: ResumeViewModel by viewModels()

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            handleFileSelection(uri)
        }
    }

    override fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?) =
        FragmentResumeUploadBinding.inflate(inflater, container, false)

    override fun onViewReady(savedInstanceState: Bundle?) {
        setupClickListeners()
        observeViewModel()
    }

    private fun setupClickListeners() {
        binding.btnBack.setOnClickListener {
            navigateUp()
        }
        binding.layoutDragDrop.setOnClickListener {
            filePickerLauncher.launch("application/pdf")
        }
        binding.btnBrowse.setOnClickListener {
            filePickerLauncher.launch("application/pdf")
        }
    }

    private fun handleFileSelection(uri: Uri) {
        val context = context ?: return
        var filename = "resume.pdf"
        var size = 0L

        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
            if (cursor.moveToFirst()) {
                if (nameIndex != -1) filename = cursor.getString(nameIndex)
                if (sizeIndex != -1) size = cursor.getLong(sizeIndex)
            }
        }

        binding.tvUploadFilename.text = filename
        binding.tvUploadSize.text = String.format("%.1f KB", size / 1024f)
        binding.cardUploadProgress.visibility = View.VISIBLE
        binding.cardStepper.visibility = View.VISIBLE

        try {
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                val byteBuffer = ByteArrayOutputStream()
                val buffer = ByteArray(1024)
                var len: Int
                while (inputStream.read(buffer).also { len = it } != -1) {
                    byteBuffer.write(buffer, 0, len)
                }
                val fileBytes = byteBuffer.toByteArray()
                viewModel.uploadResume(filename, "application/pdf", fileBytes)
            }
        } catch (e: Exception) {
            showError("Could not read file: ${e.localizedMessage}")
        }
    }

    private fun observeViewModel() {
        viewModel.uploadState.collectLatestLifecycleFlow { state ->
            when (state) {
                is UploadUiState.Idle -> {
                    binding.cardUploadProgress.visibility = View.GONE
                }
                is UploadUiState.Progress -> {
                    binding.uploadProgressBar.progress = state.percentage
                    binding.tvUploadStatus.text = "Uploading: ${state.percentage}%"
                    
                    setStepState(1, StepState.ACTIVE)
                    setStepState(2, StepState.INACTIVE)
                    setStepState(3, StepState.INACTIVE)
                }
                is UploadUiState.Success -> {
                    binding.uploadProgressBar.progress = 100
                    binding.tvUploadStatus.text = "File uploaded successfully."
                    
                    setStepState(1, StepState.COMPLETED)
                    setStepState(2, StepState.ACTIVE)
                }
                is UploadUiState.Error -> {
                    binding.tvUploadStatus.text = "Error: ${state.message}"
                    showError(state.message)
                }
            }
        }

        viewModel.parseStatus.collectLatestLifecycleFlow { status ->
            if (status != null) {
                val stepStatus = status.status.uppercase()
                binding.tvUploadStatus.text = "Parsing: ${status.progress}%"
                
                when (stepStatus) {
                    "SUCCESS" -> {
                        setStepState(2, StepState.COMPLETED)
                        setStepState(3, StepState.COMPLETED)
                        binding.tvUploadStatus.text = "Successfully Parsed & Analyzed!"
                        
                        val resumeId = viewModel.uploadState.value.let { state ->
                            if (state is UploadUiState.Success) state.resume.id else ""
                        }
                        viewModel.clearParseStatus()
                        
                        if (findNavController().currentDestination?.id == R.id.resumeUploadFragment) {
                            val bundle = Bundle().apply {
                                putString("resumeId", resumeId)
                            }
                            showSuccess("Resume parsed successfully!")
                            navigate(R.id.resumeDetailFragment, bundle)
                        }
                    }
                    "FAILED" -> {
                        setStepState(2, StepState.FAILED)
                        binding.tvUploadStatus.text = "Parsing failed: ${status.error_message}"
                        showError(status.error_message ?: "Unknown parsing error")
                    }
                    "PROCESSING", "PARSING" -> {
                        setStepState(2, StepState.ACTIVE)
                        setStepState(3, StepState.INACTIVE)
                    }
                    "ANALYZING", "ANALYSIS" -> {
                        setStepState(2, StepState.COMPLETED)
                        setStepState(3, StepState.ACTIVE)
                    }
                }
            }
        }
    }

    private fun setStepState(stepNum: Int, state: StepState) {
        val (numView, labelView) = when (stepNum) {
            1 -> Pair(binding.tvStep1Num, binding.tvStep1Label)
            2 -> Pair(binding.tvStep2Num, binding.tvStep2Label)
            else -> Pair(binding.tvStep3Num, binding.tvStep3Label)
        }

        when (state) {
            StepState.INACTIVE -> {
                numView.backgroundTintList = ColorStateList.valueOf(0xFF27272A.toInt())
                numView.setTextColor(0xFF6B6B80.toInt())
                labelView.setTextColor(0xFF6B6B80.toInt())
            }
            StepState.ACTIVE -> {
                numView.backgroundTintList = ColorStateList.valueOf(0xFF3B82F6.toInt())
                numView.setTextColor(0xFFFFFFFF.toInt())
                labelView.setTextColor(0xFFFFFFFF.toInt())
            }
            StepState.COMPLETED -> {
                numView.backgroundTintList = ColorStateList.valueOf(0xFF10B981.toInt())
                numView.setTextColor(0xFFFFFFFF.toInt())
                labelView.setTextColor(0xFFD1FAE5.toInt())
            }
            StepState.FAILED -> {
                numView.backgroundTintList = ColorStateList.valueOf(0xFFEF4444.toInt())
                numView.setTextColor(0xFFFFFFFF.toInt())
                labelView.setTextColor(0xFFEF4444.toInt())
            }
        }
    }

    enum class StepState {
        INACTIVE, ACTIVE, COMPLETED, FAILED
    }
}
