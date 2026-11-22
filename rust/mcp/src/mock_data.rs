//! Offline demo fixtures ported from `mcp/src/dsm/mockData.ts`.

#![forbid(unsafe_code)]

use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use chrono::Utc;
use serde_json::json;

use crate::types::{
    AppNotifyItem, DockerContainer, DownloadTask, DriveInfo, DsmProcess, FileItem,
    NotificationItem, PackageItem, ServiceItem, StorageVolume, SystemInfo, SystemUtilization,
};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as u64)
}

fn now_secs() -> u64 {
    now_ms() / 1000
}

pub fn mock_system_info() -> SystemInfo {
    SystemInfo {
        model: "DS920+".to_string(),
        serial: "2170QNR641001".to_string(),
        version: "DSM 7.2.1-69057 Update 5".to_string(),
        uptime: 846_200,
        temperature: 42,
        time: Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        ram_total: 8192,
        ram_used: 3276,
        cpu_model: "Intel Celeron J4125 (4 Cores, 2.0 GHz)".to_string(),
        cpu_cores: 4,
    }
}

pub fn get_mock_utilization() -> SystemUtilization {
    let t = now_ms();
    let jitter = t % 20;
    SystemUtilization {
        cpu_percent: 15 + jitter,
        memory_percent: 40 + (jitter % 5),
        memory_used_mb: 3276,
        memory_total_mb: 8192,
        network_rx_bytes: 1_572_864 + (jitter * 131_072),
        network_tx_bytes: 524_288 + (jitter * 32_768),
        disk_read_bytes: 1_048_576 + (jitter * 65_536),
        disk_write_bytes: 2_097_152 + (jitter * 98_304),
        timestamp: t,
    }
}

pub fn mock_processes() -> Vec<DsmProcess> {
    vec![
        DsmProcess {
            pid: 1420,
            name: "synoscgi".into(),
            cpu: 4.2,
            memory: 124_500,
            user: "root".into(),
            status: "running".into(),
        },
        DsmProcess {
            pid: 1892,
            name: "dockerd".into(),
            cpu: 3.8,
            memory: 312_000,
            user: "root".into(),
            status: "running".into(),
        },
        DsmProcess {
            pid: 2104,
            name: "smbd".into(),
            cpu: 1.5,
            memory: 86_400,
            user: "admin".into(),
            status: "sleeping".into(),
        },
        DsmProcess {
            pid: 3201,
            name: "nginx".into(),
            cpu: 0.9,
            memory: 54_200,
            user: "http".into(),
            status: "sleeping".into(),
        },
        DsmProcess {
            pid: 4512,
            name: "syno-download-manager".into(),
            cpu: 5.4,
            memory: 198_000,
            user: "admin".into(),
            status: "running".into(),
        },
        DsmProcess {
            pid: 5120,
            name: "synomediaparser".into(),
            cpu: 8.1,
            memory: 420_000,
            user: "root".into(),
            status: "running".into(),
        },
        DsmProcess {
            pid: 6112,
            name: "postgres".into(),
            cpu: 1.2,
            memory: 245_000,
            user: "postgres".into(),
            status: "sleeping".into(),
        },
        DsmProcess {
            pid: 7421,
            name: "synostoragemgmt".into(),
            cpu: 0.5,
            memory: 67_800,
            user: "root".into(),
            status: "sleeping".into(),
        },
    ]
}

fn mock_file(
    path: &str,
    name: &str,
    isdir: bool,
    size: u64,
    mtime: u64,
    owner: &str,
    perm: &str,
) -> FileItem {
    FileItem {
        path: path.to_string(),
        name: name.to_string(),
        isdir,
        size,
        mtime,
        owner: Some(owner.to_string()),
        filetype: None,
        perm: Some(perm.to_string()),
        real_path: None,
        item_count: None,
        mime_type: None,
        content: None,
    }
}

