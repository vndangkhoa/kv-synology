export const mockSystemInfo = {
    model: "DS920+",
    serial: "2170QNR641001",
    version: "DSM 7.2.1-69057 Update 5",
    uptime: 846200,
    temperature: 42,
    time: new Date().toISOString(),
    ramTotal: 8192,
    ramUsed: 3276,
    cpuModel: "Intel Celeron J4125 (4 Cores, 2.0 GHz)",
    cpuCores: 4,
};
export const getMockUtilization = () => ({
    cpuPercent: Math.floor(15 + Math.random() * 25),
    memoryPercent: 40 + Math.floor(Math.random() * 5),
    memoryUsedMB: 3276,
    memoryTotalMB: 8192,
    networkRxBytes: Math.floor(1024 * 1024 * (1.5 + Math.random() * 3.5)),
    networkTxBytes: Math.floor(1024 * 512 * (0.5 + Math.random() * 2)),
    diskReadBytes: Math.floor(1024 * 1024 * (0.5 + Math.random() * 4)),
    diskWriteBytes: Math.floor(1024 * 1024 * (1.0 + Math.random() * 6)),
    timestamp: Date.now(),
});
export const mockProcesses = [
    { pid: 1420, name: "synoscgi", cpu: 4.2, memory: 124500, user: "root", status: "running" },
    { pid: 1892, name: "dockerd", cpu: 3.8, memory: 312000, user: "root", status: "running" },
    { pid: 2104, name: "smbd", cpu: 1.5, memory: 86400, user: "admin", status: "sleeping" },
    { pid: 3201, name: "nginx", cpu: 0.9, memory: 54200, user: "http", status: "sleeping" },
    { pid: 4512, name: "syno-download-manager", cpu: 5.4, memory: 198000, user: "admin", status: "running" },
    { pid: 5120, name: "synomediaparser", cpu: 8.1, memory: 420000, user: "root", status: "running" },
    { pid: 6112, name: "postgres", cpu: 1.2, memory: 245000, user: "postgres", status: "sleeping" },
    { pid: 7421, name: "synostoragemgmt", cpu: 0.5, memory: 67800, user: "root", status: "sleeping" },
];
export const mockFiles = {
    "/": [
        { path: "/docker", name: "docker", isdir: true, size: 0, mtime: 1708500000, owner: "admin", perm: "0755 (rwxr-xr-x)", realPath: "/volume1/docker", itemCount: 4 },
        { path: "/downloads", name: "downloads", isdir: true, size: 0, mtime: 1708700000, owner: "admin", perm: "0777 (rwxrwxrwx)", realPath: "/volume1/downloads", itemCount: 5 },
        { path: "/video", name: "video", isdir: true, size: 0, mtime: 1708600000, owner: "admin", perm: "0755 (rwxr-xr-x)", realPath: "/volume1/video", itemCount: 3 },
        { path: "/music", name: "music", isdir: true, size: 0, mtime: 1708300000, owner: "admin", perm: "0755 (rwxr-xr-x)", realPath: "/volume1/music", itemCount: 2 },
        { path: "/photo", name: "photo", isdir: true, size: 0, mtime: 1708200000, owner: "admin", perm: "0755 (rwxr-xr-x)", realPath: "/volume1/photo", itemCount: 3 },
        { path: "/homes", name: "homes", isdir: true, size: 0, mtime: 1708420000, owner: "root", perm: "0700 (rwx------)", realPath: "/volume1/homes", itemCount: 2 },
        { path: "/backup", name: "backup", isdir: true, size: 0, mtime: 1708100000, owner: "root", perm: "0750 (rwxr-x---)", realPath: "/volume2/backup", itemCount: 1 },
    ],
    "/docker": [
        {
            path: "/docker/docker-compose.yml",
            name: "docker-compose.yml",
            isdir: false,
            size: 2450,
            mtime: 1708503000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "code",
            mimeType: "text/yaml",
            content: `version: '3.8'

services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: unless-stopped
    environment:
      - WEBSOCKET_ENABLED=true
      - SIGNUPS_ALLOWED=true
    volumes:
      - ./data:/data
    ports:
      - 8080:80
      - 3012:3012

  qbittorrent:
    image: linuxserver/qbittorrent:latest
    container_name: qbittorrent
    environment:
      - PUID=1026
      - PGID=100
      - TZ=Asia/Ho_Chi_Minh
      - WEBUI_PORT=8085
    volumes:
      - ./config:/config
      - /volume1/downloads:/downloads
    ports:
      - 8085:8085
      - 6881:6881
    restart: unless-stopped`
        },
        {
            path: "/docker/vaultwarden.env",
            name: "vaultwarden.env",
            isdir: false,
            size: 680,
            mtime: 1708504000,
            owner: "admin",
            perm: "0600 (rw-------)",
            filetype: "code",
            mimeType: "text/plain",
            content: `# Vaultwarden Environment Configuration
DATA_FOLDER=/data
DATABASE_URL=data/db.sqlite3
DOMAIN=https://vault.synology.local
ROCKET_PORT=80
WEBSOCKET_ENABLED=true
SIGNUPS_ALLOWED=false
INVITATIONS_ALLOWED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USERNAME=admin@gmail.com
SMTP_AUTH_MECHANISM=Plain`
        },
        {
            path: "/docker/server_config.json",
            name: "server_config.json",
            isdir: false,
            size: 1420,
            mtime: 1708505000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "code",
            mimeType: "application/json",
            content: `{
  "server": {
    "host": "0.0.0.0",
    "port": 8088,
    "ssl": {
      "enabled": true,
      "cert": "/etc/ssl/certs/synology.crt",
      "key": "/etc/ssl/private/synology.key"
    },
    "logging": {
      "level": "info",
      "format": "json"
    }
  },
  "modules": [
    "dashboard",
    "filestation",
    "docker",
    "downloadstation",
    "storagemanager"
  ]
}`
        },
        {
            path: "/docker/nginx.conf",
            name: "nginx.conf",
            isdir: false,
            size: 980,
            mtime: 1708502000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "code",
            mimeType: "text/plain",
            content: `events {
  worker_connections 1024;
}

http {
  server {
    listen 80;
    server_name nas.myhome.com;

    location / {
      proxy_pass http://127.0.0.1:5000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}`
        },
    ],
    "/downloads": [
        {
            path: "/downloads/Ubuntu_24.04_LTS.iso",
            name: "Ubuntu_24.04_LTS.iso",
            isdir: false,
            size: 4800000000,
            mtime: 1708701000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "iso",
            mimeType: "application/x-iso9660-image"
        },
        {
            path: "/downloads/Documentation.pdf",
            name: "Documentation.pdf",
            isdir: false,
            size: 3200000,
            mtime: 1708702000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "pdf",
            mimeType: "application/pdf"
        },
        {
            path: "/downloads/System_Report_2026.csv",
            name: "System_Report_2026.csv",
            isdir: false,
            size: 45200,
            mtime: 1708703000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "csv",
            mimeType: "text/csv",
            content: `ThoiGian,CPU_Load,RAM_Used_MB,Net_Rx_KB,Net_Tx_KB,Disk_Read_KB,Disk_Write_KB
2026-02-21 08:00,12.5%,3120,4500,320,1200,850
2026-02-21 08:15,14.8%,3240,5100,410,1800,920
2026-02-21 08:30,22.1%,3560,12500,1200,4500,2400
2026-02-21 08:45,18.3%,3390,8200,890,3100,1500
2026-02-21 09:00,15.2%,3280,6400,620,2100,1100`
        },
        {
            path: "/downloads/backup_scripts.tar.gz",
            name: "backup_scripts.tar.gz",
            isdir: false,
            size: 1540000,
            mtime: 1708704000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "archive",
            mimeType: "application/gzip"
        },
        {
            path: "/downloads/synology_system.log",
            name: "synology_system.log",
            isdir: false,
            size: 89000,
            mtime: 1708705000,
            owner: "root",
            perm: "0644 (rw-r--r--)",
            filetype: "code",
            mimeType: "text/plain",
            content: `[2026-02-21 10:20:12] [INFO] [System] DSM Version 7.2.1-69057 started successfully.
[2026-02-21 10:20:15] [INFO] [Storage] Volume 1 (Btrfs SHR) mounted at /volume1. Status: Normal.
[2026-02-21 10:20:18] [INFO] [Network] Interface eth0 acquired IP 192.168.1.100/24 via DHCP.
[2026-02-21 10:20:25] [INFO] [Docker] Container Manager daemon initialized. 5 active containers.
[2026-02-21 10:20:30] [INFO] [Auth] User 'admin' logged in from 192.168.1.50 via WebAPI.`
        }
    ],
    "/video": [
        {
            path: "/video/Sample_4K_HDR.mp4",
            name: "Sample_4K_HDR.mp4",
            isdir: false,
            size: 852000000,
            mtime: 1708602000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "video",
            mimeType: "video/mp4"
        },
        {
            path: "/video/Nature_Documentary.mkv",
            name: "Nature_Documentary.mkv",
            isdir: false,
            size: 1450000000,
            mtime: 1708603000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "video",
            mimeType: "video/x-matroska"
        },
        {
            path: "/video/Timelapse_Sunset.webm",
            name: "Timelapse_Sunset.webm",
            isdir: false,
            size: 320000000,
            mtime: 1708604000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "video",
            mimeType: "video/webm"
        }
    ],
    "/music": [
        {
            path: "/music/Acoustic_Guitar_Master.flac",
            name: "Acoustic_Guitar_Master.flac",
            isdir: false,
            size: 45000000,
            mtime: 1708301000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "audio",
            mimeType: "audio/flac"
        },
        {
            path: "/music/LoFi_Chill_Beats.mp3",
            name: "LoFi_Chill_Beats.mp3",
            isdir: false,
            size: 9800000,
            mtime: 1708302000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "audio",
            mimeType: "audio/mpeg"
        }
    ],
    "/photo": [
        {
            path: "/photo/IMG_20260220_102430.jpg",
            name: "IMG_20260220_102430.jpg",
            isdir: false,
            size: 4520000,
            mtime: 1708202000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "image",
            mimeType: "image/jpeg"
        },
        {
            path: "/photo/Wallpaper_Mountains_4K.png",
            name: "Wallpaper_Mountains_4K.png",
            isdir: false,
            size: 8900000,
            mtime: 1708203000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "image",
            mimeType: "image/png"
        },
        {
            path: "/photo/Architecture_Vector.svg",
            name: "Architecture_Vector.svg",
            isdir: false,
            size: 145000,
            mtime: 1708204000,
            owner: "admin",
            perm: "0644 (rw-r--r--)",
            filetype: "image",
            mimeType: "image/svg+xml"
        }
    ]
};
export const mockDockerContainers = [
    {
        id: "c1",
        name: "vaultwarden",
        image: "vaultwarden/server:latest",
        status: "running",
        created: "2026-01-15 08:30",
        ports: ["8080:80", "3012:3012"],
        cpuUsage: 0.8,
        memoryUsage: "64.2 MB",
    },
    {
        id: "c2",
        name: "plex-media-server",
        image: "linuxserver/plex:latest",
        status: "running",
        created: "2026-01-10 14:20",
        ports: ["32400:32400", "1900:1900/udp"],
        cpuUsage: 3.4,
        memoryUsage: "482.6 MB",
    },
    {
        id: "c3",
        name: "homeassistant",
        image: "ghcr.io/home-assistant/home-assistant:stable",
        status: "running",
        created: "2026-02-01 11:00",
        ports: ["8123:8123"],
        cpuUsage: 1.2,
        memoryUsage: "215.8 MB",
    },
    {
        id: "c4",
        name: "qbittorrent-vpn",
        image: "markusmcnubs/qbittorrentvpn:latest",
        status: "running",
        created: "2026-01-20 18:45",
        ports: ["8085:8080", "6881:6881"],
        cpuUsage: 2.1,
        memoryUsage: "185.0 MB",
    },
    {
        id: "c5",
        name: "adguard-home",
        image: "adguard/adguardhome:latest",
        status: "running",
        created: "2026-01-05 09:15",
        ports: ["53:53/udp", "3000:3000"],
        cpuUsage: 0.4,
        memoryUsage: "48.1 MB",
    },
    {
        id: "c6",
        name: "nginx-proxy-manager",
        image: "jc21/nginx-proxy-manager:latest",
        status: "stopped",
        created: "2026-02-12 16:30",
        ports: ["80:80", "443:443", "81:81"],
        cpuUsage: 0.0,
        memoryUsage: "0 MB",
    },
];
export const mockDownloadTasks = [
    {
        id: "dl_1",
        title: "Debian-12.5.0-amd64-netinst.iso",
        size: 654311424,
        status: "downloading",
        progress: 74,
        downloadSpeed: 12500000,
        uploadSpeed: 450000,
        type: "HTTP/HTTPS",
    },
    {
        id: "dl_2",
        title: "Blender_4.1_Open_Movie_Project_4K.torrent",
        size: 4294967296,
        status: "downloading",
        progress: 48,
        downloadSpeed: 8900000,
        uploadSpeed: 1200000,
        type: "BitTorrent",
    },
    {
        id: "dl_3",
        title: "NodeJS_v22_LTS_Source.tar.gz",
        size: 89456123,
        status: "finished",
        progress: 100,
        downloadSpeed: 0,
        uploadSpeed: 0,
        type: "HTTP",
    },
    {
        id: "dl_4",
        title: "ArchLinux_Latest_Bootstrap.tar.zst",
        size: 245000000,
        status: "paused",
        progress: 32,
        downloadSpeed: 0,
        uploadSpeed: 0,
        type: "FTP",
    },
];
export const mockStorageVolumes = [
    {
        id: "volume_1",
        name: "Volume 1 (SHR - Btrfs)",
        path: "/volume1",
        fsType: "Btrfs",
        status: "normal",
        totalBytes: 15400000000000,
        usedBytes: 8900000000000,
        freeBytes: 6500000000000,
        drives: [
            { slot: 1, model: "Seagate IronWolf 8TB (ST8000VN004)", serial: "WSD2091A", status: "normal", temp: 36, size: 8000000000000, health: "Sức khỏe tốt (0 Bad Sectors)" },
            { slot: 2, model: "Seagate IronWolf 8TB (ST8000VN004)", serial: "WSD2091B", status: "normal", temp: 37, size: 8000000000000, health: "Sức khỏe tốt (0 Bad Sectors)" },
            { slot: 3, model: "WD Red Plus 8TB (WD80EFPX)", serial: "WD-WX8201", status: "normal", temp: 35, size: 8000000000000, health: "Sức khỏe tốt (0 Bad Sectors)" },
            { slot: 4, model: "WD Red Plus 8TB (WD80EFPX)", serial: "WD-WX8202", status: "normal", temp: 35, size: 8000000000000, health: "Sức khỏe tốt (0 Bad Sectors)" },
        ],
    },
    {
        id: "volume_2",
        name: "Volume 2 (NVMe Storage Pool)",
        path: "/volume2",
        fsType: "Btrfs",
        status: "normal",
        totalBytes: 960000000000,
        usedBytes: 310000000000,
        freeBytes: 650000000000,
        drives: [
            { slot: 5, model: "Samsung 970 EVO Plus 1TB NVMe", serial: "S4EVNF0M", status: "normal", temp: 42, size: 1000000000000, health: "100% Tuổi thọ" },
        ],
    },
];
export const mockServices = [
    {
        id: "smb",
        name: "smb",
        displayName: "SMB / CIFS (Windows File Service)",
        description: "Chia sẻ tệp cho Windows, macOS qua giao thức SMB. Cổng mặc định 445.",
        category: "file",
        enabled: true,
        running: true,
        status: "running",
        port: 445,
        api: "SYNO.Core.FileServ.SMB",
        details: { workgroup: "WORKGROUP", smb3_enabled: true },
        canToggle: true,
    },
    {
        id: "afp",
        name: "afp",
        displayName: "AFP (Apple Filing Protocol)",
        description: "Dịch vụ tệp cho macOS cũ qua AFP. Khuyên dùng SMB cho DSM 7+.",
        category: "file",
        enabled: false,
        running: false,
        status: "stopped",
        port: 548,
        api: "SYNO.Core.FileServ.AFP",
        details: {},
        canToggle: true,
    },
    {
        id: "nfs",
        name: "nfs",
        displayName: "NFS",
        description: "Chia sẻ tệp cho Linux/Unix qua NFS v3/v4. Hỗ trợ NFSv4.1.",
        category: "file",
        enabled: true,
        running: true,
        status: "running",
        port: 2049,
        api: "SYNO.Core.FileServ.NFS",
        details: { enable_nfs_v4: true, nfs_v4_domain: "local" },
        canToggle: true,
    },
    {
        id: "ftp",
        name: "ftp",
        displayName: "FTP",
        description: "Giao thức truyền tệp FTP. Hỗ trợ FTPS (FTP over TLS).",
        category: "file",
        enabled: false,
        running: false,
        status: "stopped",
        port: 21,
        api: "SYNO.Core.FileServ.FTP",
        details: { enable_ftps: false, portnum: 21 },
        canToggle: true,
    },
    {
        id: "sftp",
        name: "sftp",
        displayName: "SFTP (FTP over SSH)",
        description: "Truyền tệp an toàn qua SSH. Dùng cổng SSH (mặc định 22 / 2222).",
        category: "file",
        enabled: true,
        running: true,
        status: "running",
        port: 22,
        api: "SYNO.Core.FileServ.FTP.SFTP",
        details: { portnum: 22 },
        canToggle: true,
    },
    {
        id: "ssh",
        name: "ssh",
        displayName: "SSH (Terminal)",
        description: "Truy cập dòng lệnh an toàn qua SSH. Cổng mặc định 22.",
        category: "system",
        enabled: true,
        running: true,
        status: "running",
        port: 22,
        api: "SYNO.Core.Terminal",
        details: { enable_telnet: false },
        canToggle: true,
    },
    {
        id: "telnet",
        name: "telnet",
        displayName: "Telnet",
        description: "Giao thức Telnet (không mã hóa, không khuyến nghị).",
        category: "system",
        enabled: false,
        running: false,
        status: "stopped",
        port: 23,
        api: "SYNO.Core.Terminal",
        details: {},
        canToggle: true,
    },
    {
        id: "rsync",
        name: "rsync",
        displayName: "rsync / Network Backup",
        description: "Dịch vụ đồng bộ và sao lưu qua rsync. Dùng cho Hyper Backup, rsync.",
        category: "network",
        enabled: false,
        running: false,
        status: "stopped",
        port: 873,
        api: "SYNO.Backup.Service.NetworkBackup",
        details: {},
        canToggle: true,
    },
    {
        id: "webdav",
        name: "webdav",
        displayName: "WebDAV",
        description: "Truy cập tệp qua HTTP/WebDAV. Thường dùng cổng 5005/5006.",
        category: "network",
        enabled: false,
        running: false,
        status: "stopped",
        port: 5005,
        api: "SYNO.Core.FileServ.ServiceDiscovery",
        details: {},
        canToggle: true,
    },
];
export const mockNotifications = [
    {
        id: "n1",
        title: "SYNO.SDS.StorageManager.Instance:storage_volume_degraded",
        displayTitle: "Lưu trữ: Volume xuống cấp",
        className: "SYNO.SDS.StorageManager.Instance",
        category: "storage",
        level: "warning",
        messages: ["Volume 1 (SHR) bị xuống cấp trên DS920+. Ổ đĩa 3 (SATA3) báo lỗi I/O. Vui lòng kiểm tra S.M.A.R.T."],
        rawMessages: ['{"%VOLUME%":"Volume 1","%DISK%":"Disk 3"}'],
        time: Math.floor(Date.now() / 1000) - 3600,
        read: false,
    },
    {
        id: "n2",
        title: "SYNO.SDS.PackageCenter.Instance:package_update_available",
        displayTitle: "Gói: Có bản cập nhật",
        className: "SYNO.SDS.PackageCenter.Instance",
        category: "package",
        level: "info",
        messages: ["Container Manager 20.10.23-1437 → 20.10.23-1481 có sẵn. Nhấn cập nhật trong Package Center."],
        rawMessages: ['{"%PKG%":"Container Manager","%OLD%":"20.10.23-1437","%NEW%":"20.10.23-1481"}'],
        time: Math.floor(Date.now() / 1000) - 7200,
        read: false,
    },
    {
        id: "n3",
        title: "SYNO.SDS.AdminCenter.Instance:system_reboot",
        displayTitle: "Hệ thống: Khởi động lại hoàn tất",
        className: "",
        category: "system",
        level: "success",
        messages: ["DSM đã khởi động lại thành công vào 2026-02-22 10:20. Uptime: 9 ngày 19 giờ. Nhiệt độ 42°C."],
        rawMessages: ['{"%TIME%":"2026-02-22 10:20"}'],
        time: Math.floor(Date.now() / 1000) - 9500,
        read: true,
    },
    {
        id: "n4",
        title: "SYNO.SDS.SecurityScan.Instance:security_warning",
        displayTitle: "Bảo mật: Phát hiện rủi ro",
        className: "SYNO.SDS.SecurityScan.Instance",
        category: "security",
        level: "error",
        messages: ["Quét bảo mật phát hiện SSH mở cổng 22 với mật khẩu yếu cho tài khoản admin. Khuyến nghị đổi port hoặc bật 2FA."],
        rawMessages: ['{"%PORT%":"22","%USER%":"admin"}'],
        time: Math.floor(Date.now() / 1000) - 14400,
        read: false,
    },
    {
        id: "n5",
        title: "SYNO.SDS.DownloadStation.Instance:download_complete",
        displayTitle: "Download Station: Tải xong",
        className: "SYNO.SDS.DownloadStation.Instance",
        category: "backup",
        level: "success",
        messages: ['Tác vụ "Debian-12.5.0-amd64-netinst.iso" đã hoàn tất (654 MB). Lưu tại /volume1/downloads.'],
        rawMessages: ['{"%TASK%":"Debian-12.5.0-amd64-netinst.iso"}'],
        time: Math.floor(Date.now() / 1000) - 18000,
        read: true,
    },
    {
        id: "n6",
        title: "SYNO.SDS.FileStation.Instance:file_share_link_created",
        displayTitle: "File Station: Đã tạo liên kết chia sẻ",
        className: "SYNO.SDS.FileStation.Instance",
        category: "file",
        level: "info",
        messages: ["Liên kết chia sẻ cho /docker/docker-compose.yml đã được tạo: https://gofile.me/abc123 (hết hạn 2026-12-31)."],
        rawMessages: ['{"%PATH%":"/docker/docker-compose.yml"}'],
        time: Math.floor(Date.now() / 1000) - 25200,
        read: true,
    },
    {
        id: "n7",
        title: "SYNO.SDS.Network.Instance:network_disconnected",
        displayTitle: "Mạng: Mất kết nối",
        className: "",
        category: "network",
        level: "error",
        messages: ["Cổng LAN 1 mất kết nối lúc 09:15. Đã chuyển sang LAN 2 (failover). Kiểm tra cáp mạng."],
        rawMessages: ['{"%IFACE%":"LAN 1"}'],
        time: Math.floor(Date.now() / 1000) - 36000,
        read: false,
    },
];
export const mockAppNotifications = [
    { id: "a1", title: "Hyper Backup", content: "Tác vụ sao lưu 'Daily Backup' hoàn tất lúc 02:00. 12 GB đã sao lưu lên C2.", level: "success", time: Math.floor(Date.now() / 1000) - 28800, unread: true, pkgId: "HyperBackup" },
    { id: "a2", title: "Synology Photos", content: "Đã phát hiện 24 ảnh mới cần sao lưu từ thiết bị di động.", level: "info", time: Math.floor(Date.now() / 1000) - 43200, unread: false, pkgId: "SynoPhotos" },
];
export const mockPackages = [
    { id: "kvsynology", name: "KV Synology", version: "1.0.0-10", status: "running", description: "KV Synology — modern Synology DSM web manager (Next.js 15 + QuickConnect relay + DSM proxy).", maintainer: "Khoa Vo", category: "Utilities", isCommunity: true },
    { id: "kvtube", name: "KV Tube", version: "1.0.0-43", status: "running", description: "KV Tube — Trình phát và xem video YouTube không quảng cáo, tối ưu hóa cho Synology NAS.", maintainer: "Khoa Vo", category: "Multimedia", isCommunity: true },
    { id: "ContainerManager", name: "Container Manager (Docker)", version: "24.0.2-1543", status: "running", description: "Quản lý và chạy các ứng dụng trong container nhẹ Docker / Container Manager trên Synology DSM.", maintainer: "Synology Inc.", category: "Utilities" },
    { id: "FileStation", name: "File Station", version: "1.4.2-1575", status: "running", description: "Quản lý và duyệt tập tin tập trung toàn diện trên Synology NAS.", maintainer: "Synology Inc.", category: "Management" },
    { id: "StorageManager", name: "Storage Manager", version: "1.0.0-00502", status: "running", description: "Quản lý nhóm lưu trữ, phân vùng Btrfs, SSD Cache và kiểm tra sức khỏe ổ đĩa cứng S.M.A.R.T.", maintainer: "Synology Inc.", category: "Management" },
    { id: "HyperBackup", name: "Hyper Backup", version: "4.1.2-4045", status: "running", description: "Sao lưu toàn diện dữ liệu NAS lên Synology C2, đám mây S3 và thiết bị lưu trữ ngoài.", maintainer: "Synology Inc.", category: "Backup" },
    { id: "DownloadStation", name: "Download Station", version: "4.1.2-5012", status: "running", description: "Công cụ tải về tệp tin tự động qua BitTorrent, FTP, HTTP, HTTPS và NZB.", maintainer: "Synology Inc.", category: "Download" },
    { id: "Tailscale", name: "Tailscale Mesh VPN", version: "1.58.2-700058002", status: "running", description: "Mạng riêng ảo mesh VPN WireGuard an toàn cao cấp không cần cấu hình mở port tường lửa.", maintainer: "Tailscale Inc.", category: "Security" },
    { id: "WebStation", name: "Web Station", version: "4.3.1-0530", status: "running", description: "Lưu trữ và quản trị các trang web PHP, Node.js, Python và máy chủ Nginx/Apache.", maintainer: "Synology Inc.", category: "Productivity" },
    { id: "ffmpeg7", name: "FFmpeg 7", version: "7.1.5-10", status: "running", description: "Bộ thư viện giải mã và chuyển mã âm thanh, hình ảnh và video đa định dạng thế hệ mới.", maintainer: "SynoCommunity", category: "Multimedia", isCommunity: true },
    { id: "WireGuard", name: "WireGuard VPN", version: "1.0.20220627", status: "running", description: "Giao thức mạng riêng ảo WireGuard tốc độ cao, bảo mật mã hóa thế hệ mới cho Synology NAS.", maintainer: "Community", category: "Security", isCommunity: true },
    { id: "Node.js_v20", name: "Node.js v20 LTS", version: "20.19.5-1014", status: "running", description: "Môi trường thực thi JavaScript server-side hiệu năng cao.", maintainer: "Synology Inc.", category: "Developer Tools" },
    { id: "Node.js_v18", name: "Node.js v18 LTS", version: "18.18.2-1011", status: "running", description: "Môi trường JavaScript runtime Node.js phiên bản 18.", maintainer: "Synology Inc.", category: "Developer Tools" },
    { id: "Node.js_v22", name: "Node.js v22", version: "22.19.0-1006", status: "running", description: "Môi trường JavaScript runtime Node.js phiên bản 22 mới nhất.", maintainer: "Synology Inc.", category: "Developer Tools" },
    { id: "python311", name: "Python 3.11 Runtime", version: "3.11.15-15", status: "running", description: "Ngôn ngữ lập trình Python 3.11 cùng trình quản lý gói pip tích hợp cho Synology DSM.", maintainer: "SynoCommunity", category: "Developer Tools", isCommunity: true },
    { id: "python312", name: "Python 3.12 Runtime", version: "3.12.13-7", status: "running", description: "Ngôn ngữ lập trình Python 3.12 hiện đại cho DSM.", maintainer: "SynoCommunity", category: "Developer Tools", isCommunity: true },
    { id: "synocli-videodriver", name: "SynoCli Video Drivers", version: "1.5-8", status: "running", description: "Trình điều khiển đồ họa và driver phần cứng Vulkan/OpenCL cho Intel GPU.", maintainer: "SynoCommunity", category: "Utilities", isCommunity: true },
    { id: "synocli-videodriver-tools", name: "SynoCli Video Driver Tools", version: "1.0-2", status: "running", description: "Bộ công cụ chẩn đoán và cấu hình card màn hình GPU.", maintainer: "SynoCommunity", category: "Utilities", isCommunity: true },
    { id: "SynoFinder", name: "Universal Search", version: "1.7.1-0800", status: "running", description: "Công cụ tìm kiếm tệp tin, tài liệu và ảnh toàn cục tốc độ cao trên DSM.", maintainer: "Synology Inc.", category: "Management" },
    { id: "Contacts", name: "Synology Contacts", version: "1.0.11-20661", status: "running", description: "Quản lý danh bạ tập trung và đồng bộ hóa CardDAV đa nền tảng.", maintainer: "Synology Inc.", category: "Productivity" },
    { id: "MailClient", name: "Synology MailPlus", version: "4.1.0-22327", status: "running", description: "Giao diện webmail doanh nghiệp cao cấp.", maintainer: "Synology Inc.", category: "Productivity" },
    { id: "MariaDB10", name: "MariaDB 10", version: "10.11.11-1551", status: "running", description: "Hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở hiệu năng cao tương thích MySQL.", maintainer: "Synology Inc.", category: "Developer Tools" },
    { id: "TextEditor", name: "Text Editor", version: "1.2.5-0254", status: "running", description: "Trình soạn thảo mã nguồn và văn bản trực tiếp trên giao diện web DSM.", maintainer: "Synology Inc.", category: "Productivity" },
    { id: "VPNCenter", name: "VPN Server", version: "1.4.10-2984", status: "running", description: "Máy chủ VPN hỗ trợ OpenVPN, L2TP/IPSec và PPTP cho truy cập an toàn từ xa.", maintainer: "Synology Inc.", category: "Security" },
    { id: "WebDAVServer", name: "WebDAV Server", version: "2.4.8-20135", status: "running", description: "Dịch vụ chia sẻ tập tin qua giao thức WebDAV an toàn qua HTTPS.", maintainer: "Synology Inc.", category: "Productivity" },
    { id: "arc-control", name: "Arc Control", version: "1.5-7", status: "running", description: "Công cụ quản trị bộ nạp khởi động Arc Loader và phần cứng DSM nâng cao.", maintainer: "AuxXxilium", category: "Utilities", isCommunity: true },
];
//# sourceMappingURL=mockData.js.map