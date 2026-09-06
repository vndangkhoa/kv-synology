# KV-Synology Feature Matrix

This matrix catalogs every feature discovered in the repository, its web source, and its native Android realization.

| Feature ID | Feature Name | Web Source Component | API / Data Source | Android Realization | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Multi-NAS Connection | `LoginModal.tsx`, `sessionStorage.ts` | `SYNO.API.Auth`, LocalStorage | `LoginScreen`, Room `NasProfileEntity`, Android Keystore | IMPLEMENTED |
| **AUTH-02** | QuickConnect Auto-Discovery | `route.ts`, `LoginModal.tsx` | QuickConnect `Serv.php` | Native `QuickConnectResolver` (coroutine probe + cache) | IMPLEMENTED |
| **AUTH-03** | 2FA / OTP Authentication | `LoginModal.tsx`, `client.ts` | `SYNO.API.Auth` code 403/404 | OTP dialog & error parsing | IMPLEMENTED |
| **AUTH-04** | Self-Signed SSL Support | `route.ts`, `client.ts` | Node `rejectUnauthorized: false` | Host-scoped `TrustManager` with explicit opt-in | IMPLEMENTED |
| **DASH-01** | Real-Time Hardware Telemetry | `OverviewTab.tsx`, `useAppStore.ts` | `SYNO.Core.System.Utilization` | Flow polling (3s), Compose Sparkline / Canvas charts | IMPLEMENTED |
| **DASH-02** | System Specs & Uptime | `OverviewTab.tsx` | `SYNO.Core.System` | Material 3 System Info Cards | IMPLEMENTED |
| **DASH-03** | Top Running Processes | `OverviewTab.tsx`, `client.ts` | `SYNO.Core.System.Process` | LazyColumn with CPU/Memory bars & kill action | IMPLEMENTED |
| **DASH-04** | Power Controls (Reboot/Shutdown) | `PowerModal.tsx`, `client.ts` | `SYNO.Core.System` (reboot/shutdown) | Confirmation dialog with clear consequences | IMPLEMENTED |
| **FILE-01** | Directory Traversal & Breadcrumbs | `FileStationTab.tsx` | `SYNO.FileStation.List` | Breadcrumb bar, pull-to-refresh, LazyColumn/Grid | IMPLEMENTED |
| **FILE-02** | File Operations (Create, Rename, Delete)| `FileStationTab.tsx` | `SYNO.FileStation.CreateFolder/Rename/Delete` | Bottom sheet / context menu actions | IMPLEMENTED |
| **FILE-03** | File Upload / Storage Access | `FileStationTab.tsx` | `SYNO.FileStation.Upload` (Multipart) | Android Storage Access Framework (SAF) | IMPLEMENTED |
| **FILE-04** | File Download | `FileStationTab.tsx` | `SYNO.FileStation.Download` | Native `DownloadManager` with notification channels | IMPLEMENTED |
| **FILE-05** | Media Streaming & Preview | `FilePreviewModal.tsx` | `SYNO.FileStation.Download` + Range | Media3 / ExoPlayer for Audio/Video, Coil for Images | IMPLEMENTED |
| **FILE-06** | Share Link Generator | `FileStationTab.tsx` | `SYNO.FileStation.Sharing` | Android Sharesheet integration | IMPLEMENTED |
| **DOCK-01** | Container Management | `DockerTab.tsx` | `SYNO.Docker.Container` | Container cards, start/stop/restart toggles | IMPLEMENTED |
| **DOCK-02** | Compose / Project Management | `DockerProjectModal.tsx` | `SYNO.ContainerManager.Project` | YAML editor, build/start/stop actions | IMPLEMENTED |
| **DOCK-03** | Container Logs Viewer | `DockerDetailModal.tsx` | `SYNO.Docker.Container.Log` | Monospace log viewer with auto-scroll | IMPLEMENTED |
| **DOCK-04** | Docker Image Management | `DockerImagePullModal.tsx` | `SYNO.Docker.Image` | Image pull dialog with registry search | IMPLEMENTED |
| **DOWN-01** | Download Task Management | `DownloadStationTab.tsx` | `SYNO.DownloadStation.Task` | Task filter tabs, progress bars, pause/resume/delete | IMPLEMENTED |
| **DOWN-02** | Add Task via URL / Magnet / File | `DownloadStationTab.tsx` | `SYNO.DownloadStation.Task` / `FileHosting` | Floating Action Button, SAF file picker | IMPLEMENTED |
| **DOWN-03** | RSS Feeds & BT Search | `DownloadStationTab.tsx` | `SYNO.DownloadStation.RSS/BTSearch` | RSS reader tab & torrent keyword search | IMPLEMENTED |
| **STOR-01** | Storage Pools & Volumes | `StorageManagerTab.tsx` | `SYNO.Storage.CGI.Storage` / `Volume` | Capacity bars, RAID type badges, status chips | IMPLEMENTED |
| **STOR-02** | SMART Health & Diagnostics | `StorageManagerTab.tsx` | `SYNO.Storage.CGI.Smart` / `Check` | SMART attributes table, short/long test triggers | IMPLEMENTED |
| **STOR-03** | Data Scrubbing & SSD Cache | `StorageManagerTab.tsx` | `SYNO.Storage.CGI.Scrubbing` / `CacheAdvisor` | Progress indicators & cache optimization info | IMPLEMENTED |
| **PACK-01** | Installed Packages | `PackageCenterTab.tsx` | `SYNO.Core.Package` / `Control` | Package list, start/stop toggle, update action | IMPLEMENTED |
| **PACK-02** | Package Sources & Settings | `PackageCenterTab.tsx` | `SYNO.Core.Package.Server` | Third-party community repository manager | IMPLEMENTED |
| **SERV-01** | File Services Toggle | `ServicesTab.tsx` | `SYNO.Core.FileServ.*` (SMB/NFS/FTP/SFTP) | Switch list with port display & confirm dialogs | IMPLEMENTED |
| **SERV-02** | Reverse Proxy Rules | `ReverseProxyTab.tsx` | `SYNO.Core.AppPortal.ReverseProxy` | Rule cards, HTTP/HTTPS frontend/backend editor | IMPLEMENTED |
| **SEC-01** | Firewall Management | `FirewallManagerTab.tsx` | `SYNO.Core.Security.Firewall` / `Rules` | Rule list, allow/deny chips, rule order | IMPLEMENTED |
| **SEC-02** | AutoBlock & DoS Protection | `FirewallManagerTab.tsx` | `SYNO.Core.Security.AutoBlock` / `DoS` | Blocked IPs table, unblock action, threshold sliders | IMPLEMENTED |
| **PERM-01** | ACL Tree & Effective Tester | `PermissionInspectorTab.tsx` | `SYNO.FileStation.ACL`, ACL engine | Permission tree, user-folder effective access evaluator | IMPLEMENTED |
| **PERM-02** | Security Audit | `PermissionInspectorTab.tsx` | Security audit engine | Severity cards (Critical/Warning/Info) & fixes | IMPLEMENTED |
| **NOTIF-01**| DSM Notification Center | `NotificationsTab.tsx` | `SYNO.Core.DSMNotify` / `AppNotify` | Grouped notification cards, mark read, clear all | IMPLEMENTED |
| **TRAF-01** | Network Traffic & GeoIP | `NetworkTrafficTab.tsx` | `SYNO.Core.CurrentConnection`, GeoIP | Active connection list with country flags & ISPs | IMPLEMENTED |
| **SNMP-01** | Multi-Device SNMP Monitoring | `SnmpTab.tsx` | SNMP v1/v2c/v3 engine | Device sensor cards, PRTG-style live values | IMPLEMENTED |
| **TERM-01** | Terminal Console | `TerminalTab.tsx` | SSH / Shell engine | Native command line interface with monospace output | IMPLEMENTED |
| **SETT-01** | Multi-Language & Theme | `SettingsTab.tsx` | DataStore (`vi`/`en`, System/Dark/Light) | Compose dynamic theming and bilingual locale support | IMPLEMENTED |
| **SETT-02** | Experience Modes | `SettingsTab.tsx` | DataStore (`beginner`/`advance`) | Adaptive bottom bar & drawer filtering | IMPLEMENTED |
| **DEMO-01** | Standalone Demo Mode | `mockData.ts` | In-memory simulated dataset | Full functional offline sandbox with realistic NAS data | IMPLEMENTED |
