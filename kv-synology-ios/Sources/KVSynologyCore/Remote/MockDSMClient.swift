import Foundation

/// Actor providing a rich, realistic, dynamic mock Synology DSM environment for offline demo mode.
public actor MockDSMClient {
    public static let shared = MockDSMClient()

    private var servicesState: [DsmService] = [
        DsmService(id: "smb", name: "smb", displayName: "SMB / CIFS", serviceDescription: "Dịch vụ chia sẻ file cho Windows & macOS", category: "file", enabled: true, running: true, status: "running", port: 445),
        DsmService(id: "afp", name: "afp", displayName: "AFP", serviceDescription: "Apple Filing Protocol cho Mac cũ", category: "file", enabled: false, running: false, status: "stopped", port: 548),
        DsmService(id: "nfs", name: "nfs", displayName: "NFS", serviceDescription: "Network File System cho máy chủ Linux", category: "file", enabled: true, running: true, status: "running", port: 2049),
        DsmService(id: "ftp", name: "ftp", displayName: "FTP / FTPS", serviceDescription: "Dịch vụ truyền tệp qua mạng Internet", category: "file", enabled: true, running: true, status: "running", port: 21),
        DsmService(id: "ssh", name: "ssh", displayName: "SSH Terminal", serviceDescription: "Truy cập dòng lệnh bảo mật vào hệ thống", category: "terminal", enabled: true, running: true, status: "running", port: 22),
        DsmService(id: "rsync", name: "rsync", displayName: "Rsync Network Backup", serviceDescription: "Dịch vụ đồng bộ tệp qua mạng Rsync", category: "backup", enabled: false, running: false, status: "stopped", port: 873),
        DsmService(id: "webdav", name: "webdav", displayName: "WebDAV Server", serviceDescription: "Truy cập tệp từ xa qua HTTP/HTTPS WebDAV", category: "file", enabled: false, running: false, status: "stopped", port: 5005),
        DsmService(id: "nginx", name: "nginx", displayName: "Nginx Web Engine", serviceDescription: "Máy chủ web HTTP/HTTPS và reverse proxy (luôn bật)", category: "web", enabled: true, running: true, status: "enabled", port: 80, canToggle: false),
        DsmService(id: "snmp", name: "snmp", displayName: "SNMP Agent", serviceDescription: "Giám sát phần cứng qua mạng SNMP", category: "management", enabled: true, running: true, status: "running", port: 161)
    ]

    private var filesState: [String: [DsmFile]] = [
        "/": [
            DsmFile(path: "/docker", name: "docker", isdir: true, mtime: 1718000000, owner: "root", perm: "755"),
            DsmFile(path: "/downloads", name: "downloads", isdir: true, mtime: 1718100000, owner: "admin", perm: "777"),
            DsmFile(path: "/media", name: "media", isdir: true, mtime: 1718200000, owner: "admin", perm: "755"),
            DsmFile(path: "/homes", name: "homes", isdir: true, mtime: 1717000000, owner: "root", perm: "700"),
            DsmFile(path: "/backup", name: "backup", isdir: true, mtime: 1718300000, owner: "admin", perm: "755")
        ],
        "/docker": [
            DsmFile(path: "/docker/sample_video.mp4", name: "sample_video.mp4", isdir: false, size: 154200000, mtime: 1718400000, owner: "admin", mimeType: "video/mp4"),
            DsmFile(path: "/docker/synology_config.json", name: "synology_config.json", isdir: false, size: 4820, mtime: 1718450000, owner: "admin", mimeType: "application/json"),
            DsmFile(path: "/docker/backup_log.txt", name: "backup_log.txt", isdir: false, size: 18900, mtime: 1718480000, owner: "root", mimeType: "text/plain"),
            DsmFile(path: "/docker/nas_banner.png", name: "nas_banner.png", isdir: false, size: 1250000, mtime: 1718500000, owner: "admin", mimeType: "image/png")
        ]
    ]

    private var mockFileContents: [String: String] = [
        "/docker/synology_config.json": """
        {
          "server_name": "DS920-KhoaVo",
          "timezone": "Asia/Ho_Chi_Minh",
          "packages_autoupdate": true,
          "notifications": {
            "email": "admin@example.com",
            "telegram_enabled": true
          },
          "max_ssh_retries": 5
        }
        """,
        "/docker/backup_log.txt": """
        [2026-09-06 02:00:01] INFO: Daily Hyper Backup started for Volume1.
        [2026-09-06 02:14:22] INFO: Docker containers paused for snapshot.
        [2026-09-06 02:14:45] INFO: Snapshot taken successfully.
        [2026-09-06 02:15:00] INFO: Resumed docker containers.
        [2026-09-06 02:30:11] SUCCESS: Backup completed. Transferred: 4.2 GB.
        """
    ]

    private var dockerState: [DockerContainerDetails] = [
        DockerContainerDetails(
            id: "c1_vaultwarden",
            name: "vaultwarden",
            image: "vaultwarden/server:latest",
            status: "running",
            created: "2024-05-10",
            ports: ["8080:80"],
            cpuUsage: 0.5,
            memoryUsage: "68 MB",
            uptime: "14 days",
            restartPolicy: "unless-stopped"
        ),
        DockerContainerDetails(
            id: "c2_adguard",
            name: "adguardhome",
            image: "adguard/adguardhome:latest",
            status: "running",
            created: "2024-04-12",
            ports: ["53:53/udp", "3000:3000"],
            cpuUsage: 1.2,
            memoryUsage: "92 MB",
            uptime: "28 days",
            restartPolicy: "always"
        ),
        DockerContainerDetails(
            id: "c3_portainer",
            name: "portainer-ce",
            image: "portainer/portainer-ce:latest",
            status: "running",
            created: "2024-03-01",
            ports: ["9000:9000"],
            cpuUsage: 0.2,
            memoryUsage: "45 MB",
            uptime: "35 days",
            restartPolicy: "always"
        ),
        DockerContainerDetails(
            id: "c4_nginx",
            name: "nginx-proxy-manager",
            image: "jc21/nginx-proxy-manager:latest",
            status: "stopped",
            created: "2024-06-01",
            ports: ["81:81", "443:443"],
            cpuUsage: 0.0,
            memoryUsage: "0 MB",
            uptime: "Stopped",
            restartPolicy: "unless-stopped"
        )
    ]

    private var mockProjectsState: [DockerProject] = [
        DockerProject(
            id: "proj_infra",
            name: "Infra-Core",
            status: "running",
            path: "/volume1/docker/infra",
            yamlContent: "services:\n  vaultwarden:\n    image: vaultwarden/server:latest\n    ports:\n      - 8080:80\n  adguardhome:\n    image: adguard/adguardhome:latest\n    ports:\n      - 53:53/udp\n      - 3000:3000",
            services: [
                DockerProjectService(name: "vaultwarden", image: "vaultwarden/server:latest", status: "running", ports: ["8080:80"]),
                DockerProjectService(name: "adguardhome", image: "adguard/adguardhome:latest", status: "running", ports: ["53:53/udp", "3000:3000"])
            ],
            created: "2024-05-10"
        ),
        DockerProject(
            id: "proj_proxy",
            name: "Proxy",
            status: "stopped",
            path: "/volume1/docker/proxy",
            yamlContent: "services:\n  nginx-proxy-manager:\n    image: jc21/nginx-proxy-manager:latest\n    ports:\n      - 81:81\n      - 443:443",
            services: [
                DockerProjectService(name: "nginx-proxy-manager", image: "jc21/nginx-proxy-manager:latest", status: "stopped", ports: ["81:81", "443:443"])
            ],
            created: "2024-06-01"
        )
    ]

    private var mockProjectMembers: [String: [String]] = [
        "proj_infra": ["c1_vaultwarden", "c2_adguard"],
        "proj_proxy": ["c4_nginx"]
    ]

    private var mockImagesState: [DockerImage] = [
        DockerImage(id: "img_1", repository: "vaultwarden/server", tag: "latest", sizeMB: 142, sizeFormatted: "142 MB", created: "2024-05-01", containersCount: 1, isUsed: true),
        DockerImage(id: "img_2", repository: "adguard/adguardhome", tag: "latest", sizeMB: 85, sizeFormatted: "85 MB", created: "2024-04-10", containersCount: 1, isUsed: true),
        DockerImage(id: "img_3", repository: "portainer/portainer-ce", tag: "latest", sizeMB: 280, sizeFormatted: "280 MB", created: "2024-03-01", containersCount: 1, isUsed: true),
        DockerImage(id: "img_4", repository: "redis", tag: "7.0-alpine", sizeMB: 32, sizeFormatted: "32 MB", created: "2024-02-15", containersCount: 0, isUsed: false)
    ]

    private var downloadState: [DownloadTask] = [
        DownloadTask(id: "dt_1", title: "Ubuntu 24.04 LTS Desktop ISO", size: 5800000000, status: .downloading, progress: 68.5, downloadSpeed: 12500000, uploadSpeed: 450000, type: "bt", uri: "magnet:?xt=urn:btih:ubuntu", destination: "/volume1/downloads"),
        DownloadTask(id: "dt_2", title: "Debian 12 Netinst AMD64", size: 750000000, status: .finished, progress: 100.0, downloadSpeed: 0, uploadSpeed: 0, type: "http", uri: "https://cdimage.debian.org/debian-12.iso", destination: "/volume1/downloads"),
        DownloadTask(id: "dt_3", title: "Alpine Linux Standard 3.20", size: 215000000, status: .paused, progress: 42.0, downloadSpeed: 0, uploadSpeed: 0, type: "http", uri: "https://dl-cdn.alpinelinux.org/alpine.iso", destination: "/volume1/downloads"),
        DownloadTask(id: "dt_4", title: "Arch Linux 2024 Release", size: 1100000000, status: .waiting, progress: 0.0, downloadSpeed: 0, uploadSpeed: 0, type: "bt", uri: "magnet:?xt=urn:btih:arch", destination: "/volume1/downloads")
    ]

    private var reverseProxyState: [ReverseProxyRule] = [
        ReverseProxyRule(
            uuid: "rpr_1",
            description: "Vaultwarden Password Manager",
            frontend: ReverseProxyFrontend(protocol: 1, fqdn: "vault.synology.local", port: 443, hsts: true, http2: true),
            backend: ReverseProxyBackend(protocol: 0, fqdn: "localhost", port: 8080)
        ),
        ReverseProxyRule(
            uuid: "rpr_2",
            description: "AdGuard Home DNS Web",
            frontend: ReverseProxyFrontend(protocol: 1, fqdn: "adguard.synology.local", port: 443, hsts: false, http2: true),
            backend: ReverseProxyBackend(protocol: 0, fqdn: "localhost", port: 3000)
        )
    ]

    private var firewallState: [FirewallRule] = [
        FirewallRule(id: "fw_1", name: "Allow DSM Web HTTPS", ports: "5001", protocolType: "tcp", sourceType: "all", sourceValue: "all", action: "allow", enabled: true, order: 1),
        FirewallRule(id: "fw_2", name: "Allow Local LAN SMB & NFS", ports: "445,2049", protocolType: "tcp", sourceType: "subnet", sourceValue: "192.168.1.0/24", action: "allow", enabled: true, order: 2),
        FirewallRule(id: "fw_3", name: "Allow SSH Admin Only", ports: "22", protocolType: "tcp", sourceType: "single_ip", sourceValue: "192.168.1.100", action: "allow", enabled: true, order: 3),
        FirewallRule(id: "fw_4", name: "Deny Unknown WAN Inbound", ports: "all", protocolType: "all", sourceType: "all", sourceValue: "all", action: "deny", enabled: true, order: 4)
    ]

    private var mockAclOverrides: [String: [FolderUserAccess]] = [:]

    private var notificationsState: [DsmNotification] = [
        DsmNotification(id: "notif_1", title: "SMART Test Finished", displayTitle: "Kiểm tra S.M.A.R.T Drive 1 hoàn tất", category: "storage", level: "success", messages: ["Ổ đĩa 1 (ST4000VN008) ở trạng thái tốt, không có sector hỏng."], time: Int64(Date().timeIntervalSince1970) - 3600, read: false),
        DsmNotification(id: "notif_2", title: "Hyper Backup Succeeded", displayTitle: "Sao lưu hàng ngày thành công", category: "backup", level: "info", messages: ["Đã sao lưu 14.2 GB lên Synology C2 Storage."], time: Int64(Date().timeIntervalSince1970) - 18000, read: false),
        DsmNotification(id: "notif_3", title: "Auto-Block Triggered", displayTitle: "Đã chặn IP 185.220.101.5", category: "security", level: "warning", messages: ["Địa chỉ IP 185.220.101.5 đã thử đăng nhập SSH thất bại 5 lần."], time: Int64(Date().timeIntervalSince1970) - 86400, read: true)
    ]

    private var packagesState: [DsmPackage] = [
        DsmPackage(id: "ContainerManager", name: "Container Manager (Docker)", version: "24.0.2-1527", status: "running", description: "Chạy container Docker độc lập", maintainer: "Synology", category: "Utilities", installed: true, hasUpdate: false),
        DsmPackage(id: "DownloadStation", name: "Download Station", version: "3.9.5-4603", status: "running", description: "Tải tệp tin BitTorrent, HTTP, FTP", maintainer: "Synology", category: "Download", installed: true, hasUpdate: false),
        DsmPackage(id: "FileStation", name: "File Station", version: "1.4.3-0980", status: "running", description: "Quản lý tập tin đám mây riêng", maintainer: "Synology", category: "Productivity", installed: true, hasUpdate: false),
        DsmPackage(id: "HyperBackup", name: "Hyper Backup", version: "4.1.1-3758", status: "running", description: "Sao lưu dữ liệu đám mây và ổ đĩa", maintainer: "Synology", category: "Backup", installed: true, hasUpdate: true, latestVersion: "4.1.2-3760"),
        DsmPackage(id: "PlexMediaServer", name: "Plex Media Server", version: "1.40.2", status: "stopped", description: "Trung tâm quản lý video và nhạc", maintainer: "Plex Inc.", category: "Multimedia", installed: true, hasUpdate: false)
    ]

    public init() {}

    // MARK: - Session & Telemetry

    public func getMockSession() -> DsmSession {
        DsmSession(
            sid: "demo_session_token_12345",
            synoToken: "demo_syno_token_67890",
            did: "demo_did_device_abc",
            cookie: "id=demo_session_token_12345",
            isConnected: true,
            dsmVersion: 7,
            versionString: "DSM 7.2.1-69057 Update 5",
            model: "DS920+",
            hostname: "Demo-Synology-NAS",
            account: "admin"
        )
    }

    public func getMockSystemInfo() -> SystemInfo {
        SystemInfo(
            model: "DS920+",
            serial: "2170QNR641001",
            version: "DSM 7.2.1-69057 Update 5",
            uptime: 846200,
            temperature: 42,
            time: ISO8601DateFormatter().string(from: Date()),
            ramTotal: 8192,
            ramUsed: 3276,
            cpuModel: "Intel Celeron J4125 (4 Cores, 2.0 GHz)",
            cpuCores: 4
        )
    }

    public func getMockUtilization() -> SystemUtilization {
        let cpu = Double.random(in: 20...65)
        let mem = Double.random(in: 38...48)
        return SystemUtilization(
            cpuPercent: cpu,
            memoryPercent: mem,
            memoryUsedMB: Int64(8192.0 * (mem / 100.0)),
            memoryTotalMB: 8192,
            networkRxBytes: Int64(1024 * 1024 * Int.random(in: 1...8)),
            networkTxBytes: Int64(1024 * 512 * Int.random(in: 1...6)),
            diskReadBytes: Int64(1024 * 256 * Int.random(in: 1...4)),
            diskWriteBytes: Int64(1024 * 512 * Int.random(in: 1...5)),
            timestamp: Int64(Date().timeIntervalSince1970 * 1000)
        )
    }

    public func getMockProcesses() -> [DsmProcess] {
        [
            DsmProcess(pid: 1240, name: "synoscgi", cpu: 12.5, memory: 3.2, user: "root", status: "running"),
            DsmProcess(pid: 892, name: "dockerd", cpu: 8.4, memory: 6.5, user: "root", status: "running"),
            DsmProcess(pid: 1560, name: "smbd", cpu: 4.1, memory: 2.1, user: "admin", status: "running"),
            DsmProcess(pid: 3045, name: "nginx", cpu: 3.2, memory: 1.8, user: "http", status: "running"),
            DsmProcess(pid: 412, name: "transmission-daemon", cpu: 2.8, memory: 4.2, user: "download", status: "running"),
            DsmProcess(pid: 5210, name: "postgres", cpu: 1.9, memory: 5.1, user: "postgres", status: "running")
        ]
    }

    // MARK: - File Station

    public func getMockFiles(folderPath: String = "/") -> [DsmFile] {
        let key = folderPath.isEmpty ? "/" : folderPath
        if let files = filesState[key] {
            return files
        }
        if key != "/" {
            return [
                DsmFile(path: "\(key)/sample_video.mp4", name: "sample_video.mp4", isdir: false, size: 154200000, mtime: 1718400000, owner: "admin", mimeType: "video/mp4"),
                DsmFile(path: "\(key)/synology_config.json", name: "synology_config.json", isdir: false, size: 4820, mtime: 1718450000, owner: "admin", mimeType: "application/json"),
                DsmFile(path: "\(key)/backup_log.txt", name: "backup_log.txt", isdir: false, size: 18900, mtime: 1718480000, owner: "root", mimeType: "text/plain"),
                DsmFile(path: "\(key)/nas_banner.png", name: "nas_banner.png", isdir: false, size: 1250000, mtime: 1718500000, owner: "admin", mimeType: "image/png"),
                DsmFile(path: "\(key)/sample_track.mp3", name: "sample_track.mp3", isdir: false, size: 8400000, mtime: 1718520000, owner: "admin", mimeType: "audio/mpeg")
            ]
        }
        return filesState["/"] ?? []
    }

    public func createMockFolder(folderPath: String, name: String) -> Bool {
        let parent = folderPath.isEmpty ? "/" : folderPath
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !clean.isEmpty else { return false }
        let newPath = parent == "/" ? "/\(clean)" : "\(parent)/\(clean)"

        var parentList = filesState[parent] ?? []
        if parentList.contains(where: { $0.name == clean }) { return false }

        let now = Int64(Date().timeIntervalSince1970)
        parentList.append(DsmFile(path: newPath, name: clean, isdir: true, mtime: now, owner: "admin", perm: "755"))
        filesState[parent] = parentList
        filesState[newPath] = []
        return true
    }

    public func deleteMockFile(path: String) -> Bool {
        for (parent, var list) in filesState {
            if let idx = list.firstIndex(where: { $0.path == path }) {
                list.remove(at: idx)
                filesState[parent] = list
                filesState.removeValue(forKey: path)
                mockFileContents.removeValue(forKey: path)
                return true
            }
        }
        return false
    }

    public func renameMockFile(path: String, newName: String) -> Bool {
        let clean = newName.trimmingCharacters(in: .whitespacesAndNewlines).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !clean.isEmpty else { return false }

        for (parent, var list) in filesState {
            if let idx = list.firstIndex(where: { $0.path == path }) {
                var item = list[idx]
                let newPath = parent == "/" ? "/\(clean)" : "\(parent)/\(clean)"
                item.path = newPath
                item.name = clean
                list[idx] = item
                filesState[parent] = list

                if let bucket = filesState.removeValue(forKey: path) {
                    filesState[newPath] = bucket
                }
                if let content = mockFileContents.removeValue(forKey: path) {
                    mockFileContents[newPath] = content
                }
                return true
            }
        }
        return false
    }

    public func getMockFileContent(path: String) -> String {
        mockFileContents[path] ?? "Tệp cấu hình Synology NAS:\nĐường dẫn: \(path)\nKích thước: 1024 bytes\nĐược quản lý bởi KV Synology."
    }

    public func saveMockFileContent(path: String, content: String) -> Bool {
        mockFileContents[path] = content
        let parent = (path as NSString).deletingLastPathComponent.isEmpty ? "/" : (path as NSString).deletingLastPathComponent
        let fileName = (path as NSString).lastPathComponent
        var parentList = filesState[parent] ?? []
        let size = Int64(content.utf8.count)
        let now = Int64(Date().timeIntervalSince1970)

        if let idx = parentList.firstIndex(where: { $0.path == path || $0.name == fileName }) {
            parentList[idx].size = size
            parentList[idx].mtime = now
        } else {
            parentList.append(DsmFile(path: path, name: fileName, isdir: false, size: size, mtime: now, owner: "admin"))
        }
        filesState[parent] = parentList
        return true
    }

    public func getMockFileBytes(path: String) -> Data {
        let text = getMockFileContent(path: path)
        return text.data(using: .utf8) ?? Data()
    }

    public func mockCopyMoveFiles(paths: [String], destFolder: String, isCut: Bool) -> Bool {
        let destClean = destFolder.isEmpty ? "/" : destFolder
        var targetList = filesState[destClean] ?? []

        for srcPath in paths {
            var foundItem: DsmFile?
            var sourceKey: String?

            for (key, list) in filesState {
                if let item = list.first(where: { $0.path == srcPath }) {
                    foundItem = item
                    sourceKey = key
                    break
                }
            }

            let fileName = (srcPath as NSString).lastPathComponent
            let item = foundItem ?? DsmFile(path: srcPath, name: fileName, isdir: false, size: 1024, mtime: Int64(Date().timeIntervalSince1970))
            let targetPath = destClean == "/" ? "/\(fileName)" : "\(destClean)/\(fileName)"

            targetList.removeAll(where: { $0.name == fileName })
            var copied = item
            copied.path = targetPath
            targetList.append(copied)

            if let content = mockFileContents[srcPath] {
                mockFileContents[targetPath] = content
                if isCut { mockFileContents.removeValue(forKey: srcPath) }
            }

            if isCut, let sourceKey = sourceKey {
                var sList = filesState[sourceKey] ?? []
                sList.removeAll(where: { $0.path == srcPath })
                filesState[sourceKey] = sList
                if let sub = filesState.removeValue(forKey: srcPath) {
                    filesState[targetPath] = sub
                }
            }
        }

        filesState[destClean] = targetList
        return true
    }

    // MARK: - Docker

    public func getMockDockerContainers() -> [DockerContainerDetails] {
        dockerState
    }

    public func toggleMockDockerContainer(id: String, action: String) -> Bool {
        guard let idx = dockerState.firstIndex(where: { $0.id == id || $0.name == id }) else { return false }
        var cur = dockerState[idx]
        let newStatus: String
        switch action.lowercased() {
        case "start": newStatus = "running"
        case "stop": newStatus = "stopped"
        case "restart": newStatus = "running"
        default: newStatus = (cur.status == "running") ? "stopped" : "running"
        }
        cur.status = newStatus
        dockerState[idx] = cur
        return true
    }

    public func deleteMockContainer(id: String) -> Bool {
        let initial = dockerState.count
        dockerState.removeAll(where: { $0.id == id || $0.name == id })
        return dockerState.count < initial
    }

    public func deleteMockImage(repository: String, tag: String) -> Bool {
        guard let idx = mockImagesState.firstIndex(where: { $0.repository == repository && $0.tag == tag }) else { return false }
        if mockImagesState[idx].isUsed { return false }
        mockImagesState.remove(at: idx)
        return true
    }

    public func toggleMockProject(id: String, action: String) -> Bool {
        guard let idx = mockProjectsState.firstIndex(where: { $0.id == id || $0.name == id }) else { return false }
        let newStatus: String
        switch action.lowercased() {
        case "start": newStatus = "running"
        case "stop": newStatus = "stopped"
        default: return false
        }
        mockProjectsState[idx].status = newStatus

        let members = mockProjectMembers[mockProjectsState[idx].id] ?? []
        for i in 0..<dockerState.count {
            if members.contains(dockerState[i].id) {
                dockerState[i].status = newStatus
            }
        }
        return true
    }

    public func getMockDockerProjects() -> [DockerProject] {
        mockProjectsState.map { project in
            let members = (mockProjectMembers[project.id] ?? []).compactMap { cid in
                dockerState.first(where: { $0.id == cid })
            }
            let syncedStatus: String
            if !members.isEmpty && members.allSatisfy({ $0.status == "running" }) {
                syncedStatus = "running"
            } else if !members.isEmpty && members.allSatisfy({ $0.status == "stopped" }) {
                syncedStatus = "stopped"
            } else {
                syncedStatus = project.status
            }
            var p = project
            p.status = syncedStatus
            p.services = members.map { DockerProjectService(name: $0.name, image: $0.image, status: $0.status, ports: $0.ports) }
            return p
        }
    }

    public func getMockDockerImages() -> [DockerImage] {
        mockImagesState
    }

    // MARK: - Download Station

    public func getMockDownloadTasks() -> [DownloadTask] {
        downloadState
    }

    public func addMockDownloadTask(uri: String, destination: String? = nil) -> Bool {
        let cleanUri = uri.trimmingCharacters(in: .whitespacesAndNewlines)
        let title = (cleanUri as NSString).lastPathComponent.components(separatedBy: "?").first ?? cleanUri
        let task = DownloadTask(
            id: "dt_\(Int64(Date().timeIntervalSince1970 * 1000))",
            title: title.isEmpty ? "New Download" : title,
            size: 0,
            status: .waiting,
            progress: 0.0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            type: cleanUri.hasPrefix("magnet:") ? "bt" : "http",
            uri: cleanUri,
            destination: destination ?? "/volume1/downloads",
            createdTime: Int64(Date().timeIntervalSince1970)
        )
        downloadState.append(task)
        return true
    }

    public func toggleMockDownloadTask(id: String, action: String) -> Bool {
        guard let idx = downloadState.firstIndex(where: { $0.id == id }) else { return false }
        var cur = downloadState[idx]
        switch action.lowercased() {
        case "delete":
            downloadState.remove(at: idx)
            return true
        case "pause":
            cur.status = .paused
            cur.downloadSpeed = 0
            downloadState[idx] = cur
            return true
        case "resume":
            cur.status = cur.progress >= 100.0 ? .finished : .downloading
            cur.downloadSpeed = cur.progress >= 100.0 ? 0 : 4500000
            downloadState[idx] = cur
            return true
        default:
            return false
        }
    }

    // MARK: - Storage

    public func getMockStorageVolumes() -> [StorageVolume] {
        [
            StorageVolume(
                id: "volume_1",
                name: "Volume 1",
                path: "/volume1",
                fsType: "btrfs",
                totalBytes: 3840000000000,
                usedBytes: 2150000000000,
                freeBytes: 1690000000000,
                status: "normal",
                drives: [
                    DiskDrive(slot: 1, slotName: "Drive 1", model: "Seagate IronWolf 4TB", serial: "ST4000VN008-1", status: "normal", temp: 36, size: 4000000000000, health: "healthy"),
                    DiskDrive(slot: 2, slotName: "Drive 2", model: "Seagate IronWolf 4TB", serial: "ST4000VN008-2", status: "normal", temp: 38, size: 4000000000000, health: "healthy")
                ],
                raidType: "Synology Hybrid RAID (SHR)"
            ),
            StorageVolume(
                id: "volume_2",
                name: "Volume 2 (NVMe)",
                path: "/volume2",
                fsType: "btrfs",
                totalBytes: 960000000000,
                usedBytes: 320000000000,
                freeBytes: 640000000000,
                status: "normal",
                drives: [
                    DiskDrive(slot: 3, slotName: "M.2 SSD 1", model: "Samsung 970 EVO Plus 1TB", serial: "S4EWNF0N123", status: "normal", temp: 44, size: 1000000000000, health: "healthy", driveType: "NVMe")
                ],
                raidType: "RAID 1"
            )
        ]
    }

    // MARK: - Packages

    public func getMockPackages() -> [DsmPackage] {
        packagesState
    }

    public func toggleMockPackage(id: String, action: String) -> Bool {
        guard let idx = packagesState.firstIndex(where: { $0.id == id }) else { return false }
        let newStatus: String
        switch action.lowercased() {
        case "start": newStatus = "running"
        case "stop": newStatus = "stopped"
        default: return false
        }
        packagesState[idx].status = newStatus
        return true
    }

    // MARK: - Services

    public func getMockServices() -> [DsmService] {
        servicesState
    }

    public func toggleMockService(id: String, enabled: Bool) -> Bool {
        guard let idx = servicesState.firstIndex(where: { $0.id == id }) else { return false }
        guard servicesState[idx].canToggle else { return false }
        servicesState[idx].enabled = enabled
        servicesState[idx].running = enabled
        servicesState[idx].status = enabled ? "running" : "stopped"
        return true
    }

    public func updateMockServicePort(id: String, port: Int) -> Bool {
        guard let idx = servicesState.firstIndex(where: { $0.id == id }) else { return false }
        guard (1...65535).contains(port) else { return false }
        let allowed = Set(["ssh", "ftp", "webdav", "rsync"])
        guard allowed.contains(id) else { return false }
        servicesState[idx].port = port
        return true
    }

    // MARK: - Reverse Proxy

    public func getMockReverseProxyRules() -> [ReverseProxyRule] {
        reverseProxyState
    }

    public func addMockReverseProxyRule(rule: ReverseProxyRule) -> Bool {
        var r = rule
        if r.uuid.isEmpty {
            r.uuid = "rpr_\(Int64(Date().timeIntervalSince1970 * 1000))"
        }
        reverseProxyState.append(r)
        return true
    }

    public func updateMockReverseProxyRule(rule: ReverseProxyRule) -> Bool {
        guard let idx = reverseProxyState.firstIndex(where: { $0.uuid == rule.uuid }) else { return false }
        reverseProxyState[idx] = rule
        return true
    }

    public func deleteMockReverseProxyRule(uuid: String) -> Bool {
        let initial = reverseProxyState.count
        reverseProxyState.removeAll(where: { $0.uuid == uuid })
        return reverseProxyState.count < initial
    }

    // MARK: - Firewall

    public func getMockFirewallRules() -> [FirewallRule] {
        firewallState
    }

    public func addMockFirewallRule(rule: FirewallRule) -> Bool {
        var r = rule
        if r.id.isEmpty {
            r.id = "fw_\(Int64(Date().timeIntervalSince1970 * 1000))"
        }
        if let idx = firewallState.firstIndex(where: { $0.name == r.name }) {
            r.order = firewallState[idx].order
            firewallState[idx] = r
        } else {
            r.order = firewallState.count + 1
            firewallState.append(r)
        }
        return true
    }

    public func toggleMockFirewallRule(name: String, enabled: Bool) -> Bool {
        guard let idx = firewallState.firstIndex(where: { $0.name == name || $0.id == name }) else { return false }
        firewallState[idx].enabled = enabled
        return true
    }

    public func deleteMockFirewallRule(name: String) -> Bool {
        let initial = firewallState.count
        firewallState.removeAll(where: { $0.name == name || $0.id == name })
        return firewallState.count < initial
    }

    // MARK: - Notifications

    public func getMockNotifications() -> [DsmNotification] {
        notificationsState.sorted(by: { $0.time > $1.time })
    }

    public func markAllMockNotificationsRead() -> Bool {
        for i in 0..<notificationsState.count {
            notificationsState[i].read = true
        }
        return true
    }

    public func clearAllMockNotifications() -> Bool {
        notificationsState.removeAll()
        return true
    }

    // MARK: - Traffic & SNMP

    public func getMockTrafficSummary() -> TrafficSummary {
        TrafficSummary(
            totalConnections: 18,
            outboundConnections: 12,
            inboundConnections: 6,
            localConnections: 4,
            currentOutboundSpeed: 2450000,
            currentInboundSpeed: 820000,
            topCountries: [
                CountryTrafficSummary(countryCode: "VN", countryName: "Vietnam", flagEmoji: "🇻🇳", activeConnections: 8, outboundBytes: 12000000, inboundBytes: 5400000),
                CountryTrafficSummary(countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", activeConnections: 5, outboundBytes: 8400000, inboundBytes: 2100000),
                CountryTrafficSummary(countryCode: "SG", countryName: "Singapore", flagEmoji: "🇸🇬", activeConnections: 3, outboundBytes: 3200000, inboundBytes: 1100000),
                CountryTrafficSummary(countryCode: "JP", countryName: "Japan", flagEmoji: "🇯🇵", activeConnections: 2, outboundBytes: 950000, inboundBytes: 420000)
            ],
            connections: [
                ActiveConnection(id: "conn_1", direction: "inbound", localAddress: "192.168.1.10", localPort: 5001, remoteAddress: "113.161.42.18", remotePort: 54320, protocolType: "HTTPS", state: "ESTABLISHED", processName: "DSM Web UI (admin)", geo: IpGeoInfo(ip: "113.161.42.18", countryCode: "VN", countryName: "Vietnam", flagEmoji: "🇻🇳", isp: "VNPT", isPrivate: false)),
                ActiveConnection(id: "conn_2", direction: "local", localAddress: "192.168.1.10", localPort: 445, remoteAddress: "192.168.1.15", remotePort: 49152, protocolType: "SMB", state: "ESTABLISHED", processName: "smbd (File Sharing)", geo: IpGeoInfo(ip: "192.168.1.15", countryCode: "LAN", countryName: "Mạng nội bộ", flagEmoji: "🏠", isp: "Local", isPrivate: true)),
                ActiveConnection(id: "conn_3", direction: "outbound", localAddress: "192.168.1.10", localPort: 42100, remoteAddress: "142.250.190.46", remotePort: 443, protocolType: "HTTPS", state: "ESTABLISHED", processName: "Package Center", geo: IpGeoInfo(ip: "142.250.190.46", countryCode: "US", countryName: "United States", flagEmoji: "🇺🇸", isp: "Google LLC", isPrivate: false))
            ],
            interfaces: [
                NetworkInterfaceStats(id: "eth0", name: "LAN 1 (eth0)", ip: "192.168.1.10", mask: "255.255.255.0", mac: "00:11:32:AB:CD:EF", status: "up", speedMbps: 1000, rxBytes: 450201020, txBytes: 890120400),
                NetworkInterfaceStats(id: "eth1", name: "LAN 2 (eth1)", ip: "192.168.1.11", mask: "255.255.255.0", mac: "00:11:32:AB:CD:F0", status: "up", speedMbps: 1000, rxBytes: 12050020, txBytes: 8402010)
            ]
        )
    }

    public func getMockSnmpDevices() -> [SnmpDevice] {
        [
            SnmpDevice(
                id: "dev_1",
                name: "Core Switch (MikroTik)",
                host: "192.168.1.1",
                port: 161,
                sensors: [
                    SnmpSensor(id: "s1", name: "Ping Latency", kind: "ping", unit: "ms", value: 1.8, status: "up"),
                    SnmpSensor(id: "s2", name: "CPU Utilization", kind: "cpu", unit: "%", value: 14.5, status: "up"),
                    SnmpSensor(id: "s3", name: "Port 1 WAN Traffic", kind: "traffic", unit: "Mbps", value: 85.2, status: "up")
                ]
            ),
            SnmpDevice(
                id: "dev_2",
                name: "UPS CyberPower",
                host: "192.168.1.25",
                port: 161,
                sensors: [
                    SnmpSensor(id: "s4", name: "Battery Charge", kind: "memory", unit: "%", value: 100.0, status: "up"),
                    SnmpSensor(id: "s5", name: "Output Load", kind: "cpu", unit: "%", value: 28.0, status: "up"),
                    SnmpSensor(id: "s6", name: "Estimated Runtime", kind: "uptime", unit: "min", value: 48.0, status: "up")
                ]
            )
        ]
    }

    // MARK: - ACL

    public func getMockFolderAcl(path: String = "/docker") -> FolderAclInfo {
        if let overridden = mockAclOverrides[path] {
            return FolderAclInfo(path: path, owner: "admin", group: "administrators", accessList: overridden)
        }
        return FolderAclInfo(
            path: path,
            owner: "admin",
            group: "administrators",
            posixPerm: "755",
            isAclMode: true,
            accessList: [
                FolderUserAccess(targetName: "admin", isGroup: false, level: "full_control"),
                FolderUserAccess(targetName: "administrators", isGroup: true, level: "full_control"),
                FolderUserAccess(targetName: "users", isGroup: true, level: "read_only"),
                FolderUserAccess(targetName: "guest", isGroup: false, level: "deny")
            ]
        )
    }

    public func setMockFolderAcl(path: String, accessList: [FolderUserAccess]) -> Bool {
        mockAclOverrides[path] = accessList
        return true
    }

    // MARK: - Security Advisor

    public func getMockSecurityScanResult() -> SecurityScanResult {
        SecurityScanResult(
            id: "scan_\(Int64(Date().timeIntervalSince1970))",
            scanTimestamp: Int64(Date().timeIntervalSince1970 * 1000),
            status: "healthy",
            riskLevel: "low",
            itemsChecked: 48,
            warningsCount: 1,
            criticalCount: 0,
            issues: [
                SecurityAuditItem(id: "sec_1", severity: "warning", title: "Cổng SSH mặc định đang sử dụng cổng 22", itemDescription: "Sử dụng cổng 22 chuẩn dễ bị tấn công brute-force từ Internet.", recommendation: "Đổi cổng SSH sang số cổng tùy chỉnh cao hơn (ví dụ 2222).")
            ],
            recommendations: [
                "Bật xác thực hai yếu tố (2FA) cho toàn bộ tài khoản quản trị.",
                "Đổi cổng SSH mặc định 22 sang cổng khác.",
                "Đảm bảo tự động cập nhật bản vá bảo mật quan trọng."
            ]
        )
    }
}
