import { SystemInfo, SystemUtilization, DSMProcess, FileItem, DockerContainer, DownloadTask, StorageVolume, PackageItem } from "./types";

export const mockSystemInfo: SystemInfo = {
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

export const getMockUtilization = (): SystemUtilization => ({
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

export const mockProcesses: DSMProcess[] = [
  { pid: 1420, name: "synoscgi", cpu: 4.2, memory: 124500, user: "root", status: "running" },
  { pid: 1892, name: "dockerd", cpu: 3.8, memory: 312000, user: "root", status: "running" },
  { pid: 2104, name: "smbd", cpu: 1.5, memory: 86400, user: "admin", status: "sleeping" },
  { pid: 3201, name: "nginx", cpu: 0.9, memory: 54200, user: "http", status: "sleeping" },
  { pid: 4512, name: "syno-download-manager", cpu: 5.4, memory: 198000, user: "admin", status: "running" },
  { pid: 5120, name: "synomediaparser", cpu: 8.1, memory: 420000, user: "root", status: "running" },
  { pid: 6112, name: "postgres", cpu: 1.2, memory: 245000, user: "postgres", status: "sleeping" },
  { pid: 7421, name: "synostoragemgmt", cpu: 0.5, memory: 67800, user: "root", status: "sleeping" },
];

export const mockFiles: Record<string, FileItem[]> = {
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

export const mockDockerContainers: DockerContainer[] = [
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

export const mockDownloadTasks: DownloadTask[] = [
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

export const mockStorageVolumes: StorageVolume[] = [
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

export const mockPackages: PackageItem[] = [
  { id: "ContainerManager", name: "Container Manager (Docker)", version: "20.10.23-1437", status: "running", description: "Quản lý và chạy các ứng dụng trong container nhẹ", maintainer: "Synology Inc." },
  { id: "DownloadStation", name: "Download Station", version: "3.9.5-4601", status: "running", description: "Công cụ tải về tệp tin qua BitTorrent, FTP, HTTP", maintainer: "Synology Inc." },
  { id: "FileStation", name: "File Station", version: "1.3.5-0422", status: "running", description: "Quản lý và duyệt tập tin tập trung trên Synology NAS", maintainer: "Synology Inc." },
  { id: "SynoPhotos", name: "Synology Photos", version: "1.6.2-0641", status: "running", description: "Sao lưu và quản lý thư viện ảnh thông minh AI", maintainer: "Synology Inc." },
  { id: "AudioStation", name: "Audio Station", version: "7.1.0-5302", status: "stopped", description: "Phát và sắp xếp thư viện âm nhạc trực tuyến", maintainer: "Synology Inc." },
  { id: "HyperBackup", name: "Hyper Backup", version: "4.1.1-3758", status: "running", description: "Sao lưu dữ liệu NAS lên đám mây và ổ đĩa ngoài", maintainer: "Synology Inc." },
  { id: "SANManager", name: "SAN Manager (iSCSI)", version: "1.0.3-0382", status: "running", description: "Quản lý LUN và mục tiêu iSCSI", maintainer: "Synology Inc." },
  { id: "WebStation", name: "Web Station", version: "4.2.2-0518", status: "running", description: "Lưu trữ các trang web PHP, Node.js và Python", maintainer: "Synology Inc." },
];
