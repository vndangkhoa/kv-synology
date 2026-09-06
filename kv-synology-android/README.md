# KV-Synology Native Android Application

KV-Synology is a production-grade native Android application for managing and monitoring Synology DiskStation Manager (DSM) devices. Built from the ground up with Kotlin, Jetpack Compose, Material 3, and Clean Architecture.

---

## 1. Project Overview & Architecture

- **Language**: Kotlin 2.0+
- **UI Toolkit**: Jetpack Compose + Material 3
- **Architecture**: MVVM + Clean Architecture + Repository Pattern
- **Dependency Injection**: Dagger Hilt
- **Asynchronous Execution**: Kotlin Coroutines & Flow / StateFlow
- **Networking**: Retrofit 2 + OkHttp 4 + Kotlinx Serialization
- **Local Persistence**: Room Database + Jetpack DataStore Preferences
- **Security**: Android Keystore + `EncryptedSharedPreferences`
- **Media Engine**: AndroidX Media3 (ExoPlayer) with HTTP Range support + Coil

```
┌─────────────────────────────────────────────────────────────┐
│                 Presentation Layer (Compose M3)             │
│            Adaptive Navigation (Phones & Tablets)           │
│                    ViewModels & StateFlow                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Domain Layer (Clean Use Cases)              │
│       Repositories & Serializable Domain Data Models        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                         Data Layer                          │
│   ├── Remote: DSMClient, Authenticator, QuickConnectResolver│
│   └── Local: Room (NasProfileDao), EncryptedStorage         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Requirements & Toolchain

- **JDK**: Java 17 (Eclipse Temurin 17 or OpenJDK 17)
- **Android SDK**: Compile SDK 35, Target SDK 35, Min SDK 26 (Android 8.0 Oreo)
- **Build System**: Gradle 8.9 (via included `gradlew`)
- **Android Studio**: Android Studio Koala (2024.1+) or newer

---

## 3. Getting Started & Build Instructions

### 3.1 Clone & Setup
Ensure your Android SDK path is specified in `local.properties`:
```properties
sdk.dir=/home/khoavo/Android/Sdk
```

### 3.2 Run Unit Tests
```bash
./gradlew test
```

### 3.3 Build Debug APK
```bash
./gradlew assembleDebug
```
The compiled debug APK will be located at:
```
app/build/outputs/apk/debug/app-debug.apk
```

### 3.4 Build Release APK
```bash
./gradlew assembleRelease
```
The compiled release APK will be located at:
```
app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 4. Key Features & Native Capabilities

1. **Direct DSM Networking & QuickConnect Auto-Resolution**:
   - Replaces web proxies with direct OkHttp communication.
   - Native coroutine-based `QuickConnectResolver` querying `Serv.php` tunnels, probing candidate addresses concurrently, and caching for 10 minutes.
2. **Security & Self-Signed TLS Handling**:
   - Host-scoped `TrustManager` enables self-signed certificate acceptance only when opted-in per NAS profile.
   - Passwords and auth session tokens stored in Android Keystore / `EncryptedSharedPreferences`.
3. **Adaptive UI**:
   - Material 3 Navigation Suite automatically adapts between a Bottom Navigation Bar on mobile screens and a Navigation Rail on tablets and landscape orientations.
4. **Complete Module Support**:
   - **Dashboard**: Live CPU, RAM, Network, Disk I/O telemetry with custom Canvas charts, running processes, and NAS power controls.
   - **File Station**: Breadcrumbs, file creation, renaming, deletion, share link generation, and media playback via Media3 ExoPlayer and Coil.
   - **Docker / Container Manager**: Container lifecycle controls (start/stop/restart), compose project YAML inspector, and images list.
   - **Download Station**: Filter by state (Downloading, Paused, Finished), numeric DSM state mapping, and task creation.
   - **Storage Manager**: Storage pools, volume usage bars, attached drive health, and temperature.
   - **Package Center**: Package inventory, start/stop toggles, and updates.
   - **Services & Reverse Proxy**: File services (SMB, AFP, NFS, FTP, SSH), and Nginx reverse proxy configuration.
   - **Firewall & Security**: Rule editor, AutoBlock IP list, and DoS protection.
   - **Permissions Inspector**: ACL permission tree, user-folder access rights.
   - **Notifications Center**: Grouped DSM notifications and severity badges.
   - **Network Traffic & SNMP**: Active connection list, GeoIP country summary, and PRTG-style sensors.
   - **Settings**: Vietnamese & English language toggle, Light / Dark / OLED themes, and Beginner vs Advanced experience modes.
5. **Standalone Offline Demo Mode**:
   - Realistic offline simulation matching `mockData.ts` for instant preview and development without physical NAS hardware.
