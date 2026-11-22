use crate::models::{
    AclAuditIssue, AclEntry, AclFolderNode, BlockedIp, DiskInfo, DockerContainer, DownloadTask,
    FileItem, FirewallRule, McpToolDoc, NasProfile, NotificationItem, PackageItem, ProcessItem,
    ReverseProxyRule, ServiceItem, SnmpDevice, StorageVolume, SystemInfo, SystemUtilization,
    TrafficConnection, TrafficCountry, TrafficProcess, TrafficSummary, UtilSample,
};

pub fn demo_profiles() -> Vec<NasProfile> {
    vec![
        NasProfile {
            id: "nas-home-ds920".to_string(),
            label: "DS920+ Home (LAN)".to_string(),
            host: "192.168.1.10".to_string(),
            port: 5001,
            https: true,
            account: "admin".to_string(),
        },
        NasProfile {
            id: "nas-office-rs1221".to_string(),
            label: "RS1221+ Studio".to_string(),
            host: "nas.khoavo.myds.me".to_string(),
            port: 5001,
            https: true,
            account: "ops_admin".to_string(),
        },
    ]
}

pub fn demo_system_info() -> SystemInfo {
    SystemInfo {
        model: "DS920+ (Pure Rust Demo)".to_string(),
        serial: "2180QXR984512".to_string(),
        dsm_version: "DSM 7.2.2-72806 Update 3".to_string(),
        ram_mb: 16384,
        uptime_sec: 1_579_620,
        temperature_c: 41,
        cpu_cores: 4,
        cpu_model: "Intel Celeron J4125 @ 2.00GHz".to_string(),
        hostname: "kv-syno-ds920".to_string(),
    }
}

pub fn demo_utilization(tick: u64) -> SystemUtilization {
    let phase = (tick % 12) as f64;
    let wave = ((phase * 0.55).sin() + 1.0) * 0.5;
    let cpu_user = 14.0 + wave * 18.0;
    let cpu_sys = 4.2 + wave * 4.8;
    let ram_used = 7_120 + ((wave * 820.0) as u64);
    let ram_total = 16_384;
    SystemUtilization {
        cpu_total: (cpu_user + cpu_sys).clamp(5.0, 95.0),
        cpu_user,
        cpu_system: cpu_sys,
        ram_percent: (ram_used as f64 / ram_total as f64) * 100.0,
        ram_used_mb: ram_used,
        ram_cached_mb: 4_860,
        ram_total_mb: ram_total,
        net_rx_bps: 18_400_000 + (tick % 7) * 2_450_000,
        net_tx_bps: 6_150_000 + (tick % 5) * 1_120_000,
        disk_read_bps: 42_000_000 + (tick % 4) * 5_500_000,
        disk_write_bps: 14_200_000 + (tick % 6) * 1_800_000,
    }
}

pub fn demo_history() -> Vec<UtilSample> {
    (0..24)
        .map(|i| {
            let u = demo_utilization(i);
            UtilSample {
                cpu: u.cpu_total,
                ram: u.ram_percent,
                rx_kbps: (u.net_rx_bps as f64) / 1024.0,
                tx_kbps: (u.net_tx_bps as f64) / 1024.0,
            }
        })
        .collect()
}

pub fn demo_processes() -> Vec<ProcessItem> {
    vec![
        ProcessItem {
            pid: 1842,
            name: "postgres (immich)".to_string(),
            user: "docker".to_string(),
            cpu_percent: 6.8,
            ram_mb: 1420,
            status: "Sleeping".to_string(),
        },
        ProcessItem {
            pid: 2201,
            name: "jellyfin".to_string(),
            user: "media".to_string(),
            cpu_percent: 5.4,
            ram_mb: 980,
            status: "Running".to_string(),
        },
        ProcessItem {
            pid: 1120,
            name: "kv-synology".to_string(),
            user: "root".to_string(),
            cpu_percent: 0.4,
            ram_mb: 14,
            status: "Running".to_string(),
        },
        ProcessItem {
            pid: 932,
            name: "smbd".to_string(),
            user: "root".to_string(),
            cpu_percent: 2.1,
            ram_mb: 186,
            status: "Sleeping".to_string(),
        },
        ProcessItem {
            pid: 3104,
            name: "nginx (reverse-proxy)".to_string(),
            user: "http".to_string(),
            cpu_percent: 1.5,
            ram_mb: 128,
            status: "Running".to_string(),
        },
        ProcessItem {
            pid: 4412,
            name: "synoscgi".to_string(),
            user: "system".to_string(),
            cpu_percent: 1.2,
            ram_mb: 94,
            status: "Sleeping".to_string(),
        },
        ProcessItem {
            pid: 5190,
            name: "transmission-daemon".to_string(),
            user: "DownloadStation".to_string(),
            cpu_percent: 3.3,
            ram_mb: 245,
            status: "Running".to_string(),
        },
        ProcessItem {
            pid: 620,
            name: "btrfs-transaction".to_string(),
            user: "root".to_string(),
            cpu_percent: 0.9,
            ram_mb: 48,
            status: "Running".to_string(),
        },
    ]
}

