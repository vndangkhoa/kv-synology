package com.khoavo.kvsynology.presentation.services

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.ReverseProxyRule
import com.khoavo.kvsynology.domain.model.ServiceItem
import com.khoavo.kvsynology.domain.repository.ServicesRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ServicesViewModel @Inject constructor(
    private val repository: ServicesRepository
) : ViewModel() {

    private val _servicesState = MutableStateFlow<UiState<List<ServiceItem>>>(UiState.Loading)
    val servicesState: StateFlow<UiState<List<ServiceItem>>> = _servicesState.asStateFlow()

    private val _reverseProxyState = MutableStateFlow<UiState<List<ReverseProxyRule>>>(UiState.Loading)
    val reverseProxyState: StateFlow<UiState<List<ReverseProxyRule>>> = _reverseProxyState.asStateFlow()

    private val _togglingIds = MutableStateFlow<Set<String>>(emptySet())
    val togglingIds: StateFlow<Set<String>> = _togglingIds.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun consumeError() { _errorMessage.value = null }

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _servicesState.value = UiState.Loading
            try {
                val list = repository.getServices()
                _servicesState.value = UiState.Success(list)
            } catch (e: Exception) {
                _servicesState.value = UiState.Error(e.message ?: "Lỗi tải dịch vụ")
            }

            try {
                val rules = repository.getReverseProxyRules()
                _reverseProxyState.value = UiState.Success(rules)
            } catch (e: Exception) {
                // Surface instead of hanging on Loading forever.
                _reverseProxyState.value = UiState.Error(e.message ?: "Lỗi tải Reverse Proxy")
            }
        }
    }

    fun toggleService(id: String, enabled: Boolean) {
        val current = (_servicesState.value as? UiState.Success)?.data ?: return
        val target = current.find { it.id == id } ?: return
        if (!target.canToggle) {
            _errorMessage.value = "Dịch vụ ${target.displayName} là dịch vụ hệ thống luôn bật, không thể tắt."
            return
        }
        if (id in _togglingIds.value) return
        // Optimistic update
        _togglingIds.value = _togglingIds.value + id
        _servicesState.value = UiState.Success(current.map {
            if (it.id == id) it.copy(enabled = enabled, status = if (enabled) "enabled" else "disabled")
            else it
        })
        viewModelScope.launch {
            try {
                val success = repository.toggleService(id, enabled)
                if (!success) {
                    // Revert + reload real state from NAS
                    _errorMessage.value = "Không thể ${if (enabled) "bật" else "tắt"} ${target.displayName}. Đã khôi phục trạng thái thực từ NAS."
                    loadServicesOnly()
                } else {
                    // Re-fetch to confirm NAS applied the change
                    loadServicesOnly()
                }
            } catch (e: Exception) {
                _errorMessage.value = "Lỗi ${if (enabled) "bật" else "tắt"} ${target.displayName}: ${e.message}"
                loadServicesOnly()
            } finally {
                _togglingIds.value = _togglingIds.value - id
            }
        }
    }

    private suspend fun loadServicesOnly() {
        try {
            val list = repository.getServices()
            _servicesState.value = UiState.Success(list)
        } catch (e: Exception) {
            // Keep optimistic state but surface error
            _errorMessage.value = e.message ?: "Lỗi tải dịch vụ"
        }
    }

    fun updateServicePort(id: String, port: Int) {
        viewModelScope.launch {
            try {
                val ok = repository.updateServicePort(id, port)
                if (!ok) {
                    _errorMessage.value = "Không thể đổi cổng dịch vụ. Vui lòng thử lại."
                }
                loadServicesOnly()
            } catch (e: Exception) {
                _errorMessage.value = "Lỗi đổi cổng: ${e.message}"
            }
        }
    }

    fun addReverseProxyRule(rule: ReverseProxyRule) {
        viewModelScope.launch {
            try {
                val ok = repository.addReverseProxyRule(rule)
                if (!ok) {
                    _errorMessage.value = "Không thể thêm quy tắc Reverse Proxy."
                }
                loadData()
            } catch (e: Exception) {
                _errorMessage.value = "Lỗi thêm quy tắc: ${e.message}"
            }
        }
    }

    fun updateReverseProxyRule(rule: ReverseProxyRule) {
        viewModelScope.launch {
            try {
                val ok = repository.updateReverseProxyRule(rule)
                if (!ok) {
                    _errorMessage.value = "Không thể cập nhật quy tắc Reverse Proxy."
                }
                loadData()
            } catch (e: Exception) {
                _errorMessage.value = "Lỗi cập nhật quy tắc: ${e.message}"
            }
        }
    }

    fun deleteReverseProxyRule(uuid: String) {
        viewModelScope.launch {
            try {
                val ok = repository.deleteReverseProxyRule(uuid)
                if (!ok) {
                    _errorMessage.value = "Không thể xóa quy tắc Reverse Proxy."
                }
                loadData()
            } catch (e: Exception) {
                _errorMessage.value = "Lỗi xóa quy tắc: ${e.message}"
            }
        }
    }
}

