import {
  SystemInfo,
  SystemUtilization,
  DSMProcess,
  FileItem,
  DockerContainer,
  DockerContainerDetails,
  DockerProject,
  DockerImage,
  DownloadTask,
  StorageVolume,
  PackageItem,
  ServiceItem,
  NotificationItem,
  AppNotifyItem,
  FirewallRule,
  FirewallConfig,
  AutoBlockConfig,
  BlockedIpItem,
} from "./types";

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

export const mockDockerContainers: DockerContainerDetails[] = [
  {
    id: "c1",
    fullId: "e9a8f4c21b34d7890123456789abcdef0123456789abcdef0123456789abcdef",
    name: "vaultwarden",
    image: "vaultwarden/server:latest",
    status: "running",
    created: "2026-01-15 08:30",
    uptime: "Đang chạy 42 ngày, 14 giờ",
    ports: ["8080:80", "3012:3012"],
    portBindings: [
      { hostPort: "8080", containerPort: "80", protocol: "tcp" },
      { hostPort: "3012", containerPort: "3012", protocol: "tcp" },
    ],
    volumeMounts: [
      { hostPath: "/volume2/docker/vaultwarden/data", containerPath: "/data", mode: "rw" },
    ],
    envVars: [
      { key: "SIGNUPS_ALLOWED", value: "false" },
      { key: "WEBSOCKET_ENABLED", value: "true" },
      { key: "ROCKET_PORT", value: "80" },
      { key: "TZ", value: "Asia/Ho_Chi_Minh" },
    ],
    ipAddress: "172.17.0.2",
    gateway: "172.17.0.1",
    macAddress: "02:42:ac:11:00:02",
    networkMode: "bridge",
    restartPolicy: "unless-stopped",
    command: "/vaultwarden",
    cpuLimit: 2,
    memoryLimitMB: 512,
    cpuUsage: 0.8,
    memoryUsage: "64.2 MB",
    stats: {
      cpuPercent: 0.8,
      memoryUsageMB: 64.2,
      memoryLimitMB: 512,
      memoryPercent: 12.5,
      networkRxBytes: 154200000,
      networkTxBytes: 89400000,
      blockReadBytes: 24500000,
      blockWriteBytes: 12800000,
      pidsCount: 14,
    },
  },
  {
    id: "c2",
    fullId: "b8c7d6e5f4a3928170615243142536475869708192a3b4c5d6e7f8091a2b3c4d",
    name: "plex-media-server",
    image: "linuxserver/plex:latest",
    status: "running",
    created: "2026-01-10 14:20",
    uptime: "Đang chạy 47 ngày, 8 giờ",
    ports: ["32400:32400", "1900:1900/udp"],
    portBindings: [
      { hostPort: "32400", containerPort: "32400", protocol: "tcp" },
      { hostPort: "1900", containerPort: "1900", protocol: "udp" },
      { hostPort: "3005", containerPort: "3005", protocol: "tcp" },
    ],
    volumeMounts: [
      { hostPath: "/volume2/docker/plex/config", containerPath: "/config", mode: "rw" },
      { hostPath: "/volume2/video", containerPath: "/media", mode: "ro" },
    ],
    envVars: [
      { key: "PUID", value: "1026" },
      { key: "PGID", value: "100" },
      { key: "VERSION", value: "docker" },
      { key: "TZ", value: "Asia/Ho_Chi_Minh" },
    ],
    ipAddress: "172.17.0.3",
    gateway: "172.17.0.1",
    macAddress: "02:42:ac:11:00:03",
    networkMode: "host",
    restartPolicy: "always",
    command: "/init",
    cpuLimit: 4,
    memoryLimitMB: 2048,
    cpuUsage: 3.4,
    memoryUsage: "482.6 MB",
    stats: {
      cpuPercent: 3.4,
      memoryUsageMB: 482.6,
      memoryLimitMB: 2048,
      memoryPercent: 23.5,
      networkRxBytes: 894000000,
      networkTxBytes: 14500000000,
      blockReadBytes: 540000000,
      blockWriteBytes: 32000000,
      pidsCount: 38,
    },
  },
  {
    id: "c3",
    fullId: "f1e2d3c4b5a697887766554433221100ffeeddccbbaa99887766554433221100",
    name: "homeassistant",
    image: "ghcr.io/home-assistant/home-assistant:stable",
    status: "running",
    created: "2026-02-01 11:00",
    uptime: "Đang chạy 26 ngày, 2 giờ",
    ports: ["8123:8123"],
    portBindings: [
      { hostPort: "8123", containerPort: "8123", protocol: "tcp" },
    ],
    volumeMounts: [
      { hostPath: "/volume2/docker/homeassistant", containerPath: "/config", mode: "rw" },
    ],
    envVars: [
      { key: "TZ", value: "Asia/Ho_Chi_Minh" },
    ],
    ipAddress: "172.17.0.4",
    gateway: "172.17.0.1",
    macAddress: "02:42:ac:11:00:04",
    networkMode: "host",
    restartPolicy: "unless-stopped",
    command: "python3 -m homeassistant --config /config",
    cpuLimit: 2,
    memoryLimitMB: 1024,
    cpuUsage: 1.2,
    memoryUsage: "215.8 MB",
    stats: {
      cpuPercent: 1.2,
      memoryUsageMB: 215.8,
      memoryLimitMB: 1024,
      memoryPercent: 21.0,
      networkRxBytes: 42000000,
      networkTxBytes: 38000000,
      blockReadBytes: 18000000,
      blockWriteBytes: 45000000,
      pidsCount: 22,
    },
  },
  {
    id: "c4",
    fullId: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    name: "qbittorrent-vpn",
    image: "markusmcnubs/qbittorrentvpn:latest",
    status: "running",
    created: "2026-01-20 18:45",
    uptime: "Đang chạy 37 ngày, 19 giờ",
    ports: ["8085:8080", "6881:6881"],
    portBindings: [
      { hostPort: "8085", containerPort: "8080", protocol: "tcp" },
      { hostPort: "6881", containerPort: "6881", protocol: "tcp" },
      { hostPort: "6881", containerPort: "6881", protocol: "udp" },
    ],
    volumeMounts: [
      { hostPath: "/volume2/docker/qbittorrent/config", containerPath: "/config", mode: "rw" },
      { hostPath: "/volume2/downloads", containerPath: "/downloads", mode: "rw" },
    ],
    envVars: [
      { key: "WEBUI_PORT", value: "8080" },
      { key: "VPN_ENABLED", value: "yes" },
      { key: "VPN_TYPE", value: "wireguard" },
      { key: "LAN_NETWORK", value: "192.168.31.0/24" },
    ],
    ipAddress: "172.17.0.5",
    gateway: "172.17.0.1",
    macAddress: "02:42:ac:11:00:05",
    networkMode: "bridge",
    restartPolicy: "unless-stopped",
    command: "/init",
    cpuLimit: 2,
    memoryLimitMB: 1024,
    cpuUsage: 2.1,
    memoryUsage: "185.0 MB",
    stats: {
      cpuPercent: 2.1,
      memoryUsageMB: 185.0,
      memoryLimitMB: 1024,
      memoryPercent: 18.0,
      networkRxBytes: 12500000000,
      networkTxBytes: 3400000000,
      blockReadBytes: 250000000,
      blockWriteBytes: 1200000000,
      pidsCount: 16,
    },
  },
  {
    id: "c5",
    fullId: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    name: "adguard-home",
    image: "adguard/adguardhome:latest",
    status: "running",
    created: "2026-01-05 09:15",
    uptime: "Đang chạy 52 ngày, 4 giờ",
    ports: ["53:53/udp", "3000:3000"],
    portBindings: [
      { hostPort: "53", containerPort: "53", protocol: "udp" },
      { hostPort: "3000", containerPort: "3000", protocol: "tcp" },
    ],
    volumeMounts: [
      { hostPath: "/volume2/docker/adguard/work", containerPath: "/opt/adguardhome/work", mode: "rw" },
      { hostPath: "/volume2/docker/adguard/conf", containerPath: "/opt/adguardhome/conf", mode: "rw" },
    ],
    envVars: [
      { key: "TZ", value: "Asia/Ho_Chi_Minh" },
    ],
    ipAddress: "172.17.0.6",
    gateway: "172.17.0.1",
    macAddress: "02:42:ac:11:00:06",
    networkMode: "bridge",
    restartPolicy: "always",
    command: "/opt/adguardhome/AdGuardHome",
    cpuLimit: 1,
    memoryLimitMB: 256,
    cpuUsage: 0.4,
    memoryUsage: "48.1 MB",
    stats: {
      cpuPercent: 0.4,
      memoryUsageMB: 48.1,
      memoryLimitMB: 256,
      memoryPercent: 18.8,
      networkRxBytes: 12000000,
      networkTxBytes: 14000000,
      blockReadBytes: 8000000,
      blockWriteBytes: 15000000,
      pidsCount: 9,
    },
  },
  {
    id: "c6",
    fullId: "9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    name: "nginx-proxy-manager",
    image: "jc21/nginx-proxy-manager:latest",
    status: "stopped",
    created: "2026-02-12 16:30",
    uptime: "Đã dừng lúc 2026-02-25 10:00",
    ports: ["80:80", "443:443", "81:81"],
    portBindings: [
      { hostPort: "80", containerPort: "80", protocol: "tcp" },
      { hostPort: "443", containerPort: "443", protocol: "tcp" },
      { hostPort: "81", containerPort: "81", protocol: "tcp" },
    ],
    volumeMounts: [
      { hostPath: "/volume2/docker/npm/data", containerPath: "/data", mode: "rw" },
      { hostPath: "/volume2/docker/npm/letsencrypt", containerPath: "/etc/letsencrypt", mode: "rw" },
    ],
    envVars: [
      { key: "DB_SQLITE_FILE", value: "/data/database.sqlite" },
      { key: "DISABLE_IPV6", value: "true" },
    ],
    ipAddress: "",
    gateway: "172.17.0.1",
    macAddress: "02:42:ac:11:00:07",
    networkMode: "bridge",
    restartPolicy: "unless-stopped",
    command: "/init",
    cpuLimit: 2,
    memoryLimitMB: 512,
    cpuUsage: 0.0,
    memoryUsage: "0 MB",
    stats: {
      cpuPercent: 0,
      memoryUsageMB: 0,
      memoryLimitMB: 512,
      memoryPercent: 0,
      networkRxBytes: 0,
      networkTxBytes: 0,
      blockReadBytes: 0,
      blockWriteBytes: 0,
      pidsCount: 0,
    },
  },
];

