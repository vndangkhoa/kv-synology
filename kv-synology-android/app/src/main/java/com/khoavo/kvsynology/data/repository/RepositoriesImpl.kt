package com.khoavo.kvsynology.data.repository

import com.khoavo.kvsynology.data.local.datastore.AppPreferencesDataStore
import com.khoavo.kvsynology.data.local.db.dao.NasProfileDao
import com.khoavo.kvsynology.data.local.db.entity.NasProfileEntity
import com.khoavo.kvsynology.data.local.security.EncryptedStorage
import com.khoavo.kvsynology.data.remote.dsm.DSMClient
import com.khoavo.kvsynology.domain.model.*
import com.khoavo.kvsynology.domain.repository.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient,
    private val profileDao: NasProfileDao,
    private val encryptedStorage: EncryptedStorage,
    private val dataStore: AppPreferencesDataStore
) : AuthRepository {

    private val _sessionFlow = MutableStateFlow(dsmClient.getSession())
    override val currentSessionFlow: Flow<DsmSession> = _sessionFlow.asStateFlow()

    override suspend fun getCurrentSession(): DsmSession = dsmClient.getSession()

    override suspend fun login(config: ConnectionConfig): Result<DsmSession> {
        val res = dsmClient.login(config)
        if (res.isSuccess) {
            val session = res.getOrThrow()
            _sessionFlow.value = session

            // Save profile if remember is checked or if connected
            val profileId = "nas_${config.host.replace('.', '_')}_${config.port}_${config.account}"
            if (!config.password.isNullOrBlank()) {
                encryptedStorage.savePassword(profileId, config.password)
            }
            if (session.sid.isNotBlank()) {
                encryptedStorage.saveSessionToken(profileId, session.sid, session.synoToken)
            }

            profileDao.clearCurrentFlags()
            profileDao.insertOrUpdate(
                NasProfileEntity(
                    id = profileId,
                    name = session.hostname.ifBlank { config.host },
                    host = config.host,
                    port = config.port,
                    https = config.https,
                    account = config.account,
                    ignoreCert = config.ignoreCert,
                    model = session.model,
                    versionString = session.versionString,
                    isCurrent = true
                )
            )
            dataStore.setActiveProfileId(profileId)
        }
        return res
    }

    override suspend fun logout() {
        dsmClient.logout()
        _sessionFlow.value = DsmSession(isConnected = false)
        dataStore.setActiveProfileId(null)
    }

    override suspend fun getActiveConfig(): ConnectionConfig = dsmClient.getConfig()
        ?: ConnectionConfig()

    override suspend fun isDemoSession(): Boolean =
        dsmClient.getConfig()?.isDemo == true

    override suspend fun getAllProfiles(): Flow<List<ConnectionConfig>> {
        return profileDao.getAllProfilesFlow().map { list ->
            list.map { entity ->
                ConnectionConfig(
                    host = entity.host,
                    port = entity.port,
                    https = entity.https,
                    account = entity.account,
                    password = encryptedStorage.getPassword(entity.id),
                    ignoreCert = entity.ignoreCert
                )
            }
        }
    }

    override suspend fun saveProfile(config: ConnectionConfig, remember: Boolean) {
        val profileId = "nas_${config.host.replace('.', '_')}_${config.port}_${config.account}"
        if (remember && !config.password.isNullOrBlank()) {
            encryptedStorage.savePassword(profileId, config.password)
        }
        profileDao.insertOrUpdate(
            NasProfileEntity(
                id = profileId,
                name = config.host,
                host = config.host,
                port = config.port,
                https = config.https,
                account = config.account,
                ignoreCert = config.ignoreCert,
                remember = remember
            )
        )
    }

    override suspend fun deleteProfile(profileId: String) {
        profileDao.deleteProfile(profileId)
        encryptedStorage.clearProfileCredentials(profileId)
    }

    override suspend fun clearAllProfiles() {
        profileDao.deleteAllProfiles()
        encryptedStorage.clearAll()
    }

    override suspend fun selectProfile(profileId: String): Result<DsmSession> {        val entity = profileDao.getProfileById(profileId)
            ?: return Result.failure(Exception("Profile not found"))
        val pwd = encryptedStorage.getPassword(profileId)
        val config = ConnectionConfig(
            host = entity.host,
            port = entity.port,
            https = entity.https,
            account = entity.account,
            password = pwd,
            ignoreCert = entity.ignoreCert
        )
        return login(config)
    }
}

@Singleton
class SystemRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : SystemRepository {

    override fun getTelemetryFlow(): Flow<SystemUtilization> = flow {
        while (true) {
            emit(dsmClient.getUtilization())
            delay(3000) // 3s polling as in web client
        }
    }

    override suspend fun getSystemInfo(): SystemInfo = dsmClient.getSystemInfo()

    override suspend fun getProcesses(): List<DsmProcess> = dsmClient.getProcesses()

    override suspend fun powerAction(action: String): Boolean = dsmClient.powerAction(action)

    override suspend fun killProcess(pid: Int): Boolean = dsmClient.killProcess(pid)
}

@Singleton
class FileStationRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : FileStationRepository {

    override suspend fun listFiles(path: String): List<FileItem> = dsmClient.listFiles(path)

    override suspend fun createFolder(path: String, name: String): Boolean = dsmClient.createFolder(path, name)

    override suspend fun deleteFile(path: String): Boolean = dsmClient.deleteFile(path)

