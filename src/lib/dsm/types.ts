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

export interface DockerPortBinding {
  hostPort: string;
  containerPort: string;
  protocol: "tcp" | "udp";
}

export interface DockerVolumeMount {
  hostPath: string;
  containerPath: string;
  mode: "rw" | "ro";
}

export interface DockerEnvVar {
  key: string;
  value: string;
}

export interface DockerContainerStats {
  cpuPercent: number;
  memoryUsageMB: number;
  memoryLimitMB: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pidsCount: number;
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
  portBindings?: DockerPortBinding[];
  volumeMounts?: DockerVolumeMount[];
  envVars?: DockerEnvVar[];
  stats?: DockerContainerStats;
  uptime?: string;
  ipAddress?: string;
  gateway?: string;
  macAddress?: string;
  networkMode?: string;
  restartPolicy?: "no" | "always" | "unless-stopped" | "on-failure";
  command?: string;
  cpuLimit?: number;
  memoryLimitMB?: number;
}

export interface DockerContainerDetails extends DockerContainer {
  fullId?: string;
  entrypoint?: string[];
  autoRestart?: boolean;
  privileged?: boolean;
  labels?: Record<string, string>;
}

export interface DockerProjectService {
  name: string;
  image: string;
  status: "running" | "stopped" | "created";
  ports?: string[];
}

export interface DockerProject {
  id: string;
  name: string;
  status: "running" | "stopped" | "building" | "partial";
  path: string;
  yamlContent: string;
  services: DockerProjectService[];
  created: string;
  updated?: string;
  totalCpuPercent?: number;
  totalMemoryUsageMB?: number;
  totalMemoryFormatted?: string;
  containers?: DockerContainerDetails[];
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  sizeMB: number;
  sizeFormatted: string;
  created: string;
  containersCount?: number;
  isUsed?: boolean;
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
  slotName?: string;
  model: string;
  serial: string;
  status: "normal" | "warning" | "critical";
  temp: number;
  size: number;
  health: string;
  driveType?: "HDD" | "NVMe" | "SSD";
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
  isCache?: boolean;
  cacheType?: "read_write" | "read_only" | "storage_pool";
  targetVolume?: string;
  hitRate?: number;
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

// ==================== FIREWALL & SECURITY ====================
export type FirewallProtocol = "all" | "tcp" | "udp";
export type FirewallAction = "allow" | "deny";
export type FirewallSourceType = "all" | "subnet" | "single_ip" | "geoip" | "local";

export interface FirewallRule {
  id: string;
  name: string;
  serviceId?: string;
  ports: string; // e.g. "5000,5001", "22", "80,443", "all"
  protocol: FirewallProtocol;
  sourceType: FirewallSourceType;
  sourceValue: string; // e.g. "192.168.1.0/24", "VN,US,SG", "all", "192.168.31.50"
  action: FirewallAction;
  enabled: boolean;
  order: number;
  ifname?: string; // "all", "ovs_eth0", "eth0"
}

export interface FirewallConfig {
  enabled: boolean;
  defaultProfile: string;
  allowUnmatched: boolean;
  rules: FirewallRule[];
}

export interface AutoBlockConfig {
  enabled: boolean;
  attempts: number;
  withinMinutes: number;
  enableUnblock: boolean;
  unblockDays: number;
  blockedCount: number;
  allowedCount: number;
}

export interface BlockedIpItem {
  ip: string;
  denyTime: string;
  expireTime?: string;
  country?: string;
}

