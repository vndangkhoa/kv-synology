package com.khoavo.kvsynology.presentation.download

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.DownloadTask
import com.khoavo.kvsynology.domain.model.DownloadTaskStatus
import com.khoavo.kvsynology.domain.repository.DownloadRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DownloadViewModel @Inject constructor(
    private val repository: DownloadRepository
) : ViewModel() {

    private val _tasksState = MutableStateFlow<UiState<List<DownloadTask>>>(UiState.Loading)
    val tasksState: StateFlow<UiState<List<DownloadTask>>> = _tasksState.asStateFlow()

    private val _filterStatus = MutableStateFlow<DownloadTaskStatus?>(null)
    val filterStatus: StateFlow<DownloadTaskStatus?> = _filterStatus.asStateFlow()

    init {
        loadTasks()
    }

    fun loadTasks() {
        viewModelScope.launch {
            _tasksState.value = UiState.Loading
            try {
                val tasks = repository.getTasks()
                _tasksState.value = if (tasks.isEmpty()) UiState.Empty else UiState.Success(tasks)
            } catch (e: Exception) {
                _tasksState.value = UiState.Error(e.message ?: "Lỗi tải tác vụ tải xuống")
            }
        }
    }

    fun setFilter(status: DownloadTaskStatus?) {
        _filterStatus.value = status
    }

    fun addTask(uri: String, destination: String? = null) {
        viewModelScope.launch {
            repository.addTask(uri, destination)
            loadTasks()
        }
    }

    fun toggleTask(id: String, action: String) {
        viewModelScope.launch {
            repository.toggleTask(id, action)
            loadTasks()
        }
    }
}
