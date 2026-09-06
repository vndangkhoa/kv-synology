# KV-Synology Parity Check

This audit verifies behavior and feature parity between the original web application and the native Android application.

| Feature Area | Source Web Behavior | Android Native Behavior | Parity Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | Multi-version auth (7->1), OTP code 403, 7-day session | Native `DSMAuthenticator`, Keystore credential storage, Biometric lock | **PASS** | Full parity + Keystore security |
| **QuickConnect** | `Serv.php` query, control host redirects, candidate probing | Native `QuickConnectResolver`, concurrent probing, 10m cache | **PASS** | Identical logic ported to Kotlin |
| **Self-Signed SSL** | `rejectUnauthorized: false` in Node.js agent | Host-scoped `TrustManager` with user opt-in toggle | **PASS** | Safer than web blanket bypass |
| **Dashboard** | 3s polling for CPU/RAM/Disk/Net, process list, reboot modal | Coroutine StateFlow (3s), Canvas charts, process list, power dialog | **PASS** | Identical metrics & actions |
| **File Station** | Breadcrumbs, list/grid, search, upload, download, share link | Native Compose UI, SAF file picker, DownloadManager, Sharesheet | **PASS** | Android-native interactions |
| **Media Preview** | HTML5 video/audio modal, image viewer | AndroidX Media3 (ExoPlayer) with Range headers, Coil zoom viewer | **PASS** | Native hardware decoder |
| **Docker / Containers** | Container list, Compose YAML, image pull, logs | Compose container cards, YAML editor, log viewer, pull modal | **PASS** | Complete container operations |
| **Download Station** | Task list, state mapping, add via magnet/URL, RSS, BT search | Task filter tabs, DownloadStation numeric state mapper, RSS, BT search | **PASS** | Full parity with DSM numeric states |
| **Storage Manager** | Storage pools, volumes, drive health, SMART tests, scrubbing | Storage topology cards, SMART attribute table, scrubbing controls | **PASS** | Full parity |
| **Package Center** | Installed/available packages, start/stop, update, sources | Material 3 package list, toggle switches, repository sources | **PASS** | Full parity |
| **Services & Terminal** | File services switch, SSH/Telnet settings, web shell | Service toggles with confirm dialogs, terminal screen | **PASS** | Full parity |
| **Reverse Proxy** | Nginx reverse proxy rule list, add/edit/delete, health check | Rule editor, frontend/backend config, WebSocket headers | **PASS** | Full parity |
| **Firewall & Security** | Firewall rules, profile apply, AutoBlock list, DoS switch | Rule list with protocol chips, blocked IP table, DoS switch | **PASS** | Full parity |
| **Permissions Inspector** | ACL tree, user/folder matrix, effective tester, audit | Interactive ACL tree, permission matrix, audit findings cards | **PASS** | Full parity |
| **Notifications** | DSM notifications, unread badges, mark read, clear all | Grouped notification cards, level chips, clear/mark read | **PASS** | Full parity |
| **Traffic & SNMP** | Active connections, GeoIP flag display, PRTG-style sensors | Connection list with country flags, UDP SNMP polling | **PASS** | Full parity |
| **Settings & Theming** | VI/EN language, Dark/Light/OLED theme, Beginner/Advanced mode | Compose Material 3 dynamic theme, Bilingual strings, DataStore | **PASS** | Full parity |
| **Offline Demo Mode** | Comprehensive mock datasets in `mockData.ts` | Kotlin `MockDSMClient` with identical datasets | **PASS** | Immediate sandbox capability |
| **Resource Monitor** | CPU/RAM wave chart, process explorer with search/filters/kill | Native `ResourceMonitorScreen`, Canvas wave chart, kill dialog | **PASS** | Full parity |
| **AI Assistant** | Floating chat drawer, diagnostic quick suggestions, DSM analysis | `AiChatBottomSheet`, `SmartToy` FAB, telemetry diagnostic AI | **PASS** | Full parity |
| **MCP Tools Guide** | Interactive tool catalog, payload preview, copy MCP config | `McpDocsScreen`, tool cards, JSON payload copy to clipboard | **PASS** | Full parity |
| **Docker Details & Logs** | Inspect container modal, real-time container log viewer | `ContainerDetailDialog`, log viewer, container controls | **PASS** | Full parity |

