package com.khoavo.kvsynology.presentation.docker

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.domain.model.DockerContainerDetails
import com.khoavo.kvsynology.domain.model.DockerImage
import com.khoavo.kvsynology.domain.model.DockerProject
import com.khoavo.kvsynology.domain.model.PackageItem
import com.khoavo.kvsynology.domain.repository.DockerRepository
import com.khoavo.kvsynology.domain.repository.PackageRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DockerViewModel @Inject constructor(
    private val repository: DockerRepository,
    private val packageRepository: PackageRepository
) : ViewModel() {

    private val _containersState = MutableStateFlow<UiState<List<DockerContainerDetails>>>(UiState.Loading)
    val containersState: StateFlow<UiState<List<DockerContainerDetails>>> = _containersState.asStateFlow()

    private val _projectsState = MutableStateFlow<UiState<List<DockerProject>>>(UiState.Loading)
    val projectsState: StateFlow<UiState<List<DockerProject>>> = _projectsState.asStateFlow()

    private val _imagesState = MutableStateFlow<UiState<List<DockerImage>>>(UiState.Loading)
    val imagesState: StateFlow<UiState<List<DockerImage>>> = _imagesState.asStateFlow()

    /** Container Manager package (links Package Center ↔ Docker). */
    private val _containerPkg = MutableStateFlow<PackageItem?>(null)
    val containerPkg: StateFlow<PackageItem?> = _containerPkg.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun consumeError() { _errorMessage.value = null }

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _containersState.value = UiState.Loading
            try {
                val list = repository.getContainers()
                _containersState.value = if (list.isEmpty()) UiState.Empty else UiState.Success(list)
            } catch (e: Exception) {
                _containersState.value = UiState.Error(e.message ?: "Lỗi tải danh sách container")
            }

            try {
                val projs = repository.getProjects()
                _projectsState.value = UiState.Success(projs)
            } catch (e: Exception) {
                _projectsState.value = UiState.Error(e.message ?: "Lỗi tải dự án Compose")
            }

            try {
                val imgs = repository.getImages()
                // Real "in use" flag: image referenced by any live container.
                val containers = (_containersState.value as? UiState.Success)?.data ?: emptyList()
                val usedRefs = containers.map { it.image.substringBefore('@').lowercase() }.toSet()
                _imagesState.value = UiState.Success(imgs.map { img ->
                    val ref = "${img.repository}:${img.tag}".lowercase()
                    val used = img.isUsed || usedRefs.any { u ->
                        u == ref || u.startsWith("${img.repository.lowercase()}:") ||
                            u.startsWith("${img.repository.lowercase()}@")
                    }
                    img.copy(isUsed = used)
                })
            } catch (e: Exception) {
                _imagesState.value = UiState.Error(e.message ?: "Lỗi tải danh sách image")
            }

            try {
                _containerPkg.value = packageRepository.getPackages().firstOrNull { pkg ->
                    pkg.id.contains("container", ignoreCase = true) ||
                        pkg.name.contains("container", ignoreCase = true) ||
                        pkg.name.contains("docker", ignoreCase = true)
                }
            } catch (_: Exception) {}
        }
    }

    fun toggleContainer(id: String, action: String) {
        viewModelScope.launch {
            if (!repository.toggleContainer(id, action)) {
                _errorMessage.value = "Không thể $action container. Kiểm tra lại trên NAS."
            }
            loadData()
        }
    }

    fun toggleProject(id: String, action: String) {
        viewModelScope.launch {
            if (!repository.toggleProject(id, action)) {
                _errorMessage.value = "Không thể $action dự án Compose."
            }
            loadData()
        }
    }

    fun deleteContainer(idOrName: String, force: Boolean = false) {
        viewModelScope.launch {
            if (!repository.deleteContainer(idOrName, force)) {
                _errorMessage.value = "Không thể xóa container (hãy dừng nó trước)."
            }
            loadData()
        }
    }

    fun deleteImage(repo: String, tag: String) {
        viewModelScope.launch {
            if (!repository.deleteImage(repo, tag)) {
                _errorMessage.value = "Không thể xóa image (có thể đang được container dùng)."
            }
            loadData()
        }
    }

    suspend fun getContainerLogs(idOrName: String): List<String> {
        return repository.getContainerLogs(idOrName)
    }
}
