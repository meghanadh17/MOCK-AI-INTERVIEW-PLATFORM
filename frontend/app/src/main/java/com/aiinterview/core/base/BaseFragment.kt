package com.aiinterview.core.base

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.viewbinding.ViewBinding
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import androidx.navigation.fragment.findNavController
import com.aiinterview.core.extensions.ToastType
import com.aiinterview.core.extensions.showCustomToast

abstract class BaseFragment<VB : ViewBinding> : Fragment() {

    private var _binding: VB? = null
    protected val binding get() = _binding!!
    protected val bindingOrNull: VB? get() = _binding

    abstract fun inflateBinding(inflater: LayoutInflater, container: ViewGroup?): VB
    abstract fun onViewReady(savedInstanceState: Bundle?)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        _binding = inflateBinding(inflater, container)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        onViewReady(savedInstanceState)
    }

    protected fun showLoading(show: Boolean) {
        val overlay = binding.root.findViewById<View>(com.aiinterview.R.id.loading_overlay)
        overlay?.visibility = if (show) View.VISIBLE else View.GONE
    }

    protected fun showError(message: String) {
        showCustomToast(message, ToastType.ERROR)
    }

    protected fun showSuccess(message: String) {
        showCustomToast(message, ToastType.SUCCESS)
    }

    protected fun showInfo(message: String) {
        showCustomToast(message, ToastType.INFO)
    }

    protected fun showToast(message: String, type: ToastType) {
        showCustomToast(message, type)
    }

    protected fun <T> Flow<T>.collectLatestLifecycleFlow(collect: suspend (T) -> Unit) {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                this@collectLatestLifecycleFlow.collectLatest(collect)
            }
        }
    }

    protected fun <T> Flow<T>.collectLifecycleFlow(collect: suspend (T) -> Unit) {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                this@collectLifecycleFlow.collect { collect(it) }
            }
        }
    }

    protected fun navigate(
        destinationId: Int,
        args: Bundle? = null,
        navOptions: androidx.navigation.NavOptions? = null,
        navigatorExtras: androidx.navigation.Navigator.Extras? = null
    ) {
        findNavController().navigate(destinationId, args, navOptions, navigatorExtras)
    }

    protected fun navigateUp() {
        findNavController().navigateUp()
    }

    protected fun popBackStack() {
        findNavController().popBackStack()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