pub fn mock_files_map() -> HashMap<String, Vec<FileItem>> {
    let mut m = HashMap::new();
    let mut root_shares = Vec::new();
    for (p, n, mtime, owner, perm, rp, cnt) in [
        (
            "/docker",
            "docker",
            1_708_500_000,
            "admin",
            "0755 (rwxr-xr-x)",
            "/volume1/docker",
            4,
        ),
        (
            "/downloads",
            "downloads",
            1_708_700_000,
            "admin",
            "0777 (rwxrwxrwx)",
            "/volume1/downloads",
            5,
        ),
        (
            "/video",
            "video",
            1_708_600_000,
            "admin",
            "0755 (rwxr-xr-x)",
            "/volume1/video",
            3,
        ),
        (
            "/music",
            "music",
            1_708_300_000,
            "admin",
            "0755 (rwxr-xr-x)",
            "/volume1/music",
            2,
        ),
        (
            "/photo",
            "photo",
            1_708_200_000,
            "admin",
            "0755 (rwxr-xr-x)",
            "/volume1/photo",
            3,
        ),
        (
            "/homes",
            "homes",
            1_708_420_000,
            "root",
            "0700 (rwx------)",
            "/volume1/homes",
            2,
        ),
        (
            "/backup",
            "backup",
            1_708_100_000,
            "root",
            "0750 (rwxr-x---)",
            "/volume2/backup",
            1,
        ),
    ] {
        let mut f = mock_file(p, n, true, 0, mtime, owner, perm);
        f.real_path = Some(rp.to_string());
        f.item_count = Some(cnt);
        root_shares.push(f);
    }
    m.insert("/".to_string(), root_shares);

    let mut compose = mock_file(
        "/docker/docker-compose.yml",
        "docker-compose.yml",
        false,
        2450,
        1_708_503_000,
        "admin",
        "0644 (rw-r--r--)",
    );
    compose.filetype = Some("code".into());
    compose.mime_type = Some("text/yaml".into());
    compose.content = Some(
        "version: '3.8'\n\nservices:\n  vaultwarden:\n    image: vaultwarden/server:latest\n"
            .into(),
    );

    let mut env_f = mock_file(
        "/docker/vaultwarden.env",
        "vaultwarden.env",
        false,
        680,
        1_708_504_000,
        "admin",
        "0600 (rw-------)",
    );
    env_f.filetype = Some("code".into());
    env_f.mime_type = Some("text/plain".into());
    env_f.content = Some("DATA_FOLDER=/data\nWEBSOCKET_ENABLED=true\n".into());

    m.insert("/docker".to_string(), vec![compose, env_f]);

    let mut iso = mock_file(
        "/downloads/Ubuntu_24.04_LTS.iso",
        "Ubuntu_24.04_LTS.iso",
        false,
        4_800_000_000,
        1_708_701_000,
        "admin",
        "0644 (rw-r--r--)",
    );
    iso.filetype = Some("iso".into());
    iso.mime_type = Some("application/x-iso9660-image".into());
    let mut csv = mock_file(
        "/downloads/System_Report_2026.csv",
        "System_Report_2026.csv",
        false,
        45_200,
        1_708_703_000,
        "admin",
        "0644 (rw-r--r--)",
    );
    csv.filetype = Some("csv".into());
    csv.mime_type = Some("text/csv".into());
    m.insert("/downloads".to_string(), vec![iso, csv]);

    m.insert(
        "/video".to_string(),
        vec![mock_file(
            "/video/Sample_4K_HDR.mp4",
            "Sample_4K_HDR.mp4",
            false,
            852_000_000,
            1_708_602_000,
            "admin",
            "0644 (rw-r--r--)",
        )],
    );
    m.insert(
        "/music".to_string(),
        vec![mock_file(
            "/music/Acoustic_Guitar_Master.flac",
            "Acoustic_Guitar_Master.flac",
            false,
            45_000_000,
            1_708_301_000,
            "admin",
            "0644 (rw-r--r--)",
        )],
    );
    m.insert(
        "/photo".to_string(),
        vec![mock_file(
            "/photo/IMG_20260220_102430.jpg",
            "IMG_20260220_102430.jpg",
            false,
            4_520_000,
            1_708_202_000,
            "admin",
            "0644 (rw-r--r--)",
        )],
    );
    m
}

