package com.khoavo.kvsynology.presentation.security

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.FirewallConfig
import com.khoavo.kvsynology.domain.model.FirewallRule
import com.khoavo.kvsynology.domain.repository.SecurityRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SecurityViewModel @Inject constructor(
    private val repository: SecurityRepository
) : ViewModel() {

    private val _firewallState = MutableStateFlow<UiState<FirewallConfig>>(UiState.Loading)
    val firewallState: StateFlow<UiState<FirewallConfig>> = _firewallState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _firewallState.value = UiState.Loading
            try {
                val cfg = repository.getFirewallConfig()
                _firewallState.value = UiState.Success(cfg)
            } catch (e: Exception) {
                _firewallState.value = UiState.Error(e.message ?: "Lỗi tải cấu hình tường lửa")
            }
        }
    }

    fun addRule(rule: FirewallRule) {
        viewModelScope.launch {
            repository.addFirewallRule(rule)
            loadData()
        }
    }

    fun editRule(rule: FirewallRule) {
        viewModelScope.launch {
            repository.addFirewallRule(rule)
            loadData()
        }
    }

    fun toggleRule(name: String, enabled: Boolean) {
        viewModelScope.launch {
            repository.toggleFirewallRule(name, enabled)
            loadData()
        }
    }

    fun deleteRule(name: String) {
        viewModelScope.launch {
            repository.deleteFirewallRule(name)
            loadData()
        }
    }
}
