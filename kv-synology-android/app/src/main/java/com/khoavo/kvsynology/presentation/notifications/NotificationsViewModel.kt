package com.khoavo.kvsynology.presentation.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.NotificationItem
import com.khoavo.kvsynology.domain.repository.NotificationsRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val repository: NotificationsRepository
) : ViewModel() {

    private val _notificationsState = MutableStateFlow<UiState<List<NotificationItem>>>(UiState.Loading)
    val notificationsState: StateFlow<UiState<List<NotificationItem>>> = _notificationsState.asStateFlow()

    init {
        loadNotifications()
    }

    fun loadNotifications() {
        viewModelScope.launch {
            _notificationsState.value = UiState.Loading
            try {
                val list = repository.getNotifications()
                _notificationsState.value = if (list.isEmpty()) UiState.Empty else UiState.Success(list)
            } catch (e: Exception) {
                _notificationsState.value = UiState.Error(e.message ?: "Lỗi tải thông báo")
            }
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            try {
                repository.markAllRead()
                loadNotifications()
            } catch (_: Exception) {}
        }
    }

    fun clearAll() {
        viewModelScope.launch {
            repository.clearAll()
            _notificationsState.value = UiState.Empty
        }
    }
}
