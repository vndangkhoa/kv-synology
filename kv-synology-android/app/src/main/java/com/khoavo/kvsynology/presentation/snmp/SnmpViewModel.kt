package com.khoavo.kvsynology.presentation.snmp

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.SnmpDevice
import com.khoavo.kvsynology.domain.repository.SnmpRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SnmpViewModel @Inject constructor(
    private val repository: SnmpRepository
) : ViewModel() {

    private val _snmpState = MutableStateFlow<UiState<List<SnmpDevice>>>(UiState.Loading)
    val snmpState: StateFlow<UiState<List<SnmpDevice>>> = _snmpState.asStateFlow()

    init {
        loadDevices()
    }

    fun loadDevices() {
        viewModelScope.launch {
            _snmpState.value = UiState.Loading
            try {
                val devs = repository.getDevices()
                _snmpState.value = UiState.Success(devs)
            } catch (e: Exception) {
                _snmpState.value = UiState.Error(e.message ?: "Lỗi tải thiết bị SNMP")
            }
        }
    }
}
