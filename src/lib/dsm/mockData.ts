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
  DsmUser,
  DsmGroup,
  FolderAclInfo,
  SecurityAuditItem,
  AclRights,
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
    id: "volume_1",
    name: "Volume 1",
    path: "/volume1",
    fsType: "BTRFS (Phân vùng Chính)",
    status: "normal",
    isCache: false,
    totalBytes: 1.82 * 1024 ** 4, // 1.82 TB (2TB HDD)
    usedBytes: 0.95 * 1024 ** 4,  // 950 GB (52%)
    freeBytes: 0.87 * 1024 ** 4,  // 870 GB
    drives: [
      { slot: 1, slotName: "Khay 1", model: "Seagate IronWolf 2TB (ST2000VN004)", serial: "WSD2091A", status: "normal", temp: 36, size: 1.82 * 1024 ** 4, health: "Sức khỏe tốt", driveType: "HDD" },
    ],
  },
  {
    id: "volume_2",
    name: "Volume 2",
    path: "/volume2",
    fsType: "BTRFS (Phân vùng Phụ)",
    status: "normal",
    isCache: false,
    totalBytes: 1.82 * 1024 ** 4, // 1.82 TB (2TB HDD)
    usedBytes: 0.28 * 1024 ** 4,  // 280 GB (15%)
    freeBytes: 1.54 * 1024 ** 4,  // 1.54 TB
    drives: [
      { slot: 2, slotName: "Khay 2", model: "Seagate IronWolf 2TB (ST2000VN004)", serial: "WSD2091B", status: "normal", temp: 37, size: 1.82 * 1024 ** 4, health: "Sức khỏe tốt", driveType: "HDD" },
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
  { id: "kvsynology", name: "KV Synology", version: "1.0.0-10", status: "running", description: "KV Synology — modern Synology DSM web manager (Next.js 15 + QuickConnect relay + DSM proxy).", maintainer: "Khoa Vo", category: "Utilities", isCommunity: true },
  { id: "kvtube", name: "KV Tube", version: "1.0.0-43", status: "running", description: "KV Tube — Trình phát và xem video YouTube không quảng cáo, tối ưu hóa cho Synology NAS và Android TV.", maintainer: "Khoa Vo", category: "Multimedia", isCommunity: true },
  { id: "ContainerManager", name: "Container Manager (Docker)", version: "24.0.2-1543", status: "running", description: "Quản lý và chạy các ứng dụng trong container nhẹ Docker / Container Manager trên Synology DSM.", maintainer: "Synology Inc.", category: "Utilities" },
  { id: "FileStation", name: "File Station", version: "1.4.2-1575", status: "running", description: "Quản lý và duyệt tập tin tập trung toàn diện trên Synology NAS.", maintainer: "Synology Inc.", category: "Management" },
  { id: "StorageManager", name: "Storage Manager", version: "1.0.0-00502", status: "running", description: "Quản lý nhóm lưu trữ, phân vùng Btrfs, SSD Cache và kiểm tra sức khỏe ổ đĩa cứng S.M.A.R.T.", maintainer: "Synology Inc.", category: "Management" },
  { id: "HyperBackup", name: "Hyper Backup", version: "4.1.2-4045", status: "running", description: "Sao lưu toàn diện dữ liệu NAS lên Synology C2, đám mây S3 và thiết bị lưu trữ ngoài.", maintainer: "Synology Inc.", category: "Backup" },
  { id: "DownloadStation", name: "Download Station", version: "4.1.2-5012", status: "running", description: "Công cụ tải về tệp tin tự động qua BitTorrent, FTP, HTTP, HTTPS và NZB.", maintainer: "Synology Inc.", category: "Download" },
  { id: "Tailscale", name: "Tailscale Mesh VPN", version: "1.58.2-700058002", status: "running", description: "Mạng riêng ảo mesh VPN WireGuard an toàn cao cấp không cần cấu hình mở port tường lửa.", maintainer: "Tailscale Inc.", category: "Security" },
  { id: "WebStation", name: "Web Station", version: "4.3.1-0530", status: "running", description: "Lưu trữ và quản trị các trang web PHP, Node.js, Python và máy chủ Nginx/Apache.", maintainer: "Synology Inc.", category: "Productivity" },
  { id: "ffmpeg7", name: "FFmpeg 7", version: "7.1.5-10", status: "running", description: "Bộ thư viện giải mã và chuyển mã âm thanh, hình ảnh và video đa định dạng thế hệ mới.", maintainer: "SynoCommunity", category: "Multimedia", isCommunity: true },
  { id: "WireGuard", name: "WireGuard VPN", version: "1.0.20220627", status: "running", description: "Giao thức mạng riêng ảo WireGuard tốc độ cao, bảo mật mã hóa thế hệ mới cho Synology NAS.", maintainer: "Community", category: "Security", isCommunity: true },
  { id: "Node.js_v20", name: "Node.js v20 LTS", version: "20.19.5-1014", status: "running", description: "Môi trường thực thi JavaScript server-side hiệu năng cao cho ứng dụng web và script tự động hóa.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "Node.js_v18", name: "Node.js v18 LTS", version: "18.18.2-1011", status: "running", description: "Môi trường JavaScript runtime Node.js phiên bản 18.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "Node.js_v22", name: "Node.js v22", version: "22.19.0-1006", status: "running", description: "Môi trường JavaScript runtime Node.js phiên bản 22 mới nhất.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "python311", name: "Python 3.11 Runtime", version: "3.11.15-15", status: "running", description: "Ngôn ngữ lập trình Python 3.11 cùng trình quản lý gói pip tích hợp cho Synology DSM.", maintainer: "SynoCommunity", category: "Developer Tools", isCommunity: true },
  { id: "python312", name: "Python 3.12 Runtime", version: "3.12.13-7", status: "running", description: "Ngôn ngữ lập trình Python 3.12 hiện đại cho DSM.", maintainer: "SynoCommunity", category: "Developer Tools", isCommunity: true },
  { id: "synocli-videodriver", name: "SynoCli Video Drivers", version: "1.5-8", status: "running", description: "Trình điều khiển đồ họa và driver phần cứng Vulkan/OpenCL cho Intel GPU.", maintainer: "SynoCommunity", category: "Utilities", isCommunity: true },
  { id: "synocli-videodriver-tools", name: "SynoCli Video Driver Tools", version: "1.0-2", status: "running", description: "Bộ công cụ chẩn đoán và cấu hình card màn hình GPU.", maintainer: "SynoCommunity", category: "Utilities", isCommunity: true },
  { id: "SynoFinder", name: "Universal Search", version: "1.7.1-0800", status: "running", description: "Công cụ tìm kiếm tệp tin, tài liệu và ảnh toàn cục tốc độ cao trên DSM.", maintainer: "Synology Inc.", category: "Management" },
  { id: "Contacts", name: "Synology Contacts", version: "1.0.11-20661", status: "running", description: "Quản lý danh bạ tập trung và đồng bộ hóa CardDAV đa nền tảng.", maintainer: "Synology Inc.", category: "Productivity" },
  { id: "MailClient", name: "Synology MailPlus", version: "4.1.0-22327", status: "running", description: "Giao diện webmail doanh nghiệp cao cấp với khả năng quản lý thư điện tử trực quan.", maintainer: "Synology Inc.", category: "Productivity" },
  { id: "MailPlus-Server", name: "Synology MailPlus Server", version: "4.1.0-21778", status: "running", description: "Máy chủ thư điện tử bảo mật chuẩn doanh nghiệp với bộ lọc spam và chống virus.", maintainer: "Synology Inc.", category: "Productivity" },
  { id: "MariaDB10", name: "MariaDB 10", version: "10.11.11-1551", status: "running", description: "Hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở hiệu năng cao tương thích MySQL.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "TextEditor", name: "Text Editor", version: "1.2.5-0254", status: "running", description: "Trình soạn thảo mã nguồn và văn bản trực tiếp trên giao diện web DSM.", maintainer: "Synology Inc.", category: "Productivity" },
  { id: "VPNCenter", name: "VPN Server", version: "1.4.10-2984", status: "running", description: "Máy chủ VPN hỗ trợ OpenVPN, L2TP/IPSec và PPTP cho truy cập an toàn từ xa.", maintainer: "Synology Inc.", category: "Security" },
  { id: "WebDAVServer", name: "WebDAV Server", version: "2.4.8-20135", status: "running", description: "Dịch vụ chia sẻ tập tin qua giao thức WebDAV an toàn qua HTTPS.", maintainer: "Synology Inc.", category: "Productivity" },
  { id: "arc-control", name: "Arc Control", version: "1.5-7", status: "running", description: "Công cụ quản trị bộ nạp khởi động Arc Loader và phần cứng DSM nâng cao.", maintainer: "AuxXxilium", category: "Utilities", isCommunity: true },
  { id: "UniversalViewer", name: "Universal Viewer", version: "1.4.0-0712", status: "running", description: "Trình xem trước tệp tin đa định dạng trực tiếp trên trình duyệt.", maintainer: "Synology Inc.", category: "Utilities" },
  { id: "java-17-openjdk", name: "Java 17 OpenJDK", version: "17.0.16.7-2", status: "running", description: "Môi trường thực thi Java SE 17 OpenJDK cho các dịch vụ Java trên DSM.", maintainer: "SynoCommunity", category: "Developer Tools", isCommunity: true },
  { id: "ReplicationService", name: "Replication Service", version: "1.3.0-0505", status: "running", description: "Dịch vụ sao chép và nhân bản dữ liệu snapshot giữa các thiết bị Synology.", maintainer: "Synology Inc.", category: "Management" },
  { id: "OAuthService", name: "OAuth Service", version: "1.1.5-0111", status: "running", description: "Dịch vụ ủy quyền và xác thực tài khoản chuẩn OAuth 2.0.", maintainer: "Synology Inc.", category: "Management" },
  { id: "SupportService", name: "Support Service", version: "2.0.5-21076", status: "running", description: "Dịch vụ hỗ trợ kỹ thuật và chuẩn đoán hệ thống Synology.", maintainer: "Synology Inc.", category: "Management" },
  { id: "ActiveInsight", name: "Active Insight", version: "3.0.5-24122", status: "running", description: "Giám sát tình trạng phần cứng, sự cố và tài nguyên hệ thống qua đám mây 24/7.", maintainer: "Synology Inc.", category: "Management" },
  { id: "Calendar", name: "Synology Calendar", version: "3.0.3-21434", status: "running", description: "Quản lý lịch làm việc, sự kiện và đồng bộ hóa CalDAV cá nhân và nhóm.", maintainer: "Synology Inc.", category: "Productivity" },
  { id: "Git", name: "Git Server", version: "2.39.1-1079", status: "running", description: "Máy chủ lưu trữ mã nguồn Git phân tán.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "git", name: "Git CLI Tools", version: "2.55.0-41", status: "running", description: "Bộ công cụ dòng lệnh Git phân tán chuyên nghiệp.", maintainer: "SynoCommunity", category: "Developer Tools", isCommunity: true },
  { id: "HybridShare", name: "Hybrid Share", version: "1.6.0-2023", status: "running", description: "Kết hợp lưu trữ cục bộ NAS với đám mây Synology C2 Storage.", maintainer: "Synology Inc.", category: "Management" },
  { id: "LogCenter", name: "Log Center", version: "1.3.0-1667", status: "running", description: "Thu thập, phân tích và quản lý nhật ký hệ thống Syslog tập trung.", maintainer: "Synology Inc.", category: "Management" },
  { id: "NVIDIARuntimeLibrary", name: "Nvidia GPU Driver", version: "1.2.6-0116", status: "running", description: "Trình điều khiển card đồ họa NVIDIA CUDA cho Container và AI.", maintainer: "Synology Inc.", category: "Utilities" },
  { id: "PHP7.4", name: "PHP 7.4", version: "7.4.33-0130", status: "running", description: "Môi trường thực thi ngôn ngữ kịch bản PHP 7.4.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "PHP8.0", name: "PHP 8.0", version: "8.0.30-0121", status: "running", description: "Môi trường thực thi ngôn ngữ kịch bản PHP 8.0.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "PHP8.2", name: "PHP 8.2", version: "8.2.28-0107", status: "running", description: "Môi trường thực thi ngôn ngữ kịch bản PHP 8.2.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "PHP8.3", name: "PHP 8.3", version: "8.3.27-0004", status: "running", description: "Môi trường thực thi ngôn ngữ kịch bản PHP 8.3.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "Perl", name: "Perl", version: "5.34.1-0301", status: "running", description: "Ngôn ngữ kịch bản xử lý văn bản và tự động hóa hệ thống Perl.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "ProxyServer", name: "Proxy Server", version: "5.2.0-1204", status: "running", description: "Dịch vụ máy chủ ủy nhiệm bộ nhớ đệm HTTP và bảo mật duyệt web.", maintainer: "Synology Inc.", category: "Network" },
  { id: "Python2", name: "Python 2.7", version: "2.7.18-1004", status: "running", description: "Môi trường thực thi ngôn ngữ kịch bản Python 2.7.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "Python3.9", name: "Python 3.9", version: "3.9.22-0015", status: "running", description: "Môi trường thực thi ngôn ngữ kịch bản Python 3.9.", maintainer: "Synology Inc.", category: "Developer Tools" },
  { id: "QuickConnect", name: "QuickConnect", version: "1.0.10-0187", status: "running", description: "Dịch vụ chuyển tiếp truy cập từ xa không cần mở port của Synology.", maintainer: "Synology Inc.", category: "Management" },
  { id: "SMBService", name: "SMB Service", version: "4.15.13-2503", status: "running", description: "Dịch vụ chia sẻ tệp tin SMB / CIFS cho Windows, macOS và Linux.", maintainer: "Synology Inc.", category: "Management" },
  { id: "ScsiTarget", name: "SAN Manager", version: "1.0.12-0338", status: "running", description: "Quản trị lưu trữ khối block-level, LUN và mục tiêu iSCSI SAN.", maintainer: "Synology Inc.", category: "Management" },
  { id: "SecureSignIn", name: "Secure SignIn Service", version: "1.1.6-0391", status: "running", description: "Dịch vụ xác thực đa yếu tố 2FA và phê duyệt đăng nhập không cần mật khẩu.", maintainer: "Synology Inc.", category: "Management" },
  { id: "SimplePermissionManager", name: "Simple Permission Manager", version: "1.0.0-10", status: "running", description: "Tiện ích quản lý phân quyền thư mục và người dùng đơn giản hóa.", maintainer: "Synology Inc.", category: "Management" },
  { id: "SnapshotReplication", name: "Snapshot Replication", version: "7.4.6-1699", status: "running", description: "Bảo vệ dữ liệu gần như tức thời với công nghệ bản ghi nhanh Btrfs snapshot.", maintainer: "Synology Inc.", category: "Backup" },
  { id: "SynologyApplicationService", name: "Synology Application Service", version: "1.9.0-20810", status: "running", description: "Dịch vụ chia sẻ thông báo, gắn thẻ và đồng bộ giữa các ứng dụng Synology.", maintainer: "Synology Inc.", category: "Management" },
  { id: "AntiVirus", name: "Antivirus Essential", version: "1.5.7-3241", status: "running", description: "Ứng dụng quét và tiêu diệt virus, mã độc bảo vệ dữ liệu NAS.", maintainer: "Synology Inc.", category: "Security" },
  { id: "Apache2.4", name: "Apache HTTP Server 2.4", version: "2.4.63-0155", status: "running", description: "Máy chủ web Apache HTTP Server hiệu năng cao cho Web Station.", maintainer: "Synology Inc.", category: "Productivity" },
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

// ==================== PERMISSIONS & ACL MOCK DATA ====================
export const fullAclRights: AclRights = {
  read: true,
  write: true,
  execute: true,
  append: true,
  delete: true,
  deleteChild: true,
  readAttr: true,
  writeAttr: true,
  readPerm: true,
  writePerm: true,
  takeOwner: true,
};

export const rwAclRights: AclRights = {
  read: true,
  write: true,
  execute: true,
  append: true,
  delete: true,
  deleteChild: false,
  readAttr: true,
  writeAttr: true,
  readPerm: true,
  writePerm: false,
  takeOwner: false,
};

export const roAclRights: AclRights = {
  read: true,
  write: false,
  execute: true,
  append: false,
  delete: false,
  deleteChild: false,
  readAttr: true,
  writeAttr: false,
  readPerm: true,
  writePerm: false,
  takeOwner: false,
};

export const denyAclRights: AclRights = {
  read: false,
  write: false,
  execute: false,
  append: false,
  delete: false,
  deleteChild: false,
  readAttr: false,
  writeAttr: false,
  readPerm: false,
  writePerm: false,
  takeOwner: false,
};

export const mockDsmUsers: DsmUser[] = [
  {
    name: "admin",
    uid: 1024,
    description: "Quản trị viên hệ thống (System Administrator)",
    email: "admin@synology.local",
    groups: ["administrators", "users"],
    status: "active",
    isAdmin: true,
  },
  {
    name: "khoavo",
    uid: 1026,
    description: "Trưởng nhóm Kiến trúc sư phần mềm (Lead Architect)",
    email: "khoavo@company.local",
    groups: ["administrators", "Developers", "users"],
    status: "active",
    isAdmin: true,
  },
  {
    name: "minh_dev",
    uid: 1027,
    description: "Kỹ sư phần mềm Fullstack (Senior Developer)",
    email: "minh.dev@company.local",
    groups: ["Developers", "users"],
    status: "active",
    isAdmin: false,
  },
  {
    name: "lan_accountant",
    uid: 1028,
    description: "Trưởng phòng Kế toán & Tài chính (CFO)",
    email: "lan.cfo@company.local",
    groups: ["Accounting", "users"],
    status: "active",
    isAdmin: false,
  },
  {
    name: "media_bot",
    uid: 1029,
    description: "Tài khoản dịch vụ Plex & Streaming (Media Agent)",
    email: "bot.media@company.local",
    groups: ["MediaStreamers", "users"],
    status: "active",
    isAdmin: false,
  },
  {
    name: "guest",
    uid: 1030,
    description: "Tài khoản khách mặc định (Guest Account - Đã vô hiệu)",
    groups: ["users"],
    status: "disabled",
    isAdmin: false,
  },
];

export const mockDsmGroups: DsmGroup[] = [
  {
    name: "administrators",
    gid: 101,
    description: "Nhóm Quản trị viên cấp cao nhất trên DSM",
    members: ["admin", "khoavo"],
  },
  {
    name: "Developers",
    gid: 102,
    description: "Phòng Công nghệ & Lập trình phần mềm",
    members: ["khoavo", "minh_dev"],
  },
  {
    name: "Accounting",
    gid: 103,
    description: "Phòng Tài chính - Kế toán doanh nghiệp",
    members: ["lan_accountant"],
  },
  {
    name: "MediaStreamers",
    gid: 104,
    description: "Nhóm dịch vụ truyền thông, phát nhạc & video",
    members: ["media_bot"],
  },
  {
    name: "users",
    gid: 100,
    description: "Tất cả người dùng trên Synology NAS (Mặc định)",
    members: ["admin", "khoavo", "minh_dev", "lan_accountant", "media_bot", "guest"],
  },
];

export const mockFolderAcls: Record<string, FolderAclInfo> = {
  "/docker": {
    path: "/docker",
    realPath: "/volume1/docker",
    owner: "admin",
    group: "administrators",
    posixPerm: "0755",
    isAclMode: true,
    isInheritEnabled: true,
    parentPath: "/",
    directRulesCount: 3,
    inheritedRulesCount: 1,
    accessList: [
      {
        targetName: "admin",
        isGroup: false,
        displayName: "admin (Owner)",
        userGroups: ["administrators", "users"],
        level: "full_control",
        inheritance: "owner",
        rights: fullAclRights,
        isOwner: true,
        explanation: "Chủ sở hữu thư mục (POSIX & Windows ACL Owner)",
      },
      {
        targetName: "administrators",
        isGroup: true,
        displayName: "Nhóm Quản trị viên (administrators)",
        level: "full_control",
        inheritance: "direct",
        rights: fullAclRights,
        explanation: "Quy tắc ACL gán trực tiếp cho nhóm administrators",
      },
      {
        targetName: "khoavo",
        isGroup: false,
        displayName: "khoavo",
        userGroups: ["administrators", "Developers", "users"],
        level: "full_control",
        inheritance: "inherited_group",
        inheritedFrom: "administrators",
        rights: fullAclRights,
        explanation: "Kế thừa quyền Full Control qua thành viên nhóm administrators",
      },
      {
        targetName: "lan_accountant",
        isGroup: false,
        displayName: "lan_accountant",
        userGroups: ["Accounting", "users"],
        level: "deny",
        inheritance: "direct",
        rights: denyAclRights,
        explanation: "Quy tắc Deny trực tiếp ngăn truy cập vào thư mục Docker",
      },
      {
        targetName: "guest",
        isGroup: false,
        displayName: "guest",
        userGroups: ["users"],
        level: "deny",
        inheritance: "direct",
        rights: denyAclRights,
        explanation: "Quy tắc Deny trực tiếp cho tài khoản Guest",
      },
    ],
  },
  "/projects": {
    path: "/projects",
    realPath: "/volume1/projects",
    owner: "khoavo",
    group: "Developers",
    posixPerm: "0770",
    isAclMode: true,
    isInheritEnabled: true,
    parentPath: "/",
    directRulesCount: 4,
    inheritedRulesCount: 0,
    accessList: [
      {
        targetName: "khoavo",
        isGroup: false,
        displayName: "khoavo (Owner)",
        userGroups: ["administrators", "Developers", "users"],
        level: "full_control",
        inheritance: "owner",
        rights: fullAclRights,
        isOwner: true,
        explanation: "Chủ sở hữu thư mục /projects và gán quyền trực tiếp",
      },
      {
        targetName: "Developers",
        isGroup: true,
        displayName: "Nhóm Lập trình viên (Developers)",
        level: "read_write",
        inheritance: "direct",
        rights: rwAclRights,
        explanation: "Quy tắc ACL cấp quyền Đọc & Ghi trực tiếp cho nhóm Developers",
      },
      {
        targetName: "minh_dev",
        isGroup: false,
        displayName: "minh_dev",
        userGroups: ["Developers", "users"],
        level: "read_write",
        inheritance: "inherited_group",
        inheritedFrom: "Developers",
        rights: rwAclRights,
        explanation: "Kế thừa quyền Read/Write do là thành viên của nhóm Developers",
      },
      {
        targetName: "admin",
        isGroup: false,
        displayName: "admin",
        userGroups: ["administrators", "users"],
        level: "full_control",
        inheritance: "direct",
        rights: fullAclRights,
        explanation: "Quy tắc ACL gán trực tiếp cho quản trị viên admin",
      },
      {
        targetName: "lan_accountant",
        isGroup: false,
        displayName: "lan_accountant",
        userGroups: ["Accounting", "users"],
        level: "deny",
        inheritance: "direct",
        rights: denyAclRights,
        explanation: "Quy tắc ACL chặn (Deny) phòng kế toán truy cập mã nguồn dự án",
      },
    ],
  },
  "/projects/frontend": {
    path: "/projects/frontend",
    realPath: "/volume1/projects/frontend",
    owner: "minh_dev",
    group: "Developers",
    posixPerm: "0775",
    isAclMode: true,
    isInheritEnabled: true,
    parentPath: "/projects",
    directRulesCount: 1,
    inheritedRulesCount: 3,
    accessList: [
      {
        targetName: "minh_dev",
        isGroup: false,
        displayName: "minh_dev (Owner)",
        userGroups: ["Developers", "users"],
        level: "full_control",
        inheritance: "owner",
        rights: fullAclRights,
        isOwner: true,
        explanation: "Chủ sở hữu thư mục con /projects/frontend (Toàn quyền)",
      },
      {
        targetName: "khoavo",
        isGroup: false,
        displayName: "khoavo",
        userGroups: ["administrators", "Developers", "users"],
        level: "full_control",
        inheritance: "inherited_folder",
        inheritedFrom: "/projects",
        rights: fullAclRights,
        explanation: "Kế thừa quyền Full Control từ thư mục cha /projects",
      },
      {
        targetName: "admin",
        isGroup: false,
        displayName: "admin",
        userGroups: ["administrators", "users"],
        level: "full_control",
        inheritance: "inherited_folder",
        inheritedFrom: "/projects",
        rights: fullAclRights,
        explanation: "Kế thừa quyền Full Control từ thư mục cha /projects",
      },
      {
        targetName: "Developers",
        isGroup: true,
        displayName: "Nhóm Developers",
        level: "read_write",
        inheritance: "inherited_folder",
        inheritedFrom: "/projects",
        rights: rwAclRights,
        explanation: "Kế thừa quyền Read-Write của nhóm Developers từ thư mục /projects",
      },
      {
        targetName: "lan_accountant",
        isGroup: false,
        displayName: "lan_accountant",
        userGroups: ["Accounting", "users"],
        level: "deny",
        inheritance: "inherited_folder",
        inheritedFrom: "/projects",
        rights: denyAclRights,
        explanation: "Kế thừa quy tắc Deny từ thư mục cha /projects",
      },
    ],
  },
  "/projects/backend": {
    path: "/projects/backend",
    realPath: "/volume1/projects/backend",
    owner: "khoavo",
    group: "Developers",
    posixPerm: "0770",
    isAclMode: true,
    isInheritEnabled: true,
    parentPath: "/projects",
    directRulesCount: 1,
    inheritedRulesCount: 3,
    accessList: [
      {
        targetName: "khoavo",
        isGroup: false,
        displayName: "khoavo (Owner)",
        userGroups: ["administrators", "Developers", "users"],
        level: "full_control",
        inheritance: "owner",
        rights: fullAclRights,
        isOwner: true,
        explanation: "Chủ sở hữu thư mục con backend và quản trị viên",
      },
      {
        targetName: "minh_dev",
        isGroup: false,
        displayName: "minh_dev",
        userGroups: ["Developers", "users"],
        level: "read_write",
        inheritance: "inherited_folder",
        inheritedFrom: "/projects (qua nhóm Developers)",
        rights: rwAclRights,
        explanation: "Kế thừa quyền Đọc & Ghi từ thư mục cha /projects qua nhóm Developers",
      },
      {
        targetName: "admin",
        isGroup: false,
        displayName: "admin",
        userGroups: ["administrators", "users"],
        level: "full_control",
        inheritance: "inherited_folder",
        inheritedFrom: "/projects",
        rights: fullAclRights,
        explanation: "Kế thừa quyền Full Control từ thư mục cha /projects",
      },
      {
        targetName: "lan_accountant",
        isGroup: false,
        displayName: "lan_accountant",
        userGroups: ["Accounting", "users"],
        level: "deny",
        inheritance: "inherited_folder",
        inheritedFrom: "/projects",
        rights: denyAclRights,
        explanation: "Kế thừa quy tắc Deny từ thư mục cha /projects",
      },
    ],
  },
  "/finance": {
    path: "/finance",
    realPath: "/volume1/finance",
    owner: "lan_accountant",
    group: "Accounting",
    posixPerm: "0700",
    isAclMode: true,
    isInheritEnabled: true,
    parentPath: "/",
    directRulesCount: 4,
    inheritedRulesCount: 0,
    accessList: [
      {
        targetName: "lan_accountant",
        isGroup: false,
        displayName: "lan_accountant (Owner)",
        userGroups: ["Accounting", "users"],
        level: "full_control",
        inheritance: "owner",
        rights: fullAclRights,
        isOwner: true,
        explanation: "Chủ sở hữu thư mục Tài chính /finance",
      },
      {
        targetName: "Accounting",
        isGroup: true,
        displayName: "Nhóm Kế toán (Accounting)",
        level: "read_write",
        inheritance: "direct",
        rights: rwAclRights,
        explanation: "Quy tắc ACL cấp quyền trực tiếp cho phòng Kế toán",
      },
      {
        targetName: "admin",
        isGroup: false,
        displayName: "admin",
        userGroups: ["administrators", "users"],
        level: "full_control",
        inheritance: "direct",
        rights: fullAclRights,
        explanation: "Quyền quản trị viên hệ thống gán trực tiếp",
      },
      {
        targetName: "Developers",
        isGroup: true,
        displayName: "Nhóm Lập trình (Developers)",
        level: "deny",
        inheritance: "direct",
        rights: denyAclRights,
        explanation: "Quy tắc ACL chặn (Deny) tuyệt đối nhóm Lập trình viên vào thư mục tài chính",
      },
      {
        targetName: "minh_dev",
        isGroup: false,
        displayName: "minh_dev",
        userGroups: ["Developers", "users"],
        level: "deny",
        inheritance: "inherited_group",
        inheritedFrom: "Developers",
        rights: denyAclRights,
        explanation: "Bị chặn truy cập (Deny) do là thành viên của nhóm Developers",
      },
    ],
  },
  "/finance/2026-reports": {
    path: "/finance/2026-reports",
    realPath: "/volume1/finance/2026-reports",
    owner: "lan_accountant",
    group: "Accounting",
    posixPerm: "0700",
    isAclMode: true,
    isInheritEnabled: true,
    parentPath: "/finance",
    directRulesCount: 0,
    inheritedRulesCount: 4,
    accessList: [
      {
        targetName: "lan_accountant",
        isGroup: false,
        displayName: "lan_accountant (Owner)",
        userGroups: ["Accounting", "users"],
        level: "full_control",
        inheritance: "owner",
        rights: fullAclRights,
        isOwner: true,
        explanation: "Chủ sở hữu và kế thừa toàn quyền từ thư mục gốc /finance",
      },
      {
        targetName: "Accounting",
        isGroup: true,
        displayName: "Nhóm Kế toán (Accounting)",
        level: "read_write",
        inheritance: "inherited_folder",
        inheritedFrom: "/finance",
        rights: rwAclRights,
        explanation: "Kế thừa quyền Đọc & Ghi từ thư mục cha /finance",
      },
      {
        targetName: "admin",
        isGroup: false,
        displayName: "admin",
        userGroups: ["administrators", "users"],
        level: "full_control",
        inheritance: "inherited_folder",
        inheritedFrom: "/finance",
        rights: fullAclRights,
        explanation: "Kế thừa quyền Full Control từ thư mục cha /finance",
      },
      {
        targetName: "minh_dev",
        isGroup: false,
        displayName: "minh_dev",
        userGroups: ["Developers", "users"],
        level: "deny",
        inheritance: "inherited_folder",
        inheritedFrom: "/finance",
        rights: denyAclRights,
        explanation: "Kế thừa quy tắc Deny từ thư mục cha /finance",
      },
    ],
  },
  "/downloads": {
    path: "/downloads",
    realPath: "/volume1/downloads",
    owner: "admin",
    group: "users",
    posixPerm: "0777",
    isAclMode: true,
    isInheritEnabled: true,
    parentPath: "/",
    directRulesCount: 2,
    inheritedRulesCount: 0,
    accessList: [
      {
        targetName: "admin",
        isGroup: false,
        displayName: "admin (Owner)",
        userGroups: ["administrators", "users"],
        level: "full_control",
        inheritance: "owner",
        rights: fullAclRights,
        isOwner: true,
        explanation: "Chủ sở hữu thư mục Downloads",
      },
      {
        targetName: "users",
        isGroup: true,
        displayName: "Nhóm tất cả người dùng (users)",
        level: "read_write",
        inheritance: "direct",
        rights: rwAclRights,
        explanation: "Cấp quyền Đọc & Ghi công khai cho toàn bộ người dùng trong nhóm users",
      },
      {
        targetName: "khoavo",
        isGroup: false,
        displayName: "khoavo",
        userGroups: ["administrators", "Developers", "users"],
        level: "read_write",
        inheritance: "inherited_group",
        inheritedFrom: "users",
        rights: rwAclRights,
        explanation: "Kế thừa quyền Đọc & Ghi qua nhóm users",
      },
      {
        targetName: "minh_dev",
        isGroup: false,
        displayName: "minh_dev",
        userGroups: ["Developers", "users"],
        level: "read_write",
        inheritance: "inherited_group",
        inheritedFrom: "users",
        rights: rwAclRights,
        explanation: "Kế thừa quyền Đọc & Ghi qua nhóm users",
      },
      {
        targetName: "lan_accountant",
        isGroup: false,
        displayName: "lan_accountant",
        userGroups: ["Accounting", "users"],
        level: "read_write",
        inheritance: "inherited_group",
        inheritedFrom: "users",
        rights: rwAclRights,
        explanation: "Kế thừa quyền Đọc & Ghi qua nhóm users",
      },
    ],
  },
  "/video": {
    path: "/video",
    realPath: "/volume1/video",
    owner: "admin",
    group: "users",
    posixPerm: "0755",
    isAclMode: true,
    isInheritEnabled: true,
    parentPath: "/",
    directRulesCount: 3,
    inheritedRulesCount: 0,
    accessList: [
      {
        targetName: "admin",
        isGroup: false,
        displayName: "admin (Owner)",
        userGroups: ["administrators", "users"],
        level: "full_control",
        inheritance: "owner",
        rights: fullAclRights,
        isOwner: true,
        explanation: "Chủ sở hữu thư mục Video",
      },
      {
        targetName: "MediaStreamers",
        isGroup: true,
        displayName: "Nhóm Media Streaming",
        level: "read_write",
        inheritance: "direct",
        rights: rwAclRights,
        explanation: "Quyền trực tiếp cho dịch vụ Streaming (Plex/Jellyfin)",
      },
      {
        targetName: "media_bot",
        isGroup: false,
        displayName: "media_bot",
        userGroups: ["MediaStreamers", "users"],
        level: "read_write",
        inheritance: "inherited_group",
        inheritedFrom: "MediaStreamers",
        rights: rwAclRights,
        explanation: "Kế thừa quyền Đọc & Ghi qua nhóm MediaStreamers",
      },
      {
        targetName: "users",
        isGroup: true,
        displayName: "Nhóm người dùng (users)",
        level: "read_only",
        inheritance: "direct",
        rights: roAclRights,
        explanation: "Quy tắc ACL cấp quyền Chỉ Đọc (Read-Only) để xem phim",
      },
      {
        targetName: "khoavo",
        isGroup: false,
        displayName: "khoavo",
        userGroups: ["administrators", "Developers", "users"],
        level: "full_control",
        inheritance: "inherited_group",
        inheritedFrom: "administrators",
        rights: fullAclRights,
        explanation: "Kế thừa Full Control từ nhóm administrators",
      },
      {
        targetName: "minh_dev",
        isGroup: false,
        displayName: "minh_dev",
        userGroups: ["Developers", "users"],
        level: "read_only",
        inheritance: "inherited_group",
        inheritedFrom: "users",
        rights: roAclRights,
        explanation: "Kế thừa quyền Chỉ Đọc từ nhóm users",
      },
    ],
  },
  "/homes/khoavo": {
    path: "/homes/khoavo",
    realPath: "/volume1/homes/khoavo",
    owner: "khoavo",
    group: "users",
    posixPerm: "0700",
    isAclMode: true,
    isInheritEnabled: false,
    parentPath: "/homes",
    directRulesCount: 3,
    inheritedRulesCount: 0,
    accessList: [
      {
        targetName: "khoavo",
        isGroup: false,
        displayName: "khoavo (Owner)",
        userGroups: ["administrators", "Developers", "users"],
        level: "full_control",
        inheritance: "owner",
        rights: fullAclRights,
        isOwner: true,
        explanation: "Thư mục cá nhân riêng tư của người dùng khoavo",
      },
      {
        targetName: "admin",
        isGroup: false,
        displayName: "admin",
        userGroups: ["administrators", "users"],
        level: "full_control",
        inheritance: "direct",
        rights: fullAclRights,
        explanation: "Quyền quản trị viên cấp cao nhất DSM",
      },
      {
        targetName: "users",
        isGroup: true,
        displayName: "Nhóm tất cả người dùng (users)",
        level: "deny",
        inheritance: "direct",
        rights: denyAclRights,
        explanation: "Chặn tất cả người dùng khác vào thư mục cá nhân",
      },
    ],
  },
  "/public-share": {
    path: "/public-share",
    realPath: "/volume1/public-share",
    owner: "admin",
    group: "users",
    posixPerm: "0777",
    isAclMode: true,
    isInheritEnabled: true,
    parentPath: "/",
    directRulesCount: 2,
    inheritedRulesCount: 0,
    accessList: [
      {
        targetName: "admin",
        isGroup: false,
        displayName: "admin (Owner)",
        userGroups: ["administrators", "users"],
        level: "full_control",
        inheritance: "owner",
        rights: fullAclRights,
        isOwner: true,
        explanation: "Chủ sở hữu thư mục chia sẻ công cộng",
      },
      {
        targetName: "users",
        isGroup: true,
        displayName: "Nhóm người dùng chung (users)",
        level: "read_write",
        inheritance: "direct",
        rights: rwAclRights,
        explanation: "Mọi thành viên NAS đều có quyền Đọc & Ghi tài liệu tại đây",
      },
      {
        targetName: "guest",
        isGroup: false,
        displayName: "guest",
        userGroups: ["users"],
        level: "read_only",
        inheritance: "direct",
        rights: roAclRights,
        explanation: "Quy tắc ACL cấp quyền Chỉ Đọc cho khách",
      },
    ],
  },
};

export const mockSecurityAuditItems: SecurityAuditItem[] = [
  {
    id: "sec_1",
    severity: "critical",
    title: "Thư mục công cộng cấp quyền Ghi không hạn chế (Unrestricted Write)",
    description: "Thư mục /downloads và /public-share đang cấp quyền Read-Write trực tiếp cho nhóm 'users'. Bất kỳ ai có tài khoản đều có thể thêm, sửa, xóa tệp mà không cần phê duyệt.",
    affectedPath: "/downloads",
    affectedUsers: ["users", "guest"],
    recommendation: "Chuyển quyền nhóm 'users' thành Read-Only, chỉ cấp quyền Write cho người dùng cụ thể hoặc bật tính năng Phê duyệt (Approval workflow).",
  },
  {
    id: "sec_2",
    severity: "warning",
    title: "Tài khoản bị vô hiệu nhưng vẫn có quy tắc ACL riêng (Orphan ACL Rule)",
    description: "Tài khoản 'guest' đang ở trạng thái Disabled nhưng vẫn có các quy tắc ACL riêng biệt tại /public-share và /docker.",
    affectedPath: "/public-share",
    affectedUsers: ["guest"],
    recommendation: "Xóa sạch các mục ACL gắn đích danh cho tài khoản bị khóa để tối ưu bảng phân quyền Windows ACL.",
  },
  {
    id: "sec_3",
    severity: "info",
    title: "Cấu trúc Kế thừa đa tầng hoạt động an toàn (Active Inheritance)",
    description: "Các nhánh thư mục /projects và /finance đang áp dụng hoàn hảo cơ chế Kế thừa ACL tự động từ thư mục cha xuống thư mục con (3 cấp độ).",
    affectedPath: "/projects/frontend",
    affectedUsers: ["khoavo", "minh_dev", "lan_accountant"],
    recommendation: "Duy trì cơ chế kế thừa này để tránh phải phân quyền thủ công khi tạo thêm thư mục con mới.",
  },
];

