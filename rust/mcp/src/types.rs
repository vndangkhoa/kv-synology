//! Canonical DSM data structures matching `mcp/src/dsm/types.ts`.

#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DsmConnectionConfig {
    pub host: String,
    pub port: u16,
    pub https: bool,
    pub account: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub otp: Option<String>,
    #[serde(default = "default_true")]
    pub ignore_cert: bool,
}

const fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DsmSession {
    pub sid: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub syno_token: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub did: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cookie: Option<String>,
    pub is_connected: bool,
    pub is_demo: bool,
    pub dsm_version: u8,
    pub version_string: String,
    pub model: String,
    pub hostname: String,
    pub account: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub model: String,
    pub serial: String,
    pub version: String,
    pub uptime: u64,
    pub temperature: i64,
    pub time: String,
    pub ram_total: u64,
    pub ram_used: u64,
    pub cpu_model: String,
    pub cpu_cores: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemUtilization {
    pub cpu_percent: u64,
    pub memory_percent: u64,
    #[serde(rename = "memoryUsedMB")]
    pub memory_used_mb: u64,
    #[serde(rename = "memoryTotalMB")]
    pub memory_total_mb: u64,
    pub network_rx_bytes: u64,
    pub network_tx_bytes: u64,
    pub disk_read_bytes: u64,
    pub disk_write_bytes: u64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DsmProcess {
    pub pid: u64,
    pub name: String,
    pub cpu: f64,
    pub memory: u64,
    pub user: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileItem {
    pub path: String,
    pub name: String,
    pub isdir: bool,
    pub size: u64,
    pub mtime: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filetype: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub perm: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub real_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub item_count: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareLink {
    pub id: String,
    pub url: String,
    pub path: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date_expired: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub has_password: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub created: String,
    pub ports: Vec<String>,
    pub cpu_usage: f64,
    pub memory_usage: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadTask {
    pub id: String,
    pub title: String,
    pub size: u64,
    pub status: String,
    pub progress: u64,
    pub download_speed: u64,
    pub upload_speed: u64,
    #[serde(rename = "type")]
    pub task_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveInfo {
    pub slot: u32,
    pub model: String,
    pub serial: String,
    pub status: String,
    pub temp: i64,
    pub size: u64,
    pub health: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageVolume {
    pub id: String,
    pub name: String,
    pub path: String,
    pub fs_type: String,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub status: String,
    pub drives: Vec<DriveInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageItem {
    pub id: String,
    pub name: String,
    pub version: String,
    pub status: String,
    pub description: String,
    pub maintainer: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_community: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceItem {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub category: String,
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub running: Option<bool>,
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
    pub can_toggle: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalInfo {
    pub enable_ssh: bool,
    pub enable_telnet: bool,
    pub ssh_port: u16,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hostname: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationItem {
    pub id: String,
    pub title: String,
    pub display_title: String,
    pub class_name: String,
    pub category: String,
    pub level: String,
    pub messages: Vec<String>,
    pub raw_messages: Vec<String>,
    pub time: u64,
    pub read: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppNotifyItem {
    pub id: String,
    pub title: String,
    pub content: String,
    pub level: String,
    pub time: u64,
    pub unread: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pkg_id: Option<String>,
}

pub type NotificationStringsMap = Map<String, Value>;
