# KV-Synology Native Android Architecture

## 1. Architectural Blueprint: Clean Architecture + MVVM

The native Android app follows Google's recommended Modern Android Architecture (MAD) with Clean Architecture principles:

```
┌─────────────────────────────────────────────────────────────┐
│                       Presentation Layer                    │
│   Jetpack Compose UI (Material 3) + Adaptive Navigation     │
│             StateFlow / UiState / Events                    │
│                     Viewmodels                              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                         Domain Layer                        │
│   Use Cases / Business Logic / Domain Models / Repositories │
│               (Pure Kotlin, zero Android UI)                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                          Data Layer                         │
│  Repository Implementations / Data Sources / Mappers        │
│    ├── Remote: Retrofit, OkHttp, QuickConnectResolver, DSM  │
│    └── Local: Room Database, EncryptedPrefs, DataStore      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Package Structure (`com.khoavo.kvsynology`)

```
com.khoavo.kvsynology/
├── data/
│   ├── local/
│   │   ├── db/
│   │   │   ├── AppDatabase.kt
│   │   │   ├── dao/
│   │   │   │   ├── NasProfileDao.kt
│   │   │   │   ├── DownloadTaskDao.kt
│   │   │   │   └── SnmpDeviceDao.kt
│   │   │   └── entity/
│   │   │       ├── NasProfileEntity.kt
│   │   │       └── SnmpDeviceEntity.kt
│   │   ├── datastore/
│   │   │   └── AppPreferencesDataStore.kt
│   │   └── security/
│   │       └── EncryptedStorage.kt
│   ├── remote/
│   │   ├── dsm/
│   │   │   ├── DSMClient.kt
│   │   │   ├── DSMAuthenticator.kt
│   │   │   ├── DSMRequestBuilder.kt
│   │   │   ├── MockDSMClient.kt
│   │   │   └── response/
│   │   ├── quickconnect/
│   │   │   └── QuickConnectResolver.kt
│   │   └── ssl/
│   │       └── CertificatePolicy.kt
│   └── repository/
│       ├── AuthRepositoryImpl.kt
│       ├── SystemRepositoryImpl.kt
│       ├── FileStationRepositoryImpl.kt
│       ├── DockerRepositoryImpl.kt
│       ├── DownloadRepositoryImpl.kt
│       ├── StorageRepositoryImpl.kt
│       ├── PackageRepositoryImpl.kt
│       ├── ServicesRepositoryImpl.kt
│       ├── SecurityRepositoryImpl.kt
│       ├── PermissionsRepositoryImpl.kt
│       ├── NotificationsRepositoryImpl.kt
│       └── SnmpRepositoryImpl.kt
├── di/
│   ├── NetworkModule.kt
│   ├── DatabaseModule.kt
│   ├── RepositoryModule.kt
│   └── CoroutineScopeModule.kt
├── domain/
│   ├── model/
│   │   ├── ConnectionConfig.kt
│   │   ├── DsmSession.kt
│   │   ├── SystemInfo.kt
│   │   ├── SystemUtilization.kt
│   │   ├── FileItem.kt
│   │   ├── DockerContainer.kt
│   │   ├── DownloadTask.kt
│   │   ├── StorageVolume.kt
│   │   ├── PackageItem.kt
│   │   ├── ServiceItem.kt
│   │   ├── FirewallRule.kt
│   │   ├── DsmUser.kt
│   │   ├── ReverseProxyRule.kt
│   │   └── NotificationItem.kt
│   └── repository/
│       ├── AuthRepository.kt
│       ├── SystemRepository.kt
│       ├── FileStationRepository.kt
│       └── ...
└── presentation/
    ├── common/
    │   ├── UiState.kt
    │   ├── components/
    │   └── theme/
    │       ├── Color.kt
    │       ├── Theme.kt
    │       └── Type.kt
    ├── navigation/
    │   ├── AppNavHost.kt
    │   ├── Screen.kt
    │   └── AdaptiveNavigationScaffold.kt
    ├── login/
    │   ├── LoginScreen.kt
    │   └── LoginViewModel.kt
    ├── dashboard/
    │   ├── DashboardScreen.kt
    │   └── DashboardViewModel.kt
    ├── files/
    │   ├── FileStationScreen.kt
    │   ├── FilePreviewDialog.kt
    │   └── FileStationViewModel.kt
    ├── docker/
    │   ├── DockerScreen.kt
    │   └── DockerViewModel.kt
    ├── download/
    │   ├── DownloadStationScreen.kt
    │   └── DownloadViewModel.kt
    ├── storage/
    │   ├── StorageManagerScreen.kt
    │   └── StorageViewModel.kt
    ├── packages/
    │   ├── PackageCenterScreen.kt
    │   └── PackageViewModel.kt
    ├── services/
    │   ├── ServicesScreen.kt
    │   ├── ReverseProxyScreen.kt
    │   └── ServicesViewModel.kt
    ├── security/
    │   ├── FirewallScreen.kt
    │   └── SecurityViewModel.kt
    ├── permissions/
    │   ├── PermissionsScreen.kt
    │   └── PermissionsViewModel.kt
    ├── notifications/
    │   ├── NotificationsScreen.kt
    │   └── NotificationsViewModel.kt
    ├── traffic/
    │   ├── TrafficScreen.kt
    │   └── TrafficViewModel.kt
    ├── snmp/
    │   ├── SnmpScreen.kt
    │   └── SnmpViewModel.kt
    ├── terminal/
    │   ├── TerminalScreen.kt
    │   └── TerminalViewModel.kt
    └── settings/
        ├── SettingsScreen.kt
        └── SettingsViewModel.kt
```

---

## 3. UI State Management Pattern

Every ViewModel exposes a structured StateFlow conforming to explicit sealed states:

```kotlin
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String, val code: Int? = null) : UiState<Nothing>
    data object Empty : UiState<Nothing>
}
```

This eliminates blank screens, handles transient network reconnects gracefully, and enables pull-to-refresh without disturbing current cached views.