pub fn mock_docker_containers() -> Vec<DockerContainer> {
    vec![
        DockerContainer {
            id: "c1".into(),
            name: "vaultwarden".into(),
            image: "vaultwarden/server:latest".into(),
            status: "running".into(),
            created: "2026-01-15 08:30".into(),
            ports: vec!["8080:80".into(), "3012:3012".into()],
            cpu_usage: 0.8,
            memory_usage: "64.2 MB".into(),
        },
        DockerContainer {
            id: "c2".into(),
            name: "plex-media-server".into(),
            image: "linuxserver/plex:latest".into(),
            status: "running".into(),
            created: "2026-01-10 14:20".into(),
            ports: vec!["32400:32400".into()],
            cpu_usage: 3.4,
            memory_usage: "482.6 MB".into(),
        },
        DockerContainer {
            id: "c3".into(),
            name: "homeassistant".into(),
            image: "ghcr.io/home-assistant/home-assistant:stable".into(),
            status: "running".into(),
            created: "2026-02-01 11:00".into(),
            ports: vec!["8123:8123".into()],
            cpu_usage: 1.2,
            memory_usage: "215.8 MB".into(),
        },
        DockerContainer {
            id: "c4".into(),
            name: "qbittorrent-vpn".into(),
            image: "markusmcnubs/qbittorrentvpn:latest".into(),
            status: "running".into(),
            created: "2026-01-20 18:45".into(),
            ports: vec!["8085:8080".into()],
            cpu_usage: 2.1,
            memory_usage: "185.0 MB".into(),
        },
        DockerContainer {
            id: "c5".into(),
            name: "adguard-home".into(),
            image: "adguard/adguardhome:latest".into(),
            status: "running".into(),
            created: "2026-01-05 09:15".into(),
            ports: vec!["3000:3000".into()],
            cpu_usage: 0.4,
            memory_usage: "48.1 MB".into(),
        },
        DockerContainer {
            id: "c6".into(),
            name: "nginx-proxy-manager".into(),
            image: "jc21/nginx-proxy-manager:latest".into(),
            status: "stopped".into(),
            created: "2026-02-12 16:30".into(),
            ports: vec!["80:80".into(), "443:443".into()],
            cpu_usage: 0.0,
            memory_usage: "0 MB".into(),
        },
    ]
}

pub fn mock_download_tasks() -> Vec<DownloadTask> {
    vec![
        DownloadTask {
            id: "dl_1".into(),
            title: "Debian-12.5.0-amd64-netinst.iso".into(),
            size: 654_311_424,
            status: "downloading".into(),
            progress: 74,
            download_speed: 12_500_000,
            upload_speed: 450_000,
            task_type: "HTTP/HTTPS".into(),
        },
        DownloadTask {
            id: "dl_2".into(),
            title: "Blender_4.1_Open_Movie_Project_4K.torrent".into(),
            size: 4_294_967_296,
            status: "downloading".into(),
            progress: 48,
            download_speed: 8_900_000,
            upload_speed: 1_200_000,
            task_type: "BitTorrent".into(),
        },
        DownloadTask {
            id: "dl_3".into(),
            title: "NodeJS_v22_LTS_Source.tar.gz".into(),
            size: 89_456_123,
            status: "finished".into(),
            progress: 100,
            download_speed: 0,
            upload_speed: 0,
            task_type: "HTTP".into(),
        },
        DownloadTask {
            id: "dl_4".into(),
            title: "ArchLinux_Latest_Bootstrap.tar.zst".into(),
            size: 245_000_000,
            status: "paused".into(),
            progress: 32,
            download_speed: 0,
            upload_speed: 0,
            task_type: "FTP".into(),
        },
    ]
}