    override suspend fun renameFile(path: String, newName: String): Boolean = dsmClient.renameFile(path, newName)

    override suspend fun createShareLink(path: String): ShareLink = dsmClient.createShareLink(path)

    override fun getStreamUrl(path: String): String = dsmClient.getFileStreamUrl(path)

    override fun getDownloadUrl(path: String): String = dsmClient.getFileDownloadUrl(path)
    override suspend fun copyMoveFiles(paths: List<String>, destFolder: String, isCut: Boolean): Boolean =
        dsmClient.copyMoveFiles(paths, destFolder, isCut)
    override suspend fun getFileContent(path: String): String = dsmClient.getFileContent(path)
    override suspend fun saveFileContent(filePath: String, content: String): Boolean =
        dsmClient.saveFileContent(filePath, content)
    override suspend fun downloadFileBytes(path: String): ByteArray = dsmClient.downloadFileBytes(path)
    override suspend fun downloadFileToStream(path: String, out: java.io.OutputStream): Long =
        dsmClient.downloadFileToStream(path, out)
}

@Singleton
class DockerRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : DockerRepository {

    override suspend fun getContainers(): List<DockerContainerDetails> = dsmClient.getDockerContainers()

    override suspend fun toggleContainer(id: String, action: String): Boolean = dsmClient.toggleDockerContainer(id, action)

    override suspend fun getProjects(): List<DockerProject> = dsmClient.getDockerProjects()

    override suspend fun getImages(): List<DockerImage> = dsmClient.getDockerImages()

    override suspend fun getContainerLogs(idOrName: String, tail: Int): List<String> = dsmClient.getDockerContainerLogs(idOrName, tail)

    override suspend fun toggleProject(id: String, action: String): Boolean = dsmClient.toggleDockerProject(id, action)

    override suspend fun deleteContainer(idOrName: String, force: Boolean): Boolean = dsmClient.deleteDockerContainer(idOrName, force)

    override suspend fun deleteImage(repository: String, tag: String): Boolean = dsmClient.deleteDockerImage(repository, tag)
}

@Singleton
class DownloadRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : DownloadRepository {

    override suspend fun getTasks(): List<DownloadTask> = dsmClient.getDownloadTasks()

    override suspend fun addTask(uri: String, destination: String?): Boolean = dsmClient.addDownloadTask(uri, destination)

    override suspend fun toggleTask(id: String, action: String): Boolean = dsmClient.toggleDownloadTask(id, action)
}

@Singleton
class StorageRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : StorageRepository {
    override suspend fun getVolumes(): List<StorageVolume> = dsmClient.getStorageVolumes()
}

@Singleton
class PackageRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : PackageRepository {
    override suspend fun getPackages(): List<PackageItem> = dsmClient.getPackages()
    override suspend fun togglePackage(id: String, action: String): Boolean = dsmClient.togglePackage(id, action)
}

@Singleton
class ServicesRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : ServicesRepository {
    override suspend fun getServices(): List<ServiceItem> = dsmClient.getServices()
    override suspend fun toggleService(id: String, enabled: Boolean): Boolean = dsmClient.toggleService(id, enabled)
    override suspend fun updateServicePort(id: String, port: Int): Boolean = dsmClient.updateServicePort(id, port)
    override suspend fun getReverseProxyRules(): List<ReverseProxyRule> = dsmClient.getReverseProxyRules()
    override suspend fun addReverseProxyRule(rule: ReverseProxyRule): Boolean = dsmClient.addReverseProxyRule(rule)
    override suspend fun updateReverseProxyRule(rule: ReverseProxyRule): Boolean = dsmClient.updateReverseProxyRule(rule)
    override suspend fun deleteReverseProxyRule(uuid: String): Boolean = dsmClient.deleteReverseProxyRule(uuid)
}

@Singleton
class SecurityRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : SecurityRepository {
    override suspend fun getFirewallConfig(): FirewallConfig = dsmClient.getFirewallConfig()
    override suspend fun addFirewallRule(rule: FirewallRule): Boolean = dsmClient.addFirewallRule(rule)
    override suspend fun toggleFirewallRule(name: String, enabled: Boolean): Boolean = dsmClient.toggleFirewallRule(name, enabled)
    override suspend fun deleteFirewallRule(name: String): Boolean = dsmClient.deleteFirewallRule(name)
}

@Singleton
class NotificationsRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : NotificationsRepository {
    override suspend fun getNotifications(): List<NotificationItem> = dsmClient.getNotifications()
    override suspend fun markAllRead(): Boolean = dsmClient.markAllNotificationsRead()
    override suspend fun clearAll(): Boolean = dsmClient.clearAllNotifications()
}

@Singleton
class TrafficRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : TrafficRepository {
    override suspend fun getTrafficSummary(): TrafficSummary = dsmClient.getTrafficSummary()
}

@Singleton
class SnmpRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : SnmpRepository {
    override suspend fun getDevices(): List<SnmpDevice> = dsmClient.getSnmpDevices()
}

@Singleton
class PermissionsRepositoryImpl @Inject constructor(
    private val dsmClient: DSMClient
) : PermissionsRepository {
    override suspend fun getSharedFolderList(): List<String> = dsmClient.getSharedFolderList()
    override suspend fun getFolderAcl(path: String): FolderAclInfo = dsmClient.getFolderAcl(path)
    override suspend fun saveFolderAcl(path: String, accessList: List<FolderUserAccess>): Boolean =
        dsmClient.setFolderAcl(path, accessList)
}
