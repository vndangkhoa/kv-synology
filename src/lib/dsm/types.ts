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
  status: "downloading" | "paused" | "finished" | "error" | "waiting" | "seeding" | "hash_checking" | "extracting" | "filehosting_waiting" | "finishing";
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  type: string;
  uri?: string;
  destination?: string;
  username?: string;
  createdTime?: number;
  additional?: any;
}

export interface DownloadStationInfo {
  is_manager: boolean;
  version: number;
  version_string: string;
}

export interface DownloadStationConfig {
  bt_max_download: number;
  bt_max_upload: number;
  nzb_max_download: number;
  http_max_download: number;
  ftp_max_download: number;
  emule_max_download: number;
  emule_max_upload: number;
  emule_enabled: boolean;
  unzip_service_enabled: boolean;
  default_destination: string;
  emule_default_destination: string;
}

export interface DownloadStationSchedule {
  enabled: boolean;
  emule_enabled: boolean;
}

export interface DownloadStationStatistic {
  speed_download: number;
  speed_upload: number;
  emule_speed_download: number;
  emule_speed_upload: number;
  nzb_speed_download: number;
  nzb_speed_upload: number;
}

export interface DownloadTaskDetail extends DownloadTask {
  detail?: {
    uri: string;
    destination: string;
    create_time: number;
    priority: string;
    username: string;
  };
  transfer?: {
    size_downloaded: number;
    size_uploaded: number;
    speed_download: number;
    speed_upload: number;
  };
  file?: Array<{ filename: string; size: number; downloaded: number; priority: string }>;
  tracker?: Array<{ url: string; status: string; seeds: number; peers: number }>;
  peer?: Array<{ address: string; progress: number; agent: string }>;
}

export interface RSSSite {
  id: string;
  title: string;
  url: string;
  username?: string;
  enabled?: boolean;
  is_updating?: boolean;
}

export interface RSSFeed {
  id: string;
  title: string;
  url: string;
  description?: string;
  publish_date?: string;
  size?: number;
}

export interface BTSearchTask {
  taskId: string;
  keyword: string;
}

export interface BTSearchResult {
  title: string;
  download: string;
  size: number;
  datetime: string;
  seednum: number;
  leech: number;
  category: string;
  peers?: number;
  seeds?: number;
}

export interface HostAccount {
  id?: string;
  username: string;
  password?: string;
  status?: "valid" | "invalid" | "expired" | "active";
  premium?: boolean;
}

export interface HostModule {
  id: string; // e.g. "fshare", "googledrive", "mediafire", "MegaNz", "rapidgator", "youtube", "1fichier"
  name: string;
  displayname?: string;
  type?: string; // "pyload" | "syno" | "custom"
  description?: string;
  host_type?: "premium" | "free" | "all";
  version?: string;
  has_account?: boolean;
  auth_needed?: boolean;
  can_be_disabled?: boolean;
  removable?: boolean;
  experimental?: boolean;
  enabled: boolean;
  username?: string;
  password?: string;
  valid?: boolean;
  accounts?: HostAccount[];
  supportedUrls?: string[];
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
  // Production SMART & Spec fields
  device?: string;
  smartStatus?: string;
  badSectors?: number;
  reallocatedSectors?: number;
  pendingSectors?: number;
  powerOnHours?: number;
  remainLife?: number;
  fwVersion?: string;
  allocationRole?: string;
  location?: string;
  driveAction?: string;
  is4Kn?: boolean;
  sectorSize?: number;
  writeCacheEnabled?: boolean;
  supportWriteCache?: boolean;
  interfaceType?: string;
  rawSizeBytes?: number;
}

export interface DriveBenchmarkResult {
  device: string;
  readSpeedMBs: number;
  writeSpeedMBs: number;
  readIOPS?: number;
  writeIOPS?: number;
  latencyMs?: number;
  time?: string;
  status: "idle" | "running" | "finished" | "failed";
}

export interface SharedFolderUsage {
  name: string;
  path: string;
  sizeBytes: number;
  fileCount?: number;
}

