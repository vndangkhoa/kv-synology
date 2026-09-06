# KV-Synology Screen & Navigation Parity Audit

| Source Page / Tab | Source File | Android Compose Screen | Navigation Route | Adaptive Layout | Parity Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Login Modal** | `LoginModal.tsx` | `LoginScreen.kt` | `login` | Centered card on tablet, bottom sheet on phone | **PASS** |
| **Dashboard** | `OverviewTab.tsx` | `DashboardScreen.kt` | `dashboard` | 2-column grid on tablet, single column on phone | **PASS** |
| **Resource Monitor**| `ResourceMonitorTab.tsx` | `MonitorScreen.kt` | `monitor` | Multi-pane charts on tablet, tabs on phone | **PASS** |
| **File Station** | `FileStationTab.tsx` | `FileStationScreen.kt` | `files` | Master-detail on tablet, drill-down on phone | **PASS** |
| **File Preview** | `FilePreviewModal.tsx` | `FilePreviewDialog.kt` | Dialog / Player | Media3 full-screen video, pan/zoom image viewer | **PASS** |
| **Docker Manager** | `DockerTab.tsx` | `DockerScreen.kt` | `docker` | 2-pane project/container view on tablet | **PASS** |
| **Download Station**| `DownloadStationTab.tsx` | `DownloadScreen.kt` | `download` | Split view task list + details on tablet | **PASS** |
| **Storage Manager** | `StorageManagerTab.tsx` | `StorageScreen.kt` | `storage` | Grid layout for volumes/pools on tablet | **PASS** |
| **Package Center** | `PackageCenterTab.tsx` | `PackagesScreen.kt` | `packages` | Adaptive card grid on tablet | **PASS** |
| **Services** | `ServicesTab.tsx` | `ServicesScreen.kt` | `services` | 2-column category view on tablet | **PASS** |
| **Reverse Proxy** | `ReverseProxyTab.tsx` | `ReverseProxyScreen.kt` | `reverse_proxy`| Card grid with inline test indicators | **PASS** |
| **Firewall & Security**| `FirewallManagerTab.tsx`| `FirewallScreen.kt` | `firewall` | Tabbed Rules / AutoBlock / DoS | **PASS** |
| **Permissions** | `PermissionInspectorTab.tsx`| `PermissionsScreen.kt` | `permissions`| Tree + Matrix view with horizontal scroll | **PASS** |
| **Notifications** | `NotificationsTab.tsx` | `NotificationsScreen.kt`| `notifications`| Filter chips + expandable alert cards | **PASS** |
| **Traffic Monitor** | `NetworkTrafficTab.tsx` | `TrafficScreen.kt` | `traffic` | World GeoIP summary + connection table | **PASS** |
| **SNMP Monitor** | `SnmpTab.tsx` | `SnmpScreen.kt` | `snmp` | Sensor metric cards + live PRTG-style gauges | **PASS** |
| **Terminal Console**| `TerminalTab.tsx` | `TerminalScreen.kt` | `terminal` | Full-screen monospace shell with soft keyboard | **PASS** |
| **Settings** | `SettingsTab.tsx` | `SettingsScreen.kt` | `settings` | Categorized preference list (Theme, Lang, Mode)| **PASS** |
