package com.khoavo.kvsynology.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.DsmProcess
import com.khoavo.kvsynology.domain.model.SystemInfo
import com.khoavo.kvsynology.domain.model.SystemUtilization
import com.khoavo.kvsynology.domain.repository.SystemRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val systemRepository: SystemRepository
) : ViewModel() {

    private val _systemInfo = MutableStateFlow<UiState<SystemInfo>>(UiState.Loading)
    val systemInfo: StateFlow<UiState<SystemInfo>> = _systemInfo.asStateFlow()

    private val _processes = MutableStateFlow<UiState<List<DsmProcess>>>(UiState.Loading)
    val processes: StateFlow<UiState<List<DsmProcess>>> = _processes.asStateFlow()

    private val _currentUtilization = MutableStateFlow(SystemUtilization())
    val currentUtilization: StateFlow<SystemUtilization> = _currentUtilization.asStateFlow()

    private val _utilizationHistory = MutableStateFlow<List<SystemUtilization>>(emptyList())
    val utilizationHistory: StateFlow<List<SystemUtilization>> = _utilizationHistory.asStateFlow()

    init {
        loadDashboardData()
        observeTelemetry()
    }

    fun loadDashboardData() {
        viewModelScope.launch {
            try {
                val info = systemRepository.getSystemInfo()
                _systemInfo.value = UiState.Success(info)
            } catch (e: Exception) {
                _systemInfo.value = UiState.Error(e.message ?: "Lỗi tải thông tin phần cứng")
            }

            try {
                val procs = systemRepository.getProcesses()
                _processes.value = UiState.Success(procs)
            } catch (e: Exception) {
                _processes.value = UiState.Error(e.message ?: "Lỗi tải danh sách tiến trình")
            }
        }
    }

    private fun observeTelemetry() {
        viewModelScope.launch {
            systemRepository.getTelemetryFlow().collect { util ->
                _currentUtilization.value = util
                _utilizationHistory.update { prev ->
                    (prev + util).takeLast(20) // Keep last 20 samples for live charts
                }
            }
        }
    }

    fun executePowerAction(action: String, onComplete: () -> Unit) {
        viewModelScope.launch {
            systemRepository.powerAction(action)
            onComplete()
        }
    }
}
