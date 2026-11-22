# KV-Synology iOS — Native DSM Management App

[![Swift 6.0](https://img.shields.io/badge/Swift-6.0-F05138.svg?style=flat&logo=swift)](https://swift.org)
[![iOS 17.0+](https://img.shields.io/badge/iOS-17.0+-000000.svg?style=flat&logo=apple)](https://developer.apple.com/ios/)
[![Linux Tested](https://img.shields.io/badge/Linux-Swift%20Test%20Passing-success.svg?style=flat&logo=linux)](https://github.com)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20MVVM%20%2B%20Observation-blue.svg)](https://developer.apple.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, modern, and native **iOS / iPadOS client** for managing **Synology DiskStation Manager (DSM 7.x & 6.x)**. Built entirely with **Swift 6** and **SwiftUI**, utilizing Apple's iOS 17 Observation framework (`@Observable`), Swift Concurrency (`actor`, `async`/`await`), and an OLED True Black design system.

---

## Table of Contents
1. [Architecture & Technology Stack](#architecture--technology-stack)
2. [Feature Catalog (All 14 Modules)](#feature-catalog-all-14-modules)
3. [Project Directory Structure](#project-directory-structure)
4. [Getting Started (Xcode Setup)](#getting-started-xcode-setup)
5. [How to Build & Test on Linux (5 Methods)](#how-to-build--test-on-linux-5-methods)
   - [Method 1: Headless Docker Swift Unit Tests](#method-1-headless-docker-swift-unit-tests-recommended-for-ci)
   - [Method 2: Docker-OSX KVM Virtualization](#method-2-docker-osx-kvm-virtualization-run-xcode-on-linux)
   - [Method 3: Physical iPhone Testing via USB (libimobiledevice)](#method-3-physical-iphone-testing-via-usb-libimobiledevice)
   - [Method 4: In-Browser Testing with Appetize.io](#method-4-in-browser-testing-with-appetizeio-zero-install)
   - [Method 5: Expo / React Native Cross-Platform Alternative](#method-5-expo--react-native-cross-platform-alternative)
6. [Continuous Integration (CI/CD)](#continuous-integration-cicd)
7. [Unit Testing Suite](#unit-testing-suite)
8. [License & Credits](#license--credits)

---

## Architecture & Technology Stack

KV-Synology iOS is decoupled into two clean architectural layers:

```
┌────────────────────────────────────────────────────────┐
│                   KVSynologyApp (UI)                   │
│  - SwiftUI (iOS 17+) + Observation (@Observable)       │
│  - Adaptive Navigation (Tab Bar on iPhone, Sidebar on iPad) │
│  - Apple Charts Telemetry Gauges                       │
│  - Monospace ANSI Terminal Emulator                    │
│  - OLED True Black & DSM Accent Themes                 │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  KVSynologyCore (Logic)                │
│  - Pure Foundation & Swift 6 Sendable Concurrency       │
│  - Cross-platform Linux & Darwin Compilable            │
│  - DSMClient & DSMAuthenticator Actors                 │
│  - QuickConnect Relay & Direct IP Auto-Resolver        │
│  - MockDSMClient Full Offline Simulation Engine        │
│  - Cross-platform Keychain & Profile Storage           │
└────────────────────────────────────────────────────────┘
```

### Key Technical Highlights:
- **Language**: Swift 6.0 (Strict concurrency checking, `Sendable`, actors).
- **Presentation**: SwiftUI with `@Observable` (eliminates legacy Combine `@Published` boilerplate).
- **Remote Client**: Actor-isolated `DSMClient` and `DSMAuthenticator` executing standard DSM REST endpoints (`SYNO.Core.System`, `SYNO.FileStation.*`, `SYNO.Docker.*`, `SYNO.DownloadStation.*`, `SYNO.Storage.*`).
- **QuickConnect Engine**: High-performance multi-endpoint resolver with WAN relay tunnels, direct DDNS probes, smart DNS resolution, concurrent candidate probing, and target caching.
- **Offline Demo Mode**: Powered by `MockDSMClient`, providing realistic system telemetry, Docker containers, file directory trees, download tasks, disk health status, and live log simulation without a physical NAS.
- **Cross-Platform Core**: `KVSynologyCore` compiles cleanly on **macOS**, **iOS**, and headless **Linux** (x86_64 and aarch64) using conditional compilation (`#if canImport(FoundationNetworking)`).

---

## Feature Catalog (All 14 Modules)

KV-Synology iOS delivers 100% parity with the KV-Synology web and Android clients:

| # | Module | Description & Capabilities |
|---|---|---|
| **1** | **Authentication & Multi-NAS** | Secure login via QuickConnect ID, DDNS domain, or LAN IP; automatic DSM 7.x/6.x API fallback; 2-Step OTP authentication; self-signed SSL bypass; Multi-NAS profile switcher with Keychain persistence. |
| **2** | **System Dashboard** | Real-time CPU, RAM, Network RX/TX, and Disk I/O telemetry charts; DSM OS version, CPU model, temperature, and uptime; Remote Reboot & Shutdown controls with safety confirmation. |
| **3** | **File Station** | High-speed directory browser; file search, sorting, and metadata preview; file operations (create folder, rename, delete, copy, cut, paste); media streaming (video/audio via AVPlayer); syntax-highlighted code editor. |
| **4** | **Container Manager (Docker)** | Complete Docker container management: list, start, stop, restart, delete; CPU & RAM gauges per container; live streaming terminal container logs with search; Compose projects viewer; Docker image repository management. |
| **5** | **Download Station** | Real-time BitTorrent, HTTP, FTP, and NZB download tracker; transfer speeds, progress %, and ETA; pause, resume, and delete tasks; add download via magnet link, web URL, or local file. |
| **6** | **Storage Manager** | Storage pool and volume health overview (Btrfs/ext4); RAID layout inspection; physical disk slot temperature, serial number, and S.M.A.R.T. diagnostic status. |
| **7** | **Package Center** | Overview of installed and available DSM packages; 1-tap Start/Stop services; package version badges and update checks. |
| **8** | **File Services & Reverse Proxy** | 1-tap toggle switches for SMB, AFP, NFS, FTP, SFTP, SSH, Telnet, rsync, and WebDAV; port number configuration; Reverse Proxy rules list showing source-to-target host/port mappings. |
| **9** | **Security & Auto-Block** | DSM Security Advisor score; Firewall rule priority list with allow/deny badges; Auto-Block management (inspect blocked client IPs, unblock IPs, whitelist entries). |
| **10** | **Permissions & ACL Matrix** | Windows ACL shared folder hierarchy explorer; user and group access control matrix (Full Control, Read Only, Deny, Custom bits). |
| **11** | **Notification Center** | Categorized DSM notification feed (System, Storage, Security, Backup, Network); severity badges (Info, Warning, Error); "Mark all as read" and "Clear all" actions. |
| **12** | **Network Traffic & GeoIP** | Active socket connection table; client IP, local port, protocol, and transfer speed; GeoIP flag and country identification; per-interface RX/TX metrics. |
| **13** | **SSH Terminal Console** | Full-screen VT100/ANSI terminal emulator; custom mobile accessory keyboard toolbar (Esc, Tab, Ctrl, Arrows, Pipe, Slash) for command-line DSM administration. |
| **14** | **AI MCP Assistant** | Model Context Protocol AI assistant interface; chat-based DSM administration with quick action suggestions ("Check disk health", "Restart container", "Show blocked IPs"). |

---

## Project Directory Structure

```
kv-synology-ios/
├── Package.swift                             # Swift Package Manager manifest (Swift 6 / 5.10)
├── Dockerfile.swift-test                     # Multi-arch Linux unit testing Dockerfile
├── README.md                                 # Complete documentation & developer guide
├── .github/
│   └── workflows/
│       └── ios-build.yml                     # GitHub Actions CI (Linux tests + macOS Simulator build)
├── scripts/
│   ├── test-linux.sh                         # Linux automated test runner (Local Swift or Docker)
│   └── test-device.sh                        # Physical iPhone USB sideload & syslog streaming
├── Sources/
│   ├── KVSynologyCore/                       # Platform-agnostic Core Framework
│   │   ├── Models/                           # 13 Domain Data Models (Codable, Sendable)
│   │   │   ├── ConnectionModels.swift
│   │   │   ├── DockerModels.swift
│   │   │   ├── DownloadModels.swift
│   │   │   ├── FileModels.swift
│   │   │   ├── NotificationModels.swift
│   │   │   ├── PackageModels.swift
│   │   │   ├── PermissionModels.swift
│   │   │   ├── SecurityModels.swift
│   │   │   ├── ServiceModels.swift
│   │   │   ├── SnmpModels.swift
│   │   │   ├── StorageModels.swift
│   │   │   ├── SystemModels.swift
│   │   │   └── TrafficModels.swift
│   │   ├── Remote/                           # Network Actors & Resolvers
│   │   │   ├── DSMAuthenticator.swift        # SYNO.API.Auth login/logout with version fallback
│   │   │   ├── DSMClient.swift               # Synology REST API client actor
│   │   │   ├── MockDSMClient.swift           # Offline mock engine for Demo mode
│   │   │   ├── QuickConnectResolver.swift    # Multi-candidate QuickConnect resolver
│   │   │   └── SSLTrustDelegate.swift        # Self-signed certificate trust handler
│   │   ├── Repository/                       # Repository pattern interfaces & bindings
│   │   │   └── DSMRepository.swift
│   │   └── Storage/                          # Secure Storage & Persistence
│   │       ├── KeychainManager.swift         # Hardware Keychain with Linux fallback
│   │       └── ProfileStorage.swift          # Multi-NAS configuration profile storage
│   └── KVSynologyApp/                        # SwiftUI Application Layer
│       ├── App/                              # App entry point & global AppState
│       ├── Navigation/                       # TabBar (iPhone) & Sidebar (iPad/Mac)
│       ├── Theme/                            # Colors, Typography & Localization
│       └── Views/                            # 14 Feature View Modules + ViewModels
└── Tests/
    └── KVSynologyCoreTests/                  # Comprehensive Automated Unit Tests
        ├── DSMClientTests.swift              # URL building, query generation, JSON decoding
        ├── QuickConnectTests.swift           # Regex, candidate extraction, caching logic
        ├── MockDataTests.swift               # Offline mock telemetry, files, docker, storage
        └── KVSynologyCoreTests.swift         # Profile storage and integration tests
```

---

## Getting Started (Xcode Setup)

### System Requirements:
- **macOS Sonoma (14.0)** or **macOS Sequoia (15.0+)**
- **Xcode 15.4** or **Xcode 16+**
- Target: **iOS 17.0+** / **iPadOS 17.0+** / **macOS 14.0+ (Catalyst / Designed for iPad)**

### Steps to Open and Run:
1. Clone the repository:
   ```bash
   git clone https://github.com/vndangkhoa/kv-synology.git
   cd kv-synology/kv-synology-ios
   ```
2. Open the project in Xcode:
   - Double click `Package.swift`, or launch Xcode and select **File → Open** and choose `kv-synology-ios`.
3. Select an active scheme:
   - Choose **KVSynologyApp** (or target scheme).
   - Choose a target device: e.g., **iPhone 15 Pro Simulator** or connected physical device.
4. Press `Cmd + R` to build and run!
5. In the login screen, click **"Chế độ dùng thử (Demo Mode)"** to immediately test all 14 screens without needing a physical Synology NAS!

---

## How to Build & Test on Linux (5 Methods)

While native iOS SwiftUI views require Darwin runtime for rendering, you can develop, test, and run KV-Synology from Linux using any of the following 5 methods:

### Method 1: Headless Docker Swift Unit Tests (Recommended for CI)
Test the entire core engine, authentication, QuickConnect resolution, REST query generators, and mock repositories in seconds directly on your Linux terminal without installing Swift natively.

```bash
# From kv-synology-ios directory:
./scripts/test-linux.sh
```

**How it works:**
The script automatically detects if a local `swift` compiler is installed. If not, it executes `swift test` inside the official `swift:6.0` container:
```bash
docker run --rm -v "$(pwd)":/workspace -w /workspace swift:6.0 swift test --enable-test-discovery
```

### Method 2: Docker-OSX KVM Virtualization (Run Xcode on Linux)
Your Linux machine supports hardware KVM virtualization (`/dev/kvm`). You can run a full macOS Ventura or Sonoma instance inside Docker with near-native CPU speeds to run Xcode and the native iOS Simulator directly on Linux!

1. Verify KVM availability on your Linux system:
   ```bash
   kvm-ok
   # Output: INFO: /dev/kvm exists - KVM acceleration can be used
   ```
2. Launch Docker-OSX:
   ```bash
   docker run -it \
       --device /dev/kvm \
       -p 50922:10022 \
       -p 5900:5900 \
       -e "RAM=12" \
       -e "SMP=6" \
       -e "CORES=6" \
       -v /tmp/.X11-unix:/tmp/.X11-unix \
       -e "DISPLAY=${DISPLAY:-:0.0}" \
       sickcodes/docker-osx:latest
   ```
3. Once booted, open Xcode inside macOS, clone this repository, and run the iOS Simulator.

### Method 3: Physical iPhone Testing via USB (libimobiledevice)
You can compile an `.ipa` on a remote Mac or via GitHub Actions, and sideload, install, and live-debug it on a physical iPhone plugged into your Linux machine over USB.

1. Install libimobiledevice tools:
   ```bash
   sudo apt-get update
   sudo apt-get install -y usbmuxd libimobiledevice-utils ideviceinstaller
   ```
2. Connect your iPhone via USB, unlock the screen, and tap **"Trust this computer"**.
3. Run the automated test and sideload script:
   ```bash
   ./scripts/test-device.sh build/KVSynology-Ionic.ipa
   ```
4. The script validates pairing, installs the `.ipa`, and automatically begins streaming live device logs filtered for `KVSynology`:
   ```bash
   idevicesyslog | grep -i KVSynology
   ```

### Method 4: In-Browser Testing with Appetize.io (Zero-Install)
Test the compiled iOS Simulator build interactively inside Google Chrome or Firefox without macOS:

1. Push your code or trigger the GitHub Actions workflow (`.github/workflows/ios-build.yml`).
2. Download `KVSynology-Simulator.app.zip` from the workflow artifacts.
3. Visit [https://appetize.io/upload](https://appetize.io/upload).
4. Drag and drop the `.zip` file into the upload zone.
5. Launch the virtual interactive iPhone 15 Pro simulator directly in your browser!

### Method 5: Expo / React Native Cross-Platform Alternative
If you prefer a single TypeScript codebase running identically on iOS, Android, and Web with live hot-reloading on Linux via the **Expo Go** mobile app:
- Our adjacent web repository (`src/components/*`) already provides full TypeScript models and React components.
- An Expo React Native wrapper can connect to the same `DSMClient` REST endpoints and run on any physical iPhone via QR code scanning in the free Expo Go app on the App Store.

---

## Continuous Integration (CI/CD)

The project includes an enterprise-ready GitHub Actions workflow (`.github/workflows/ios-build.yml`):

1. **Linux Fast-Fail Job (`test-linux`)**:
   - Runs on `ubuntu-latest` inside the official `swift:6.0` container.
   - Compiles and runs all 30 unit tests with test discovery.
   - Completes in ~15 seconds.
2. **macOS Build Job (`build-simulator`)**:
   - Runs on `macos-14` (Apple Silicon M1/M2).
   - Compiles the iOS Simulator build using `xcodebuild`.
   - Packages `KVSynology-Simulator.app.zip` and uploads it as an artifact ready for Appetize.io.

---

## Unit Testing Suite

The testing suite contains 30 comprehensive unit tests across 4 dedicated test suites:

- **`DSMClientTests.swift`**:
  - `testUrlBuildingHttpsDefaultPort`: Validates scheme, host, port (5001), query parameters, `_sid`, and `SynoToken` insertion.
  - `testUrlBuildingHttpCustomPort`: Validates plain HTTP URL generation with custom ports.
  - `testPostQueryBodyGeneration`: Validates URL-encoded POST body serialization and parameter sorting.
  - `testSystemInfoJsonDecoding`: Validates DSM JSON decoding into typed `SystemInfo`.
  - `testDockerContainerJsonDecoding`: Validates container metadata, ports, volume mounts, and environment variables.
  - `testDownloadTaskStatusParsing`: Validates numeric and string status mapping to `DownloadTaskStatus`.
  - `testDSMAuthErrorDescriptions`: Validates localized Vietnamese error messages for 403, invalid credentials, and OTP challenges.
  - `testDSMClientDemoSession`: Validates offline demo authentication and logout lifecycle.

- **`QuickConnectTests.swift`**:
  - `testIsQuickConnectIdValidation`: Validates QuickConnect ID detection vs direct IP and domain addresses.
  - `testConnectionConfigQuickConnectProperties`: Validates ID extraction and regex normalization.
  - `testCandidateExtractionFromMockServPayload`: Validates extraction of Relay tunnels, DDNS addresses, SmartDNS endpoints, WAN IPs, and LAN interface candidates from `Serv.php` JSON payload.
  - `testQuickConnectCachingLifecycle`: Validates endpoint caching, cache hits, and cache clearance.
  - `testResolvedTargetExpiration`: Validates expiration time math.

- **`MockDataTests.swift`**:
  - `testMockTelemetryAndSystemInfo`: Validates realistic system specifications, CPU %, and RAM usage.
  - `testMockContainerOperations`: Validates container start/stop/restart operations and Compose project status syncing.
  - `testMockFileStationOperations`: Validates directory listing, folder creation, and file read/write simulation.
  - `testMockDownloadStationOperations`: Validates torrent/magnet task creation, pausing, and resuming.
  - `testMockStorageManagerVolumesAndDisks`: Validates Btrfs volume calculations and physical disk S.M.A.R.T. health data.
  - `testMockNotificationStreamAndActions`: Validates notification categorization and "mark all read" actions.
  - `testMockServicesAndFirewall`: Validates 1-click service toggles and firewall rule list.

- **`KVSynologyCoreTests.swift`**:
  - Validates Codable roundtrips, multi-NAS `ProfileStorage`, and repository-level demo switching.

### Test Execution Command:
```bash
./scripts/test-linux.sh
```
Output:
```
================================================================
       KV-Synology iOS - Linux Test Execution Runner            
================================================================
...
Executed 30 tests, with 0 failures (0 unexpected) in 0.21 seconds
✔ [PASS] All KVSynologyCore unit tests passed successfully!
```

---

## License & Credits

- **Author**: Khoa Vo (`vndangkhoa`)
- **License**: MIT License (see [LICENSE](../LICENSE) file).
- **Trademarks**: Synology, DiskStation, and DSM are trademarks of Synology Inc. This project is an independent open-source tool.
