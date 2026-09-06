package com.khoavo.kvsynology.data.remote.dsm

import com.khoavo.kvsynology.domain.model.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockDSMClient @Inject constructor() {

    // ---------- Stateful demo storage (so demo mode actually functions) ----------

    private val lock = Any()

    private val servicesState = mutableListOf(
        ServiceItem("smb", "smb", "SMB / CIFS", "Dịch vụ chia sẻ file cho Windows & macOS", "file", true, true, "running", 445),
        ServiceItem("afp", "afp", "AFP", "Apple Filing Protocol cho Mac cũ", "file", false, false, "stopped", 548),
        ServiceItem("nfs", "nfs", "NFS", "Network File System cho máy chủ Linux", "file", true, true, "running", 2049),
        ServiceItem("ftp", "ftp", "FTP / FTPS", "Dịch vụ truyền tệp qua mạng Internet", "file", true, true, "running", 21),
        ServiceItem("ssh", "ssh", "SSH Terminal", "Truy cập dòng lệnh bảo mật vào hệ thống", "terminal", true, true, "running", 22),
        ServiceItem("rsync", "rsync", "Rsync Network Backup", "Dịch vụ đồng bộ tệp qua mạng Rsync", "backup", false, false, "stopped", 873),
        ServiceItem("webdav", "webdav", "WebDAV Server", "Truy cập tệp từ xa qua HTTP/HTTPS WebDAV", "file", false, false, "stopped", 5005),
        ServiceItem("nginx", "nginx", "Nginx Web Engine", "Máy chủ web HTTP/HTTPS và reverse proxy (luôn bật)", "web", true, true, "enabled", 80, canToggle = false),
        ServiceItem("snmp", "snmp", "SNMP Agent", "Giám sát phần cứng qua mạng SNMP", "management", true, true, "running", 161)
    )

    private val filesState: MutableMap<String, MutableList<FileItem>> = mutableMapOf(
        "/" to mutableListOf(
            FileItem(path = "/docker", name = "docker", isdir = true, mtime = 1718000000L, owner = "root", perm = "755"),
            FileItem(path = "/downloads", name = "downloads", isdir = true, mtime = 1718100000L, owner = "admin", perm = "777"),
            FileItem(path = "/media", name = "media", isdir = true, mtime = 1718200000L, owner = "admin", perm = "755"),
            FileItem(path = "/homes", name = "homes", isdir = true, mtime = 1717000000L, owner = "root", perm = "700"),
            FileItem(path = "/backup", name = "backup", isdir = true, mtime = 1718300000L, owner = "admin", perm = "755")
        ),
        "/docker" to mutableListOf(
            FileItem(path = "/docker/sample_video.mp4", name = "sample_video.mp4", isdir = false, size = 154200000L, mtime = 1718400000L, owner = "admin", mimeType = "video/mp4"),
            FileItem(path = "/docker/synology_config.json", name = "synology_config.json", isdir = false, size = 4820L, mtime = 1718450000L, owner = "admin", mimeType = "application/json"),
            FileItem(path = "/docker/backup_log.txt", name = "backup_log.txt", isdir = false, size = 18900L, mtime = 1718480000L, owner = "root", mimeType = "text/plain"),
            FileItem(path = "/docker/nas_banner.png", name = "nas_banner.png", isdir = false, size = 1250000L, mtime = 1718500000L, owner = "admin", mimeType = "image/png"),
        )
    )

    private val mockFileContents: MutableMap<String, String> = mutableMapOf(
        "/docker/synology_config.json" to """{
  "server_name": "DS920-KhoaVo",
  "timezone": "Asia/Ho_Chi_Minh",
  "packages_autoupdate": true,
  "notifications": {
    "email": "admin@example.com",
    "telegram_enabled": true
  },
  "max_ssh_retries": 5
}""",
        "/docker/backup_log.txt" to """[2026-09-06 02:00:01] INFO: Daily Hyper Backup started for Volume1.
[2026-09-06 02:14:22] INFO: Docker containers paused for snapshot.
[2026-09-06 02:14:45] INFO: Snapshot taken successfully.
[2026-09-06 02:15:00] INFO: Resumed docker containers.
[2026-09-06 02:30:11] SUCCESS: Backup completed. Transferred: 4.2 GB."""
    )

    private val dockerState = mutableListOf(
        DockerContainerDetails(
            id = "c1_vaultwarden",
            name = "vaultwarden",
            image = "vaultwarden/server:latest",
            status = "running",
            created = "2024-05-10",
            ports = listOf("8080:80"),
            cpuUsage = 0.5,
            memoryUsage = "68 MB",
            uptime = "14 days",
            restartPolicy = "unless-stopped"
        ),
        DockerContainerDetails(
            id = "c2_adguard",
            name = "adguardhome",
            image = "adguard/adguardhome:latest",
            status = "running",
            created = "2024-04-12",
            ports = listOf("53:53/udp", "3000:3000"),
            cpuUsage = 1.2,
            memoryUsage = "92 MB",
            uptime = "28 days",
            restartPolicy = "always"
        ),
        DockerContainerDetails(
            id = "c3_portainer",
            name = "portainer-ce",
            image = "portainer/portainer-ce:latest",
            status = "running",
            created = "2024-03-01",
            ports = listOf("9000:9000"),
            cpuUsage = 0.2,
            memoryUsage = "45 MB",
            uptime = "35 days",
            restartPolicy = "always"
        ),
        DockerContainerDetails(
            id = "c4_nginx",
            name = "nginx-proxy-manager",
            image = "jc21/nginx-proxy-manager:latest",
            status = "stopped",
            created = "2024-06-01",
            ports = listOf("81:81", "443:443"),
            cpuUsage = 0.0,
            memoryUsage = "0 MB",
            uptime = "Stopped",
            restartPolicy = "unless-stopped"
        )
    )

    // Compose projects reference live mock containers (resolved by id at read time).
    private val mockProjectsState = mutableListOf(
        DockerProject(
            id = "proj_infra",
            name = "Infra-Core",
            status = "running",
            path = "/volume1/docker/infra",
            created = "2024-05-10",
            yamlContent = "services:\n  vaultwarden:\n    image: vaultwarden/server:latest\n    ports:\n      - 8080:80\n  adguardhome:\n    image: adguard/adguardhome:latest\n    ports:\n      - 53:53/udp\n      - 3000:3000",
            services = listOf(
                DockerProjectService("vaultwarden", "vaultwarden/server:latest", "running", listOf("8080:80")),
                DockerProjectService("adguardhome", "adguard/adguardhome:latest", "running", listOf("53:53/udp", "3000:3000"))
            )
        ),
        DockerProject(
            id = "proj_proxy",
            name = "Proxy",
            status = "stopped",
            path = "/volume1/docker/proxy",
            created = "2024-06-01",
            yamlContent = "services:\n  nginx-proxy-manager:\n    image: jc21/nginx-proxy-manager:latest\n    ports:\n      - 81:81\n      - 443:443",
            services = listOf(
                DockerProjectService("nginx-proxy-manager", "jc21/nginx-proxy-manager:latest", "stopped", listOf("81:81", "443:443"))
            )
        )
    )

    private val mockImagesState = mutableListOf(
        DockerImage("img_1", "vaultwarden/server", "latest", 142L, "142 MB", "2024-05-01", 1, true),
        DockerImage("img_2", "adguard/adguardhome", "latest", 85L, "85 MB", "2024-04-10", 1, true),
        DockerImage("img_3", "portainer/portainer-ce", "latest", 280L, "280 MB", "2024-03-01", 1, true),
        DockerImage("img_4", "redis", "7.0-alpine", 32L, "32 MB", "2024-02-15", 0, false)
    )

    private val downloadState = mutableListOf(
        DownloadTask("dt_1", "Ubuntu 24.04 LTS Desktop ISO", 5800000000L, DownloadTaskStatus.DOWNLOADING, 68.5, 12500000L, 450000L, "bt", "magnet:?xt=urn:btih:ubuntu", "/volume1/downloads"),
        DownloadTask("dt_2", "Debian 12 Netinst AMD64", 750000000L, DownloadTaskStatus.FINISHED, 100.0, 0L, 0L, "http", "https://cdimage.debian.org/debian-12.iso", "/volume1/downloads"),
        DownloadTask("dt_3", "Alpine Linux Standard 3.20", 215000000L, DownloadTaskStatus.PAUSED, 42.0, 0L, 0L, "http", "https://dl-cdn.alpinelinux.org/alpine.iso", "/volume1/downloads"),
        DownloadTask("dt_4", "Arch Linux 2024 Release", 1100000000L, DownloadTaskStatus.WAITING, 0.0, 0L, 0L, "bt", "magnet:?xt=urn:btih:arch", "/volume1/downloads")
    )

    private val reverseProxyState = mutableListOf(
        ReverseProxyRule(
            uuid = "rpr_1",
            description = "Vaultwarden Password Manager",
            frontend = ReverseProxyFrontend(1, "vault.synology.local", 443, hsts = true, http2 = true),
            backend = ReverseProxyBackend(0, "localhost", 8080)
        ),
        ReverseProxyRule(
            uuid = "rpr_2",
            description = "AdGuard Home DNS Web",
            frontend = ReverseProxyFrontend(1, "adguard.synology.local", 443, hsts = false, http2 = true),
            backend = ReverseProxyBackend(0, "localhost", 3000)
        )
    )

    private val firewallState = mutableListOf(
        FirewallRule("fw_1", "Allow DSM Web HTTPS", "5001", "tcp", "all", "all", "allow", true, 1),
        FirewallRule("fw_2", "Allow Local LAN SMB & NFS", "445,2049", "tcp", "subnet", "192.168.1.0/24", "allow", true, 2),
        FirewallRule("fw_3", "Allow SSH Admin Only", "22", "tcp", "single_ip", "192.168.1.100", "allow", true, 3),
        FirewallRule("fw_4", "Deny Unknown WAN Inbound", "all", "all", "all", "all", "deny", true, 4)
    )

    private val mockAclOverrides = mutableMapOf<String, List<FolderUserAccess>>()

    fun setMockFolderAcl(path: String, accessList: List<FolderUserAccess>): Boolean {
        synchronized(lock) {
            mockAclOverrides[path] = accessList.map { it.copy() }
            return true
        }
    }

    private val notificationsState = mutableListOf(        NotificationItem("notif_1", "SMART Test Finished", "Kiểm tra S.M.A.R.T Drive 1 hoàn tất", "storage", "success", listOf("Ổ đĩa 1 (ST4000VN008) ở trạng thái tốt, không có sector hỏng."), System.currentTimeMillis() / 1000 - 3600, false),
        NotificationItem("notif_2", "Hyper Backup Succeeded", "Sao lưu hàng ngày thành công", "backup", "info", listOf("Đã sao lưu 14.2 GB lên Synology C2 Storage."), System.currentTimeMillis() / 1000 - 18000, false),
        NotificationItem("notif_3", "Auto-Block Triggered", "Đã chặn IP 185.220.101.5", "security", "warning", listOf("Địa chỉ IP 185.220.101.5 đã thử đăng nhập SSH thất bại 5 lần."), System.currentTimeMillis() / 1000 - 86400, true)
    )

    private val packagesState = mutableListOf(
        PackageItem("ContainerManager", "Container Manager (Docker)", "24.0.2-1527", "running", "Chạy container Docker độc lập", "Synology", "Utilities", installed = true, hasUpdate = false),
        PackageItem("DownloadStation", "Download Station", "3.9.5-4603", "running", "Tải tệp tin BitTorrent, HTTP, FTP", "Synology", "Download", installed = true, hasUpdate = false),
        PackageItem("FileStation", "File Station", "1.4.3-0980", "running", "Quản lý tập tin đám mây riêng", "Synology", "Productivity", installed = true, hasUpdate = false),
        PackageItem("HyperBackup", "Hyper Backup", "4.1.1-3758", "running", "Sao lưu dữ liệu đám mây và ổ đĩa", "Synology", "Backup", installed = true, hasUpdate = true, latestVersion = "4.1.2-3760"),
        PackageItem("PlexMediaServer", "Plex Media Server", "1.40.2", "stopped", "Trung tâm quản lý video và nhạc", "Plex Inc.", "Multimedia", installed = true, hasUpdate = false)
    )

    fun getMockSession(): DsmSession {
        return DsmSession(
            sid = "demo_session_token_12345",
            synoToken = "demo_syno_token_67890",
            isConnected = true,
            dsmVersion = 7,
            versionString = "DSM 7.2.1-69057 Update 5",
            model = "DS920+",
            hostname = "Demo-Synology-NAS",
            account = "admin"
        )
    }

    fun getMockSystemInfo(): SystemInfo {
        return SystemInfo(
            model = "DS920+",
            serial = "2170QNR641001",
            version = "DSM 7.2.1-69057 Update 5",
            uptime = 846200L,
            temperature = 42,
            time = "2026-09-06T15:00:00Z",
            ramTotal = 8192L,
            ramUsed = 3276L,
            cpuModel = "Intel Celeron J4125 (4 Cores, 2.0 GHz)",
            cpuCores = 4
        )
    }

    fun getMockUtilization(): SystemUtilization {
        val cpu = (20..65).random().toDouble()
        val mem = (38..48).random().toDouble()
        return SystemUtilization(
            cpuPercent = cpu,
            memoryPercent = mem,
            memoryUsedMB = (8192 * (mem / 100.0)).toLong(),
            memoryTotalMB = 8192L,
            networkRxBytes = (1024 * 1024 * (1..8).random()).toLong(),
            networkTxBytes = (1024 * 512 * (1..6).random()).toLong(),
            diskReadBytes = (1024 * 256 * (1..4).random()).toLong(),
            diskWriteBytes = (1024 * 512 * (1..5).random()).toLong(),
            timestamp = System.currentTimeMillis()
        )
    }

    fun getMockProcesses(): List<DsmProcess> {
        return listOf(
            DsmProcess(1240, "synoscgi", 12.5, 3.2, "root", "running"),
            DsmProcess(892, "dockerd", 8.4, 6.5, "root", "running"),
            DsmProcess(1560, "smbd", 4.1, 2.1, "admin", "running"),
            DsmProcess(3045, "nginx", 3.2, 1.8, "http", "running"),
            DsmProcess(412, "transmission-daemon", 2.8, 4.2, "download", "running"),
            DsmProcess(5210, "postgres", 1.9, 5.1, "postgres", "running")
        )
    }

    fun getMockFiles(folderPath: String = "/"): List<FileItem> {
        synchronized(lock) {
            val key = if (folderPath.isEmpty()) "/" else folderPath
            filesState[key]?.let { return it.toList() }
            // Unknown subfolder: return generic demo files (not persisted)
            if (key != "/") {
                return listOf(
                    FileItem(path = "$key/sample_video.mp4", name = "sample_video.mp4", isdir = false, size = 154200000L, mtime = 1718400000L, owner = "admin", mimeType = "video/mp4"),
                    FileItem(path = "$key/synology_config.json", name = "synology_config.json", isdir = false, size = 4820L, mtime = 1718450000L, owner = "admin", mimeType = "application/json"),
                    FileItem(path = "$key/backup_log.txt", name = "backup_log.txt", isdir = false, size = 18900L, mtime = 1718480000L, owner = "root", mimeType = "text/plain"),
                    FileItem(path = "$key/nas_banner.png", name = "nas_banner.png", isdir = false, size = 1250000L, mtime = 1718500000L, owner = "admin", mimeType = "image/png"),
                    FileItem(path = "$key/sample_track.mp3", name = "sample_track.mp3", isdir = false, size = 8400000L, mtime = 1718520000L, owner = "admin", mimeType = "audio/mpeg")
                )
            }
            return filesState["/"]?.toList() ?: emptyList()
        }
    }

    fun createMockFolder(folderPath: String, name: String): Boolean {
        synchronized(lock) {
            val parent = if (folderPath.isEmpty()) "/" else folderPath
            val clean = name.trim().trim('/').ifBlank { return false }
            val newPath = if (parent == "/") "/$clean" else "$parent/$clean"
            val parentList = filesState.getOrPut(parent) { mutableListOf() }
            if (parentList.any { it.name == clean }) return false
            val now = System.currentTimeMillis() / 1000
            parentList.add(FileItem(path = newPath, name = clean, isdir = true, mtime = now, owner = "admin", perm = "755"))
            // Register new folder + add parent entry at root if top-level
            filesState.getOrPut(newPath) { mutableListOf() }
            if (parent == "/" && filesState["/"]?.none { it.path == newPath } == true) {
                // already added above (same list)
            }
            return true
        }
    }

    fun deleteMockFile(path: String): Boolean {
        synchronized(lock) {
            // Remove from any parent list
            for ((_, list) in filesState) {
                val idx = list.indexOfFirst { it.path == path }
                if (idx >= 0) {
                    list.removeAt(idx)
                    filesState.remove(path) // drop subfolder contents if dir
                    return true
                }
            }
            return false
        }
    }

    fun renameMockFile(path: String, newName: String): Boolean {
        synchronized(lock) {
            val clean = newName.trim().trim('/').ifBlank { return false }
            for ((_, list) in filesState) {
                val idx = list.indexOfFirst { it.path == path }
                if (idx >= 0) {
                    val old = list[idx]
                    val parent = path.substringBeforeLast('/', missingDelimiterValue = "/").ifEmpty { "/" }
                    val newPath = if (parent == "/") "/$clean" else "$parent/$clean"
                    list[idx] = old.copy(path = newPath, name = clean)
                    // Move subfolder bucket if renamed dir
                    filesState.remove(path)?.let { filesState[newPath] = it }
                    return true
                }
            }
            return false
        }
    }

    fun getMockFileContent(path: String): String {
        synchronized(lock) {
            return mockFileContents[path] ?: "Tệp cấu hình Synology NAS:\nĐường dẫn: $path\nKích thước: 1024 bytes\nĐược quản lý bởi KV Synology."
        }
    }

    fun saveMockFileContent(path: String, content: String): Boolean {
        synchronized(lock) {
            mockFileContents[path] = content
            val parent = path.substringBeforeLast('/', missingDelimiterValue = "/").ifEmpty { "/" }
            val fileName = path.substringAfterLast('/')
            val parentList = filesState.getOrPut(parent) { mutableListOf() }
            val idx = parentList.indexOfFirst { it.path == path || it.name == fileName }
            val sizeBytes = content.toByteArray().size.toLong()
            val now = System.currentTimeMillis() / 1000
            if (idx >= 0) {
                parentList[idx] = parentList[idx].copy(size = sizeBytes, mtime = now)
            } else {
                parentList.add(FileItem(path = path, name = fileName, isdir = false, size = sizeBytes, mtime = now, owner = "admin"))
            }
            return true
        }
    }

    fun getMockFileBytes(path: String): ByteArray {
        synchronized(lock) {
            return (mockFileContents[path] ?: "Mock binary/text data for $path").toByteArray()
        }
    }

    fun mockCopyMoveFiles(paths: List<String>, destFolder: String, isCut: Boolean): Boolean {
        synchronized(lock) {
            val destClean = if (destFolder.isEmpty()) "/" else destFolder
            val targetList = filesState.getOrPut(destClean) { mutableListOf() }

            for (srcPath in paths) {
                var foundItem: FileItem? = null
                var sourceList: MutableList<FileItem>? = null

                for ((_, list) in filesState) {
                    val idx = list.indexOfFirst { it.path == srcPath }
                    if (idx >= 0) {
                        foundItem = list[idx]
                        sourceList = list
                        break
                    }
                }

                val item = foundItem ?: FileItem(
                    path = srcPath,
                    name = srcPath.substringAfterLast('/'),
                    isdir = false,
                    size = 1024L,
                    mtime = System.currentTimeMillis() / 1000
                )

                val fileName = item.name
                val targetPath = if (destClean == "/") "/$fileName" else "$destClean/$fileName"

                targetList.removeAll { it.name == fileName }
                targetList.add(item.copy(path = targetPath))

                // If text content exists, move/copy it
                mockFileContents[srcPath]?.let { content ->
                    mockFileContents[targetPath] = content
                    if (isCut) mockFileContents.remove(srcPath)
                }

                // If cut, remove from original location
                if (isCut && sourceList != null) {
                    sourceList.removeAll { it.path == srcPath }
                    filesState.remove(srcPath)?.let { subfolderItems ->
                        filesState[targetPath] = subfolderItems
                    }
                }
            }
            return true
        }
    }

    fun getMockDockerContainers(): List<DockerContainerDetails> {
        synchronized(lock) { return dockerState.map { it.copy() } }
    }

    fun toggleMockDockerContainer(id: String, action: String): Boolean {
        synchronized(lock) {
            val idx = dockerState.indexOfFirst { it.id == id || it.name == id }
            if (idx < 0) return false
            val cur = dockerState[idx]
            val newStatus = when (action.lowercase()) {
                "start" -> "running"
                "stop" -> "stopped"
                "restart" -> "running"
                else -> if (cur.status == "running") "stopped" else "running"
            }
            dockerState[idx] = cur.copy(status = newStatus)
            return true
        }
    }

    fun deleteMockContainer(id: String): Boolean {
        synchronized(lock) {
            return dockerState.removeIf { it.id == id || it.name == id }
        }
    }

    fun deleteMockImage(repository: String, tag: String): Boolean {
        synchronized(lock) {
            val idx = mockImagesState.indexOfFirst { it.repository == repository && it.tag == tag }
            if (idx < 0) return false
            if (mockImagesState[idx].isUsed) return false // in use — refuse like DSM
            mockImagesState.removeAt(idx)
            return true
        }
    }

    fun toggleMockProject(id: String, action: String): Boolean {
        synchronized(lock) {
            val idx = mockProjectsState.indexOfFirst { it.id == id || it.name == id }
            if (idx < 0) return false
            val cur = mockProjectsState[idx]
            val newStatus = when (action.lowercase()) {
                "start" -> "running"
                "stop" -> "stopped"
                else -> return false
            }
            mockProjectsState[idx] = cur.copy(status = newStatus)
            // Keep member containers in sync (compose up/down).
            val members = mockProjectMembers[cur.id] ?: emptyList()
            dockerState.replaceAll { c ->
                if (c.id in members) c.copy(status = newStatus) else c
            }
            return true
        }
    }

    // Compose project → member container ids (resolved live at read time).
    private val mockProjectMembers = mapOf(
        "proj_infra" to listOf("c1_vaultwarden", "c2_adguard"),
        "proj_proxy" to listOf("c4_nginx")
    )

    fun getMockDockerProjects(): List<DockerProject> {
        synchronized(lock) {
            return mockProjectsState.map { p ->
                val members = mockProjectMembers[p.id]
                    ?.mapNotNull { cid -> dockerState.find { it.id == cid } }
                    ?: emptyList()
                // Sync project status from members when they unanimously agree.
                val syncedStatus = when {
                    members.isNotEmpty() && members.all { it.status == "running" } -> "running"
                    members.isNotEmpty() && members.all { it.status == "stopped" } -> "stopped"
                    else -> p.status
                }
                p.copy(
                    status = syncedStatus,
                    services = members.map {
                        DockerProjectService(it.name, it.image, it.status, it.ports)
                    }
                )
            }
        }
    }

    fun getMockDockerImages(): List<DockerImage> {
        synchronized(lock) { return mockImagesState.map { it.copy() } }
    }

    fun getMockDownloadTasks(): List<DownloadTask> {
        synchronized(lock) { return downloadState.map { it.copy() } }
    }

    fun addMockDownloadTask(uri: String, destination: String? = null): Boolean {
        synchronized(lock) {
            val title = uri.substringAfterLast('/').substringBefore('?').ifBlank { uri }.take(80)
            downloadState.add(
                DownloadTask(
                    id = "dt_${System.currentTimeMillis()}",
                    title = title,
                    size = 0L,
                    status = DownloadTaskStatus.WAITING,
                    progress = 0.0,
                    downloadSpeed = 0L,
                    uploadSpeed = 0L,
                    type = if (uri.startsWith("magnet:")) "bt" else "http",
                    uri = uri,
                    destination = destination ?: "/volume1/downloads",
                    createdTime = System.currentTimeMillis() / 1000
                )
            )
            return true
        }
    }

    fun toggleMockDownloadTask(id: String, action: String): Boolean {
        synchronized(lock) {
            val idx = downloadState.indexOfFirst { it.id == id }
            if (idx < 0) return false
            val cur = downloadState[idx]
            when (action.lowercase()) {
                "delete" -> { downloadState.removeAt(idx); return true }
                "pause" -> downloadState[idx] = cur.copy(status = DownloadTaskStatus.PAUSED, downloadSpeed = 0L)
                "resume" -> downloadState[idx] = cur.copy(
                    status = if (cur.progress >= 100.0) DownloadTaskStatus.FINISHED else DownloadTaskStatus.DOWNLOADING,
                    downloadSpeed = if (cur.progress >= 100.0) 0L else 4500000L
                )
                else -> return false
            }
            return true
        }
    }

    fun getMockStorageVolumes(): List<StorageVolume> {
        return listOf(
            StorageVolume(
                id = "volume_1",
                name = "Volume 1",
                path = "/volume1",
                fsType = "btrfs",
                totalBytes = 3840000000000L, // 3.84 TB
                usedBytes = 2150000000000L,  // 2.15 TB
                freeBytes = 1690000000000L,  // 1.69 TB
                status = "normal",
                raidType = "Synology Hybrid RAID (SHR)",
                drives = listOf(
                    DriveInfo(1, "Drive 1", "Seagate IronWolf 4TB", "ST4000VN008", "normal", 36, 4000000000000L, "healthy"),
                    DriveInfo(2, "Drive 2", "Seagate IronWolf 4TB", "ST4000VN008", "normal", 38, 4000000000000L, "healthy")
                )
            ),
            StorageVolume(
                id = "volume_2",
                name = "Volume 2 (NVMe)",
                path = "/volume2",
                fsType = "btrfs",
                totalBytes = 960000000000L,
                usedBytes = 320000000000L,
                freeBytes = 640000000000L,
                status = "normal",
                raidType = "RAID 1",
                drives = listOf(
                    DriveInfo(3, "M.2 SSD 1", "Samsung 970 EVO Plus 1TB", "S4EWNF0N123", "normal", 44, 1000000000000L, "healthy", "NVMe")
                )
            )
        )
    }

    fun getMockPackages(): List<PackageItem> {
        synchronized(lock) { return packagesState.map { it.copy() } }
    }

    fun toggleMockPackage(id: String, action: String): Boolean {
        synchronized(lock) {
            val idx = packagesState.indexOfFirst { it.id == id }
            if (idx < 0) return false
            val cur = packagesState[idx]
            val newStatus = when (action.lowercase()) {
                "start" -> "running"
                "stop" -> "stopped"
                else -> return false
            }
            packagesState[idx] = cur.copy(status = newStatus)
            return true
        }
    }

    fun getMockServices(): List<ServiceItem> {
        synchronized(lock) { return servicesState.map { it.copy() } }
    }

    fun toggleMockService(id: String, enabled: Boolean): Boolean {
        synchronized(lock) {
            val idx = servicesState.indexOfFirst { it.id == id }
            if (idx < 0) return false
            val cur = servicesState[idx]
            if (!cur.canToggle) return false
            servicesState[idx] = cur.copy(
                enabled = enabled,
                running = enabled,
                status = if (enabled) "running" else "stopped"
            )
            return true
        }
    }

    fun updateMockServicePort(id: String, port: Int): Boolean {
        synchronized(lock) {
            val idx = servicesState.indexOfFirst { it.id == id }
            if (idx < 0) return false
            if (port !in 1..65535) return false
            // Only services with configurable ports
            if (id !in setOf("ssh", "ftp", "webdav", "rsync")) return false
            servicesState[idx] = servicesState[idx].copy(port = port)
            return true
        }
    }

    fun getMockReverseProxyRules(): List<ReverseProxyRule> {
        synchronized(lock) { return reverseProxyState.map { it.copy() } }
    }

    fun addMockReverseProxyRule(rule: ReverseProxyRule): Boolean {
        synchronized(lock) {
            val withId = if (rule.uuid.isBlank()) rule.copy(uuid = "rpr_${System.currentTimeMillis()}") else rule
            reverseProxyState.add(withId)
            return true
        }
    }

    fun updateMockReverseProxyRule(rule: ReverseProxyRule): Boolean {
        synchronized(lock) {
            val idx = reverseProxyState.indexOfFirst { it.uuid == rule.uuid }
            if (idx != -1) {
                reverseProxyState[idx] = rule
                return true
            }
            return false
        }
    }

    fun deleteMockReverseProxyRule(uuid: String): Boolean {
        synchronized(lock) {
            return reverseProxyState.removeIf { it.uuid == uuid }
        }
    }

    fun getMockFirewallRules(): List<FirewallRule> {
        synchronized(lock) { return firewallState.map { it.copy() } }
    }

    fun addMockFirewallRule(rule: FirewallRule): Boolean {
        synchronized(lock) {
            val withId = if (rule.id.isBlank()) rule.copy(id = "fw_${System.currentTimeMillis()}") else rule
            // Replace same-name rule (edit), else append
            val idx = firewallState.indexOfFirst { it.name == withId.name }
            if (idx >= 0) firewallState[idx] = withId.copy(order = firewallState[idx].order)
            else firewallState.add(withId.copy(order = firewallState.size + 1))
            return true
        }
    }

    fun toggleMockFirewallRule(name: String, enabled: Boolean): Boolean {
        synchronized(lock) {
            val idx = firewallState.indexOfFirst { it.name == name || it.id == name }
            if (idx < 0) return false
            firewallState[idx] = firewallState[idx].copy(enabled = enabled)
            return true
        }
    }

    fun deleteMockFirewallRule(name: String): Boolean {
        synchronized(lock) {
            return firewallState.removeIf { it.name == name || it.id == name }
        }
    }

    fun getMockNotifications(): List<NotificationItem> {
        synchronized(lock) { return notificationsState.map { it.copy() }.sortedByDescending { it.time } }
    }

    fun markAllMockNotificationsRead(): Boolean {
        synchronized(lock) {
            for (i in notificationsState.indices) {
                notificationsState[i] = notificationsState[i].copy(read = true)
            }
            return true
        }
    }

    fun clearAllMockNotifications(): Boolean {
        synchronized(lock) {
            notificationsState.clear()
            return true
        }
    }

    fun getMockTrafficSummary(): TrafficSummary {
        return TrafficSummary(
            totalConnections = 18,
            outboundConnections = 12,
            inboundConnections = 6,
            localConnections = 4,
            currentOutboundSpeed = 2450000L,
            currentInboundSpeed = 820000L,
            topCountries = listOf(
                CountryTrafficSummary("VN", "Vietnam", "🇻🇳", 8, 12000000L, 5400000L),
                CountryTrafficSummary("US", "United States", "🇺🇸", 5, 8400000L, 2100000L),
                CountryTrafficSummary("SG", "Singapore", "🇸🇬", 3, 3200000L, 1100000L),
                CountryTrafficSummary("JP", "Japan", "🇯🇵", 2, 950000L, 420000L)
            )
        )
    }

    fun getMockSnmpDevices(): List<SnmpDevice> {
        return listOf(
            SnmpDevice(
                id = "dev_1",
                name = "Core Switch (MikroTik)",
                host = "192.168.1.1",
                port = 161,
                sensors = listOf(
                    SnmpSensor("s1", "Ping Latency", "ping", "ms", 1.8, "up"),
                    SnmpSensor("s2", "CPU Utilization", "cpu", "%", 14.5, "up"),
                    SnmpSensor("s3", "Port 1 WAN Traffic", "traffic", "Mbps", 85.2, "up")
                )
            ),
            SnmpDevice(
                id = "dev_2",
                name = "UPS CyberPower",
                host = "192.168.1.25",
                port = 161,
                sensors = listOf(
                    SnmpSensor("s4", "Battery Charge", "memory", "%", 100.0, "up"),
                    SnmpSensor("s5", "Output Load", "cpu", "%", 28.0, "up"),
                    SnmpSensor("s6", "Estimated Runtime", "uptime", "min", 48.0, "up")
                )
            )
        )
    }

    fun getMockFolderAcl(path: String = "/docker"): FolderAclInfo {
        synchronized(lock) {
            mockAclOverrides[path]?.let {
                return FolderAclInfo(
                    path = path,
                    owner = "admin",
                    group = "administrators",
                    accessList = it.map { e -> e.copy() }
                )
            }
        }
        return FolderAclInfo(
            path = path,
            owner = "admin",
            group = "administrators",
            accessList = listOf(
                FolderUserAccess("admin", false, "full_control"),
                FolderUserAccess("administrators", true, "full_control"),
                FolderUserAccess("users", true, "read_only"),
                FolderUserAccess("guest", false, "deny")
            )
        )
    }
}