pub fn demo_files(path: &str) -> Vec<FileItem> {
    if path == "/" || path.is_empty() {
        vec![
            FileItem {
                name: "docker".to_string(),
                path: "/docker".to_string(),
                is_dir: true,
                size: 0,
                modified: "2026-11-22 09:14".to_string(),
                owner: "admin".to_string(),
                perm: "rwxr-xr-x".to_string(),
            },
            FileItem {
                name: "Media".to_string(),
                path: "/Media".to_string(),
                is_dir: true,
                size: 0,
                modified: "2026-11-21 22:05".to_string(),
                owner: "admin".to_string(),
                perm: "rwxr-xr-x".to_string(),
            },
            FileItem {
                name: "Backups".to_string(),
                path: "/Backups".to_string(),
                is_dir: true,
                size: 0,
                modified: "2026-11-22 03:00".to_string(),
                owner: "backup_svc".to_string(),
                perm: "rwx------".to_string(),
            },
            FileItem {
                name: "Downloads".to_string(),
                path: "/Downloads".to_string(),
                is_dir: true,
                size: 0,
                modified: "2026-11-22 11:30".to_string(),
                owner: "admin".to_string(),
                perm: "rwxrwxr-x".to_string(),
            },
            FileItem {
                name: "homes".to_string(),
                path: "/homes".to_string(),
                is_dir: true,
                size: 0,
                modified: "2026-11-18 14:20".to_string(),
                owner: "root".to_string(),
                perm: "rwxr-xr-x".to_string(),
            },
            FileItem {
                name: "Projects".to_string(),
                path: "/Projects".to_string(),
                is_dir: true,
                size: 0,
                modified: "2026-11-22 10:12".to_string(),
                owner: "khoa".to_string(),
                perm: "rwxr-xr-x".to_string(),
            },
        ]
    } else {
        vec![
            FileItem {
                name: "configs".to_string(),
                path: format!("{path}/configs"),
                is_dir: true,
                size: 0,
                modified: "2026-11-22 08:40".to_string(),
                owner: "admin".to_string(),
                perm: "rwxr-xr-x".to_string(),
            },
            FileItem {
                name: "docker-compose.yml".to_string(),
                path: format!("{path}/docker-compose.yml"),
                is_dir: false,
                size: 4_812,
                modified: "2026-11-21 19:52".to_string(),
                owner: "admin".to_string(),
                perm: "rw-r--r--".to_string(),
            },
            FileItem {
                name: "nas-health-snapshot.json".to_string(),
                path: format!("{path}/nas-health-snapshot.json"),
                is_dir: false,
                size: 128_400,
                modified: "2026-11-22 06:00".to_string(),
                owner: "admin".to_string(),
                perm: "rw-r--r--".to_string(),
            },
            FileItem {
                name: "synology-backup-archive.spk".to_string(),
                path: format!("{path}/synology-backup-archive.spk"),
                is_dir: false,
                size: 84_934_656,
                modified: "2026-11-20 16:45".to_string(),
                owner: "admin".to_string(),
                perm: "rw-r--r--".to_string(),
            },
        ]
    }
}

pub fn demo_volumes() -> Vec<StorageVolume> {
    vec![
        StorageVolume {
            id: "volume_1".to_string(),
            name: "Volume 1 (Main Pool)".to_string(),
            raid_type: "SHR (1-drive fault tolerance)".to_string(),
            fs_type: "Btrfs".to_string(),
            status: "Normal".to_string(),
            used_gb: 6_840.0,
            total_gb: 11_176.0,
            pool_name: "Storage Pool 1".to_string(),
        },
        StorageVolume {
            id: "volume_2".to_string(),
            name: "Volume 2 (NVMe Docker Cache)".to_string(),
            raid_type: "RAID 1".to_string(),
            fs_type: "Btrfs".to_string(),
            status: "Normal".to_string(),
            used_gb: 312.0,
            total_gb: 931.0,
            pool_name: "Storage Pool 2".to_string(),
        },
    ]
}

pub fn demo_disks() -> Vec<DiskInfo> {
    vec![
        DiskInfo {
            id: "sata1".to_string(),
            slot: "Drive 1".to_string(),
            model: "Synology HAT5300-4T".to_string(),
            serial: "WX42D91801".to_string(),
            size_gb: 3726,
            temp_c: 34,
            smart_status: "Normal".to_string(),
            health: "Healthy".to_string(),
            disk_type: "SATA HDD".to_string(),
        },
        DiskInfo {
            id: "sata2".to_string(),
            slot: "Drive 2".to_string(),
            model: "Synology HAT5300-4T".to_string(),
            serial: "WX42D91802".to_string(),
            size_gb: 3726,
            temp_c: 35,
            smart_status: "Normal".to_string(),
            health: "Healthy".to_string(),
            disk_type: "SATA HDD".to_string(),
        },
        DiskInfo {
            id: "sata3".to_string(),
            slot: "Drive 3".to_string(),
            model: "Seagate IronWolf ST4000VN008".to_string(),
            serial: "ZGY89A12".to_string(),
            size_gb: 3726,
            temp_c: 37,
            smart_status: "Normal".to_string(),
            health: "Healthy".to_string(),
            disk_type: "SATA HDD".to_string(),
        },
        DiskInfo {
            id: "nvme0n1".to_string(),
            slot: "M.2 Slot 1".to_string(),
            model: "Samsung 980 PRO 1TB".to_string(),
            serial: "S5GXNX0R41".to_string(),
            size_gb: 931,
            temp_c: 42,
            smart_status: "Normal".to_string(),
            health: "Healthy (98% wear left)".to_string(),
            disk_type: "NVMe SSD".to_string(),
        },
    ]
}

