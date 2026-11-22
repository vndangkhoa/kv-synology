use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum NavTab {
    Dashboard,
    Monitor,
    Snmp,
    Traffic,
    Files,
    Permissions,
    Docker,
    Download,
    Storage,
    Packages,
    Services,
    ReverseProxy,
    Firewall,
    Notifications,
    Reports,
    Terminal,
    Mcp,
    Settings,
}

impl NavTab {
    pub const ALL: [NavTab; 18] = [
        NavTab::Dashboard,
        NavTab::Monitor,
        NavTab::Snmp,
        NavTab::Traffic,
        NavTab::Files,
        NavTab::Permissions,
        NavTab::Docker,
        NavTab::Download,
        NavTab::Storage,
        NavTab::Packages,
        NavTab::Services,
        NavTab::ReverseProxy,
        NavTab::Firewall,
        NavTab::Notifications,
        NavTab::Reports,
        NavTab::Terminal,
        NavTab::Mcp,
        NavTab::Settings,
    ];

    pub const fn id(self) -> &'static str {
        match self {
            NavTab::Dashboard => "dashboard",
            NavTab::Monitor => "monitor",
            NavTab::Snmp => "snmp",
            NavTab::Traffic => "traffic",
            NavTab::Files => "files",
            NavTab::Permissions => "permissions",
            NavTab::Docker => "docker",
            NavTab::Download => "download",
            NavTab::Storage => "storage",
            NavTab::Packages => "packages",
            NavTab::Services => "services",
            NavTab::ReverseProxy => "reverse-proxy",
            NavTab::Firewall => "firewall",
            NavTab::Notifications => "notifications",
            NavTab::Reports => "reports",
            NavTab::Terminal => "terminal",
            NavTab::Mcp => "mcp",
            NavTab::Settings => "settings",
        }
    }

    pub fn from_id(s: &str) -> Option<Self> {
        Self::ALL.iter().copied().find(|t| t.id() == s)
    }

    pub const fn requires_auth(self) -> bool {
        !matches!(self, NavTab::Settings | NavTab::Mcp)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Language {
    Vi,
    En,
}

impl Language {
    pub const fn code(self) -> &'static str {
        match self {
            Language::Vi => "vi",
            Language::En => "en",
        }
    }

    pub fn from_code(s: &str) -> Self {
        if s.eq_ignore_ascii_case("en") {
            Language::En
        } else {
            Language::Vi
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ThemeMode {
    System,
    Light,
    Dark,
    Gemini,
}

impl ThemeMode {
    pub const fn id(self) -> &'static str {
        match self {
            ThemeMode::System => "system",
            ThemeMode::Light => "light",
            ThemeMode::Dark => "dark",
            ThemeMode::Gemini => "gemini",
        }
    }

    pub fn from_id(s: &str) -> Self {
        match s {
            "light" => ThemeMode::Light,
            "dark" => ThemeMode::Dark,
            "gemini" => ThemeMode::Gemini,
            _ => ThemeMode::System,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ExperienceMode {
    Beginner,
    Advance,
}

impl ExperienceMode {
    pub const fn id(self) -> &'static str {
        match self {
            ExperienceMode::Beginner => "beginner",
            ExperienceMode::Advance => "advance",
        }
    }

    pub fn from_id(s: &str) -> Self {
        if s == "advance" {
            ExperienceMode::Advance
        } else {
            ExperienceMode::Beginner
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DsmConfig {
    pub host: String,
    pub port: u16,
    pub https: bool,
    pub account: String,
}

impl Default for DsmConfig {
    fn default() -> Self {
        Self {
            host: "192.168.1.10".to_string(),
            port: 5001,
            https: true,
            account: "admin".to_string(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DsmSession {
    pub is_connected: bool,
    pub is_demo: bool,
    pub sid: String,
    pub synotoken: String,
    pub cookie: String,
    pub account: String,
    pub host: String,
    pub port: u16,
    pub https: bool,
    pub saved_until: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NasProfile {
    pub id: String,
    pub label: String,
    pub host: String,
    pub port: u16,
    pub https: bool,
    pub account: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub model: String,
    pub serial: String,
    pub dsm_version: String,
    pub ram_mb: u64,
    pub uptime_sec: u64,
    pub temperature_c: i32,
    pub cpu_cores: u32,
    pub cpu_model: String,
    pub hostname: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SystemUtilization {
    pub cpu_total: f64,
    pub cpu_user: f64,
    pub cpu_system: f64,
    pub ram_percent: f64,
    pub ram_used_mb: u64,
    pub ram_cached_mb: u64,
    pub ram_total_mb: u64,
    pub net_rx_bps: u64,
    pub net_tx_bps: u64,
    pub disk_read_bps: u64,
    pub disk_write_bps: u64,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct UtilSample {
    pub cpu: f64,
    pub ram: f64,
    pub rx_kbps: f64,
    pub tx_kbps: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessItem {
    pub pid: u32,
    pub name: String,
    pub user: String,
    pub cpu_percent: f64,
    pub ram_mb: u64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: String,
    pub owner: String,
    pub perm: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageVolume {
    pub id: String,
    pub name: String,
    pub raid_type: String,
    pub fs_type: String,
    pub status: String,
    pub used_gb: f64,
    pub total_gb: f64,
    pub pool_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub id: String,
    pub slot: String,
    pub model: String,
    pub serial: String,
    pub size_gb: u64,
    pub temp_c: i32,
    pub smart_status: String,
    pub health: String,
    pub disk_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub up: bool,
    pub cpu_percent: f64,
    pub memory_mb: f64,
    pub ports: String,
    pub created: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadTask {
    pub id: String,
    pub title: String,
    pub uri: String,
    pub status: String,
    pub size_bytes: u64,
    pub downloaded_bytes: u64,
    pub speed_down: u64,
    pub speed_up: u64,
    pub eta: String,
    pub task_type: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BtSearchResult {
    pub title: String,
    pub download: String,
    pub size: u64,
    pub datetime: String,
    pub seednum: i64,
    pub leech: i64,
    pub category: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RssItem {
    pub title: String,
    pub download: String,
    pub pub_date: String,
    pub size: u64,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageItem {
    pub id: String,
    pub name: String,
    pub version: String,
    pub publisher: String,
    pub category: String,
    pub running: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub enabled: bool,
    pub port: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReverseProxyRule {
    pub id: String,
    pub description: String,
    pub src_protocol: String,
    pub src_host: String,
    pub src_port: u16,
    pub dst_protocol: String,
    pub dst_host: String,
    pub dst_port: u16,
    pub hsts: bool,
    pub websocket: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirewallRule {
    pub id: String,
    pub name: String,
    pub ports: String,
    pub protocol: String,
    pub source_ip: String,
    pub action: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockedIp {
    pub ip: String,
    pub reason: String,
    pub blocked_at: String,
    pub permanent: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationItem {
    pub id: String,
    pub title: String,
    pub message: String,
    pub level: String,
    pub category: String,
    pub timestamp: String,
    pub read: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficCountry {
    pub country_code: String,
    pub country_name: String,
    pub flag_emoji: String,
    pub active_connections: u64,
    pub outbound_bytes: u64,
    pub inbound_bytes: u64,
    pub percent_outbound: u64,
    pub primary_isps: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficProcess {
    pub name: String,
    pub connections: u64,
    pub outbound_bytes: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficSummary {
    pub total_connections: u64,
    pub outbound_connections: u64,
    pub inbound_connections: u64,
    pub local_connections: u64,
    pub suspicious_count: u64,
    pub current_outbound_speed: u64,
    pub current_inbound_speed: u64,
    pub total_outbound_bytes: u64,
    pub total_inbound_bytes: u64,
    pub top_countries: Vec<TrafficCountry>,
    pub top_processes: Vec<TrafficProcess>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficConnection {
    pub id: String,
    pub protocol: String,
    pub local_ip: String,
    pub local_port: u16,
    pub remote_ip: String,
    pub remote_port: u16,
    pub state: String,
    pub process_name: String,
    pub direction: String,
    pub country_code: String,
    pub country_name: String,
    pub flag_emoji: String,
    pub isp: String,
    pub rx_speed_bytes: u64,
    pub tx_speed_bytes: u64,
    pub is_suspicious: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeoIpDetail {
    pub ip: String,
    pub country_code: Option<String>,
    pub country_name: Option<String>,
    pub flag_emoji: Option<String>,
    pub city: Option<String>,
    pub isp: Option<String>,
    pub org: Option<String>,
    pub asn: Option<String>,
    pub is_private: Option<bool>,
    pub reverse_dns: Option<String>,
    pub whois_link: Option<String>,
    pub abuse_ip_db_link: Option<String>,
    pub bgp_link: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnmpDevice {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub version: String,
    pub community: String,
    pub status: String,
    pub cpu_pct: Option<f64>,
    pub ram_pct: Option<f64>,
    pub uptime_text: String,
    pub ping_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnmpInterfaceItem {
    pub if_index: u64,
    pub name: String,
    pub descr: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AclEntry {
    pub principal: String,
    pub is_group: bool,
    pub level: String,
    pub inherited: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AclFolderNode {
    pub path: String,
    pub name: String,
    pub owner: String,
    pub entries: Vec<AclEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AclAuditIssue {
    pub severity: String,
    pub folder: String,
    pub principal: String,
    pub message_vi: String,
    pub message_en: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiModelItem {
    pub id: String,
    #[serde(default, alias = "label")]
    pub name: String,
    #[serde(default, alias = "desc")]
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolDoc {
    pub name: &'static str,
    pub category: &'static str,
    pub summary_vi: &'static str,
    pub summary_en: &'static str,
}
