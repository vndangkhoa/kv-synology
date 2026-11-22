//! MCP server exposing all 43 Synology DSM tools via `rmcp 3.11`.

#![forbid(unsafe_code)]

use base64::Engine;
use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::{CallToolResult, ContentBlock, Implementation, ServerCapabilities, ServerConfig};
use rmcp::{ServerHandler, tool, tool_handler, tool_router};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

use crate::client::DsmClient;
use crate::types::DsmConnectionConfig;

#[derive(Clone)]
pub struct KvSynologyMcpServer {
    pub client: DsmClient,
    pub tool_router: ToolRouter<Self>,
}

impl Default for KvSynologyMcpServer {
    fn default() -> Self {
        Self::new(DsmClient::new())
    }
}

impl KvSynologyMcpServer {
    pub fn new(client: DsmClient) -> Self {
        Self {
            client,
            tool_router: Self::tool_router(),
        }
    }
}

fn ok_val<T: Serialize>(data: T) -> CallToolResult {
    let text = serde_json::to_string_pretty(&data).unwrap_or_else(|_| "{}".to_string());
    CallToolResult::success(vec![ContentBlock::text(text)])
}

fn err_msg(message: impl Into<String>, details: Option<Value>) -> CallToolResult {
    let mut obj = Map::new();
    obj.insert("success".to_string(), Value::Bool(false));
    obj.insert("error".to_string(), Value::String(message.into()));
    if let Some(d) = details {
        obj.insert("details".to_string(), d);
    }
    let text = serde_json::to_string_pretty(&Value::Object(obj))
        .unwrap_or_else(|_| r#"{"success":false}"#.to_string());
    CallToolResult::error(vec![ContentBlock::text(text)])
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct LoginParams {
    #[schemars(
        description = "DSM host: LAN IP (192.168.1.10), DDNS (xxx.synology.me), or QuickConnect ID (myid / myid.quickconnect.to). Can also be full URL https://host:port"
    )]
    pub host: String,
    #[schemars(
        description = "Port, default 5001 for HTTPS, 5000 for HTTP. Ignored if host is QuickConnect (resolved automatically)"
    )]
    pub port: Option<u16>,
    #[schemars(description = "Use HTTPS (default true). For QuickConnect always true")]
    pub https: Option<bool>,
    #[schemars(description = "DSM username")]
    pub account: String,
    #[schemars(description = "DSM password (empty if OTP only)")]
    pub password: Option<String>,
    #[schemars(description = "6-digit 2FA OTP if account has 2-step verification")]
    pub otp_code: Option<String>,
    #[schemars(description = "Ignore self-signed SSL (default true)")]
    #[allow(dead_code)]
    pub ignore_cert: Option<bool>,
    #[schemars(description = "If true, use mock demo data without real NAS connection")]
    pub demo: Option<bool>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ListProcessesParams {
    #[schemars(description = "Max processes to return, default 100 sorted by CPU desc")]
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct PowerActionParams {
    #[schemars(description = "Power action: reboot or shutdown")]
    pub action: String,
    #[schemars(description = "Force immediate action (default true)")]
    pub force: Option<bool>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct PathParam {
    #[schemars(
        description = "Folder or file path, e.g. '/' for shares, '/docker', '/video', '/downloads'"
    )]
    pub path: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct CreateFolderParams {
    #[schemars(description = "Parent folder path, e.g. '/docker'")]
    pub path: String,
    #[schemars(description = "New folder name")]
    pub name: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct RenameFileParams {
    #[schemars(description = "Full current path, e.g. '/docker/old.txt'")]
    pub path: String,
    #[schemars(description = "New name, e.g. 'new.txt'")]
    pub new_name: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetFileContentParams {
    #[schemars(description = "Full file path, e.g. '/docker/docker-compose.yml'")]
    pub path: String,
    #[schemars(description = "Return as base64 instead of utf8 text (for binary files)")]
    pub as_base64: Option<bool>,
    #[schemars(description = "Max bytes to read, default 500KB. Truncated if larger")]
    pub max_bytes: Option<usize>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct UploadFileParams {
    #[schemars(description = "Destination folder, e.g. '/docker' or '/downloads'")]
    pub folder_path: String,
    #[schemars(description = "File name, e.g. 'hello.txt'")]
    pub file_name: String,
    #[schemars(description = "Base64-encoded file content (for binary)")]
    pub content_base64: Option<String>,
    #[schemars(description = "Plain text content (alternative to base64, for text files)")]
    pub content_text: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct SearchFilesParams {
    #[schemars(description = "Folder to search in, e.g. '/' or '/docker'")]
    pub folder_path: String,
    #[schemars(description = "Search pattern, e.g. '*.log' or 'docker'")]
    pub pattern: String,
    #[schemars(description = "Recursive search (default true)")]
    pub recursive: Option<bool>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ShareCreateParams {
    #[schemars(
        description = "Path to share, e.g. '/docker/docker-compose.yml' or '/video/film.mp4'"
    )]
    pub path: String,
    #[schemars(description = "Optional password for link")]
    pub password: Option<String>,
    #[schemars(description = "Expiry date YYYY-MM-DD, e.g. '2026-12-31'")]
    pub expire_date: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct IdParam {
    #[schemars(description = "Resource ID")]
    pub id: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct DockerActionParams {
    #[schemars(description = "Container name or ID, e.g. 'vaultwarden' or 'c1'")]
    pub name: String,
    #[schemars(description = "Action to perform: start, stop, or restart")]
    pub action: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct DownloadCreateParams {
    #[schemars(description = "Download URL or magnet link")]
    pub url: String,
    #[schemars(description = "Destination DSM path, e.g. '/downloads' (optional, uses default)")]
    pub destination: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct IdActionParams {
    #[schemars(description = "Target ID")]
    pub id: String,
    #[schemars(description = "Action to perform")]
    pub action: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ListServicesParams {
    #[schemars(description = "Filter by category: file/system/network/all (default all)")]
    pub category: Option<String>,
    #[schemars(description = "If true, only return enabled/running services")]
    pub enabled_only: Option<bool>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ToggleServiceParams {
    #[schemars(
        description = "Service ID: smb | afp | nfs | ftp | sftp | ssh | telnet | rsync | webdav OR package ID like 'ContainerManager'"
    )]
    pub id: String,
    #[schemars(description = "true to enable/start, false to disable/stop")]
    pub enabled: bool,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct SetTerminalParams {
    #[schemars(description = "Enable SSH service")]
    pub enable_ssh: bool,
    #[schemars(description = "Enable Telnet service (default leaves unchanged)")]
    pub enable_telnet: Option<bool>,
    #[schemars(description = "SSH port, default 22. Preserves current if omitted.")]
    pub ssh_port: Option<u16>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SshExecParams {
    #[schemars(
        description = "SSH host — LAN IP or DDNS (e.g., 192.168.1.10). QuickConnect IDs not supported for SSH"
    )]
    pub host: String,
    #[schemars(description = "SSH port, default 22 or current DSM SSH port")]
    pub port: Option<u16>,
    #[schemars(description = "SSH username (e.g., admin)")]
    pub username: String,
    #[schemars(description = "SSH password (or use privateKey)")]
    pub password: Option<String>,
    #[schemars(description = "Private key string (alternative to password)")]
    pub private_key: Option<String>,
    #[schemars(description = "Shell command to execute, e.g., 'uptime; df -h; ls /volume1'")]
    pub command: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ListNotificationsParams {
    #[schemars(
        description = "Filter by category (all, system, storage, package, network, security, backup, file, app)"
    )]
    pub category: Option<String>,
    #[schemars(description = "Filter by severity level (all, info, warning, error, success)")]
    pub level: Option<String>,
    #[schemars(description = "Only unread notifications")]
    pub unread_only: Option<bool>,
    #[schemars(description = "Max to return (default all)")]
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct RawEntryCallParams {
    #[schemars(description = "API name, e.g. 'SYNO.Core.System' or 'SYNO.FileStation.List'")]
    pub api: String,
    #[schemars(description = "Method, e.g. 'info', 'list', 'get'")]
    pub method: String,
    #[schemars(description = "API version, e.g. 1 or 2. Use dsm_get_api_info to find max/min")]
    pub version: u32,
    #[schemars(description = "Extra params as JSON string")]
    pub params_json: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct LogsParams {
    #[schemars(description = "Number of log entries, default 50")]
    pub limit: Option<u32>,
}

#[tool_router]
impl KvSynologyMcpServer {
    // ---------- AUTH TOOLS ----------
    #[tool(
        name = "dsm_login",
        description = "Authenticate to Synology DSM. Supports LAN IP, DDNS, or QuickConnect ID (e.g. 'your-id' or 'your-id.quickconnect.to'). Will resolve QuickConnect via global.quickconnect.to with relay fallback. Use demo=true for offline mock data."
    )]
    pub async fn dsm_login(&self, Parameters(p): Parameters<LoginParams>) -> CallToolResult {
        let https_flag = p.https.unwrap_or_else(default_true);
        let cfg = DsmConnectionConfig {
            host: p.host,
            port: p.port.unwrap_or(if https_flag { 5001 } else { 5000 }),
            https: https_flag,
            account: p.account,
            password: Some(p.password.unwrap_or_default()),
            otp: p.otp_code,
            ignore_cert: p.ignore_cert.unwrap_or(true),
        };
        let demo = p.demo.unwrap_or(false);
        match self.client.login(cfg, demo).await {
            Ok(session) => {
                let sid_preview = if session.sid.is_empty() {
                    String::new()
                } else {
                    let prefix: String = session.sid.chars().take(8).collect();
                    format!("{prefix}...")
                };
                ok_val(json!({
                    "success": true,
                    "message": if demo { "Logged in (demo mode)" } else { "Login successful" },
                    "session": {
                        "sid": sid_preview,
                        "did": session.did,
                        "account": session.account,
                        "hostname": session.hostname,
                        "model": session.model,
                        "version": session.version_string,
                        "isDemo": session.is_demo,
                    }
                }))
            }
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(name = "dsm_logout", description = "Logout from DSM and clear session")]
    pub async fn dsm_logout(&self) -> CallToolResult {
        self.client.logout().await;
        ok_val(json!({ "success": true, "message": "Logged out" }))
    }

    #[tool(
        name = "dsm_status",
        description = "Get current DSM connection status and session info"
    )]
    pub async fn dsm_status(&self) -> CallToolResult {
        let s = self.client.get_session().await;
        let c = self.client.get_config().await;
        let cfg_val = c.map(|cfg| {
            json!({
                "host": cfg.host,
                "port": cfg.port,
                "https": cfg.https,
                "account": cfg.account,
            })
        });
        ok_val(json!({
            "isConnected": s.is_connected,
            "isDemo": s.is_demo,
            "account": s.account,
            "hostname": s.hostname,
            "model": s.model,
            "version": s.version_string,
            "sid_present": !s.sid.is_empty(),
            "config": cfg_val,
        }))
    }

    // ---------- SYSTEM TOOLS ----------
    #[tool(
        name = "dsm_get_system_info",
        description = "Get DSM system info (model, serial, DSM version, uptime, temperature, RAM, CPU). Mirrors SYNO.Core.System.info"
    )]
    pub async fn dsm_get_system_info(&self) -> CallToolResult {
        match self.client.get_system_info().await {
            Ok(info) => ok_val(info),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_get_system_utilization",
        description = "Get real-time system utilization (CPU%, memory%, network RX/TX, disk read/write). Mirrors SYNO.Core.System.Utilization.get"
    )]
    pub async fn dsm_get_system_utilization(&self) -> CallToolResult {
        match self.client.get_utilization().await {
            Ok(u) => ok_val(u),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_list_processes",
        description = "List running processes (pid, name, cpu%, memory, user, status). Mirrors SYNO.Core.System.Process.list"
    )]
    pub async fn dsm_list_processes(
        &self,
        Parameters(p): Parameters<ListProcessesParams>,
    ) -> CallToolResult {
        match self.client.get_processes().await {
            Ok(procs) => {
                let total = procs.len();
                let slice = match p.limit {
                    Some(lim) if lim < total => procs[..lim].to_vec(),
                    _ => procs,
                };
                ok_val(json!({ "count": slice.len(), "total": total, "processes": slice }))
            }
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_power_action",
        description = "Reboot or shutdown the Synology NAS. Requires admin privileges. Mirrors SYNO.Core.System.reboot/shutdown"
    )]
    pub async fn dsm_power_action(
        &self,
        Parameters(p): Parameters<PowerActionParams>,
    ) -> CallToolResult {
        if p.action != "reboot" && p.action != "shutdown" {
            return err_msg("Invalid power action; expected reboot or shutdown", None);
        }
        match self
            .client
            .power_action(&p.action, p.force.unwrap_or(true))
            .await
        {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { format!("{} command sent", p.action) } else { format!("Failed to {}", p.action) },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    // ---------- FILE STATION ----------
    #[tool(
        name = "dsm_list_files",
        description = "List files/folders in a DSM shared folder path. Use '/' for share roots. Mirrors SYNO.FileStation.List (list_share + list)."
    )]
    pub async fn dsm_list_files(&self, Parameters(p): Parameters<PathParam>) -> CallToolResult {
        match self.client.list_files(&p.path).await {
            Ok(files) => ok_val(json!({ "path": p.path, "count": files.len(), "files": files })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_create_folder",
        description = "Create a new folder in DSM FileStation. Mirrors SYNO.FileStation.CreateFolder.create"
    )]
    pub async fn dsm_create_folder(
        &self,
        Parameters(p): Parameters<CreateFolderParams>,
    ) -> CallToolResult {
        match self.client.create_folder(&p.path, &p.name).await {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { format!("Folder '{}' created in {}", p.name, p.path) } else { "Failed to create folder".to_string() },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_delete_file",
        description = "Delete a file or folder (recursive). Mirrors SYNO.FileStation.Delete.start"
    )]
    pub async fn dsm_delete_file(&self, Parameters(p): Parameters<PathParam>) -> CallToolResult {
        match self.client.delete_file(&p.path).await {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { format!("Deleted {}", p.path) } else { "Delete failed or task queued".to_string() },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_rename_file",
        description = "Rename a file or folder. Mirrors SYNO.FileStation.Rename.rename"
    )]
    pub async fn dsm_rename_file(
        &self,
        Parameters(p): Parameters<RenameFileParams>,
    ) -> CallToolResult {
        match self.client.rename_file(&p.path, &p.new_name).await {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { format!("Renamed to {}", p.new_name) } else { "Rename failed".to_string() },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_get_file_content",
        description = "Download and return file content as text (for code, csv, log, json, yaml, etc) or base64 for binary. Mirrors SYNO.FileStation.Download"
    )]
    pub async fn dsm_get_file_content(
        &self,
        Parameters(p): Parameters<GetFileContentParams>,
    ) -> CallToolResult {
        match self.client.get_file_content(&p.path).await {
            Ok(buf) => {
                let limit = p.max_bytes.unwrap_or(512 * 1024);
                let total = buf.len();
                let slice = &buf[..total.min(limit)];
                let truncated = total > limit;
                if p.as_base64.unwrap_or(false) {
                    let b64 = base64::engine::general_purpose::STANDARD.encode(slice);
                    ok_val(json!({
                        "path": p.path,
                        "size": total,
                        "truncated": truncated,
                        "content_base64": b64,
                        "encoding": "base64",
                    }))
                } else {
                    let text = String::from_utf8_lossy(slice).into_owned();
                    ok_val(json!({
                        "path": p.path,
                        "size": total,
                        "truncated": truncated,
                        "content": text,
                        "encoding": "utf-8",
                    }))
                }
            }
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_upload_file",
        description = "Upload a file to DSM FileStation. Content is base64-encoded or plain text. Mirrors SYNO.FileStation.Upload"
    )]
    pub async fn dsm_upload_file(
        &self,
        Parameters(p): Parameters<UploadFileParams>,
    ) -> CallToolResult {
        let buf = if let Some(b64) = p.content_base64.as_deref() {
            match base64::engine::general_purpose::STANDARD.decode(b64) {
                Ok(b) => b,
                Err(e) => return err_msg(format!("Invalid base64: {e}"), None),
            }
        } else if let Some(txt) = p.content_text {
            txt.into_bytes()
        } else {
            return err_msg("Provide either content_base64 or content_text", None);
        };
        let len = buf.len();
        match self
            .client
            .upload_file(&p.folder_path, &p.file_name, buf)
            .await
        {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { format!("Uploaded {} ({} bytes) to {}", p.file_name, len, p.folder_path) } else { "Upload failed".to_string() },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_search_files",
        description = "Search files by name pattern across a folder (recursive). Mirrors SYNO.FileStation.Search"
    )]
    pub async fn dsm_search_files(
        &self,
        Parameters(p): Parameters<SearchFilesParams>,
    ) -> CallToolResult {
        match self
            .client
            .search_files(&p.folder_path, &p.pattern, p.recursive.unwrap_or(true))
            .await
        {
            Ok(res) => ok_val(res),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_list_shares",
        description = "List DSM shared folders (top-level). Alias for dsm_list_files with path='/' but explicit"
    )]
    pub async fn dsm_list_shares(&self) -> CallToolResult {
        match self.client.list_shares().await {
            Ok(shares) => ok_val(json!({ "count": shares.len(), "shares": shares })),
            Err(e) => err_msg(e, None),
        }
    }

    // ---------- SHARE LINKS ----------
    #[tool(
        name = "dsm_share_create_link",
        description = "Create a public sharing link for a file/folder (FileStation Sharing). Mirrors SYNO.FileStation.Sharing.create"
    )]
    pub async fn dsm_share_create_link(
        &self,
        Parameters(p): Parameters<ShareCreateParams>,
    ) -> CallToolResult {
        match self
            .client
            .create_share_link(&p.path, p.password.as_deref(), p.expire_date.as_deref())
            .await
        {
            Ok(link) => ok_val(link),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_share_list_links",
        description = "List all FileStation sharing links. Mirrors SYNO.FileStation.Sharing.list"
    )]
    pub async fn dsm_share_list_links(&self) -> CallToolResult {
        match self.client.list_share_links().await {
            Ok(links) => ok_val(json!({ "count": links.len(), "links": links })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_share_delete_link",
        description = "Delete a sharing link by ID. Mirrors SYNO.FileStation.Sharing.delete"
    )]
    pub async fn dsm_share_delete_link(
        &self,
        Parameters(p): Parameters<IdParam>,
    ) -> CallToolResult {
        match self.client.delete_share_link(&p.id).await {
            Ok(ok_res) => ok_val(json!({ "success": ok_res })),
            Err(e) => err_msg(e, None),
        }
    }

    // ---------- DOCKER ----------
    #[tool(
        name = "dsm_docker_list_containers",
        description = "List Docker/Container Manager containers with CPU/memory usage. Mirrors SYNO.Docker.Container.list + Resource.get"
    )]
    pub async fn dsm_docker_list_containers(&self) -> CallToolResult {
        match self.client.get_docker_containers().await {
            Ok(containers) => {
                ok_val(json!({ "count": containers.len(), "containers": containers }))
            }
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_docker_container_action",
        description = "Start/stop/restart a Docker container. Mirrors SYNO.Docker.Container.start/stop/restart"
    )]
    pub async fn dsm_docker_container_action(
        &self,
        Parameters(p): Parameters<DockerActionParams>,
    ) -> CallToolResult {
        if !matches!(p.action.as_str(), "start" | "stop" | "restart") {
            return err_msg("Invalid action; expected start, stop, or restart", None);
        }
        match self
            .client
            .toggle_docker_container(&p.name, &p.action)
            .await
        {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { format!("Container {} {} sent", p.name, p.action) } else { "Action failed".to_string() },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    // ---------- DOWNLOAD STATION ----------
    #[tool(
        name = "dsm_download_list_tasks",
        description = "List DownloadStation tasks (HTTP, BT, FTP). Mirrors SYNO.DownloadStation2.Task.list"
    )]
    pub async fn dsm_download_list_tasks(&self) -> CallToolResult {
        match self.client.get_download_tasks().await {
            Ok(tasks) => ok_val(json!({ "count": tasks.len(), "tasks": tasks })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_download_create_task",
        description = "Create a DownloadStation task from URL (http/https, magnet, ftp). Mirrors SYNO.DownloadStation2.Task.create"
    )]
    pub async fn dsm_download_create_task(
        &self,
        Parameters(p): Parameters<DownloadCreateParams>,
    ) -> CallToolResult {
        match self
            .client
            .add_download_task(&p.url, p.destination.as_deref())
            .await
        {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { "Download task created" } else { "Failed to create task" },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_download_task_action",
        description = "Pause/resume/delete a DownloadStation task. Mirrors SYNO.DownloadStation2.Task.pause/resume/delete"
    )]
    pub async fn dsm_download_task_action(
        &self,
        Parameters(p): Parameters<IdActionParams>,
    ) -> CallToolResult {
        if !matches!(p.action.as_str(), "pause" | "resume" | "delete") {
            return err_msg("Invalid action; expected pause, resume, or delete", None);
        }
        match self.client.toggle_download_task(&p.id, &p.action).await {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { format!("Task {} {}d", p.id, p.action) } else { "Action failed".to_string() },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    // ---------- STORAGE ----------
    #[tool(
        name = "dsm_storage_list_volumes",
        description = "List Storage Manager volumes and attached disks. Mirrors SYNO.Storage.CGI.Storage.load_info"
    )]
    pub async fn dsm_storage_list_volumes(&self) -> CallToolResult {
        match self.client.get_storage_volumes().await {
            Ok(volumes) => ok_val(json!({ "count": volumes.len(), "volumes": volumes })),
            Err(e) => err_msg(e, None),
        }
    }

    // ---------- PACKAGES ----------
    #[tool(
        name = "dsm_package_list",
        description = "List installed DSM packages (Package Center). Mirrors SYNO.Core.Package.list"
    )]
    pub async fn dsm_package_list(&self) -> CallToolResult {
        match self.client.get_packages().await {
            Ok(packages) => ok_val(json!({ "count": packages.len(), "packages": packages })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_package_action",
        description = "Start or stop a DSM package. Mirrors SYNO.Core.Package.Control.start/stop"
    )]
    pub async fn dsm_package_action(
        &self,
        Parameters(p): Parameters<IdActionParams>,
    ) -> CallToolResult {
        if !matches!(p.action.as_str(), "start" | "stop") {
            return err_msg("Invalid action; expected start or stop", None);
        }
        match self.client.toggle_package(&p.id, &p.action).await {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { format!("Package {} {} sent", p.id, p.action) } else { "Action failed".to_string() },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    // ---------- SERVICES ----------
    #[tool(
        name = "dsm_list_services",
        description = "List all DSM services (File Sharing: SMB/CIFS, AFP, NFS, FTP, SFTP; System: SSH, Telnet; Network: rsync, WebDAV). Shows enabled/running status, port, and details. Mirrors compound SYNO.Core.FileServ.* + SYNO.Core.Terminal."
    )]
    pub async fn dsm_list_services(
        &self,
        Parameters(p): Parameters<ListServicesParams>,
    ) -> CallToolResult {
        match self.client.get_services().await {
            Ok(services) => {
                let total = services.len();
                let filtered: Vec<_> = services
                    .into_iter()
                    .filter(|s| {
                        p.category
                            .as_deref()
                            .filter(|c| *c != "all")
                            .is_none_or(|c| s.category == c)
                    })
                    .filter(|s| !p.enabled_only.unwrap_or(false) || s.enabled)
                    .collect();
                ok_val(json!({ "count": filtered.len(), "total": total, "services": filtered }))
            }
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_get_service",
        description = "Get details of a single DSM service by ID (smb, afp, nfs, ftp, sftp, ssh, telnet, rsync, webdav). Mirrors SYNO.Core.FileServ.* get."
    )]
    pub async fn dsm_get_service(&self, Parameters(p): Parameters<IdParam>) -> CallToolResult {
        match self.client.get_service(&p.id).await {
            Ok(Some(svc)) => ok_val(svc),
            Ok(None) => err_msg(format!("Service '{}' not found", p.id), None),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_toggle_service",
        description = "Enable or disable a DSM service. Handles read-modify-write: fetches current config then sets enabled flag while preserving other settings (workgroup, domains, ports, etc). Also works for packages as fallback. Use dsm_list_services to find valid IDs."
    )]
    pub async fn dsm_toggle_service(
        &self,
        Parameters(p): Parameters<ToggleServiceParams>,
    ) -> CallToolResult {
        match self.client.toggle_service(&p.id, p.enabled).await {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "id": p.id,
                "enabled": p.enabled,
                "message": if ok_res { format!("Service {} {}", p.id, if p.enabled { "enabled" } else { "disabled" }) } else { "Toggle failed".to_string() },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_enable_service",
        description = "Enable/start a DSM service (alias for dsm_toggle_service enabled=true). Quick shortcut."
    )]
    pub async fn dsm_enable_service(&self, Parameters(p): Parameters<IdParam>) -> CallToolResult {
        match self.client.toggle_service(&p.id, true).await {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "id": p.id,
                "enabled": true,
                "message": if ok_res { format!("Service {} enabled", p.id) } else { "Enable failed".to_string() },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_disable_service",
        description = "Disable/stop a DSM service (alias for dsm_toggle_service enabled=false). Quick shortcut."
    )]
    pub async fn dsm_disable_service(&self, Parameters(p): Parameters<IdParam>) -> CallToolResult {
        match self.client.toggle_service(&p.id, false).await {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "id": p.id,
                "enabled": false,
                "message": if ok_res { format!("Service {} disabled", p.id) } else { "Disable failed".to_string() },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_get_terminal_info",
        description = "Get SSH/Telnet terminal status (enable_ssh, enable_telnet, ssh_port). Mirrors SYNO.Core.Terminal.get version 3."
    )]
    pub async fn dsm_get_terminal_info(&self) -> CallToolResult {
        match self.client.get_terminal_info().await {
            Ok(info) => ok_val(info),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_set_terminal",
        description = "Enable/disable SSH/Telnet and set SSH port. Mirrors SYNO.Core.Terminal.set version 3. Requires read-modify-write if port omitted."
    )]
    pub async fn dsm_set_terminal(
        &self,
        Parameters(p): Parameters<SetTerminalParams>,
    ) -> CallToolResult {
        match self
            .client
            .set_terminal(p.enable_ssh, p.enable_telnet, p.ssh_port)
            .await
        {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res {
                    format!("Terminal SSH={} Telnet={:?} port={:?}", p.enable_ssh, p.enable_telnet, p.ssh_port)
                } else {
                    "Set terminal failed".to_string()
                },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_get_file_service_status",
        description = "Get summarized file sharing services status (SMB, AFP, NFS, FTP, SFTP). Mirrors dsm_helper fileService() compound."
    )]
    pub async fn dsm_get_file_service_status(&self) -> CallToolResult {
        match self.client.get_file_service_status().await {
            Ok(st) => ok_val(st),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_ssh_exec",
        description = "Execute a shell command on the NAS (or any host) via SSH (russh). Requires host, username, password, command. Port defaults to 22 or current DSM SSH port. Supports demo mock. QuickConnect IDs not supported for SSH — use LAN IP/DDNS."
    )]
    pub async fn dsm_ssh_exec(&self, Parameters(p): Parameters<SshExecParams>) -> CallToolResult {
        let res = self
            .client
            .exec_ssh_command(
                &p.host,
                p.port,
                &p.username,
                p.password.as_deref(),
                p.private_key.as_deref(),
                &p.command,
            )
            .await;
        if res.get("success").and_then(Value::as_bool) == Some(true) {
            ok_val(res)
        } else {
            let msg = res
                .get("error")
                .and_then(Value::as_str)
                .unwrap_or("SSH exec failed")
                .to_string();
            err_msg(msg, Some(res))
        }
    }

    // ---------- NOTIFICATIONS ----------
    #[tool(
        name = "dsm_list_notifications",
        description = "List DSM system notifications (DSMNotify). Returns grouped by title, parsed messages via DSMNotify.Strings templating, with category/level/time. Mirrors SYNO.Core.DSMNotify notify + SYNO.Core.DSMNotify.Strings."
    )]
    pub async fn dsm_list_notifications(
        &self,
        Parameters(p): Parameters<ListNotificationsParams>,
    ) -> CallToolResult {
        match self.client.get_notifications().await {
            Ok(notifs) => {
                let mut filtered: Vec<_> = notifs
                    .into_iter()
                    .filter(|n| {
                        p.category
                            .as_deref()
                            .filter(|c| *c != "all")
                            .is_none_or(|c| n.category == c)
                    })
                    .filter(|n| {
                        p.level
                            .as_deref()
                            .filter(|l| *l != "all")
                            .is_none_or(|l| n.level == l)
                    })
                    .filter(|n| !p.unread_only.unwrap_or(false) || !n.read)
                    .collect();
                if let Some(lim) = p.limit {
                    filtered.truncate(lim);
                }
                let unread = filtered.iter().filter(|n| !n.read).count();
                ok_val(json!({
                    "count": filtered.len(),
                    "unread": unread,
                    "notifications": filtered,
                }))
            }
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_get_app_notifications",
        description = "List DSM app notifications (App Center, Hyper Backup, Photos, etc). Mirrors SYNO.Core.AppNotify get."
    )]
    pub async fn dsm_get_app_notifications(&self) -> CallToolResult {
        match self.client.get_app_notifications().await {
            Ok(apps) => ok_val(json!({ "count": apps.len(), "appNotifications": apps })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_clear_notifications",
        description = "Clear all DSM notifications (mark as cleaned). Mirrors SYNO.Core.DSMNotify notify action apply clean all. Demo clears mock."
    )]
    pub async fn dsm_clear_notifications(&self) -> CallToolResult {
        match self.client.clear_notifications().await {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { "All notifications cleared" } else { "Clear failed" },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_mark_notifications_read",
        description = "Mark all notifications as read (sets lastRead/lastSeen to now). Mirrors DSMNotify load with now."
    )]
    pub async fn dsm_mark_notifications_read(&self) -> CallToolResult {
        match self.client.mark_notifications_read().await {
            Ok(ok_res) => ok_val(json!({
                "success": ok_res,
                "message": if ok_res { "Marked as read" } else { "Failed" },
            })),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_get_notification_strings",
        description = "Get DSMNotify string templates (title/msg) map for templating. Mirrors SYNO.Core.DSMNotify.Strings get lang enu."
    )]
    pub async fn dsm_get_notification_strings(&self) -> CallToolResult {
        match self.client.get_notification_strings().await {
            Ok(strs) => ok_val(json!({ "count": strs.len(), "strings": strs })),
            Err(e) => err_msg(e, None),
        }
    }

    // ---------- GENERIC / ADVANCED ----------
    #[tool(
        name = "dsm_get_api_info",
        description = "Query DSM API info (query.cgi?api=SYNO.API.Info&method=query). Lists all available APIs and versions. Useful for discovering endpoints."
    )]
    pub async fn dsm_get_api_info(&self) -> CallToolResult {
        match self.client.get_api_info().await {
            Ok(info) => ok_val(info),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_raw_entry_call",
        description = "Raw SYNO.Entry.Request call to entry.cgi for any DSM API. Advanced: specify api, method, version, and extra params as JSON string."
    )]
    pub async fn dsm_raw_entry_call(
        &self,
        Parameters(p): Parameters<RawEntryCallParams>,
    ) -> CallToolResult {
        let mut extra = Vec::new();
        if let Some(pj) = p.params_json.as_deref().filter(|s| !s.trim().is_empty()) {
            match serde_json::from_str::<Value>(pj) {
                Ok(Value::Object(map)) => {
                    for (k, v) in map {
                        let s = match v {
                            Value::String(st) => st,
                            other => other.to_string(),
                        };
                        extra.push((k, s));
                    }
                }
                Ok(_) => return err_msg("Invalid params_json: expected JSON object", None),
                Err(e) => return err_msg(format!("Invalid params_json: {e}"), None),
            }
        }
        match self
            .client
            .raw_entry_call(&p.api, &p.method, p.version, &extra)
            .await
        {
            Ok(res) => ok_val(res),
            Err(e) => err_msg(e, None),
        }
    }

    #[tool(
        name = "dsm_get_logs",
        description = "Get DSM system logs (Log Center). Mirrors SYNO.Core.SyslogClient.Log.list"
    )]
    pub async fn dsm_get_logs(&self, Parameters(p): Parameters<LogsParams>) -> CallToolResult {
        match self.client.get_logs(p.limit.unwrap_or(50)).await {
            Ok(logs) => ok_val(logs),
            Err(e) => err_msg(e, None),
        }
    }
}

