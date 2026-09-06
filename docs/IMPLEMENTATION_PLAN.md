# KV-Synology Implementation Plan

## 1. Project Identity
- **App Name**: KV Synology
- **Package**: `com.khoavo.kvsynology`
- **Language**: Kotlin 2.0+
- **UI Toolkit**: Jetpack Compose + Material 3
- **Architecture**: MVVM + Clean Architecture + Repository Pattern
- **Target SDK**: 35
- **Minimum SDK**: 26 (Android 8.0)
- **Toolchain**: JDK 17, Android Gradle Plugin 8.5+, Gradle 8.7+

---

## 2. Phase-by-Phase Roadmap

### Phase A: Reverse Engineering & Analysis (Completed)
- Audited `src/lib/dsm/client.ts`, `route.ts`, `types.ts`, `useAppStore.ts`, and all 25+ UI component tabs.
- Identified all 60+ DSM endpoints and mock datasets.

### Phase B: Documentation Outputs (Completed)
- `PROJECT_ANALYSIS.md`
- `FEATURE_MATRIX.md`
- `API_MATRIX.md`
- `DATA_MODEL_MAPPING.md`
- `ANDROID_ARCHITECTURE.md`
- `PLATFORM_GAPS.md`
- `IMPLEMENTATION_PLAN.md`
- `PARITY_CHECK.md`
- `API_PARITY.md`
- `SCREEN_PARITY.md`

### Phase C: Gradle Foundation & Hilt Scaffolding
- Gradle project with `settings.gradle.kts`, `build.gradle.kts`, `app/build.gradle.kts`.
- Dependency injection graph setup with Hilt.
- Room database, DataStore, and EncryptedStorage setup.

### Phase D: Centralized DSM Remote Engine
- `QuickConnectResolver` (coroutine-based candidate probing, `Serv.php` parser, 10m cache).
- `CertificatePolicy` (trust manager for self-signed SSL).
- `DSMAuthenticator` (versions 7, 6, 3, 2, 1 fallback, OTP, did/sid, SynoToken).
- `DSMClient` and `MockDSMClient`.

### Phase E: Repositories & Domain Layer
- 13 Domain Repositories and Use Cases.

### Phase F: Jetpack Compose Presentation Layer
- Design system: Synology Blue `#0067E6`, OLED Dark `#000000`/`#121212`, Light Theme `#F8FAFC`.
- Bilingual support: Tiếng Việt & English.
- Navigation Suite: Adaptive Scaffold (Bottom bar on phones, Navigation Rail on tablets).
- 17 Complete Compose screens with sealed `UiState` and error recovery.

### Phase G: Testing & Build Verification
- Unit test suite.
- `./gradlew test` and `./gradlew assembleDebug`.