export const mockDockerProjects: DockerProject[] = [
  {
    id: "proj_1",
    name: "homelab-services",
    status: "running",
    path: "/volume2/docker/compose/homelab-services",
    created: "2026-01-15 10:00",
    updated: "2026-02-20 14:30",
    services: [
      { name: "vaultwarden", image: "vaultwarden/server:latest", status: "running", ports: ["8080:80"] },
      { name: "adguardhome", image: "adguard/adguardhome:latest", status: "running", ports: ["53:53/udp", "3000:3000"] },
    ],
    yamlContent: `version: '3.8'

services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: unless-stopped
    environment:
      - SIGNUPS_ALLOWED=false
      - WEBSOCKET_ENABLED=true
      - TZ=Asia/Ho_Chi_Minh
    volumes:
      - /volume2/docker/vaultwarden/data:/data
    ports:
      - "8080:80"

  adguardhome:
    image: adguard/adguardhome:latest
    container_name: adguard-home
    restart: always
    volumes:
      - /volume2/docker/adguard/work:/opt/adguardhome/work
      - /volume2/docker/adguard/conf:/opt/adguardhome/conf
    ports:
      - "53:53/udp"
      - "3000:3000"
`,
  },
  {
    id: "proj_2",
    name: "media-center",
    status: "running",
    path: "/volume2/docker/compose/media-center",
    created: "2026-01-10 12:00",
    updated: "2026-02-18 09:15",
    services: [
      { name: "plex", image: "linuxserver/plex:latest", status: "running", ports: ["32400:32400"] },
      { name: "qbittorrent", image: "markusmcnubs/qbittorrentvpn:latest", status: "running", ports: ["8085:8080"] },
    ],
    yamlContent: `version: '3.8'

services:
  plex:
    image: linuxserver/plex:latest
    container_name: plex-media-server
    restart: always
    network_mode: host
    environment:
      - PUID=1026
      - PGID=100
      - VERSION=docker
      - TZ=Asia/Ho_Chi_Minh
    volumes:
      - /volume2/docker/plex/config:/config
      - /volume2/video:/media

  qbittorrent:
    image: markusmcnubs/qbittorrentvpn:latest
    container_name: qbittorrent-vpn
    restart: unless-stopped
    environment:
      - WEBUI_PORT=8080
      - VPN_ENABLED=yes
    volumes:
      - /volume2/docker/qbittorrent/config:/config
      - /volume2/downloads:/downloads
    ports:
      - "8085:8080"
      - "6881:6881"
`,
  },
];