pub fn demo_smart_raw() -> &'static str {
    "SynoSmartInfo v1.3.15 (Demo Sample)
Device /dev/sata1 - Synology HAT5300-4T [S/N: WX42D91801]
  Model Family:     Synology HAT5300
  User Capacity:    4,000,787,030,016 bytes [4.00 TB]
  Rotation Rate:    7200 rpm
  SMART overall-health self-assessment test result: PASSED
  Power_On_Hours:   18420 (2y 37d)
  Temperature_Celsius: 34
  Reallocated_Sector_Ct: 0
  Current_Pending_Sector: 0

Device /dev/nvme0n1 - Samsung SSD 980 PRO 1TB [S/N: S5GXNX0R41]
  SMART overall-health self-assessment test result: PASSED
  Temperature:      42 Celsius
  Percentage Used:  2%
  Power On Hours:   9110
  Media Errors:     0"
}

pub fn demo_containers() -> Vec<DockerContainer> {
    vec![
        DockerContainer {
            id: "a1f92c81".to_string(),
            name: "immich-server".to_string(),
            image: "ghcr.io/immich-app/immich-server:release".to_string(),
            status: "Up 14 days".to_string(),
            up: true,
            cpu_percent: 4.2,
            memory_mb: 1120.0,
            ports: "2283:2283/tcp".to_string(),
            created: "2026-11-08".to_string(),
        },
        DockerContainer {
            id: "b4c80d12".to_string(),
            name: "jellyfin".to_string(),
            image: "linuxserver/jellyfin:latest".to_string(),
            status: "Up 14 days".to_string(),
            up: true,
            cpu_percent: 6.1,
            memory_mb: 980.0,
            ports: "8096:8096/tcp".to_string(),
            created: "2026-10-29".to_string(),
        },
        DockerContainer {
            id: "c9e17f33".to_string(),
            name: "adguard-home".to_string(),
            image: "adguard/adguardhome:latest".to_string(),
            status: "Up 18 days".to_string(),
            up: true,
            cpu_percent: 0.7,
            memory_mb: 145.0,
            ports: "53:53/udp, 3000:3000/tcp".to_string(),
            created: "2026-10-12".to_string(),
        },
        DockerContainer {
            id: "d2b54a90".to_string(),
            name: "vaultwarden".to_string(),
            image: "vaultwarden/server:latest".to_string(),
            status: "Up 18 days".to_string(),
            up: true,
            cpu_percent: 0.3,
            memory_mb: 68.0,
            ports: "8085:80/tcp".to_string(),
            created: "2026-09-25".to_string(),
        },
        DockerContainer {
            id: "e7a11c45".to_string(),
            name: "home-assistant".to_string(),
            image: "ghcr.io/home-assistant/home-assistant:stable".to_string(),
            status: "Exited (0) 2 hours ago".to_string(),
            up: false,
            cpu_percent: 0.0,
            memory_mb: 0.0,
            ports: "host".to_string(),
            created: "2026-09-14".to_string(),
        },
    ]
}

pub fn demo_downloads() -> Vec<DownloadTask> {
    vec![
        DownloadTask {
            id: "dbid_101".to_string(),
            title: "ubuntu-24.04.1-live-server-amd64.iso".to_string(),
            uri: "https://releases.ubuntu.com/24.04.1/ubuntu-24.04.1-live-server-amd64.iso"
                .to_string(),
            status: "downloading".to_string(),
            size_bytes: 2_831_155_200,
            downloaded_bytes: 1_925_000_000,
            speed_down: 14_800_000,
            speed_up: 1_250_000,
            eta: "01m 02s".to_string(),
            task_type: "bt".to_string(),
        },
        DownloadTask {
            id: "dbid_102".to_string(),
            title: "DSM_DS920+_72806.pat".to_string(),
            uri: "https://global.synologydownload.com/download/DSM/release/7.2.2/72806/DSM_DS920%2B_72806.pat".to_string(),
            status: "finished".to_string(),
            size_bytes: 382_740_480,
            downloaded_bytes: 382_740_480,
            speed_down: 0,
            speed_up: 0,
            eta: "Done".to_string(),
            task_type: "http".to_string(),
        },
        DownloadTask {
            id: "dbid_103".to_string(),
            title: "debian-12.7.0-amd64-netinst.iso".to_string(),
            uri: "magnet:?xt=urn:btih:debian1270demo".to_string(),
            status: "paused".to_string(),
            size_bytes: 659_554_304,
            downloaded_bytes: 263_821_721,
            speed_down: 0,
            speed_up: 0,
            eta: "Paused".to_string(),
            task_type: "bt".to_string(),
        },
    ]
}