#[tool_handler]
impl ServerHandler for KvSynologyMcpServer {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("kv-synology-mcp", "1.0.0"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeSet;

    #[test]
    fn exposes_exact_43_tools_matching_node_mcp() {
        let srv = KvSynologyMcpServer::default();
        let listed = srv.tool_router.list_all();
        assert_eq!(listed.len(), 43);

        let actual: BTreeSet<&str> = listed.iter().map(|t| t.name.as_ref()).collect();
        let expected: BTreeSet<&str> = [
            "dsm_login",
            "dsm_logout",
            "dsm_status",
            "dsm_get_system_info",
            "dsm_get_system_utilization",
            "dsm_list_processes",
            "dsm_power_action",
            "dsm_list_files",
            "dsm_create_folder",
            "dsm_delete_file",
            "dsm_rename_file",
            "dsm_get_file_content",
            "dsm_upload_file",
            "dsm_search_files",
            "dsm_list_shares",
            "dsm_share_create_link",
            "dsm_share_list_links",
            "dsm_share_delete_link",
            "dsm_docker_list_containers",
            "dsm_docker_container_action",
            "dsm_download_list_tasks",
            "dsm_download_create_task",
            "dsm_download_task_action",
            "dsm_storage_list_volumes",
            "dsm_package_list",
            "dsm_package_action",
            "dsm_list_services",
            "dsm_get_service",
            "dsm_toggle_service",
            "dsm_enable_service",
            "dsm_disable_service",
            "dsm_get_terminal_info",
            "dsm_set_terminal",
            "dsm_get_file_service_status",
            "dsm_ssh_exec",
            "dsm_list_notifications",
            "dsm_get_app_notifications",
            "dsm_clear_notifications",
            "dsm_mark_notifications_read",
            "dsm_get_notification_strings",
            "dsm_get_api_info",
            "dsm_raw_entry_call",
            "dsm_get_logs",
        ]
        .into_iter()
        .collect();
        assert_eq!(actual, expected);
    }

    #[tokio::test]
    async fn demo_lifecycle_and_ssh_guard() {
        let client = DsmClient::new();
        assert!(client.ensure_connected().await.is_err());

        let sess = client
            .login(
                DsmConnectionConfig {
                    host: "demo.local".into(),
                    port: 5001,
                    https: true,
                    account: "admin".into(),
                    password: None,
                    otp: None,
                    ignore_cert: true,
                },
                true,
            )
            .await
            .unwrap();
        assert!(sess.is_demo);
        assert!(sess.is_connected);

        let info = client.get_system_info().await.unwrap();
        assert_eq!(info.model, "DS920+");

        let files = client.list_files("/").await.unwrap();
        assert!(!files.is_empty());

        let ssh_demo = client
            .exec_ssh_command("demo.synology.lan", Some(22), "admin", None, None, "uptime")
            .await;
        assert_eq!(ssh_demo["success"], json!(true));

        let ssh_qc = client
            .exec_ssh_command("mynas.quickconnect.to", Some(22), "admin", None, None, "id")
            .await;
        assert_eq!(ssh_qc["success"], json!(false));

        client.logout().await;
        assert!(!client.get_session().await.is_connected);
    }

    #[test]
    fn sanitize_uri_extracts_clean_url() {
        assert_eq!(
            crate::client::sanitize_dsm_uri("[Ubuntu](https://example.com/ubuntu.iso)"),
            "https://example.com/ubuntu.iso"
        );
        assert_eq!(
            crate::client::sanitize_dsm_uri("\"https://example.com/file.zip\""),
            "https://example.com/file.zip"
        );
    }
}