export const mockDockerImages: DockerImage[] = [
  {
    id: "img_1",
    repository: "vaultwarden/server",
    tag: "latest",
    sizeMB: 185.4,
    sizeFormatted: "185.4 MB",
    created: "2026-01-10",
    containersCount: 1,
    isUsed: true,
  },
  {
    id: "img_2",
    repository: "linuxserver/plex",
    tag: "latest",
    sizeMB: 842.1,
    sizeFormatted: "842.1 MB",
    created: "2026-01-08",
    containersCount: 1,
    isUsed: true,
  },
  {
    id: "img_3",
    repository: "ghcr.io/home-assistant/home-assistant",
    tag: "stable",
    sizeMB: 1420.0,
    sizeFormatted: "1.42 GB",
    created: "2026-01-28",
    containersCount: 1,
    isUsed: true,
  },
  {
    id: "img_4",
    repository: "adguard/adguardhome",
    tag: "latest",
    sizeMB: 48.6,
    sizeFormatted: "48.6 MB",
    created: "2026-01-02",
    containersCount: 1,
    isUsed: true,
  },
  {
    id: "img_5",
    repository: "nginx",
    tag: "alpine",
    sizeMB: 23.8,
    sizeFormatted: "23.8 MB",
    created: "2026-02-14",
    containersCount: 0,
    isUsed: false,
  },
  {
    id: "img_6",
    repository: "redis",
    tag: "7-alpine",
    sizeMB: 38.2,
    sizeFormatted: "38.2 MB",
    created: "2026-02-10",
    containersCount: 0,
    isUsed: false,
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
    id: "volume_2",
    name: "Volume 2",
    path: "/volume2",
    fsType: "BTRFS (Phân vùng Chính)",
    status: "normal",
    isCache: false,
    totalBytes: 6.98 * 1024 ** 4, // 6.98 TB
    usedBytes: 3.32 * 1024 ** 4,  // 3.32 TB (48%)
    freeBytes: 3.66 * 1024 ** 4,  // 3.66 TB
    drives: [
      { slot: 1, slotName: "Khay 1", model: "Seagate IronWolf 8TB (ST8000VN004)", serial: "WSD2091A", status: "normal", temp: 36, size: 7.28 * 1024 ** 4, health: "Sức khỏe tốt", driveType: "HDD" },
      { slot: 2, slotName: "Khay 2", model: "Seagate IronWolf 8TB (ST8000VN004)", serial: "WSD2091B", status: "normal", temp: 37, size: 7.28 * 1024 ** 4, health: "Sức khỏe tốt", driveType: "HDD" },
    ],
  },
  {
    id: "ssd_cache_1",
    name: "SSD Cache 1 (NVMe M.2 Read/Write)",
    path: "/cache1 (Gắn kết Volume 2)",
    fsType: "NVMe SSD Cache (Read/Write)",
    status: "normal",
    isCache: true,
    cacheType: "read_write",
    targetVolume: "Volume 2",
    hitRate: 98.4,
    totalBytes: 238.47 * 1024 ** 3, // 238.47 GB
    usedBytes: 108.2 * 1024 ** 3,   // 108.2 GB (45%)
    freeBytes: 130.27 * 1024 ** 3,  // 130.27 GB
    drives: [
      { slot: 5, slotName: "Khe M.2-1", model: "GIGABYTE GP-GSM2NE3256GNTD", serial: "SN21080410", status: "normal", temp: 20, size: 238.47 * 1024 ** 3, health: "100% Tuổi thọ (Tốt)", driveType: "NVMe" },
      { slot: 6, slotName: "Khe M.2-2", model: "WDC PC SN730 SDBQNTY-256G-1001", serial: "20448180123", status: "normal", temp: 44, size: 238.47 * 1024 ** 3, health: "100% Tuổi thọ (Tốt)", driveType: "NVMe" },
    ],
  },
];