pub fn demo_packages() -> Vec<PackageItem> {
    vec![
        PackageItem {
            id: "ContainerManager".to_string(),
            name: "Container Manager".to_string(),
            version: "24.0.2-1535".to_string(),
            publisher: "Synology Inc.".to_string(),
            category: "Developer".to_string(),
            running: true,
            description: "Docker container orchestration runtime".to_string(),
        },
        PackageItem {
            id: "HyperBackup".to_string(),
            name: "Hyper Backup".to_string(),
            version: "4.1.2-4039".to_string(),
            publisher: "Synology Inc.".to_string(),
            category: "Backup".to_string(),
            running: true,
            description: "Multi-version encrypted backups to local/cloud".to_string(),
        },
        PackageItem {
            id: "DownloadStation".to_string(),
            name: "Download Station".to_string(),
            version: "3.9.9-4672".to_string(),
            publisher: "Synology Inc.".to_string(),
            category: "Utilities".to_string(),
            running: true,
            description: "BT / HTTP / FTP / NZB / RSS download engine".to_string(),
        },
        PackageItem {
            id: "SnapshotReplication".to_string(),
            name: "Snapshot Replication".to_string(),
            version: "7.4.5-1713".to_string(),
            publisher: "Synology Inc.".to_string(),
            category: "Backup".to_string(),
            running: true,
            description: "Instant Btrfs snapshots and replication".to_string(),
        },
        PackageItem {
            id: "AudioStation".to_string(),
            name: "Audio Station".to_string(),
            version: "7.0.2-5108".to_string(),
            publisher: "Synology Inc.".to_string(),
            category: "Multimedia".to_string(),
            running: false,
            description: "Personal music streaming library".to_string(),
        },
        PackageItem {
            id: "ActiveBackup".to_string(),
            name: "Active Backup for Business".to_string(),
            version: "2.7.0-3221".to_string(),
            publisher: "Synology Inc.".to_string(),
            category: "Backup".to_string(),
            running: true,
            description: "Centralized VM & PC bare-metal backup".to_string(),
        },
    ]
}

pub fn demo_services() -> Vec<ServiceItem> {
    vec![
        ServiceItem {
            id: "smb".to_string(),
            name: "SMB (Windows File Service)".to_string(),
            category: "File Services".to_string(),
            enabled: true,
            port: "445/tcp".to_string(),
            description: "SMBv2/SMBv3 multichannel LAN sharing".to_string(),
        },
        ServiceItem {
            id: "nfs".to_string(),
            name: "NFSv4.1".to_string(),
            category: "File Services".to_string(),
            enabled: true,
            port: "2049/tcp".to_string(),
            description: "Linux / Proxmox shared storage mount".to_string(),
        },
        ServiceItem {
            id: "afp".to_string(),
            name: "AFP (Apple Filing Protocol)".to_string(),
            category: "File Services".to_string(),
            enabled: false,
            port: "548/tcp".to_string(),
            description: "Legacy macOS Time Machine support".to_string(),
        },
        ServiceItem {
            id: "ssh".to_string(),
            name: "SSH Terminal Service".to_string(),
            category: "Terminal & SNMP".to_string(),
            enabled: true,
            port: "2212/tcp".to_string(),
            description: "OpenSSH encrypted shell access".to_string(),
        },
        ServiceItem {
            id: "sftp".to_string(),
            name: "SFTP".to_string(),
            category: "File Services".to_string(),
            enabled: true,
            port: "2212/tcp".to_string(),
            description: "Secure SSH File Transfer Protocol".to_string(),
        },
        ServiceItem {
            id: "rsync".to_string(),
            name: "rsync Daemon".to_string(),
            category: "File Services".to_string(),
            enabled: true,
            port: "873/tcp".to_string(),
            description: "Encrypted Hyper Backup & rsync replication".to_string(),
        },
        ServiceItem {
            id: "webdav".to_string(),
            name: "WebDAV HTTPS".to_string(),
            category: "Network Services".to_string(),
            enabled: false,
            port: "5006/tcp".to_string(),
            description: "Remote WebDAV drive mapping".to_string(),
        },
        ServiceItem {
            id: "snmp".to_string(),
            name: "SNMP Agent (v2c / v3)".to_string(),
            category: "Terminal & SNMP".to_string(),
            enabled: true,
            port: "161/udp".to_string(),
            description: "Telemetry metrics for PRTG & DSM Helper".to_string(),
        },
    ]
}

pub fn demo_reverse_proxies() -> Vec<ReverseProxyRule> {
    vec![
        ReverseProxyRule {
            id: "rp_1".to_string(),
            description: "KV Synology Pure Rust".to_string(),
            src_protocol: "HTTPS".to_string(),
            src_host: "syno.vndns.net".to_string(),
            src_port: 443,
            dst_protocol: "HTTP".to_string(),
            dst_host: "localhost".to_string(),
            dst_port: 8088,
            hsts: true,
            websocket: true,
        },
        ReverseProxyRule {
            id: "rp_2".to_string(),
            description: "Immich Photos".to_string(),
            src_protocol: "HTTPS".to_string(),
            src_host: "photos.vndns.net".to_string(),
            src_port: 443,
            dst_protocol: "HTTP".to_string(),
            dst_host: "localhost".to_string(),
            dst_port: 2283,
            hsts: true,
            websocket: true,
        },
        ReverseProxyRule {
            id: "rp_3".to_string(),
            description: "Vaultwarden".to_string(),
            src_protocol: "HTTPS".to_string(),
            src_host: "vault.vndns.net".to_string(),
            src_port: 443,
            dst_protocol: "HTTP".to_string(),
            dst_host: "localhost".to_string(),
            dst_port: 8085,
            hsts: true,
            websocket: true,
        },
    ]
}

