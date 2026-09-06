package com.khoavo.kvsynology.presentation.permissions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.FolderAclInfo
import com.khoavo.kvsynology.domain.model.FolderUserAccess
import com.khoavo.kvsynology.domain.repository.PermissionsRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PermissionsViewModel @Inject constructor(
    private val repository: PermissionsRepository
) : ViewModel() {

    private val _foldersState = MutableStateFlow<List<String>>(listOf("/docker", "/Backups", "/KVDownload", "/homes", "/web", "/music", "/video"))
    val foldersState: StateFlow<List<String>> = _foldersState.asStateFlow()

    private val _aclState = MutableStateFlow<UiState<FolderAclInfo>>(UiState.Loading)
    val aclState: StateFlow<UiState<FolderAclInfo>> = _aclState.asStateFlow()

    private val _saveStatus = MutableStateFlow<String?>(null)
    val saveStatus: StateFlow<String?> = _saveStatus.asStateFlow()

    private var currentPath: String = "/docker"

    init {
        loadFoldersAndAcl()
    }

    fun loadFoldersAndAcl(selected: String? = null) {
        viewModelScope.launch {
            try {
                val list = repository.getSharedFolderList()
                if (list.isNotEmpty()) {
                    _foldersState.value = list
                }
                val path = selected ?: list.firstOrNull() ?: currentPath
                loadAcl(path)
            } catch (_: Exception) {
                loadAcl(currentPath)
            }
        }
    }

    fun loadAcl(path: String = currentPath) {
        currentPath = path
        viewModelScope.launch {
            _aclState.value = UiState.Loading
            _saveStatus.value = null
            try {
                val acl = repository.getFolderAcl(path)
                _aclState.value = UiState.Success(acl)
            } catch (e: Exception) {
                _aclState.value = UiState.Error(e.message ?: "Không thể tải thông tin phân quyền")
            }
        }
    }

    fun addPermission(access: FolderUserAccess) {
        val current = (_aclState.value as? UiState.Success)?.data ?: return
        val newList = current.accessList.filterNot { it.targetName.equals(access.targetName, ignoreCase = true) } + access
        _aclState.value = UiState.Success(current.copy(accessList = newList))
        _saveStatus.value = "Đã thêm quyền cho ${access.targetName}. Nhấn 'Lưu thay đổi' để áp dụng."
    }

    fun updatePermission(access: FolderUserAccess) {
        val current = (_aclState.value as? UiState.Success)?.data ?: return
        val newList = current.accessList.map { 
            if (it.targetName.equals(access.targetName, ignoreCase = true)) access else it 
        }
        _aclState.value = UiState.Success(current.copy(accessList = newList))
        _saveStatus.value = "Đã cập nhật quyền cho ${access.targetName}."
    }

    fun deletePermission(targetName: String) {
        val current = (_aclState.value as? UiState.Success)?.data ?: return
        val newList = current.accessList.filterNot { it.targetName.equals(targetName, ignoreCase = true) }
        _aclState.value = UiState.Success(current.copy(accessList = newList))
        _saveStatus.value = "Đã xóa quyền của $targetName."
    }

    fun saveChanges() {
        val current = (_aclState.value as? UiState.Success)?.data ?: return
        viewModelScope.launch {
            _saveStatus.value = "Đang lưu phân quyền lên NAS..."
            try {
                val ok = repository.saveFolderAcl(currentPath, current.accessList)
                if (ok) {
                    _saveStatus.value = "Đã lưu và áp dụng phân quyền thành công cho thư mục $currentPath!"
                    loadAcl(currentPath)
                } else {
                    _saveStatus.value = "NAS từ chối lưu phân quyền. Kiểm tra quyền admin và thử lại."
                }
            } catch (e: Exception) {
                _saveStatus.value = "Lỗi lưu phân quyền: ${e.message}"
            }
        }
    }

    fun clearSaveStatus() {
        _saveStatus.value = null
    }
}
