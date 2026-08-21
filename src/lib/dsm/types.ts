export interface DSMConnectionConfig {
  host: string;
  port: number;
  https: boolean;
  account: string;
  password?: string;
  otp?: string;
  ignoreCert?: boolean;
}

export interface DSMSession {
  sid: string;
  synoToken?: string;
  did?: string;
  isConnected: boolean;
  isDemo: boolean;
  dsmVersion: number;
  versionString: string;
  model: string;
  hostname: string;
  account: string;
}

export interface SystemInfo {
  model: string;
  serial: string;
  version: string;
  uptime: number;
  temperature: number;
  time: string;
  ramTotal: number;
  ramUsed: number;
  cpuModel: string;
  cpuCores: number;
}

export interface SystemUtilization {
  cpuPercent: number;
  memoryPercent: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  networkRxBytes: number;
  networkTxBytes: number;
  diskReadBytes: number;
  diskWriteBytes: number;
  timestamp: number;
}

export interface DSMProcess {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  user: string;
  status: string;
}

export interface FileItem {
  path: string;
  name: string;
  isdir: boolean;
  size: number;
  mtime: number;
  owner?: string;
  filetype?: string;
  perm?: string;
  realPath?: string;
  itemCount?: number;
  mimeType?: string;
  content?: string;
}

export interface ShareLink {
  id: string;
  url: string;
  path: string;
  name: string;
  date_expired?: string;
  has_password?: boolean;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: "running" | "stopped" | "paused";
  created: string;
  ports: string[];
  cpuUsage: number;
  memoryUsage: string;
}

export interface DownloadTask {
  id: string;
  title: string;
  size: number;
  status: "downloading" | "paused" | "finished" | "error" | "waiting";
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  type: string;
}

export interface DriveInfo {
  slot: number;
  model: string;
  serial: string;
  status: "normal" | "warning" | "critical";
  temp: number;
  size: number;
  health: string;
}

export interface StorageVolume {
  id: string;
  name: string;
  path: string;
  fsType: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  status: "normal" | "warning" | "critical";
  drives: DriveInfo[];
}

export interface PackageItem {
  id: string;
  name: string;
  version: string;
  status: "running" | "stopped";
  description: string;
  maintainer: string;
}