pub fn demo_firewall_rules() -> Vec<FirewallRule> {
    vec![
        FirewallRule {
            id: "fw_1".to_string(),
            name: "Allow LAN Subnet (192.168.1.0/24)".to_string(),
            ports: "All".to_string(),
            protocol: "TCP/UDP".to_string(),
            source_ip: "192.168.1.0/24".to_string(),
            action: "Allow".to_string(),
            enabled: true,
        },
        FirewallRule {
            id: "fw_2".to_string(),
            name: "HTTPS Reverse Proxy".to_string(),
            ports: "443, 80".to_string(),
            protocol: "TCP".to_string(),
            source_ip: "VN, SG".to_string(),
            action: "Allow".to_string(),
            enabled: true,
        },
        FirewallRule {
            id: "fw_3".to_string(),
            name: "Block External Telnet/SMB".to_string(),
            ports: "23, 445, 139".to_string(),
            protocol: "TCP".to_string(),
            source_ip: "All".to_string(),
            action: "Deny".to_string(),
            enabled: true,
        },
    ]
}

pub fn demo_blocked_ips() -> Vec<BlockedIp> {
    vec![
        BlockedIp {
            ip: "185.220.101.44".to_string(),
            reason: "5 failed SSH attempts in 3m".to_string(),
            blocked_at: "2026-11-22 04:12".to_string(),
            permanent: true,
        },
        BlockedIp {
            ip: "45.155.205.91".to_string(),
            reason: "DSM login brute force".to_string(),
            blocked_at: "2026-11-21 18:45".to_string(),
            permanent: false,
        },
    ]
}

pub fn demo_notifications() -> Vec<NotificationItem> {
    vec![
        NotificationItem {
            id: "n1".to_string(),
            title: "Hyper Backup completed".to_string(),
            message: "Daily B2 Encrypted Backup finished (42.8 GB synced, 0 errors).".to_string(),
            level: "info".to_string(),
            category: "Backup".to_string(),
            timestamp: "2026-11-22 03:18".to_string(),
            read: false,
        },
        NotificationItem {
            id: "n2".to_string(),
            title: "Auto-Block triggered".to_string(),
            message: "Blocked IP 185.220.101.44 after 5 failed SSH login attempts.".to_string(),
            level: "warning".to_string(),
            category: "Security".to_string(),
            timestamp: "2026-11-22 04:12".to_string(),
            read: false,
        },
        NotificationItem {
            id: "n3".to_string(),
            title: "Btrfs Scrub Passed".to_string(),
            message: "Data scrubbing on Volume 1 completed with zero checksum errors.".to_string(),
            level: "info".to_string(),
            category: "Storage".to_string(),
            timestamp: "2026-11-20 07:05".to_string(),
            read: true,
        },
    ]
}