pub fn mock_storage_volumes() -> Vec<StorageVolume> {
    vec![
        StorageVolume {
            id: "volume_1".into(),
            name: "Volume 1 (SHR - Btrfs)".into(),
            path: "/volume1".into(),
            fs_type: "Btrfs".into(),
            total_bytes: 15_400_000_000_000,
            used_bytes: 8_900_000_000_000,
            free_bytes: 6_500_000_000_000,
            status: "normal".into(),
            drives: vec![
                DriveInfo {
                    slot: 1,
                    model: "Seagate IronWolf 8TB (ST8000VN004)".into(),
                    serial: "WSD2091A".into(),
                    status: "normal".into(),
                    temp: 36,
                    size: 8_000_000_000_000,
                    health: "Sức khỏe tốt (0 Bad Sectors)".into(),
                },
                DriveInfo {
                    slot: 2,
                    model: "Seagate IronWolf 8TB (ST8000VN004)".into(),
                    serial: "WSD2091B".into(),
                    status: "normal".into(),
                    temp: 37,
                    size: 8_000_000_000_000,
                    health: "Sức khỏe tốt (0 Bad Sectors)".into(),
                },
                DriveInfo {
                    slot: 3,
                    model: "WD Red Plus 8TB (WD80EFPX)".into(),
                    serial: "WD-WX8201".into(),
                    status: "normal".into(),
                    temp: 35,
                    size: 8_000_000_000_000,
                    health: "Sức khỏe tốt (0 Bad Sectors)".into(),
                },
                DriveInfo {
                    slot: 4,
                    model: "WD Red Plus 8TB (WD80EFPX)".into(),
                    serial: "WD-WX8202".into(),
                    status: "normal".into(),
                    temp: 35,
                    size: 8_000_000_000_000,
                    health: "Sức khỏe tốt (0 Bad Sectors)".into(),
                },
            ],
        },
        StorageVolume {
            id: "volume_2".into(),
            name: "Volume 2 (NVMe Storage Pool)".into(),
            path: "/volume2".into(),
            fs_type: "Btrfs".into(),
            total_bytes: 960_000_000_000,
            used_bytes: 310_000_000_000,
            free_bytes: 650_000_000_000,
            status: "normal".into(),
            drives: vec![DriveInfo {
                slot: 5,
                model: "Samsung 970 EVO Plus 1TB NVMe".into(),
                serial: "S4EVNF0M".into(),
                status: "normal".into(),
                temp: 42,
                size: 1_000_000_000_000,
                health: "100% Tuổi thọ".into(),
            }],
        },
    ]
}

pub fn mock_packages() -> Vec<PackageItem> {
    vec![
        PackageItem { id: "kvsynology".into(), name: "KV Synology".into(), version: "1.0.0-10".into(), status: "running".into(), description: "KV Synology — modern Synology DSM web manager (Pure Rust + Leptos + QuickConnect relay).".into(), maintainer: "Khoa Vo".into(), category: Some("Utilities".into()), is_community: Some(true) },
        PackageItem { id: "ContainerManager".into(), name: "Container Manager (Docker)".into(), version: "24.0.2-1543".into(), status: "running".into(), description: "Quản lý và chạy các ứng dụng container trên Synology DSM.".into(), maintainer: "Synology Inc.".into(), category: Some("Utilities".into()), is_community: None },
        PackageItem { id: "FileStation".into(), name: "File Station".into(), version: "1.4.2-1575".into(), status: "running".into(), description: "Quản lý và duyệt tập tin tập trung toàn diện trên Synology NAS.".into(), maintainer: "Synology Inc.".into(), category: Some("Management".into()), is_community: None },
        PackageItem { id: "StorageManager".into(), name: "Storage Manager".into(), version: "1.0.0-00502".into(), status: "running".into(), description: "Quản lý nhóm lưu trữ, phân vùng Btrfs, SSD Cache và kiểm tra S.M.A.R.T.".into(), maintainer: "Synology Inc.".into(), category: Some("Management".into()), is_community: None },
        PackageItem { id: "DownloadStation".into(), name: "Download Station".into(), version: "4.1.2-5012".into(), status: "running".into(), description: "Công cụ tải về tệp tin tự động qua BitTorrent, FTP, HTTP, HTTPS.".into(), maintainer: "Synology Inc.".into(), category: Some("Download".into()), is_community: None },
        PackageItem { id: "Tailscale".into(), name: "Tailscale Mesh VPN".into(), version: "1.58.2-700058002".into(), status: "running".into(), description: "Mạng riêng ảo mesh VPN WireGuard an toàn cao cấp.".into(), maintainer: "Tailscale Inc.".into(), category: Some("Security".into()), is_community: None },
    ]
}

