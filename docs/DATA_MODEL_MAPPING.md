# KV-Synology Data Model Mapping

This document details the direct 1:1 translation from TypeScript definitions (`src/lib/dsm/types.ts`) into Kotlin `@Serializable` data classes (`com.khoavo.kvsynology.domain.model.*`).

## 1. Connection & Session Models

| TypeScript Interface | Kotlin Data Class | Field Mappings & Types |
| :--- | :--- | :--- |
| `DSMConnectionConfig` | `ConnectionConfig` | `host: String`, `port: Int = 5001`, `https: Boolean = true`, `account: String`, `password: String? = null`, `otp: String? = null`, `ignoreCert: Boolean = true` |
| `DSMSession` | `DsmSession` | `sid: String`, `synoToken: String? = null`, `did: String? = null`, `cookie: String? = null`, `isConnected: Boolean`, `dsmVersion: Int = 7`, `versionString: String = ""`, `model: String = ""`, `hostname: String = ""`, `account: String = ""` |

---

## 2. System & Telemetry Models

| TypeScript Interface | Kotlin Data Class | Field Mappings & Types |
| :--- | :--- | :--- |
| `SystemInfo` | `SystemInfo` | `model: String`, `serial: String`, `version: String`, `uptime: Long`, `temperature: Int`, `time: String`, `ramTotal: Long`, `ramUsed: Long`, `cpuModel: String`, `cpuCores: Int` |
| `SystemUtilization` | `SystemUtilization` | `cpuPercent: Double`, `memoryPercent: Double`, `memoryUsedMB: Long`, `memoryTotalMB: Long`, `networkRxBytes: Long`, `networkTxBytes: Long`, `diskReadBytes: Long`, `diskWriteBytes: Long`, `timestamp: Long` |
| `DSMProcess` | `DsmProcess` | `pid: Int`, `name: String`, `cpu: Double`, `memory: Double`, `user: String`, `status: String` |

---

## 3. File Station Models

| TypeScript Interface | Kotlin Data Class | Field Mappings & Types |
| :--- | :--- | :--- |
| `FileItem` | `FileItem` | `path: String`, `name: String`, `isdir: Boolean`, `size: Long`, `mtime: Long`, `owner: String? = null`, `filetype: String? = null`, `perm: String? = null`, `realPath: String? = null`, `itemCount: Int? = null`, `mimeType: String? = null` |
| `ShareLink` | `ShareLink` | `id: String`, `url: String`, `path: String`, `name: String`, `dateExpired: String? = null`, `hasPassword: Boolean = false` |

---

## 4. Docker / Container Models

| TypeScript Interface | Kotlin Data Class | Field Mappings & Types |
| :--- | :--- | :--- |
| `DockerContainer` | `DockerContainer` | `id: String`, `name: String`, `image: String`, `status: String`, `created: String`, `ports: List<String> = emptyList()`, `cpuUsage: Double = 0.0`, `memoryUsage: String = ""`, `uptime: String? = null`, `restartPolicy: String? = null` |
| `DockerContainerDetails`| `DockerContainerDetails`| inherits `DockerContainer`, `fullId: String?`, `entrypoint: List<String>?`, `autoRestart: Boolean?`, `privileged: Boolean?`, `labels: Map<String, String>?`, `envVars: List<DockerEnvVar>?`, `volumeMounts: List<DockerVolumeMount>?`, `portBindings: List<DockerPortBinding>?` |
| `DockerProject` | `DockerProject` | `id: String`, `name: String`, `status: String`, `path: String`, `yamlContent: String = ""`, `services: List<DockerProjectService> = emptyList()`, `created: String = ""` |
| `DockerImage` | `DockerImage` | `id: String`, `repository: String`, `tag: String`, `sizeMB: Long`, `sizeFormatted: String`, `created: String`, `containersCount: Int = 0`, `isUsed: Boolean = false` |

---

## 5. Download Station Models

| TypeScript Interface | Kotlin Data Class | Field Mappings & Types |
| :--- | :--- | :--- |
| `DownloadTask` | `DownloadTask` | `id: String`, `title: String`, `size: Long`, `status: DownloadTaskStatus`, `progress: Double`, `downloadSpeed: Long`, `uploadSpeed: Long`, `type: String`, `uri: String? = null`, `destination: String? = null`, `createdTime: Long? = null` |
| `DownloadStationStatistic`| `DownloadStationStatistic`| `speedDownload: Long`, `speedUpload: Long`, `emuleSpeedDownload: Long = 0`, `emuleSpeedUpload: Long = 0` |
| `RSSSite` | `RssSite` | `id: String`, `title: String`, `url: String`, `enabled: Boolean = true`, `isUpdating: Boolean = false` |
| `BTSearchResult` | `BtSearchResult` | `title: String`, `download: String`, `size: Long`, `datetime: String`, `seednum: Int`, `leech: Int`, `category: String` |

---

## 6. Storage Manager Models

| TypeScript Interface | Kotlin Data Class | Field Mappings & Types |
| :--- | :--- | :--- |
| `StorageVolume` | `StorageVolume` | `id: String`, `name: String`, `path: String`, `fsType: String`, `totalBytes: Long`, `usedBytes: Long`, `freeBytes: Long`, `status: String`, `drives: List<DriveInfo> = emptyList()`, `raidType: String? = null` |
| `StoragePool` | `StoragePool` | `id: String`, `name: String`, `poolPath: String`, `raidType: String`, `status: String`, `totalBytes: Long`, `usedBytes: Long`, `freeBytes: Long`, `drives: List<DriveInfo> = emptyList()` |
| `DriveInfo` | `DriveInfo` | `slot: Int`, `slotName: String? = null`, `model: String`, `serial: String`, `status: String`, `temp: Int`, `size: Long`, `health: String`, `driveType: String? = "HDD"`, `smartStatus: String? = null` |
| `SmartInfo` | `SmartInfo` | `diskId: String`, `model: String`, `serial: String`, `fwVersion: String`, `smartStatus: String`, `temperature: Int`, `powerOnHours: Long`, `badSectors: Int`, `attributes: List<SmartAttribute>` |

---

## 7. Security, Firewall & Services Models

| TypeScript Interface | Kotlin Data Class | Field Mappings & Types |
| :--- | :--- | :--- |
| `FirewallRule` | `FirewallRule` | `id: String`, `name: String`, `ports: String`, `protocol: String`, `sourceType: String`, `sourceValue: String`, `action: String`, `enabled: Boolean`, `order: Int` |
| `AutoBlockConfig` | `AutoBlockConfig` | `enabled: Boolean`, `attempts: Int`, `withinMinutes: Int`, `enableUnblock: Boolean`, `unblockDays: Int`, `blockedCount: Int`, `allowedCount: Int` |
| `BlockedIpItem` | `BlockedIpItem` | `ip: String`, `denyTime: String`, `expireTime: String? = null`, `country: String? = null` |
| `ServiceItem` | `ServiceItem` | `id: String`, `name: String`, `displayName: String`, `description: String`, `category: String`, `enabled: Boolean`, `running: Boolean? = null`, `status: String`, `port: Int? = null`, `canToggle: Boolean` |
| `ReverseProxyRule` | `ReverseProxyRule` | `uuid: String`, `description: String`, `frontend: ReverseProxyFrontend`, `backend: ReverseProxyBackend`, `proxyConnectTimeout: Int? = null` |
| `NotificationItem` | `NotificationItem` | `id: String`, `title: String`, `displayTitle: String`, `category: String`, `level: String`, `messages: List<String>`, `time: Long`, `read: Boolean` |