export const mockServices: ServiceItem[] = [
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

export const mockNotifications: NotificationItem[] = [
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

export const mockAppNotifications: AppNotifyItem[] = [
  { id: "a1", title: "Hyper Backup", content: "Tác vụ sao lưu 'Daily Backup' hoàn tất lúc 02:00. 12 GB đã sao lưu lên C2.", level: "success", time: Math.floor(Date.now() / 1000) - 28800, unread: true, pkgId: "HyperBackup" },
  { id: "a2", title: "Synology Photos", content: "Đã phát hiện 24 ảnh mới cần sao lưu từ thiết bị di động.", level: "info", time: Math.floor(Date.now() / 1000) - 43200, unread: false, pkgId: "SynoPhotos" },
];

export const mockPackages: PackageItem[] = [
  { id: "ContainerManager", name: "Container Manager (Docker)", version: "20.10.23-1437", status: "running", description: "Quản lý và chạy các ứng dụng trong container nhẹ Docker", maintainer: "Synology Inc." },
  { id: "DownloadStation", name: "Download Station", version: "3.9.5-4601", status: "running", description: "Công cụ tải về tệp tin qua BitTorrent, FTP, HTTP và NZB", maintainer: "Synology Inc." },
  { id: "FileStation", name: "File Station", version: "1.3.5-0422", status: "running", description: "Quản lý và duyệt tập tin tập trung trên Synology NAS", maintainer: "Synology Inc." },
  { id: "SynoPhotos", name: "Synology Photos", version: "1.6.2-0641", status: "running", description: "Sao lưu và quản lý thư viện ảnh thông minh với nhận diện AI khuôn mặt", maintainer: "Synology Inc." },
  { id: "HyperBackup", name: "Hyper Backup", version: "4.1.1-3758", status: "running", description: "Sao lưu toàn diện dữ liệu NAS lên Synology C2, S3 và ổ đĩa gắn ngoài", maintainer: "Synology Inc." },
  { id: "AudioStation", name: "Audio Station", version: "7.1.0-5302", status: "stopped", description: "Phát và sắp xếp thư viện âm nhạc trực tuyến qua trình duyệt và ứng dụng di động", maintainer: "Synology Inc." },
  { id: "SANManager", name: "SAN Manager (iSCSI)", version: "1.0.3-0382", status: "running", description: "Quản lý lưu trữ khối block-level, LUN và mục tiêu iSCSI", maintainer: "Synology Inc." },
  { id: "WebStation", name: "Web Station", version: "4.2.2-0518", status: "running", description: "Lưu trữ và quản trị các trang web PHP, Node.js, Python và Nginx/Apache", maintainer: "Synology Inc." },
  { id: "PlexMediaServer", name: "Plex Media Server", version: "1.40.1-8227", status: "running", description: "Máy chủ phát đa phương tiện cá nhân với chuyển mã phần cứng 4K HDR", maintainer: "Plex Inc." },
  { id: "Tailscale", name: "Tailscale Mesh VPN", version: "1.68.2-700068002", status: "running", description: "Mạng VPN ngang hàng WireGuard an toàn không cần mở port", maintainer: "Tailscale Inc." },
  { id: "Syncthing", name: "Syncthing", version: "1.27.7-1", status: "running", description: "Đồng bộ hóa tập tin liên tục phi tập trung giữa các thiết bị", maintainer: "SynoCommunity" },
  { id: "HomeAssistant", name: "Home Assistant Core", version: "2024.5.1-1", status: "stopped", description: "Hệ thống tự động hóa nhà thông minh mã nguồn mở", maintainer: "SynoCommunity" },
  { id: "GitServer", name: "Git Server", version: "2.41.0-0112", status: "running", description: "Kho lưu trữ mã nguồn Git phân tán cho nhà phát triển", maintainer: "Synology Inc." },
  { id: "SurveillanceStation", name: "Surveillance Station", version: "9.2.0-9289", status: "stopped", description: "Hệ thống giám sát video IP và quản lý camera an ninh", maintainer: "Synology Inc." },
];

// ==================== MOCK FIREWALL & AUTO-BLOCK ====================
export const mockFirewallRules: FirewallRule[] = [
  {
    id: "fw_1",
    name: "Synology DSM Quản trị (HTTP / HTTPS)",
    ports: "5000, 5001",
    protocol: "tcp",
    sourceType: "subnet",
    sourceValue: "192.168.0.0/16",
    action: "allow",
    enabled: true,
    order: 1,
  },
  {
    id: "fw_2",
    name: "SSH Terminal Bảo mật",
    ports: "22, 2222",
    protocol: "tcp",
    sourceType: "subnet",
    sourceValue: "192.168.31.0/24",
    action: "allow",
    enabled: true,
    order: 2,
  },
  {
    id: "fw_3",
    name: "Web Server & SSL (Nginx / Apache)",
    ports: "80, 443",
    protocol: "tcp",
    sourceType: "all",
    sourceValue: "Tất cả",
    action: "allow",
    enabled: true,
    order: 3,
  },
  {
    id: "fw_4",
    name: "Chia sẻ Tệp Windows (SMB / CIFS)",
    ports: "139, 445",
    protocol: "tcp",
    sourceType: "subnet",
    sourceValue: "192.168.0.0/16",
    action: "allow",
    enabled: true,
    order: 4,
  },
  {
    id: "fw_5",
    name: "Docker Web UI & Cổng Ứng dụng",
    ports: "8080, 8088, 9000",
    protocol: "all",
    sourceType: "all",
    sourceValue: "Tất cả",
    action: "allow",
    enabled: true,
    order: 5,
  },
  {
    id: "fw_6",
    name: "Chặn tất cả cổng nhạy cảm từ ngoài mạng",
    ports: "21, 23, 111, 2049",
    protocol: "all",
    sourceType: "all",
    sourceValue: "Tất cả",
    action: "deny",
    enabled: true,
    order: 6,
  },
];

export const mockFirewallConfig: FirewallConfig = {
  enabled: true,
  defaultProfile: "default",
  allowUnmatched: true,
  rules: mockFirewallRules,
};

export const mockAutoBlockConfig: AutoBlockConfig = {
  enabled: true,
  attempts: 5,
  withinMinutes: 5,
  enableUnblock: true,
  unblockDays: 7,
  blockedCount: 4,
  allowedCount: 2,
};

export const mockBlockedIps: BlockedIpItem[] = [
  { ip: "185.220.101.4", denyTime: "2026-08-27 10:14:22", expireTime: "2026-09-03 10:14:22", country: "DE" },
  { ip: "194.26.29.112", denyTime: "2026-08-27 08:33:10", expireTime: "2026-09-03 08:33:10", country: "NL" },
  { ip: "45.154.255.89", denyTime: "2026-08-26 23:45:00", expireTime: "2026-09-02 23:45:00", country: "RU" },
  { ip: "103.145.12.78", denyTime: "2026-08-26 18:20:15", expireTime: "2026-09-02 18:20:15", country: "CN" },
];

