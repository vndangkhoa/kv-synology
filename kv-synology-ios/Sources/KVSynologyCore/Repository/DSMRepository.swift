import Foundation

// MARK: - Repository Protocols

public protocol AuthRepositoryProtocol: Sendable {
    var currentSession: DsmSession { get async }
    func login(config: ConnectionConfig) async -> Result<DsmSession, Error>
    func logout() async
    func getAllProfiles() async -> [ConnectionConfig]
    func saveProfile(config: ConnectionConfig, remember: Bool) async
    func deleteProfile(profileId: String) async
    func clearAllProfiles() async
    func selectProfile(profileId: String) async -> Result<DsmSession, Error>
    func getActiveConfig() async -> ConnectionConfig
    func isDemoSession() async -> Bool
}

public protocol SystemRepositoryProtocol: Sendable {
    func getSystemInfo() async -> SystemInfo
    func getUtilization() async -> SystemUtilization
    func getProcesses() async -> [DsmProcess]
    func powerAction(action: String) async -> Bool
    func killProcess(pid: Int) async -> Bool
    func telemetryStream(intervalSeconds: TimeInterval) -> AsyncStream<SystemUtilization>
}

public protocol FileStationRepositoryProtocol: Sendable {
    func listFiles(path: String) async -> [DsmFile]
    func createFolder(path: String, name: String) async -> Bool
    func deleteFile(path: String) async -> Bool
    func renameFile(path: String, newName: String) async -> Bool
    func createShareLink(path: String, password: String?, expire: String?) async -> FileShareLink
    func getStreamUrl(path: String) async -> String
    func getDownloadUrl(path: String) async -> String
    func copyMoveFiles(paths: [String], destFolder: String, isCut: Bool) async -> Bool
    func getFileContent(path: String) async -> String
    func saveFileContent(filePath: String, content: String) async -> Bool
    func downloadFileBytes(path: String) async throws -> Data
}

public protocol DockerRepositoryProtocol: Sendable {
    func getContainers() async -> [DockerContainerDetails]
    func toggleContainer(id: String, action: String) async -> Bool
    func getProjects() async -> [DockerProject]
    func getImages() async -> [DockerImage]
    func getContainerLogs(idOrName: String, tail: Int) async -> [String]
    func toggleProject(id: String, action: String) async -> Bool
    func deleteContainer(idOrName: String, force: Bool) async -> Bool
    func deleteImage(repository: String, tag: String) async -> Bool
}

public protocol DownloadRepositoryProtocol: Sendable {
    func getTasks() async -> [DownloadTask]
    func addTask(uri: String, destination: String?) async -> Bool
    func toggleTask(id: String, action: String) async -> Bool
}

public protocol StorageRepositoryProtocol: Sendable {
    func getVolumes() async -> [StorageVolume]
}

public protocol PackageRepositoryProtocol: Sendable {
    func getPackages() async -> [DsmPackage]
    func togglePackage(id: String, action: String) async -> Bool
}

public protocol ServicesRepositoryProtocol: Sendable {
    func getServices() async -> [DsmService]
    func toggleService(id: String, enabled: Bool) async -> Bool
    func updateServicePort(id: String, port: Int) async -> Bool
    func getReverseProxyRules() async -> [ReverseProxyRule]
    func addReverseProxyRule(rule: ReverseProxyRule) async -> Bool
    func updateReverseProxyRule(rule: ReverseProxyRule) async -> Bool
    func deleteReverseProxyRule(uuid: String) async -> Bool
}

public protocol SecurityRepositoryProtocol: Sendable {
    func getFirewallConfig() async -> FirewallConfig
    func addFirewallRule(rule: FirewallRule) async -> Bool
    func toggleFirewallRule(name: String, enabled: Bool) async -> Bool
    func deleteFirewallRule(name: String) async -> Bool
    func getSecurityScanResult() async -> SecurityScanResult
}

public protocol NotificationsRepositoryProtocol: Sendable {
    func getNotifications() async -> [DsmNotification]
    func markAllRead() async -> Bool
    func clearAll() async -> Bool
}

public protocol TrafficRepositoryProtocol: Sendable {
    func getTrafficSummary() async -> TrafficSummary
}

public protocol SnmpRepositoryProtocol: Sendable {
    func getDevices() async -> [SnmpDevice]
}

public protocol PermissionsRepositoryProtocol: Sendable {
    func getSharedFolderList() async -> [String]
    func getFolderAcl(path: String) async -> FolderAclInfo
    func saveFolderAcl(path: String, accessList: [FolderUserAccess]) async -> Bool
}

// MARK: - Unified DSMRepository Implementation

