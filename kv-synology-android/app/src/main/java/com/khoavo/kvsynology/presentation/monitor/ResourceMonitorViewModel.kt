package com.khoavo.kvsynology.presentation.monitor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.DsmProcess
import com.khoavo.kvsynology.domain.model.SystemUtilization
import com.khoavo.kvsynology.domain.repository.SystemRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ResourceMonitorViewModel @Inject constructor(
    private val systemRepository: SystemRepository
) : ViewModel() {

    private val _processesState = MutableStateFlow<UiState<List<DsmProcess>>>(UiState.Loading)
    val processesState: StateFlow<UiState<List<DsmProcess>>> = _processesState.asStateFlow()

    private val _currentTelemetry = MutableStateFlow(SystemUtilization())
    val currentTelemetry: StateFlow<SystemUtilization> = _currentTelemetry.asStateFlow()

    private val _telemetryHistory = MutableStateFlow<List<SystemUtilization>>(emptyList())
    val telemetryHistory: StateFlow<List<SystemUtilization>> = _telemetryHistory.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedFilter = MutableStateFlow("all") // all, running, highCpu, highRam, system
    val selectedFilter: StateFlow<String> = _selectedFilter.asStateFlow()

    private val _sortBy = MutableStateFlow("cpu") // cpu, memory, pid, name
    val sortBy: StateFlow<String> = _sortBy.asStateFlow()

    private val _sortDesc = MutableStateFlow(true)
    val sortDesc: StateFlow<Boolean> = _sortDesc.asStateFlow()

    init {
        loadData()
        observeTelemetry()
    }

    fun loadData() {
        viewModelScope.launch {
            _processesState.value = UiState.Loading
            try {
                val procs = systemRepository.getProcesses()
                _processesState.value = if (procs.isEmpty()) UiState.Empty else UiState.Success(procs)
            } catch (e: Exception) {
                _processesState.value = UiState.Error(e.message ?: "Lỗi tải danh sách tiến trình")
            }
        }
    }

    private fun observeTelemetry() {
        viewModelScope.launch {
            systemRepository.getTelemetryFlow().collect { util ->
                _currentTelemetry.value = util
                _telemetryHistory.update { prev ->
                    (prev + util).takeLast(25)
                }
            }
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setFilter(filter: String) {
        _selectedFilter.value = filter
    }

    fun setSort(by: String) {
        if (_sortBy.value == by) {
            _sortDesc.value = !_sortDesc.value
        } else {
            _sortBy.value = by
            _sortDesc.value = true
        }
    }

    fun killProcess(pid: Int, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            val success = systemRepository.killProcess(pid)
            if (success) {
                loadData()
            }
            onResult(success)
        }
    }
}