pub fn mock_services() -> Vec<ServiceItem> {
    vec![
        ServiceItem {
            id: "smb".into(),
            name: "smb".into(),
            display_name: "SMB / CIFS (Windows File Service)".into(),
            description: "Chia sẻ tệp cho Windows, macOS qua giao thức SMB. Cổng mặc định 445."
                .into(),
            category: "file".into(),
            enabled: true,
            running: Some(true),
            status: "running".into(),
            port: Some(445),
            api: Some("SYNO.Core.FileServ.SMB".into()),
            details: Some(json!({ "workgroup": "WORKGROUP", "smb3_enabled": true })),
            can_toggle: true,
        },
        ServiceItem {
            id: "afp".into(),
            name: "afp".into(),
            display_name: "AFP (Apple Filing Protocol)".into(),
            description: "Dịch vụ tệp cho macOS cũ qua AFP.".into(),
            category: "file".into(),
            enabled: false,
            running: Some(false),
            status: "stopped".into(),
            port: Some(548),
            api: Some("SYNO.Core.FileServ.AFP".into()),
            details: Some(json!({})),
            can_toggle: true,
        },
        ServiceItem {
            id: "nfs".into(),
            name: "nfs".into(),
            display_name: "NFS".into(),
            description: "Chia sẻ tệp cho Linux/Unix qua NFS v3/v4.".into(),
            category: "file".into(),
            enabled: true,
            running: Some(true),
            status: "running".into(),
            port: Some(2049),
            api: Some("SYNO.Core.FileServ.NFS".into()),
            details: Some(json!({ "enable_nfs_v4": true, "nfs_v4_domain": "local" })),
            can_toggle: true,
        },
        ServiceItem {
            id: "ftp".into(),
            name: "ftp".into(),
            display_name: "FTP".into(),
            description: "Giao thức truyền tệp FTP/FTPS.".into(),
            category: "file".into(),
            enabled: false,
            running: Some(false),
            status: "stopped".into(),
            port: Some(21),
            api: Some("SYNO.Core.FileServ.FTP".into()),
            details: Some(json!({ "enable_ftps": false, "portnum": 21 })),
            can_toggle: true,
        },
        ServiceItem {
            id: "sftp".into(),
            name: "sftp".into(),
            display_name: "SFTP (FTP over SSH)".into(),
            description: "Truyền tệp an toàn qua SSH.".into(),
            category: "file".into(),
            enabled: true,
            running: Some(true),
            status: "running".into(),
            port: Some(22),
            api: Some("SYNO.Core.FileServ.FTP.SFTP".into()),
            details: Some(json!({ "portnum": 22 })),
            can_toggle: true,
        },
        ServiceItem {
            id: "ssh".into(),
            name: "ssh".into(),
            display_name: "SSH (Terminal)".into(),
            description: "Truy cập dòng lệnh an toàn qua SSH. Cổng mặc định 22.".into(),
            category: "system".into(),
            enabled: true,
            running: Some(true),
            status: "running".into(),
            port: Some(22),
            api: Some("SYNO.Core.Terminal".into()),
            details: Some(json!({ "enable_telnet": false })),
            can_toggle: true,
        },
        ServiceItem {
            id: "telnet".into(),
            name: "telnet".into(),
            display_name: "Telnet".into(),
            description: "Giao thức Telnet (không mã hóa, không khuyến nghị).".into(),
            category: "system".into(),
            enabled: false,
            running: Some(false),
            status: "stopped".into(),
            port: Some(23),
            api: Some("SYNO.Core.Terminal".into()),
            details: Some(json!({})),
            can_toggle: true,
        },
        ServiceItem {
            id: "rsync".into(),
            name: "rsync".into(),
            display_name: "rsync / Network Backup".into(),
            description: "Dịch vụ đồng bộ và sao lưu qua rsync.".into(),
            category: "network".into(),
            enabled: false,
            running: Some(false),
            status: "stopped".into(),
            port: Some(873),
            api: Some("SYNO.Backup.Service.NetworkBackup".into()),
            details: Some(json!({})),
            can_toggle: true,
        },
        ServiceItem {
            id: "webdav".into(),
            name: "webdav".into(),
            display_name: "WebDAV".into(),
            description: "Truy cập tệp qua HTTP/WebDAV.".into(),
            category: "network".into(),
            enabled: false,
            running: Some(false),
            status: "stopped".into(),
            port: Some(5005),
            api: Some("SYNO.Core.FileServ.ServiceDiscovery".into()),
            details: Some(json!({})),
            can_toggle: true,
        },
    ]
}

