package com.khoavo.kvsynology.presentation.terminal

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khoavo.kvsynology.data.remote.dsm.DSMClient
import com.khoavo.kvsynology.data.remote.ssh.SshClient
import com.khoavo.kvsynology.data.remote.ssh.SshException
import com.khoavo.kvsynology.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface SshStatus {
    data object Checking : SshStatus
    data object Demo : SshStatus
    data class Connected(val host: String, val port: Int, val user: String) : SshStatus
    data object AuthRequired : SshStatus
    data class Unavailable(val reason: String) : SshStatus
}

/** Resolve a `cd` argument against the current remote dir (pure, unit-tested). */
internal fun resolveRemotePath(current: String, arg: String, home: String): String {
    val raw = arg.trim()
    if (raw.isEmpty() || raw == "~") return home.ifBlank { "/" }
    if (raw == "-") return current // no OLDPWD tracking; stay put
    val expanded = when {
        raw == "~" -> home
        raw.startsWith("~/") -> (home.trimEnd('/') + raw.removePrefix("~"))
        raw.startsWith("/") -> raw
        else -> current.trimEnd('/') + "/" + raw
    }
    val parts = mutableListOf<String>()
    for (seg in expanded.split("/")) {
        when {
            seg.isEmpty() || seg == "." -> {}
            seg == ".." -> if (parts.isNotEmpty()) parts.removeAt(parts.lastIndex)
            else -> parts.add(seg)
        }
    }
    return "/" + parts.joinToString("/")
}

internal fun shQuote(s: String): String = "'" + s.replace("'", "'\\''") + "'"

