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
  cookie?: string;
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

export type ServiceCategory = "file" | "system" | "network" | "application";
export type ServiceStatus = "running" | "stopped" | "enabled" | "disabled";

export interface ServiceItem {
  id: string; // e.g. "smb", "afp", "nfs", "ftp", "sftp", "ssh", "telnet", "webdav", or package id
  name: string;
  displayName: string;
  description: string;
  category: ServiceCategory;
  enabled: boolean;
  running?: boolean; // for services that have running state
  status: ServiceStatus;
  port?: number | null;
  version?: string;
  api?: string;
  details?: Record<string, any>;
  canToggle: boolean;
}

export interface TerminalInfo {
  enable_ssh: boolean;
  enable_telnet: boolean;
  ssh_port: number;
  hostname?: string;
}

export interface FileServiceStatus {
  smb: { enabled: boolean; workgroup?: string; details?: any };
  afp: { enabled: boolean; details?: any };
  nfs: { enabled: boolean; enable_nfs_v4?: boolean; details?: any };
  ftp: { enabled: boolean; enable_ftps?: boolean; port?: number; details?: any };
  sftp: { enabled: boolean; port?: number; details?: any };
  syslog?: any;
}

export type NotificationLevel = "info" | "warning" | "error" | "success";
export type NotificationCategory = "system" | "storage" | "package" | "network" | "security" | "backup" | "file" | "app";

export interface NotificationItem {
  id: string;
  title: string; // raw title key e.g. "SYNO.SDS.MFP.Master:notification"
  displayTitle: string; // human readable after strings lookup
  className: string; // e.g. "SYNO.SDS.StorageManager.Instance"
  category: NotificationCategory;
  level: NotificationLevel;
  messages: string[]; // decoded & templated display messages
  rawMessages: string[]; // original raw json strings
  time: number; // epoch seconds
  timeAgo?: string;
  read: boolean;
  details?: Record<string, any>;
}

export interface DSMNotifyStrings {
  [titleKey: string]: { title: string; msg: string };
}

export interface AppNotifyItem {
  id: string;
  title: string;
  content: string;
  level: NotificationLevel;
  time: number;
  unread: boolean;
  pkgId?: string;
}