/// Main repository implementation routing calls between UI/ViewModel and DSMClient / ProfileStorage.
public actor DSMRepository:
    AuthRepositoryProtocol,
    SystemRepositoryProtocol,
    FileStationRepositoryProtocol,
    DockerRepositoryProtocol,
    DownloadRepositoryProtocol,
    StorageRepositoryProtocol,
    PackageRepositoryProtocol,
    ServicesRepositoryProtocol,
    SecurityRepositoryProtocol,
    NotificationsRepositoryProtocol,
    TrafficRepositoryProtocol,
    SnmpRepositoryProtocol,
    PermissionsRepositoryProtocol
{
    public static let shared = DSMRepository()

    private let client: DSMClient
    private let profileStorage: ProfileStorage

    public init(
        client: DSMClient = .shared,
        profileStorage: ProfileStorage = .shared
    ) {
        self.client = client
        self.profileStorage = profileStorage
    }

    // MARK: - AuthRepositoryProtocol

    public var currentSession: DsmSession {
        get async {
            await client.getSession()
        }
    }

    public func login(config: ConnectionConfig) async -> Result<DsmSession, Error> {
        let result = await client.login(config: config)
        if case .success = result {
            profileStorage.saveProfile(config, rememberPassword: true)
            profileStorage.setActiveProfileId(config.id)
        }
        return result
    }

    public func logout() async {
        await client.logout()
        profileStorage.setActiveProfileId(nil)
    }

    public func getAllProfiles() async -> [ConnectionConfig] {
        profileStorage.getAllProfiles()
    }

    public func saveProfile(config: ConnectionConfig, remember: Bool) async {
        profileStorage.saveProfile(config, rememberPassword: remember)
    }

    public func deleteProfile(profileId: String) async {
        profileStorage.deleteProfile(id: profileId)
    }

    public func clearAllProfiles() async {
        profileStorage.clearAllProfiles()
    }

    public func selectProfile(profileId: String) async -> Result<DsmSession, Error> {
        guard let profile = profileStorage.getProfile(id: profileId) else {
            return .failure(DSMAuthError.connectionFailed("Hồ sơ không tồn tại"))
        }
        return await login(config: profile)
    }

    public func getActiveConfig() async -> ConnectionConfig {
        if let current = await client.getConfig() {
            return current
        }
        return profileStorage.getActiveProfile() ?? ConnectionConfig()
    }

    public func isDemoSession() async -> Bool {
        let active = await getActiveConfig()
        return active.isDemo
    }

    // MARK: - SystemRepositoryProtocol

    public func getSystemInfo() async -> SystemInfo {
        await client.getSystemInfo()
    }

    public func getUtilization() async -> SystemUtilization {
        await client.getUtilization()
    }

    public func getProcesses() async -> [DsmProcess] {
        await client.getProcesses()
    }

    public func powerAction(action: String) async -> Bool {
        await client.powerAction(action: action)
    }

    public func killProcess(pid: Int) async -> Bool {
        await client.killProcess(pid: pid)
    }

    public nonisolated func telemetryStream(intervalSeconds: TimeInterval = 2.0) -> AsyncStream<SystemUtilization> {
        AsyncStream { continuation in
            let task = Task {
                while !Task.isCancelled {
                    let util = await self.getUtilization()
                    continuation.yield(util)
                    try? await Task.sleep(nanoseconds: UInt64(intervalSeconds * 1_000_000_000))
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in
                task.cancel()
            }
        }
    }

    // MARK: - FileStationRepositoryProtocol

    public func listFiles(path: String = "/") async -> [DsmFile] {
        await client.listFiles(folderPath: path)
    }

    public func createFolder(path: String, name: String) async -> Bool {
        await client.createFolder(folderPath: path, name: name)
    }

    public func deleteFile(path: String) async -> Bool {
        await client.deleteFile(path: path)
    }

    public func renameFile(path: String, newName: String) async -> Bool {
        await client.renameFile(path: path, newName: newName)
    }

    public func createShareLink(path: String, password: String? = nil, expire: String? = nil) async -> FileShareLink {
        await client.createShareLink(path: path, password: password, expire: expire)
    }

    public func getStreamUrl(path: String) async -> String {
        await client.getFileStreamUrl(filePath: path)
    }

    public func getDownloadUrl(path: String) async -> String {
        await client.getFileDownloadUrl(filePath: path)
    }

    public func copyMoveFiles(paths: [String], destFolder: String, isCut: Bool) async -> Bool {
        await client.copyMoveFiles(paths: paths, destFolder: destFolder, isCut: isCut)
    }

    public func getFileContent(path: String) async -> String {
        await client.getFileContent(path: path)
    }

    public func saveFileContent(filePath: String, content: String) async -> Bool {
        await client.saveFileContent(filePath: filePath, content: content)
    }

    public func downloadFileBytes(path: String) async throws -> Data {
        try await client.downloadFileBytes(path: path)
    }

    // MARK: - DockerRepositoryProtocol

    public func getContainers() async -> [DockerContainerDetails] {
        await client.getDockerContainers()
    }

    public func toggleContainer(id: String, action: String) async -> Bool {
        await client.toggleDockerContainer(id: id, action: action)
    }

    public func getProjects() async -> [DockerProject] {
        await client.getDockerProjects()
    }

    public func getImages() async -> [DockerImage] {
        await client.getDockerImages()
    }

    public func getContainerLogs(idOrName: String, tail: Int = 100) async -> [String] {
        await client.getDockerContainerLogs(idOrName: idOrName, tail: tail)
    }

    public func toggleProject(id: String, action: String) async -> Bool {
        await client.toggleDockerProject(id: id, action: action)
    }

    public func deleteContainer(idOrName: String, force: Bool = false) async -> Bool {
        await client.deleteDockerContainer(idOrName: idOrName, force: force)
    }

    public func deleteImage(repository: String, tag: String) async -> Bool {
        await client.deleteDockerImage(repository: repository, tag: tag)
    }

    // MARK: - DownloadRepositoryProtocol

    public func getTasks() async -> [DownloadTask] {
        await client.getDownloadTasks()
    }

    public func addTask(uri: String, destination: String? = nil) async -> Bool {
        await client.addDownloadTask(uri: uri, destination: destination)
    }

    public func toggleTask(id: String, action: String) async -> Bool {
        await client.toggleDownloadTask(id: id, action: action)
    }

    // MARK: - StorageRepositoryProtocol

    public func getVolumes() async -> [StorageVolume] {
        await client.getStorageVolumes()
    }

    // MARK: - PackageRepositoryProtocol

    public func getPackages() async -> [DsmPackage] {
        await client.getPackages()
    }

    public func togglePackage(id: String, action: String) async -> Bool {
        await client.togglePackage(id: id, action: action)
    }

    // MARK: - ServicesRepositoryProtocol

    public func getServices() async -> [DsmService] {
        await client.getServices()
    }

    public func toggleService(id: String, enabled: Bool) async -> Bool {
        await client.toggleService(id: id, enabled: enabled)
    }

    public func updateServicePort(id: String, port: Int) async -> Bool {
        await client.updateServicePort(id: id, port: port)
    }

    public func getReverseProxyRules() async -> [ReverseProxyRule] {
        await client.getReverseProxyRules()
    }

    public func addReverseProxyRule(rule: ReverseProxyRule) async -> Bool {
        await client.addReverseProxyRule(rule: rule)
    }

    public func updateReverseProxyRule(rule: ReverseProxyRule) async -> Bool {
        await client.updateReverseProxyRule(rule: rule)
    }

    public func deleteReverseProxyRule(uuid: String) async -> Bool {
        await client.deleteReverseProxyRule(uuid: uuid)
    }

    // MARK: - SecurityRepositoryProtocol

    public func getFirewallConfig() async -> FirewallConfig {
        await client.getFirewallConfig()
    }

    public func addFirewallRule(rule: FirewallRule) async -> Bool {
        await client.addFirewallRule(rule: rule)
    }

    public func toggleFirewallRule(name: String, enabled: Bool) async -> Bool {
        await client.toggleFirewallRule(name: name, enabled: enabled)
    }

    public func deleteFirewallRule(name: String) async -> Bool {
        await client.deleteFirewallRule(name: name)
    }

    public func getSecurityScanResult() async -> SecurityScanResult {
        await client.getSecurityScanResult()
    }

    // MARK: - NotificationsRepositoryProtocol

    public func getNotifications() async -> [DsmNotification] {
        await client.getNotifications()
    }

    public func markAllRead() async -> Bool {
        await client.markAllNotificationsRead()
    }

    public func clearAll() async -> Bool {
        await client.clearAllNotifications()
    }

    // MARK: - TrafficRepositoryProtocol

    public func getTrafficSummary() async -> TrafficSummary {
        await client.getTrafficSummary()
    }

    // MARK: - SnmpRepositoryProtocol

    public func getDevices() async -> [SnmpDevice] {
        await client.getSnmpDevices()
    }

    // MARK: - PermissionsRepositoryProtocol

    public func getSharedFolderList() async -> [String] {
        await client.getSharedFolderList()
    }

    public func getFolderAcl(path: String = "/docker") async -> FolderAclInfo {
        await client.getFolderAcl(path: path)
    }

    public func saveFolderAcl(path: String, accessList: [FolderUserAccess]) async -> Bool {
        await client.setFolderAcl(path: path, accessList: accessList)
    }
}
