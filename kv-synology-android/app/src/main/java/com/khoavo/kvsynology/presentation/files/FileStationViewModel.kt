package com.khoavo.kvsynology.presentation.files

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.FileItem
import com.khoavo.kvsynology.domain.model.ShareLink
import com.khoavo.kvsynology.domain.repository.FileStationRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

data class FileClipboard(
    val isCut: Boolean,
    val item: FileItem
)

@HiltViewModel
class FileStationViewModel @Inject constructor(
    private val repository: FileStationRepository
) : ViewModel() {

    private val _currentPath = MutableStateFlow("/")
    val currentPath: StateFlow<String> = _currentPath.asStateFlow()

    private val _filesState = MutableStateFlow<UiState<List<FileItem>>>(UiState.Loading)
    val filesState: StateFlow<UiState<List<FileItem>>> = _filesState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedPreviewFile = MutableStateFlow<FileItem?>(null)
    val selectedPreviewFile: StateFlow<FileItem?> = _selectedPreviewFile.asStateFlow()

    private val _createdShareLink = MutableStateFlow<ShareLink?>(null)
    val createdShareLink: StateFlow<ShareLink?> = _createdShareLink.asStateFlow()

    private val _clipboard = MutableStateFlow<FileClipboard?>(null)
    val clipboard: StateFlow<FileClipboard?> = _clipboard.asStateFlow()

    private val _editingFile = MutableStateFlow<FileItem?>(null)
    val editingFile: StateFlow<FileItem?> = _editingFile.asStateFlow()

    private val _editingContent = MutableStateFlow<String?>(null)
    val editingContent: StateFlow<String?> = _editingContent.asStateFlow()

    private val _isSaving = MutableStateFlow(false)
    val isSaving: StateFlow<Boolean> = _isSaving.asStateFlow()

    private val _userMessage = MutableSharedFlow<String>()
    val userMessage: SharedFlow<String> = _userMessage.asSharedFlow()

    init {
        loadDirectory("/")
    }

    fun loadDirectory(path: String) {
        _currentPath.value = path
        viewModelScope.launch {
            _filesState.value = UiState.Loading
            try {
                val files = repository.listFiles(path)
                _filesState.value = if (files.isEmpty()) UiState.Empty else UiState.Success(files)
            } catch (e: Exception) {
                _filesState.value = UiState.Error(e.message ?: "Không thể đọc thư mục")
            }
        }
    }

    fun navigateInto(item: FileItem) {
        if (item.isdir) {
            loadDirectory(item.path)
        } else {
            _selectedPreviewFile.value = item
        }
    }

    fun navigateUp() {
        val curr = _currentPath.value
        if (curr == "/" || curr.isEmpty()) return
        val parent = curr.substringBeforeLast('/').ifEmpty { "/" }
        loadDirectory(parent)
    }

    fun setSearch(q: String) {
        _searchQuery.value = q
    }

    fun dismissPreview() {
        _selectedPreviewFile.value = null
    }

    fun createFolder(name: String) {
        viewModelScope.launch {
            val ok = repository.createFolder(_currentPath.value, name)
            if (ok) {
                loadDirectory(_currentPath.value)
                _userMessage.emit("Đã tạo thư mục \"$name\"")
            } else {
                _userMessage.emit("Không thể tạo thư mục \"$name\"")
            }
        }
    }

    fun deleteItem(item: FileItem) {
        viewModelScope.launch {
            val ok = repository.deleteFile(item.path)
            if (ok) {
                loadDirectory(_currentPath.value)
                _userMessage.emit("Đã xóa \"${item.name}\"")
            } else {
                _userMessage.emit("Không thể xóa \"${item.name}\"")
            }
        }
    }

    fun renameItem(item: FileItem, newName: String) {
        viewModelScope.launch {
            val ok = repository.renameFile(item.path, newName)
            if (ok) {
                loadDirectory(_currentPath.value)
                _userMessage.emit("Đã đổi tên thành \"$newName\"")
            } else {
                _userMessage.emit("Không thể đổi tên \"${item.name}\"")
            }
        }
    }

    // --- Cut, Copy, Paste ---

    fun cutItem(item: FileItem) {
        _clipboard.value = FileClipboard(isCut = true, item = item)
        viewModelScope.launch {
            _userMessage.emit("Đã chọn cắt \"${item.name}\"")
        }
    }

    fun copyItem(item: FileItem) {
        _clipboard.value = FileClipboard(isCut = false, item = item)
        viewModelScope.launch {
            _userMessage.emit("Đã chọn sao chép \"${item.name}\"")
        }
    }

    fun clearClipboard() {
        _clipboard.value = null
    }

    fun pasteClipboard() {
        val clip = _clipboard.value ?: return
        val destFolder = _currentPath.value
        viewModelScope.launch {
            val ok = repository.copyMoveFiles(
                paths = listOf(clip.item.path),
                destFolder = destFolder,
                isCut = clip.isCut
            )
            if (ok) {
                _userMessage.emit(
                    if (clip.isCut) "Đã chuyển \"${clip.item.name}\" đến $destFolder"
                    else "Đã sao chép \"${clip.item.name}\" đến $destFolder"
                )
                _clipboard.value = null
                loadDirectory(destFolder)
            } else {
                _userMessage.emit("Thao tác dán thất bại")
            }
        }
    }

    // --- File Editing ---

    fun startEditing(item: FileItem) {
        _editingFile.value = item
        _editingContent.value = null
        viewModelScope.launch {
            try {
                val content = repository.getFileContent(item.path)
                _editingContent.value = content
            } catch (e: Exception) {
                _editingContent.value = "Lỗi khi đọc tệp: ${e.message}"
            }
        }
    }

    fun saveEditingContent(content: String) {
        val file = _editingFile.value ?: return
        viewModelScope.launch {
            _isSaving.value = true
            val ok = repository.saveFileContent(file.path, content)
            _isSaving.value = false
            if (ok) {
                _editingFile.value = null
                _editingContent.value = null
                _userMessage.emit("Đã lưu \"${file.name}\" thành công")
                loadDirectory(_currentPath.value)
            } else {
                _userMessage.emit("Không thể lưu thay đổi vào \"${file.name}\"")
            }
        }
    }

    fun cancelEditing() {
        _editingFile.value = null
        _editingContent.value = null
    }

    // --- Sharing ---

    fun createShareLink(item: FileItem) {
        viewModelScope.launch {
            try {
                val link = repository.createShareLink(item.path)
                _createdShareLink.value = link
            } catch (e: Exception) {
                _userMessage.emit("Lỗi tạo liên kết: ${e.message}")
            }
        }
    }

    fun dismissShareDialog() {
        _createdShareLink.value = null
    }

    // --- Download ---

    fun downloadFile(context: Context, item: FileItem) {
        viewModelScope.launch {
            _userMessage.emit("Đang tải \"${item.name}\"...")
            try {
                var targetUri: android.net.Uri? = null
                var targetFile: File? = null
                val written = withContext(Dispatchers.IO) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val values = ContentValues().apply {
                            put(MediaStore.MediaColumns.DISPLAY_NAME, item.name)
                            put(MediaStore.MediaColumns.MIME_TYPE, item.mimeType ?: "*/*")
                            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/KVSynology")
                        }
                        val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                            ?: throw IllegalStateException("Cannot create MediaStore entry")
                        targetUri = uri
                        context.contentResolver.openOutputStream(uri)?.use { os ->
                            repository.downloadFileToStream(item.path, os)
                        } ?: throw IllegalStateException("Cannot open output stream")
                    } else {
                        val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "KVSynology")
                        dir.mkdirs()
                        val file = File(dir, item.name)
                        targetFile = file
                        FileOutputStream(file).use { fos ->
                            repository.downloadFileToStream(item.path, fos)
                        }
                    }
                }

                if (written < 0) {
                    // Don't leave a 0-byte / error-page stub behind.
                    withContext(Dispatchers.IO) {
                        targetUri?.let { runCatching { context.contentResolver.delete(it, null, null) } }
                        targetFile?.let { runCatching { if (it.exists()) it.delete() } }
                    }
                    _userMessage.emit("Không thể tải \"${item.name}\" (máy chủ từ chối hoặc mất kết nối)")
                } else {
                    _userMessage.emit("Đã lưu \"${item.name}\" (${written / 1024} KB) vào thư mục Tải về (Downloads/KVSynology)")
                }
            } catch (e: Exception) {
                _userMessage.emit("Lỗi tải xuống: ${e.message}")
            }
        }
    }

    fun getStreamUrl(item: FileItem): String = repository.getStreamUrl(item.path)
    fun getDownloadUrl(item: FileItem): String = repository.getDownloadUrl(item.path)
}
