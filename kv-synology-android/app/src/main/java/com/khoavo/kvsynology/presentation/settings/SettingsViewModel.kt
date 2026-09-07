package com.khoavo.kvsynology.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.data.local.datastore.AppPreferencesDataStore
import com.khoavo.kvsynology.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import com.khoavo.kvsynology.BuildConfig
import com.khoavo.kvsynology.domain.model.AppChangelogRegistry
import com.khoavo.kvsynology.domain.model.AppUpdateInfo
import com.khoavo.kvsynology.domain.model.VersionChangelog
import com.khoavo.kvsynology.presentation.common.UiState
import javax.inject.Inject

/**
 * Settings for Local-AI-only mode.
 * Cloud providers (Gemini/OpenAI/Claude/DeepSeek/OpenRouter) were removed —
 * the assistant runs fully on-device using real NAS telemetry, no API key needed.
 */
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val dataStore: AppPreferencesDataStore,
    private val authRepository: AuthRepository
) : ViewModel() {

    val language: StateFlow<String> = dataStore.languageFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "vi")

    val theme: StateFlow<String> = dataStore.themeFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "system")

    val experienceMode: StateFlow<String> = dataStore.experienceModeFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "beginner")

    val demoMode: StateFlow<Boolean> = dataStore.demoModeFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val showAiBubble: StateFlow<Boolean> = dataStore.showAiBubbleFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    /** Live session demo flag — the actual mock-vs-real switch (login checkbox wins over the pref). */
    private val _sessionIsDemo = MutableStateFlow<Boolean?>(null)
    val sessionIsDemo: StateFlow<Boolean?> = _sessionIsDemo.asStateFlow()

    private val _sessionHost = MutableStateFlow("")
    val sessionHost: StateFlow<String> = _sessionHost.asStateFlow()

    // Kept for backward compatibility with stored prefs; always "local" going forward.
    val aiProvider: StateFlow<String> = dataStore.aiProviderFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "local")

    val aiModel: StateFlow<String> = dataStore.aiModelFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "dsm-local-assistant")

    private val _updateState = MutableStateFlow<UiState<AppUpdateInfo>?>(null)
    val updateState: StateFlow<UiState<AppUpdateInfo>?> = _updateState.asStateFlow()

    val changelogs: List<VersionChangelog> = AppChangelogRegistry.changelogs

    fun checkForUpdate() {
        viewModelScope.launch {
            _updateState.value = UiState.Loading
            try {
                kotlinx.coroutines.delay(500)
                val currentVer = BuildConfig.VERSION_NAME
                val latestVer = "1.5.4"
                val isAvailable = compareVersions(latestVer, currentVer) > 0
                val info = AppUpdateInfo(
                    currentVersion = currentVer,
                    latestVersion = latestVer,
                    isUpdateAvailable = isAvailable,
                    releaseDate = "2026-09-07",
                    apkDownloadUrl = "https://pkg.khoavo.myds.me/package/kvsynology",
                    packagePortalUrl = "https://pkg.khoavo.myds.me/package/kvsynology",
                    changelog = changelogs
                )
                _updateState.value = UiState.Success(info)
            } catch (e: Exception) {
                _updateState.value = UiState.Error(e.message ?: "Lỗi khi kiểm tra cập nhật")
            }
        }
    }

    fun dismissUpdateDialog() {
        _updateState.value = null
    }

    private fun compareVersions(v1: String, v2: String): Int {
        val p1 = v1.split('.').mapNotNull { it.toIntOrNull() }
        val p2 = v2.split('.').mapNotNull { it.toIntOrNull() }
        val len = maxOf(p1.size, p2.size)
        for (i in 0 until len) {
            val num1 = p1.getOrElse(i) { 0 }
            val num2 = p2.getOrElse(i) { 0 }
            if (num1 != num2) return num1.compareTo(num2)
        }
        return 0
    }

    init {
        // One-time migration: drop stale cloud-provider prefs from older versions.
        // (Old builds defaulted provider to "gemini" without persisting the key,
        // so a stale non-local MODEL is the reliable upgrade signal.)
        viewModelScope.launch {
            try {
                val model = dataStore.aiModelFlow.first()
                if (!model.equals("dsm-local-assistant", ignoreCase = true)) {
                    dataStore.setAiProvider("local")
                    dataStore.setAiModel("dsm-local-assistant")
                }
            } catch (_: Exception) {}
        }
        refreshSessionInfo()
    }

    /** Re-read from Settings onResume paths via loadData(). */
    fun loadData() {
        refreshSessionInfo()
    }

    private fun refreshSessionInfo() {
        viewModelScope.launch {
            try {
                val cfg = authRepository.getActiveConfig()
                _sessionHost.value = cfg.host
                _sessionIsDemo.value = cfg.isDemo
            } catch (_: Exception) {
                _sessionIsDemo.value = null
            }
        }
    }

    fun setLanguage(lang: String) {
        viewModelScope.launch { dataStore.setLanguage(lang) }
    }

    fun setTheme(theme: String) {
        viewModelScope.launch { dataStore.setTheme(theme) }
    }

    fun setExperienceMode(mode: String) {
        viewModelScope.launch { dataStore.setExperienceMode(mode) }
    }

    fun setDemoMode(enabled: Boolean) {
        viewModelScope.launch { dataStore.setDemoMode(enabled) }
    }

    fun setShowAiBubble(show: Boolean) {
        viewModelScope.launch { dataStore.setShowAiBubble(show) }
    }

    fun logout(onComplete: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onComplete()
        }
    }
}
