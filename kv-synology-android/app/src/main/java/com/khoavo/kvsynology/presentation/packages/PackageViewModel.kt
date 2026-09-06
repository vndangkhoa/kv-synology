package com.khoavo.kvsynology.presentation.packages

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.PackageItem
import com.khoavo.kvsynology.domain.repository.PackageRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PackageViewModel @Inject constructor(
    private val repository: PackageRepository
) : ViewModel() {

    private val _packagesState = MutableStateFlow<UiState<List<PackageItem>>>(UiState.Loading)
    val packagesState: StateFlow<UiState<List<PackageItem>>> = _packagesState.asStateFlow()

    init {
        loadPackages()
    }

    fun loadPackages() {
        viewModelScope.launch {
            _packagesState.value = UiState.Loading
            try {
                val list = repository.getPackages()
                _packagesState.value = if (list.isEmpty()) UiState.Empty else UiState.Success(list)
            } catch (e: Exception) {
                _packagesState.value = UiState.Error(e.message ?: "Lỗi tải trung tâm ứng dụng")
            }
        }
    }

    fun togglePackage(id: String, action: String) {
        viewModelScope.launch {
            repository.togglePackage(id, action)
            loadPackages()
        }
    }
}
