package com.khoavo.kvsynology.presentation.traffic

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.FirewallRule
import com.khoavo.kvsynology.domain.model.TrafficSummary
import com.khoavo.kvsynology.domain.repository.SecurityRepository
import com.khoavo.kvsynology.domain.repository.TrafficRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TrafficViewModel @Inject constructor(
    private val repository: TrafficRepository,
    private val securityRepository: SecurityRepository
) : ViewModel() {

    private val _trafficState = MutableStateFlow<UiState<TrafficSummary>>(UiState.Loading)
    val trafficState: StateFlow<UiState<TrafficSummary>> = _trafficState.asStateFlow()

    private val _snackbarMessage = MutableSharedFlow<String>()
    val snackbarMessage: SharedFlow<String> = _snackbarMessage.asSharedFlow()

    /** Live auto-refresh (default ON, 5s). */
    private val _autoRefresh = MutableStateFlow(true)
    val autoRefresh: StateFlow<Boolean> = _autoRefresh.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    /** "all" | "local" | "inbound" */
    private val _directionFilter = MutableStateFlow("all")
    val directionFilter: StateFlow<String> = _directionFilter.asStateFlow()

    private var pollJob: Job? = null

    init {
        loadTraffic()
        startPolling()
    }

    fun setAutoRefresh(enabled: Boolean) {
        _autoRefresh.value = enabled
        if (enabled) startPolling() else pollJob?.cancel()
    }

    fun setSearch(q: String) { _searchQuery.value = q }
    fun setDirectionFilter(f: String) { _directionFilter.value = f }

    private fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (true) {
                delay(5000)
                if (_autoRefresh.value) refreshQuietly()
            }
        }
    }

    fun loadTraffic() {
        viewModelScope.launch {
            _trafficState.value = UiState.Loading
            try {
                val sum = repository.getTrafficSummary()
                _trafficState.value = UiState.Success(sum)
            } catch (e: Exception) {
                _trafficState.value = UiState.Error(e.message ?: "Lỗi tải lưu lượng mạng")
            }
        }
    }

    private suspend fun refreshQuietly() {
        try {
            val sum = repository.getTrafficSummary()
            _trafficState.value = UiState.Success(sum)
        } catch (_: Exception) {
            // Keep last good frame during background polls.
        }
    }

    fun blockIp(ip: String) {
        viewModelScope.launch {
            try {
                val rule = FirewallRule(
                    id = "block_${System.currentTimeMillis()}",
                    name = "Block IP $ip",
                    ports = "all",
                    protocol = "all",
                    sourceType = "single_ip",
                    sourceValue = ip,
                    action = "deny",
                    enabled = true,
                    order = 1
                )
                val ok = securityRepository.addFirewallRule(rule)
                _snackbarMessage.emit(
                    if (ok) "Đã thêm quy tắc chặn IP $ip vào Tường lửa!"
                    else "NAS từ chối thêm quy tắc chặn IP $ip."
                )
            } catch (e: Exception) {
                _snackbarMessage.emit("Lỗi chặn IP: ${e.message}")
            }
        }
    }

    fun kickConnection(connId: String) {
        val current = (_trafficState.value as? UiState.Success)?.data ?: return
        val newConnections = current.connections.filterNot { it.id == connId }
        _trafficState.value = UiState.Success(current.copy(
            connections = newConnections,
            totalConnections = newConnections.size
        ))
        viewModelScope.launch {
            // DSM exposes no session-terminate API — be honest about it.
            _snackbarMessage.emit("Đã ẩn phiên khỏi danh sách (DSM không hỗ trợ ngắt phiên từ xa).")
        }
    }

    override fun onCleared() {
        pollJob?.cancel()
        super.onCleared()
    }
}
