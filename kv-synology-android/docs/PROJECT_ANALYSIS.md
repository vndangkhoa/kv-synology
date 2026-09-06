# KV-Synology Reverse Engineering & Project Analysis

## 1. Executive Summary
**KV-Synology** (DSM Helper Web Application) is a web-based Synology DiskStation Manager (DSM) client providing system monitoring, file management, container control, download automation, storage analysis, security, and access control for Synology NAS devices.

This document details the reverse engineering of the existing codebase to inform the architecture of the native Android application (`com.khoavo.kvsynology`).

---

## 2. Existing Architecture & Stack Analysis

### 2.1 Technology Stack
- **Framework**: Next.js 15.1.0 with React 19 and TypeScript 5.7.2.
- **State Management**: Zustand (`useAppStore.ts`) managing global application state, multi-NAS session credentials, live telemetry, and UI modals.
- **Styling**: Tailwind CSS with dark mode support (`gemini` OLED dark and standard light/dark modes).
- **Icons**: Lucide React.
- **Network / Proxy**: Next.js App Router API dynamic route (`src/app/api/dsm/[...path]/route.ts`) acting as an HTTP/HTTPS reverse proxy with custom Node.js `http` and `https` agents.
- **QuickConnect**: Custom multi-stage resolver querying Synology control servers via `Serv.php`.

### 2.2 Client-Server Communication Flow (Web)
```
[Browser Client] 
       │ (Fetch with x-dsm-host, x-dsm-port, x-dsm-sid)
       ▼
[Next.js API Route /api/dsm/*]
       │
       ├─► 1. Parse target NAS configuration
       ├─► 2. Resolve QuickConnect ID if needed (caches 10 min)
       ├─► 3. Probe Universal/Fallback candidates (5001, 5000, 443, 80)
       ├─► 4. Attach Cookies & X-SYNO-TOKEN headers
       ├─► 5. Forward Range requests for streaming media
       ▼
[Synology NAS (DSM WebAPI /webapi/*)]
```

### 2.3 Why Web Used a Proxy vs. Native Android
1. **Browser CORS**: Web browsers enforce strict cross-origin policies preventing direct calls from a browser page to an internal NAS IP or DDNS.
   - *Android Translation*: Native Android HTTP clients (`OkHttp`) have **no CORS restrictions** and connect directly to the NAS.
2. **Self-Signed Certificates**: Browsers refuse untrusted SSL certificates without user intervention.
   - *Android Translation*: Android can configure an explicit user opt-in `X509TrustManager` for the NAS hostname without disabling TLS globally.
3. **Session Cookies & Range Streaming**: Browsers require special proxying for `<video>` Range headers.
   - *Android Translation*: Media3 (`ExoPlayer`) natively supports HTTP Range requests with custom headers (`Cookie: id=<sid>`).

---

## 3. Core Modules & Subsystems

| Module | Web Source | Responsibilities & Behavior |
| :--- | :--- | :--- |
| **Authentication & Session** | `src/lib/dsm/client.ts` (`login`, `validateSession`) | Auth versions (7 -> 6 -> 3 -> 2 -> 1 fallback), OTP validation, `sid`, `SynoToken`, cookie management, session persistence. |
| **QuickConnect Resolver** | `src/app/api/dsm/[...path]/route.ts` | Resolves QuickConnect IDs via `Serv.php` (`request_tunnel`, `get_server_info`), parses control hosts, LAN IPs, WAN IPs, DDNS, SmartDNS, Relay tunnels, probes reachability. |
| **Dashboard / Overview** | `src/components/dashboard/OverviewTab.tsx` | NAS model, uptime, CPU/RAM/Network/Disk live telemetry, top processes, power actions (reboot/shutdown). |
| **Resource Monitor** | `src/components/monitor/ResourceMonitorTab.tsx` | Extended performance charts, process killer, system telemetry. |
| **File Station** | `src/components/files/FileStationTab.tsx` | Directory traversal, breadcrumbs, list/grid, search, upload, download, file preview (image, audio, video, text), share links. |
| **Docker / Container Manager** | `src/components/docker/DockerTab.tsx` | Containers, Compose projects (YAML editor), Docker images, pull image, logs streaming, resource stats. |
| **Download Station** | `src/components/download/DownloadStationTab.tsx` | Task management, state mapping, add via URL/torrent file, RSS feeds, BT search, host module accounts. |
| **Storage Manager** | `src/components/storage/StorageManagerTab.tsx` | Storage pools, volumes, drive health, SMART tests, SSD cache, data scrubbing, disk benchmarking. |
| **Package Center** | `src/components/packages/PackageCenterTab.tsx` | Installed packages, package store, start/stop, batch update, package servers. |
| **Services & Terminal** | `src/components/services/ServicesTab.tsx`, `src/components/terminal/TerminalTab.tsx` | SMB, AFP, NFS, FTP, SFTP, WebDAV toggle; SSH/Telnet settings; remote command execution. |
| **Reverse Proxy** | `src/components/services/ReverseProxyTab.tsx` | Nginx reverse proxy rules, frontend/backend config, WebSocket headers, health diagnosis. |
| **Firewall & Security** | `src/components/security/FirewallManagerTab.tsx` | Firewall rules, profile management, AutoBlock IP list, DoS protection. |
| **Permissions Inspector** | `src/components/permissions/PermissionInspectorTab.tsx` | User/Group ACL, Folder ACL tree, effective permission tester, permission matrix, security audit. |
| **Notifications** | `src/components/notifications/NotificationsTab.tsx` | DSM system notifications, app notifications, category filtering, clear all, mark read. |
| **Network Traffic & SNMP**| `src/components/traffic/NetworkTrafficTab.tsx`, `src/components/snmp/SnmpTab.tsx` | Active DSM connections (`SYNO.Core.CurrentConnection`), GeoIP country breakdown, PRTG-style multi-device SNMP monitoring. |
| **Settings** | `src/components/settings/SettingsTab.tsx` | Multi-NAS profiles, Theme (Light/Dark/OLED), Language (VI/EN), Experience mode (Beginner/Advanced), AI configuration. |

---

## 4. Key Findings for Android Implementation
1. **Repository Authoritative Behavior**: All API endpoints, query strings, and payloads in `src/lib/dsm/client.ts` are exact DSM WebAPI specifications that must be replicated identically.
2. **Offline Demo Mode**: `src/lib/dsm/mockData.ts` provides complete, realistic data for every feature, enabling robust standalone testing without a physical NAS.
3. **Adaptive UI Requirement**: Mobile screens need optimized bottom navigation, while foldables and tablets require Navigation Rail and two-pane master-detail layouts.
