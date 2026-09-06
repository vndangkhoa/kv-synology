package com.khoavo.kvsynology.presentation.storage

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.StorageVolume
import com.khoavo.kvsynology.domain.repository.StorageRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StorageViewModel @Inject constructor(
    private val repository: StorageRepository
) : ViewModel() {

    private val _volumesState = MutableStateFlow<UiState<List<StorageVolume>>>(UiState.Loading)
    val volumesState: StateFlow<UiState<List<StorageVolume>>> = _volumesState.asStateFlow()

    init {
        loadStorage()
    }

    fun loadStorage() {
        viewModelScope.launch {
            _volumesState.value = UiState.Loading
            try {
                val vols = repository.getVolumes()
                _volumesState.value = if (vols.isEmpty()) UiState.Empty else UiState.Success(vols)
            } catch (e: Exception) {
                _volumesState.value = UiState.Error(e.message ?: "Lỗi tải thông tin lưu trữ")
            }
        }
    }
}