pub fn demo_traffic_fallback() -> (TrafficSummary, Vec<TrafficConnection>) {
    let conns = vec![
        TrafficConnection {
            id: "c1".to_string(),
            protocol: "TCP".to_string(),
            local_ip: "192.168.1.10".to_string(),
            local_port: 443,
            remote_ip: "14.161.22.88".to_string(),
            remote_port: 51204,
            state: "ESTABLISHED".to_string(),
            process_name: "nginx".to_string(),
            direction: "inbound".to_string(),
            country_code: "VN".to_string(),
            country_name: "Việt Nam".to_string(),
            flag_emoji: "🇻🇳".to_string(),
            isp: "VNPT Corp".to_string(),
            rx_speed_bytes: 1_240_000,
            tx_speed_bytes: 4_850_000,
            is_suspicious: false,
        },
        TrafficConnection {
            id: "c2".to_string(),
            protocol: "TCP".to_string(),
            local_ip: "192.168.1.10".to_string(),
            local_port: 49210,
            remote_ip: "172.67.148.20".to_string(),
            remote_port: 443,
            state: "ESTABLISHED".to_string(),
            process_name: "kv-synology".to_string(),
            direction: "outbound".to_string(),
            country_code: "US".to_string(),
            country_name: "United States".to_string(),
            flag_emoji: "🇺🇸".to_string(),
            isp: "Cloudflare".to_string(),
            rx_speed_bytes: 420_000,
            tx_speed_bytes: 185_000,
            is_suspicious: false,
        },
        TrafficConnection {
            id: "c3".to_string(),
            protocol: "TCP".to_string(),
            local_ip: "192.168.1.10".to_string(),
            local_port: 2212,
            remote_ip: "185.220.101.44".to_string(),
            remote_port: 61902,
            state: "SYN_RECV".to_string(),
            process_name: "sshd".to_string(),
            direction: "inbound".to_string(),
            country_code: "DE".to_string(),
            country_name: "Germany".to_string(),
            flag_emoji: "🇩🇪".to_string(),
            isp: "Tor Exit Node".to_string(),
            rx_speed_bytes: 4_200,
            tx_speed_bytes: 1_100,
            is_suspicious: true,
        },
    ];
    let summary = TrafficSummary {
        total_connections: 3,
        outbound_connections: 1,
        inbound_connections: 2,
        local_connections: 0,
        suspicious_count: 1,
        current_outbound_speed: 5_036_100,
        current_inbound_speed: 1_664_200,
        total_outbound_bytes: 84_200_000_000,
        total_inbound_bytes: 29_400_000_000,
        top_countries: vec![
            TrafficCountry {
                country_code: "VN".to_string(),
                country_name: "Việt Nam".to_string(),
                flag_emoji: "🇻🇳".to_string(),
                active_connections: 1,
                outbound_bytes: 48_000_000_000,
                inbound_bytes: 18_000_000_000,
                percent_outbound: 68,
                primary_isps: vec!["VNPT Corp".to_string()],
            },
            TrafficCountry {
                country_code: "US".to_string(),
                country_name: "United States".to_string(),
                flag_emoji: "🇺🇸".to_string(),
                active_connections: 1,
                outbound_bytes: 22_000_000_000,
                inbound_bytes: 9_000_000_000,
                percent_outbound: 29,
                primary_isps: vec!["Cloudflare".to_string()],
            },
            TrafficCountry {
                country_code: "DE".to_string(),
                country_name: "Germany".to_string(),
                flag_emoji: "🇩🇪".to_string(),
                active_connections: 1,
                outbound_bytes: 1_200_000,
                inbound_bytes: 4_200_000,
                percent_outbound: 3,
                primary_isps: vec!["Tor Exit Node".to_string()],
            },
        ],
        top_processes: vec![
            TrafficProcess {
                name: "nginx".to_string(),
                connections: 1,
                outbound_bytes: 48_000_000_000,
            },
            TrafficProcess {
                name: "kv-synology".to_string(),
                connections: 1,
                outbound_bytes: 22_000_000_000,
            },
        ],
    };
    (summary, conns)
}

pub fn demo_snmp_devices() -> Vec<SnmpDevice> {
    vec![
        SnmpDevice {
            id: "dev_local".to_string(),
            name: "Local Host (/proc Probe)".to_string(),
            host: "127.0.0.1".to_string(),
            port: 161,
            version: "v2c".to_string(),
            community: "public".to_string(),
            status: "up".to_string(),
            cpu_pct: Some(12.0),
            ram_pct: Some(44.0),
            uptime_text: "Ready".to_string(),
            ping_ms: Some(1),
        },
        SnmpDevice {
            id: "dev_nas".to_string(),
            name: "Synology DS920+ (Main NAS)".to_string(),
            host: "192.168.1.10".to_string(),
            port: 161,
            version: "v2c".to_string(),
            community: "public".to_string(),
            status: "unknown".to_string(),
            cpu_pct: None,
            ram_pct: None,
            uptime_text: "Not polled".to_string(),
            ping_ms: None,
        },
    ]
}

pub fn demo_acl_folders() -> Vec<AclFolderNode> {
    vec![
        AclFolderNode {
            path: "/docker".to_string(),
            name: "docker".to_string(),
            owner: "admin".to_string(),
            entries: vec![
                AclEntry {
                    principal: "administrators".to_string(),
                    is_group: true,
                    level: "RW".to_string(),
                    inherited: false,
                },
                AclEntry {
                    principal: "khoa".to_string(),
                    is_group: false,
                    level: "RW".to_string(),
                    inherited: true,
                },
                AclEntry {
                    principal: "guest".to_string(),
                    is_group: false,
                    level: "NA".to_string(),
                    inherited: false,
                },
            ],
        },
        AclFolderNode {
            path: "/Backups".to_string(),
            name: "Backups".to_string(),
            owner: "backup_svc".to_string(),
            entries: vec![
                AclEntry {
                    principal: "administrators".to_string(),
                    is_group: true,
                    level: "RW".to_string(),
                    inherited: false,
                },
                AclEntry {
                    principal: "backup_svc".to_string(),
                    is_group: false,
                    level: "RW".to_string(),
                    inherited: false,
                },
                AclEntry {
                    principal: "Everyone".to_string(),
                    is_group: true,
                    level: "RW".to_string(),
                    inherited: true,
                },
            ],
        },
        AclFolderNode {
            path: "/Media".to_string(),
            name: "Media".to_string(),
            owner: "admin".to_string(),
            entries: vec![
                AclEntry {
                    principal: "users".to_string(),
                    is_group: true,
                    level: "RO".to_string(),
                    inherited: true,
                },
                AclEntry {
                    principal: "media".to_string(),
                    is_group: false,
                    level: "RW".to_string(),
                    inherited: false,
                },
                AclEntry {
                    principal: "guest".to_string(),
                    is_group: false,
                    level: "RO".to_string(),
                    inherited: false,
                },
            ],
        },
    ]
}

