package com.khoavo.kvsynology.domain.repository

import com.khoavo.kvsynology.domain.model.*
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    val currentSessionFlow: Flow<DsmSession>
    suspend fun getCurrentSession(): DsmSession
    suspend fun login(config: ConnectionConfig): Result<DsmSession>
    suspend fun logout()
    suspend fun getAllProfiles(): Flow<List<ConnectionConfig>>
    suspend fun saveProfile(config: ConnectionConfig, remember: Boolean)
    suspend fun deleteProfile(profileId: String)
    suspend fun clearAllProfiles()
    suspend fun selectProfile(profileId: String): Result<DsmSession>
    /** Live connection config (blank when logged out); its isDemo flag decides mock vs real data. */
    suspend fun getActiveConfig(): ConnectionConfig
    suspend fun isDemoSession(): Boolean
}

interface SystemRepository {
    fun getTelemetryFlow(): Flow<SystemUtilization>
    suspend fun getSystemInfo(): SystemInfo
    suspend fun getProcesses(): List<DsmProcess>
    suspend fun powerAction(action: String): Boolean
    suspend fun killProcess(pid: Int): Boolean
}

interface FileStationRepository {
    suspend fun listFiles(path: String): List<FileItem>
    suspend fun createFolder(path: String, name: String): Boolean
    suspend fun deleteFile(path: String): Boolean
    suspend fun renameFile(path: String, newName: String): Boolean
    suspend fun createShareLink(path: String): ShareLink
    fun getStreamUrl(path: String): String
    fun getDownloadUrl(path: String): String
    suspend fun copyMoveFiles(paths: List<String>, destFolder: String, isCut: Boolean): Boolean
    suspend fun getFileContent(path: String): String
    suspend fun saveFileContent(filePath: String, content: String): Boolean
    suspend fun downloadFileBytes(path: String): ByteArray
}

interface DockerRepository {
    suspend fun getContainers(): List<DockerContainerDetails>
    suspend fun toggleContainer(id: String, action: String): Boolean
    suspend fun getProjects(): List<DockerProject>
    suspend fun getImages(): List<DockerImage>
    suspend fun getContainerLogs(idOrName: String, tail: Int = 100): List<String>
    suspend fun toggleProject(id: String, action: String): Boolean
    suspend fun deleteContainer(idOrName: String, force: Boolean = false): Boolean
    suspend fun deleteImage(repository: String, tag: String): Boolean
}

interface DownloadRepository {
    suspend fun getTasks(): List<DownloadTask>
    suspend fun addTask(uri: String, destination: String? = null): Boolean
    suspend fun toggleTask(id: String, action: String): Boolean
}

interface StorageRepository {
    suspend fun getVolumes(): List<StorageVolume>
}

interface PackageRepository {
    suspend fun getPackages(): List<PackageItem>
    suspend fun togglePackage(id: String, action: String): Boolean
}

interface ServicesRepository {
    suspend fun getServices(): List<ServiceItem>
    suspend fun toggleService(id: String, enabled: Boolean): Boolean
    suspend fun updateServicePort(id: String, port: Int): Boolean
    suspend fun getReverseProxyRules(): List<ReverseProxyRule>
    suspend fun addReverseProxyRule(rule: ReverseProxyRule): Boolean
    suspend fun updateReverseProxyRule(rule: ReverseProxyRule): Boolean
    suspend fun deleteReverseProxyRule(uuid: String): Boolean
}

interface SecurityRepository {
    suspend fun getFirewallConfig(): FirewallConfig
    suspend fun addFirewallRule(rule: FirewallRule): Boolean
    suspend fun toggleFirewallRule(name: String, enabled: Boolean): Boolean
    suspend fun deleteFirewallRule(name: String): Boolean
}

interface NotificationsRepository {
    suspend fun getNotifications(): List<NotificationItem>
    suspend fun markAllRead(): Boolean
    suspend fun clearAll(): Boolean
}

interface TrafficRepository {
    suspend fun getTrafficSummary(): TrafficSummary
}

interface SnmpRepository {
    suspend fun getDevices(): List<SnmpDevice>
}

interface PermissionsRepository {
    suspend fun getSharedFolderList(): List<String>
    suspend fun getFolderAcl(path: String = "/docker"): FolderAclInfo
    suspend fun saveFolderAcl(path: String, accessList: List<FolderUserAccess>): Boolean
}