pub fn mock_notifications() -> Vec<NotificationItem> {
    let t = now_secs();
    vec![
        NotificationItem {
            id: "n1".into(),
            title: "SYNO.SDS.StorageManager.Instance:storage_volume_degraded".into(),
            display_title: "Lưu trữ: Volume xuống cấp".into(),
            class_name: "SYNO.SDS.StorageManager.Instance".into(),
            category: "storage".into(),
            level: "warning".into(),
            messages: vec!["Volume 1 (SHR) bị xuống cấp trên DS920+. Ổ đĩa 3 (SATA3) báo lỗi I/O. Vui lòng kiểm tra S.M.A.R.T.".into()],
            raw_messages: vec![r#"{"%VOLUME%":"Volume 1","%DISK%":"Disk 3"}"#.into()],
            time: t.saturating_sub(3600),
            read: false,
        },
        NotificationItem {
            id: "n2".into(),
            title: "SYNO.SDS.PackageCenter.Instance:package_update_available".into(),
            display_title: "Gói: Có bản cập nhật".into(),
            class_name: "SYNO.SDS.PackageCenter.Instance".into(),
            category: "package".into(),
            level: "info".into(),
            messages: vec!["Container Manager 20.10.23-1437 → 20.10.23-1481 có sẵn.".into()],
            raw_messages: vec![r#"{"%PKG%":"Container Manager"}"#.into()],
            time: t.saturating_sub(7200),
            read: false,
        },
        NotificationItem {
            id: "n3".into(),
            title: "SYNO.SDS.AdminCenter.Instance:system_reboot".into(),
            display_title: "Hệ thống: Khởi động lại hoàn tất".into(),
            class_name: "".into(),
            category: "system".into(),
            level: "success".into(),
            messages: vec!["DSM đã khởi động lại thành công. Nhiệt độ 42°C.".into()],
            raw_messages: vec![r#"{"%TIME%":"2026-02-22 10:20"}"#.into()],
            time: t.saturating_sub(9500),
            read: true,
        },
    ]
}

pub fn mock_app_notifications() -> Vec<AppNotifyItem> {
    let t = now_secs();
    vec![
        AppNotifyItem {
            id: "a1".into(),
            title: "Hyper Backup".into(),
            content: "Tác vụ sao lưu 'Daily Backup' hoàn tất lúc 02:00.".into(),
            level: "success".into(),
            time: t.saturating_sub(28_800),
            unread: true,
            pkg_id: Some("HyperBackup".into()),
        },
        AppNotifyItem {
            id: "a2".into(),
            title: "Synology Photos".into(),
            content: "Đã phát hiện 24 ảnh mới cần sao lưu từ thiết bị di động.".into(),
            level: "info".into(),
            time: t.saturating_sub(43_200),
            unread: false,
            pkg_id: Some("SynoPhotos".into()),
        },
    ]
}
