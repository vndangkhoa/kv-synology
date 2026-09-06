package com.khoavo.kvsynology.presentation.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.data.local.datastore.AppPreferencesDataStore
import com.khoavo.kvsynology.data.remote.quickconnect.QuickConnectResolver
import com.khoavo.kvsynology.domain.model.ConnectionConfig
import com.khoavo.kvsynology.domain.model.DsmSession
import com.khoavo.kvsynology.domain.repository.AuthRepository
import com.khoavo.kvsynology.presentation.common.UiState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val quickConnectResolver: QuickConnectResolver,
    private val dataStore: AppPreferencesDataStore
) : ViewModel() {

    private val _loginState = MutableStateFlow<UiState<DsmSession>>(UiState.Empty)
    val loginState: StateFlow<UiState<DsmSession>> = _loginState.asStateFlow()

    var host = MutableStateFlow("192.168.1.10")
    var port = MutableStateFlow("5001")
    var https = MutableStateFlow(true)
    var account = MutableStateFlow("admin")
    var password = MutableStateFlow("")
    var otp = MutableStateFlow("")
    var ignoreCert = MutableStateFlow(true)
    var isDemo = MutableStateFlow(false)
    var rememberLogin = MutableStateFlow(true)

    private val _saveFeedback = MutableStateFlow<String?>(null)
    val saveFeedback: StateFlow<String?> = _saveFeedback.asStateFlow()
    fun consumeSaveFeedback() { _saveFeedback.value = null }

    val savedProfiles: StateFlow<List<ConnectionConfig>> = flow {
        authRepository.getAllProfiles().collect { emit(it) }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        // Settings demo toggle acts as the default for the login checkbox.
        viewModelScope.launch {
            try {
                isDemo.value = dataStore.demoModeFlow.first()
            } catch (_: Exception) {}
        }
    }

    fun login() {
        viewModelScope.launch {
            _loginState.value = UiState.Loading

            var targetHost = host.value.trim()
            var targetPort = port.value.toIntOrNull() ?: if (https.value) 5001 else 5000
            var targetHttps = https.value

            // Auto-resolve QuickConnect
            if (!isDemo.value && quickConnectResolver.isQuickConnectId(targetHost)) {
                val resolved = quickConnectResolver.resolve(targetHost, targetPort, targetHttps)
                if (resolved != null) {
                    targetHost = resolved.host
                    targetPort = resolved.port
                    targetHttps = resolved.isHttps
                }
            }

            val config = ConnectionConfig(
                host = targetHost,
                port = targetPort,
                https = targetHttps,
                account = account.value.trim(),
                password = password.value,
                otp = otp.value.ifBlank { null },
                ignoreCert = ignoreCert.value,
                isDemo = isDemo.value
            )

            val result = authRepository.login(config)
            result.fold(
                onSuccess = { session ->
                    if (rememberLogin.value && !isDemo.value) {
                        authRepository.saveProfile(config, remember = true)
                    }
                    _loginState.value = UiState.Success(session)
                },
                onFailure = { error ->
                    _loginState.value = UiState.Error(error.message ?: "Đăng nhập thất bại")
                }
            )
        }
    }

    fun saveCurrentProfile() {
        viewModelScope.launch {
            val targetHost = host.value.trim()
            if (targetHost.isBlank() || account.value.isBlank()) {
                _saveFeedback.value = "Vui lòng nhập Địa chỉ NAS và Tài khoản để lưu"
                return@launch
            }
            val config = ConnectionConfig(
                host = targetHost,
                port = port.value.toIntOrNull() ?: if (https.value) 5001 else 5000,
                https = https.value,
                account = account.value.trim(),
                password = password.value,
                otp = otp.value.ifBlank { null },
                ignoreCert = ignoreCert.value,
                isDemo = isDemo.value
            )
            authRepository.saveProfile(config, remember = true)
            _saveFeedback.value = "Đã lưu thông tin đăng nhập máy chủ $targetHost"
        }
    }

    fun deleteProfile(p: ConnectionConfig) {
        viewModelScope.launch {
            val profileId = "nas_${p.host.replace('.', '_')}_${p.port}_${p.account}"
            authRepository.deleteProfile(profileId)
            _saveFeedback.value = "Đã xóa máy chủ ${p.host}"
        }
    }

    fun clearAllSavedLogins() {
        viewModelScope.launch {
            authRepository.clearAllProfiles()
            _saveFeedback.value = "Đã xóa toàn bộ danh sách đăng nhập đã lưu"
        }
    }

    fun clearForm() {
        host.value = ""
        port.value = "5001"
        https.value = true
        account.value = ""
        password.value = ""
        otp.value = ""
        _saveFeedback.value = "Đã xóa trắng thông tin trên form"
    }

    fun selectProfile(p: ConnectionConfig) {
        host.value = p.host
        port.value = p.port.toString()
        https.value = p.https
        account.value = p.account
        p.password?.let { password.value = it }
        ignoreCert.value = p.ignoreCert
    }
}