export interface VolumeUsageDetail {
  volumeId: string;
  volumePath: string;
  volumeName: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPercent: number;
  sharedFoldersBytes: number;
  sharedFolders: SharedFolderUsage[];
  othersBytes: number;
  dockerBytes?: number;
  packagesBytes?: number;
  recycleBinBytes?: number;
  isScanning?: boolean;
}

export interface CacheAdvisorResult {
  volumePath: string;
  recommendedSizeGB: number;
  analyzedDays: number;
  hitRateEstimate: number;
  status: "calculated" | "analyzing" | "disabled";
}

export interface SmartAttribute {
  id: number;
  name: string;
  value: number;
  worst: number;
  threshold: number;
  raw: string;
  rawValue: number;
}

export interface SmartInfo {
  diskId: string;
  model: string;
  serial: string;
  fwVersion: string;
  smartStatus: string;
  temperature: number;
  powerOnHours: number;
  powerCycleCount: number;
  reallocatedSectorCount: number;
  pendingSectorCount: number;
  offlineUncorrectable: number;
  badSectors: number;
  remainLife?: number;
  attributes: SmartAttribute[];
  testStatus?: string;
  testProgress?: number;
}

export interface HddHealthConfig {
  badSctrThrEnabled: boolean;
  remainLifeThrEnabled: boolean;
  remainLifeThrValue: number;
  wddaEnabled: boolean;
  healthReportEnabled: boolean;
}

export interface ScrubState {
  status: "idle" | "running" | "paused" | "finished" | "crashed";
  progress: number;
  type: "pool" | "volume" | "btrfs";
  spaceId?: string;
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
  raidType?: string;
  poolId?: string;
  poolPath?: string;
  numId?: number;
}

export interface StoragePool {
  id: string;
  numId?: number;
  name: string;
  poolPath: string;
  raidType: string;
  status: "normal" | "warning" | "critical" | "degraded";
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  drives: DriveInfo[];
  scrubSupported?: boolean;
  scrubbingState?: ScrubState;
}

export interface SsdCacheItem {
  id: string;
  name: string;
  type: "read_only" | "read_write";
  status: "normal" | "warning" | "critical";
  totalBytes: number;
  usedBytes: number;
  reusableBytes?: number;
  hitRate?: number;
  drives: DriveInfo[];
  targetVolume?: string;
  bypassSequential?: boolean;
}

export interface HotSpareItem {
  id: string;
  name: string;
  device: string;
  pools: string[];
  status: string;
}

export interface DiskTestLogItem {
  time: string;
  type: string;
  status: string;
  device: string;
  lifeRemain?: number;
}

export interface StorageFullInfo {
  volumes: StorageVolume[];
  storagePools: StoragePool[];
  ssdCaches: SsdCacheItem[];
  hotSpares: HotSpareItem[];
  disks: DriveInfo[];
  env?: any;
}

export interface PackageItem {
  id: string;
  name: string;
  version: string;
  status: "running" | "stopped";
  description: string;
  maintainer: string;
  category?: string;
  autoUpgrade?: boolean;
  size?: number | string;
  iconUrl?: string;
  sourceUrl?: string;
  isCommunity?: boolean;
  installed?: boolean;
  hasUpdate?: boolean;
  latestVersion?: string;
  changeLog?: string;
}

export interface PackageServer {
  id: string;
  name: string;
  url: string;
  enabled?: boolean;
  packageCount?: number;
  isDefault?: boolean;
}

export interface PackageInstallPayload {
  id?: string;
  name: string;
  version?: string;
  description?: string;
  maintainer?: string;
  url?: string;
  spkFile?: string;
  category?: string;
  isCommunity?: boolean;
}

export interface PackageSetting {
  id: string;
  autoUpgrade?: boolean;
  displayName?: string;
  description?: string;
  maintainer?: string;
}

export type AiProviderType = "gemini" | "deepseek" | "claude" | "openai" | "opencode" | "openrouter" | "webllm" | "heuristic";

export interface McpToolCallAction {
  tool: string;
  params: Record<string, any>;
  result?: {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
  };
}