@HiltViewModel
class TerminalViewModel @Inject constructor(
    private val dsmClient: DSMClient,
    private val sshClient: SshClient,
    private val authRepository: AuthRepository
) : ViewModel() {

    private var currentUser = "admin"
    private var promptHost = "Synology-NAS"
    private var sshPassword: String? = null
    private var homeDir = "/root"

    private val _outputLines = MutableStateFlow(
        listOf(
            "Synology DSM Linux Terminal Console",
            "Đang khởi tạo phiên SSH tới NAS...",
            ""
        )
    )
    val outputLines: StateFlow<List<String>> = _outputLines.asStateFlow()

    private val _sshStatus = MutableStateFlow<SshStatus>(SshStatus.Checking)
    val sshStatus: StateFlow<SshStatus> = _sshStatus.asStateFlow()

    private val _remoteDir = MutableStateFlow("~")
    val remoteDir: StateFlow<String> = _remoteDir.asStateFlow()

    var sshPort: Int = 22
        private set

    init {
        viewModelScope.launch {
            try {
                val session = authRepository.getCurrentSession()
                val config = dsmClient.getConfig()
                if (session.account.isNotBlank()) currentUser = session.account
                if (config != null && config.account.isNotBlank()) currentUser = config.account
                promptHost = session.model.replace(" ", "-").ifBlank { config?.host ?: "Synology-NAS" }

                if (config?.isDemo == true) {
                    _sshStatus.value = SshStatus.Demo
                    _outputLines.value = listOf(
                        "Synology DSM Linux Terminal Console (DEMO)",
                        "Chế độ dùng thử — lệnh chạy trên dữ liệu mô phỏng, không chạm tới NAS thật.",
                        "Gõ 'help' để xem các lệnh hỗ trợ.",
                        ""
                    )
                    return@launch
                }
                if (config == null || !session.isConnected) {
                    _sshStatus.value = SshStatus.Unavailable("Chưa đăng nhập NAS — hãy đăng nhập lại rồi mở Terminal.")
                    _outputLines.update {
                        it + "Chưa có phiên NAS. Hãy đăng nhập rồi thử lại."
                    }
                    return@launch
                }
                promptHost = config.host
                sshPassword = config.password
                if (sshPassword.isNullOrBlank()) {
                    _sshStatus.value = SshStatus.AuthRequired
                    _outputLines.update {
                        it + "Cần mật khẩu SSH cho '$currentUser@${config.host}'. Nhấn biểu tượng chìa khóa để nhập."
                    }
                } else {
                    probeSsh(config.host, sshPort, currentUser, sshPassword!!)
                }
            } catch (e: Exception) {
                _sshStatus.value = SshStatus.Unavailable("Lỗi khởi tạo: ${e.message}")
            }
        }
    }

    fun connectWithPassword(password: String, port: Int) {
        val config = dsmClient.getConfig() ?: return
        sshPassword = password
        sshPort = port
        viewModelScope.launch {
            _sshStatus.value = SshStatus.Checking
            _outputLines.update { it + "Đang kết nối SSH tới ${config.host}:$port ..." }
            probeSsh(config.host, port, currentUser, password)
        }
    }

    private suspend fun probeSsh(host: String, port: Int, user: String, password: String) {
        try {
            val res = sshClient.probe(host, port, user, password)
            if (res.exitCode == 0 && res.stdout.contains("__kv_ssh_ok__")) {
                val pwd = res.stdout.lines().lastOrNull { it.isNotBlank() && !it.contains("__kv_ssh_ok__") }
                    ?: res.stdout.substringAfter("__kv_ssh_ok__").trim()
                homeDir = pwd.ifBlank { "/root" }
                _remoteDir.value = homeDir
                promptHost = host
                _sshStatus.value = SshStatus.Connected(host, port, user)
                _outputLines.update {
                    it + "SSH đã kết nối: $user@$host:$port (thư mục: $homeDir)"
                }
            } else {
                _sshStatus.value = SshStatus.Unavailable(res.stderr.ifBlank { "SSH probe thất bại (exit ${res.exitCode})" })
                _outputLines.update { it + (_sshStatus.value as SshStatus.Unavailable).reason }
            }
        } catch (e: SshException) {
            _sshStatus.value = SshStatus.Unavailable(e.message ?: "SSH thất bại")
            _outputLines.update { it + (e.message ?: "SSH thất bại") }
        } catch (e: Exception) {
            _sshStatus.value = SshStatus.Unavailable("Lỗi SSH: ${e.message}")
            _outputLines.update { it + "Lỗi SSH: ${e.message}" }
        }
    }

    fun executeCommand(cmd: String) {
        val clean = cmd.trim()
        if (clean.isBlank()) return

        val prompt = "$currentUser@$promptHost:${_remoteDir.value}$"
        _outputLines.update { it + "$prompt $clean" }

        viewModelScope.launch {
            when {
                clean.equals("clear", ignoreCase = true) -> {
                    _outputLines.value = emptyList()
                    return@launch
                }
                clean.equals("help", ignoreCase = true) -> {
                    _outputLines.update { it + helpText() }
                    return@launch
                }
                clean.equals("ssh-connect", ignoreCase = true) -> {
                    _outputLines.update { it + "Nhấn biểu tượng chìa khóa trên thanh trạng thái để nhập mật khẩu SSH." }
                    return@launch
                }
            }

            val status = _sshStatus.value
            if (status is SshStatus.Connected) {
                runRemoteCommand(status, clean)
            } else if (status is SshStatus.Demo) {
                _outputLines.update { it + demoResponse(clean) }
            } else {
                _outputLines.update { it + localDsmResponse(clean) }
            }
        }
    }

    // ---------- real SSH path ----------

    private suspend fun runRemoteCommand(status: SshStatus.Connected, clean: String) {
        val cmdLower = clean.lowercase()
        // Handle cd locally (track dir), validate remotely
        if (cmdLower == "cd" || cmdLower.startsWith("cd ")) {
            val arg = clean.removePrefix("cd").trim()
            val target = resolveRemotePath(
                current = if (_remoteDir.value == "~") homeDir else _remoteDir.value,
                arg = arg,
                home = homeDir
            )
            try {
                val res = sshClient.execute(
                    status.host, status.port, status.user, sshPassword.orEmpty(),
                    "cd ${shQuote(target)} && pwd"
                )
                if (res.exitCode == 0 && res.stdout.isNotBlank()) {
                    _remoteDir.value = res.stdout.lines().first { it.isNotBlank() }.trim()
                } else {
                    _outputLines.update { it + (res.stderr.ifBlank { "cd: $arg: No such file or directory" }) }
                }
            } catch (e: SshException) {
                _outputLines.update { it + (e.message ?: "cd thất bại") }
                _sshStatus.value = SshStatus.Unavailable(e.message ?: "Mất kết nối SSH")
            }
            return
        }

        val dir = if (_remoteDir.value == "~") homeDir else _remoteDir.value
        val wrapped = "cd ${shQuote(dir)} && $clean"
        try {
            val res = sshClient.execute(status.host, status.port, status.user, sshPassword.orEmpty(), wrapped)
            val out = buildString {
                if (res.stdout.isNotBlank()) append(res.stdout)
                if (res.stderr.isNotBlank()) {
                    if (isNotEmpty()) append("\n")
                    append(res.stderr)
                }
                if (res.exitCode != 0) {
                    if (isNotEmpty()) append("\n")
                    append("[exit code: ${res.exitCode}]")
                }
                if (isEmpty()) append("[OK]")
            }
            _outputLines.update { it + out }
        } catch (e: SshException) {
            _sshStatus.value = SshStatus.Unavailable(e.message ?: "Mất kết nối SSH")
            _outputLines.update { it + (e.message ?: "Lệnh thất bại") }
        } catch (e: Exception) {
            _outputLines.update { it + "Lỗi thực thi: ${e.message}" }
        }
    }

    // ---------- fallbacks (no SSH) ----------

    private suspend fun localDsmResponse(clean: String): String {
        return when (clean.lowercase()) {
            "whoami" -> currentUser
            "id" -> "uid=1026($currentUser) gid=100(users) groups=100(users),101(administrators)"
            "hostname" -> promptHost
            "pwd" -> _remoteDir.value
            "date" -> java.text.SimpleDateFormat("EEE MMM dd HH:mm:ss z yyyy", java.util.Locale.US).format(java.util.Date())
            "cat /etc/os-release" -> "NAME=\"Synology DiskStation Manager\"\nVERSION=\"7.2.1-69057\"\nID=synology\nVERSION_ID=\"7.2.1\"\nPRETTY_NAME=\"Synology DSM 7.2.1-69057\"\nHOME_URL=\"https://www.synology.com/\""
            "uname -a" -> {
                val info = dsmClient.getSystemInfo()
                "Linux $promptHost ${info.version.ifBlank { "5.10.55+ #69057" }} SMP x86_64 GNU/Linux synology"
            }
            "uptime" -> {
                val info = dsmClient.getSystemInfo()
                val hours = info.uptime / 3600
                val minutes = (info.uptime % 3600) / 60
                "up $hours hrs $minutes mins, 1 user, load average: 0.12, 0.18, 0.15"
            }
            "docker ps" -> {
                val containers = dsmClient.getDockerContainers()
                if (containers.isEmpty()) {
                    "CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES\n(Không có container đang chạy)"
                } else {
                    val header = "CONTAINER ID   IMAGE                          STATUS         PORTS"
                    val rows = containers.joinToString("\n") { c ->
                        val idShort = if (c.id.length > 12) c.id.substring(0, 12) else c.id
                        val imgShort = if (c.image.length > 30) c.image.substring(0, 27) + "..." else c.image
                        val portsShort = c.ports.joinToString(",").ifEmpty { "none" }
                        String.format("%-14s %-30s %-14s %s", idShort, imgShort, c.status, portsShort)
                    }
                    "$header\n$rows"
                }
            }
            "df -h" -> {
                val volumes = dsmClient.getStorageVolumes()
                if (volumes.isEmpty()) {
                    "Filesystem      Size  Used Avail Use% Mounted on\n/volume1        3.6T  2.1T  1.5T  58% /volume1"
                } else {
                    val header = "Filesystem        Size    Used   Avail Use% Mounted on"
                    val rows = volumes.joinToString("\n") { v ->
                        val totalGB = v.totalBytes / (1024 * 1024 * 1024)
                        val usedGB = v.usedBytes / (1024 * 1024 * 1024)
                        val freeGB = (v.totalBytes - v.usedBytes) / (1024 * 1024 * 1024)
                        val pct = if (v.totalBytes > 0) ((v.usedBytes.toDouble() / v.totalBytes) * 100).toInt() else 0
                        String.format("%-16s %4dG %6dG %6dG %3d%% %s", "/dev/" + v.id, totalGB, usedGB, freeGB, pct, "/" + v.id)
                    }
                    "$header\n$rows"
                }
            }
            "free -m" -> {
                val util = dsmClient.getUtilization()
                val totalMB = util.memoryTotalMB
                val usedMB = util.memoryUsedMB
                val freeMB = (totalMB - usedMB).coerceAtLeast(0)
                "              total        used        free      shared  buff/cache   available\nMem:          $totalMB        $usedMB        $freeMB         256        1024        $freeMB\nSwap:          2048           0        2048"
            }
            "ps" -> {
                val procs = dsmClient.getProcesses().take(10)
                val header = "  PID USER       %CPU %MEM COMMAND"
                val rows = procs.joinToString("\n") { p ->
                    val memMB = (p.memory / (1024 * 1024)).toInt()
                    String.format("%5d %-10s %4.1f %4dM %s", p.pid, p.user, p.cpu, memMB, p.name)
                }
                "$header\n$rows"
            }
            else -> {
                val hint = when (val s = _sshStatus.value) {
                    is SshStatus.Unavailable -> "SSH chưa kết nối (${s.reason}). "
                    SshStatus.AuthRequired -> "SSH cần mật khẩu. "
                    else -> ""
                }
                hint + "Lệnh '$clean' cần SSH thật — nhấn biểu tượng chìa khóa để kết nối, sau đó thử lại."
            }
        }
    }

    private fun demoResponse(clean: String): String {
        return when (clean.lowercase()) {
            "whoami" -> currentUser
            "id" -> "uid=1026($currentUser) gid=100(users) groups=100(users),101(administrators)"
            "hostname" -> promptHost
            "pwd" -> "/var/services/homes/$currentUser"
            "ls", "ls -la" -> "docker\ndownloads\nmedia\nhomes\nbackup"
            "date" -> java.text.SimpleDateFormat("EEE MMM dd HH:mm:ss z yyyy", java.util.Locale.US).format(java.util.Date())
            else -> "(DEMO) '$clean' — chế độ dùng thử, không thực thi trên NAS thật."
        }
    }

    private fun helpText(): String {
        return when (_sshStatus.value) {
            is SshStatus.Connected ->
                "SSH thật đã kết nối — mọi lệnh Linux (ls, cd /volume2, cat, docker ps, synopkg, ...) đều chạy trên NAS.\n" +
                    "Lệnh cục bộ: clear, help, ssh-connect."
            is SshStatus.Demo ->
                "Chế độ DEMO: whoami, id, hostname, pwd, ls, date, clear."
            else ->
                "SSH chưa kết nối nên chỉ dùng được lệnh tra cứu qua DSM API: whoami, id, hostname, pwd, date, uptime, docker ps, df -h, free -m, ps, uname -a, cat /etc/os-release, clear.\n" +
                    "Để chạy mọi lệnh (ls, cd, ...): bật 'SSH Terminal' trong Dịch vụ, rồi nhấn biểu tượng chìa khóa để nhập mật khẩu SSH."
        }
    }
}