pub fn demo_acl_audit() -> Vec<AclAuditIssue> {
    vec![
        AclAuditIssue {
            severity: "high".to_string(),
            folder: "/Backups".to_string(),
            principal: "Everyone".to_string(),
            message_vi: "Nhóm Everyone đang có quyền Đọc/Ghi (RW) trên thư mục sao lưu nhạy cảm!".to_string(),
            message_en: "Everyone group holds Read/Write (RW) access on sensitive /Backups share!".to_string(),
        },
        AclAuditIssue {
            severity: "medium".to_string(),
            folder: "/Media".to_string(),
            principal: "guest".to_string(),
            message_vi: "Tài khoản guest đang bật quyền chỉ đọc (RO) — nên tắt nếu không chia sẻ DLNA/khách.".to_string(),
            message_en: "Guest account has Read-Only (RO) access — consider disabling if unneeded.".to_string(),
        },
    ]
}

pub const MCP_TOOLS_CATALOG: &[McpToolDoc] = &[
    McpToolDoc {
        name: "dsm_login",
        category: "Auth",
        summary_vi: "Đăng nhập Synology DSM (IP/DDNS/QuickConnect + OTP)",
        summary_en: "Authenticate against Synology DSM (IP/DDNS/QuickConnect + OTP)",
    },
    McpToolDoc {
        name: "dsm_logout",
        category: "Auth",
        summary_vi: "Đăng xuất phiên DSM hiện tại",
        summary_en: "Close the active DSM session",
    },
    McpToolDoc {
        name: "dsm_status",
        category: "Auth",
        summary_vi: "Kiểm tra trạng thái kết nối & chế độ demo",
        summary_en: "Inspect connection & demo status",
    },
    McpToolDoc {
        name: "dsm_get_system_info",
        category: "System",
        summary_vi: "Model, serial, DSM version, uptime, nhiệt độ",
        summary_en: "Model, serial, DSM version, uptime, temperature",
    },
    McpToolDoc {
        name: "dsm_get_system_utilization",
        category: "System",
        summary_vi: "CPU %, RAM %, băng thông mạng & Disk I/O thời gian thực",
        summary_en: "Real-time CPU %, RAM %, network & disk throughput",
    },
    McpToolDoc {
        name: "dsm_list_processes",
        category: "System",
        summary_vi: "Danh sách tiến trình đang chạy trên NAS",
        summary_en: "List running NAS processes",
    },
    McpToolDoc {
        name: "dsm_power_action",
        category: "System",
        summary_vi: "Khởi động lại hoặc tắt nguồn NAS (cần confirm)",
        summary_en: "Reboot or shutdown NAS (requires confirm)",
    },
    McpToolDoc {
        name: "dsm_list_files",
        category: "Files",
        summary_vi: "Liệt kê tệp & thư mục trong File Station",
        summary_en: "List files and folders in File Station",
    },
    McpToolDoc {
        name: "dsm_create_folder",
        category: "Files",
        summary_vi: "Tạo thư mục mới",
        summary_en: "Create a new folder",
    },
    McpToolDoc {
        name: "dsm_delete_file",
        category: "Files",
        summary_vi: "Xóa tệp hoặc thư mục",
        summary_en: "Delete a file or directory",
    },
    McpToolDoc {
        name: "dsm_rename_file",
        category: "Files",
        summary_vi: "Đổi tên tệp hoặc thư mục",
        summary_en: "Rename a file or directory",
    },
    McpToolDoc {
        name: "dsm_get_file_content",
        category: "Files",
        summary_vi: "Đọc nội dung tệp văn bản/config",
        summary_en: "Read text/config file content",
    },
    McpToolDoc {
        name: "dsm_upload_file",
        category: "Files",
        summary_vi: "Tải tệp lên NAS từ máy trạm",
        summary_en: "Upload local file to NAS",
    },
    McpToolDoc {
        name: "dsm_search_files",
        category: "Files",
        summary_vi: "Tìm kiếm tệp trên thư mục chỉ định",
        summary_en: "Search files within a path",
    },
    McpToolDoc {
        name: "dsm_list_shares",
        category: "Shares",
        summary_vi: "Liệt kê các Shared Folders",
        summary_en: "List shared folders",
    },
    McpToolDoc {
        name: "dsm_share_create_link",
        category: "Shares",
        summary_vi: "Tạo liên kết chia sẻ File Station",
        summary_en: "Create File Station sharing link",
    },
    McpToolDoc {
        name: "dsm_share_list_links",
        category: "Shares",
        summary_vi: "Danh sách liên kết chia sẻ đang bật",
        summary_en: "List active sharing links",
    },
    McpToolDoc {
        name: "dsm_share_delete_link",
        category: "Shares",
        summary_vi: "Xóa liên kết chia sẻ",
        summary_en: "Delete a sharing link",
    },
    McpToolDoc {
        name: "dsm_docker_list_containers",
        category: "Docker",
        summary_vi: "Liệt kê Docker containers",
        summary_en: "List Docker containers",
    },
    McpToolDoc {
        name: "dsm_docker_container_action",
        category: "Docker",
        summary_vi: "Start / Stop / Restart container",
        summary_en: "Start / Stop / Restart container",
    },
    McpToolDoc {
        name: "dsm_download_list_tasks",
        category: "Download",
        summary_vi: "Liệt kê tác vụ Download Station",
        summary_en: "List Download Station tasks",
    },
    McpToolDoc {
        name: "dsm_download_create_task",
        category: "Download",
        summary_vi: "Thêm URL / Magnet tải xuống",
        summary_en: "Create Download Station task",
    },
    McpToolDoc {
        name: "dsm_download_task_action",
        category: "Download",
        summary_vi: "Pause / Resume / Delete tác vụ",
        summary_en: "Pause / Resume / Delete task",
    },
    McpToolDoc {
        name: "dsm_storage_list_volumes",
        category: "Storage",
        summary_vi: "Thông tin Volume & ổ đĩa vật lý",
        summary_en: "List storage volumes and physical disks",
    },
    McpToolDoc {
        name: "dsm_package_list",
        category: "Packages",
        summary_vi: "Danh sách gói DSM đã cài đặt",
        summary_en: "List installed DSM packages",
    },
    McpToolDoc {
        name: "dsm_package_action",
        category: "Packages",
        summary_vi: "Bật / tắt gói ứng dụng DSM",
        summary_en: "Start / stop a DSM package",
    },
    McpToolDoc {
        name: "dsm_list_services",
        category: "Services",
        summary_vi: "Liệt kê các dịch vụ DSM (SMB/SSH/FTP...)",
        summary_en: "List DSM services",
    },
    McpToolDoc {
        name: "dsm_get_service",
        category: "Services",
        summary_vi: "Xem chi tiết một dịch vụ",
        summary_en: "Get single service status",
    },
    McpToolDoc {
        name: "dsm_toggle_service",
        category: "Services",
        summary_vi: "Đảo trạng thái bật/tắt dịch vụ",
        summary_en: "Toggle service state",
    },
    McpToolDoc {
        name: "dsm_enable_service",
        category: "Services",
        summary_vi: "Bật dịch vụ hệ thống",
        summary_en: "Enable system service",
    },
    McpToolDoc {
        name: "dsm_disable_service",
        category: "Services",
        summary_vi: "Tắt dịch vụ hệ thống",
        summary_en: "Disable system service",
    },
    McpToolDoc {
        name: "dsm_get_terminal_info",
        category: "Terminal/SSH",
        summary_vi: "Xem trạng thái SSH/Telnet & cổng",
        summary_en: "Inspect SSH/Telnet service config",
    },
    McpToolDoc {
        name: "dsm_set_terminal",
        category: "Terminal/SSH",
        summary_vi: "Cấu hình SSH/Telnet qua DSM API",
        summary_en: "Configure SSH/Telnet via DSM API",
    },
    McpToolDoc {
        name: "dsm_get_file_service_status",
        category: "Services",
        summary_vi: "Xem trạng thái SMB/AFP/NFS/FTP/rsync",
        summary_en: "Inspect SMB/AFP/NFS/FTP/rsync status",
    },
    McpToolDoc {
        name: "dsm_ssh_exec",
        category: "Terminal/SSH",
        summary_vi: "Thực thi lệnh shell qua pure-Rust russh",
        summary_en: "Execute remote shell commands via russh",
    },
    McpToolDoc {
        name: "dsm_list_notifications",
        category: "Notifications",
        summary_vi: "Lấy thông báo hệ thống DSM",
        summary_en: "Fetch DSM notifications",
    },
    McpToolDoc {
        name: "dsm_get_app_notifications",
        category: "Notifications",
        summary_vi: "Lấy thông báo từ gói ứng dụng",
        summary_en: "Fetch app notifications",
    },
    McpToolDoc {
        name: "dsm_clear_notifications",
        category: "Notifications",
        summary_vi: "Xóa danh sách thông báo",
        summary_en: "Clear notifications",
    },
    McpToolDoc {
        name: "dsm_mark_notifications_read",
        category: "Notifications",
        summary_vi: "Đánh dấu đã đọc tất cả thông báo",
        summary_en: "Mark notifications as read",
    },
    McpToolDoc {
        name: "dsm_get_notification_strings",
        category: "Notifications",
        summary_vi: "Giải mã chuỗi thông báo DSM",
        summary_en: "Resolve localized notification templates",
    },
    McpToolDoc {
        name: "dsm_get_api_info",
        category: "Utilities",
        summary_vi: "Truy vấn SYNO.API.Info",
        summary_en: "Query SYNO.API.Info registry",
    },
    McpToolDoc {
        name: "dsm_raw_entry_call",
        category: "Utilities",
        summary_vi: "Gọi trực tiếp bất kỳ DSM entry.cgi API nào",
        summary_en: "Invoke any raw DSM entry.cgi endpoint",
    },
    McpToolDoc {
        name: "dsm_get_logs",
        category: "Utilities",
        summary_vi: "Đọc nhật ký hệ thống Synology",
        summary_en: "Read Synology system logs",
    },
];