export interface AiProviderConfig {
  provider: AiProviderType;
  apiKeys: Record<string, string>;
  models: Record<string, string>;
  customBaseUrls: Record<string, string>;
  temperature: number;
  showAiChatBubble: boolean;
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

// ==================== PERMISSIONS & ACCESS CONTROL (ADVANCE) ====================
export type PermissionLevel = "full_control" | "read_write" | "read_only" | "deny" | "custom" | "no_access";

export type InheritanceType = "direct" | "inherited_folder" | "inherited_group" | "owner";

export interface AclRights {
  read: boolean;
  write: boolean;
  execute: boolean;
  append: boolean;
  delete: boolean;
  deleteChild: boolean;
  readAttr: boolean;
  writeAttr: boolean;
  readPerm: boolean;
  writePerm: boolean;
  takeOwner: boolean;
}

export interface DsmUser {
  name: string;
  uid: number;
  description?: string;
  email?: string;
  groups: string[];
  status: "active" | "disabled" | "expired";
  isAdmin?: boolean;
  avatarUrl?: string;
}

export interface DsmGroup {
  name: string;
  gid: number;
  description?: string;
  members: string[];
}

export interface UserFolderAccess {
  path: string;
  name: string;
  volume: string;
  isdir: boolean;
  level: PermissionLevel;
  inheritance: InheritanceType;
  inheritedFrom?: string;
  rights: AclRights;
  isOwner?: boolean;
  explanation?: string;
}

export interface FolderUserAccess {
  targetName: string;
  isGroup: boolean;
  displayName?: string;
  avatarUrl?: string;
  userGroups?: string[];
  level: PermissionLevel;
  inheritance: InheritanceType;
  inheritedFrom?: string;
  rights: AclRights;
  isOwner?: boolean;
  explanation?: string;
  ruleOriginPath?: string;
}

export interface FolderAclInfo {
  path: string;
  realPath?: string;
  owner: string;
  group: string;
  posixPerm: string;
  isAclMode: boolean;
  isInheritEnabled: boolean;
  parentPath?: string;
  directRulesCount: number;
  inheritedRulesCount: number;
  accessList: FolderUserAccess[];
}

export interface PermissionMatrixCell {
  level: PermissionLevel;
  inheritance: InheritanceType;
  inheritedFrom?: string;
  isOwner?: boolean;
}

export interface PermissionMatrixData {
  users: DsmUser[];
  folders: { path: string; name: string; volume: string }[];
  matrix: Record<string, Record<string, PermissionMatrixCell>>;
}

export interface SecurityAuditItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedPath?: string;
  affectedUsers?: string[];
  recommendation: string;
}

export interface ReverseProxyHeader {
  name: string;
  value: string;
}

export interface ReverseProxyFrontend {
  protocol: 0 | 1; // 0: HTTP, 1: HTTPS
  fqdn: string;
  port: number;
  https?: {
    hsts?: boolean;
    http2?: boolean;
  };
  acl?: string | null;
}

export interface ReverseProxyBackend {
  protocol: 0 | 1; // 0: HTTP, 1: HTTPS
  fqdn: string;
  port: number;
}

export interface ReverseProxyRule {
  UUID: string;
  _key?: string;
  description: string;
  frontend: ReverseProxyFrontend;
  backend: ReverseProxyBackend;
  customize_headers?: ReverseProxyHeader[];
  proxy_connect_timeout?: number;
  proxy_read_timeout?: number;
  proxy_send_timeout?: number;
  proxy_http_version?: number;
  proxy_intercept_errors?: boolean;
}

export interface ReverseProxyPayload {
  UUID?: string;
  description: string;
  frontend: ReverseProxyFrontend;
  backend: ReverseProxyBackend;
  customize_headers?: ReverseProxyHeader[];
  proxy_connect_timeout?: number;
  proxy_read_timeout?: number;
  proxy_send_timeout?: number;
  proxy_http_version?: number;
  proxy_intercept_errors?: boolean;
}

export interface ReverseProxyHealthInfo {
  nginxSyntaxOk: boolean;
  nginxDetails?: string;
  orphanedServicesCount: number;
  activeRulesCount: number;
  cleanedOrphans?: string[];
}

