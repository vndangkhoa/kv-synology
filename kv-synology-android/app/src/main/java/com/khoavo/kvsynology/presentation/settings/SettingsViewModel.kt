package com.khoavo.kvsynology.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.BuildConfig
import com.khoavo.kvsynology.data.local.datastore.AppPreferencesDataStore
import com.khoavo.kvsynology.domain.model.AppChangelogRegistry
import com.khoavo.kvsynology.domain.model.AppUpdateInfo
import com.khoavo.kvsynology.domain.model.VersionChangelog
import com.khoavo.kvsynology.domain.repository.AuthRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val dataStore: AppPreferencesDataStore,
    private val authRepository: AuthRepository
) : ViewModel() {

    val language: StateFlow<String> = dataStore.languageFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "vi")

    val theme: StateFlow<String> = dataStore.themeFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "dark")

    val experienceMode: StateFlow<String> = dataStore.experienceModeFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "beginner")

    val demoMode: StateFlow<Boolean> = dataStore.demoModeFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val showAiBubble: StateFlow<Boolean> = dataStore.showAiBubbleFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    private val _sessionIsDemo = MutableStateFlow<Boolean?>(null)
    val sessionIsDemo: StateFlow<Boolean?> = _sessionIsDemo.asStateFlow()

    private val _sessionHost = MutableStateFlow("")
    val sessionHost: StateFlow<String> = _sessionHost.asStateFlow()

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
                val currentVer = BuildConfig.VERSION_NAME
                val remoteResult = withContext(Dispatchers.IO) { fetchLatestReleaseMeta() }
                val latestVer = remoteResult?.first?.removePrefix("v")?.ifBlank { currentVer } ?: currentVer
                val releaseDate = remoteResult?.second?.take(10)?.ifBlank { "2026-11-22" } ?: "2026-11-22"
                val apkUrl = remoteResult?.third?.ifBlank { DIRECT_APK_URL } ?: DIRECT_APK_URL
                val isAvailable = compareVersions(latestVer, currentVer) > 0

                val info = AppUpdateInfo(
                    currentVersion = currentVer,
                    latestVersion = latestVer,
                    isUpdateAvailable = isAvailable,
                    releaseDate = releaseDate,
                    apkDownloadUrl = apkUrl,
                    packagePortalUrl = PACKAGE_PORTAL_URL,
                    changelog = changelogs
                )
                _updateState.value = UiState.Success(info)
            } catch (e: Exception) {
                _updateState.value = UiState.Error(e.message ?: "Lỗi khi kiểm tra cập nhật")
            }
        }
    }

    private fun fetchLatestReleaseMeta(): Triple<String, String, String>? {
        val client = OkHttpClient.Builder()
            .connectTimeout(6, TimeUnit.SECONDS)
            .readTimeout(8, TimeUnit.SECONDS)
            .build()
        val endpoints = listOf(
            "https://git.khoavo.vndns.net/api/v1/repos/vndangkhoa/kv-synology/releases/latest",
            "https://api.github.com/repos/vndangkhoa/kv-synology/releases/latest"
        )
        for (url in endpoints) {
            try {
                val req = Request.Builder()
                    .url(url)
                    .header("Accept", "application/json")
                    .build()
                val parsed = client.newCall(req).execute().use { resp ->
                    if (!resp.isSuccessful) return@use null
                    val body = resp.body?.string() ?: return@use null
                    val obj = JSONObject(body)
                    val tag = obj.optString("tag_name").trim()
                    if (tag.isBlank()) return@use null
                    val date = obj.optString("published_at").ifBlank { obj.optString("created_at") }
                    val assets = obj.optJSONArray("assets")
                    var apkUrl = DIRECT_APK_URL
                    if (assets != null) {
                        for (i in 0 until assets.length()) {
                            val asset = assets.optJSONObject(i) ?: continue
                            val name = asset.optString("name")
                            if (name.endsWith(".apk", ignoreCase = true)) {
                                apkUrl = asset.optString("browser_download_url").ifBlank { DIRECT_APK_URL }
                                break
                            }
                        }
                    }
                    Triple(tag, date, apkUrl)
                }
                if (parsed != null) return parsed
            } catch (_: Exception) {
                // Fall through to next mirror or local version
            }
        }
        return null
    }

    fun dismissUpdateDialog() {
        _updateState.value = null
    }

    private fun compareVersions(v1: String, v2: String): Int {
        val clean1 = v1.removePrefix("v").substringBefore('-')
        val clean2 = v2.removePrefix("v").substringBefore('-')
        val p1 = clean1.split('.').mapNotNull { it.toIntOrNull() }
        val p2 = clean2.split('.').mapNotNull { it.toIntOrNull() }
        val len = maxOf(p1.size, p2.size)
        for (i in 0 until len) {
            val num1 = p1.getOrElse(i) { 0 }
            val num2 = p2.getOrElse(i) { 0 }
            if (num1 != num2) return num1.compareTo(num2)
        }
        return 0
    }

    init {
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

    companion object {
        const val PACKAGE_PORTAL_URL = "https://syno.vndns.net/package/kvsynology"
        const val DIRECT_APK_URL = "https://syno.vndns.net/kvsynology-release.apk"
    }
}
