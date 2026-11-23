#!/usr/bin/env node
/**
 * KV Synology MCP Server
 * Model Context Protocol server for Synology DSM
 * Based on dsm_helper (apaipai) + kv-synology web implementation
 *
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { dsmClient } from "./dsm/client.js";
// ===== Helper utilities =====
function ok(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
}
function err(message, extra) {
    const payload = { success: false, error: message };
    if (extra)
        payload.details = extra;
    return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        isError: true,
    };
}
function ensureLogin() {
    const s = dsmClient.getSession();
    if (!s.isConnected) {
        throw new Error("Not authenticated. Call dsm_login first (or set DSM_HOST/DSM_USER env).");
    }
}
// Load env defaults on startup
async function autoLoginFromEnv() {
    const host = process.env.DSM_HOST || process.env.SYNOLOGY_HOST;
    const user = process.env.DSM_USER || process.env.SYNOLOGY_USER || process.env.DSM_ACCOUNT;
    const pass = process.env.DSM_PASS || process.env.SYNOLOGY_PASS || process.env.DSM_PASSWORD;
    if (host && user && pass) {
        const port = parseInt(process.env.DSM_PORT || process.env.SYNOLOGY_PORT || "5001", 10);
        const httpsFlag = (process.env.DSM_HTTPS || process.env.SYNOLOGY_HTTPS || "true") !== "false";
        const otp = process.env.DSM_OTP || undefined;
        try {
            console.error(`[MCP] Auto-login to ${host}:${port} as ${user} ...`);
            await dsmClient.login({ host, port, https: httpsFlag, account: user, password: pass, otp, ignoreCert: true });
            console.error(`[MCP] Auto-login success: ${dsmClient.getSession().model} ${dsmClient.getSession().versionString}`);
        }
        catch (e) {
            console.error(`[MCP] Auto-login failed: ${e.message}`);
        }
    }
}
// ===== MCP Server =====
const server = new McpServer({
    name: "kv-synology-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// ---------- AUTH TOOLS ----------
server.tool("dsm_login", "Authenticate to Synology DSM. Supports LAN IP, DDNS, or QuickConnect ID (e.g. 'your-id' or 'your-id.quickconnect.to'). Will resolve QuickConnect via global.quickconnect.to with relay fallback. Use demo=true for offline mock data.", {
    host: z.string().describe("DSM host: LAN IP (192.168.1.10), DDNS (xxx.synology.me), or QuickConnect ID (myid / myid.quickconnect.to). Can also be full URL https://host:port"),
    port: z.number().int().min(1).max(65535).optional().describe("Port, default 5001 for HTTPS, 5000 for HTTP. Ignored if host is QuickConnect (resolved automatically)"),
    https: z.boolean().optional().describe("Use HTTPS (default true). For QuickConnect always true"),
    account: z.string().describe("DSM username"),
    password: z.string().optional().describe("DSM password (empty if OTP only)"),
    otp_code: z.string().optional().describe("6-digit 2FA OTP if account has 2-step verification"),
    ignore_cert: z.boolean().optional().describe("Ignore self-signed SSL (default true)"),
    demo: z.boolean().optional().describe("If true, use mock demo data without real NAS connection"),
}, async ({ host, port, https, account, password, otp_code, ignore_cert, demo }) => {
    try {
        const cfg = {
            host,
            port: port ?? (https === false ? 5000 : 5001),
            https: https ?? true,
            account,
            password: password ?? "",
            otp: otp_code,
            ignoreCert: ignore_cert ?? true,
        };
        const session = await dsmClient.login(cfg, !!demo);
        return ok({
            success: true,
            message: demo ? "Logged in (demo mode)" : "Login successful",
            session: {
                sid: session.sid ? session.sid.substring(0, 8) + "..." : "",
                did: session.did,
                account: session.account,
                hostname: session.hostname,
                model: session.model,
                version: session.versionString,
                isDemo: session.isDemo,
            },
        });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_logout", "Logout from DSM and clear session", {}, async () => {
    dsmClient.logout();
    return ok({ success: true, message: "Logged out" });
});
server.tool("dsm_status", "Get current DSM connection status and session info", {}, async () => {
    const s = dsmClient.getSession();
    const c = dsmClient.getConfig();
    return ok({
        isConnected: s.isConnected,
        isDemo: s.isDemo,
        account: s.account,
        hostname: s.hostname,
        model: s.model,
        version: s.versionString,
        sid_present: !!s.sid,
        config: c ? { host: c.host, port: c.port, https: c.https, account: c.account } : null,
    });
});
// ---------- SYSTEM TOOLS ----------
server.tool("dsm_get_system_info", "Get DSM system info (model, serial, DSM version, uptime, temperature, RAM, CPU). Mirrors SYNO.Core.System.info", {}, async () => {
    try {
        ensureLogin();
        const info = await dsmClient.getSystemInfo();
        return ok(info);
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_get_system_utilization", "Get real-time system utilization (CPU%, memory%, network RX/TX, disk read/write). Mirrors SYNO.Core.System.Utilization.get", {}, async () => {
    try {
        ensureLogin();
        const u = await dsmClient.getUtilization();
        return ok(u);
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_list_processes", "List running processes (pid, name, cpu%, memory, user, status). Mirrors SYNO.Core.System.Process.list", {
    limit: z.number().int().min(1).max(1000).optional().describe("Max processes to return, default 100 sorted by CPU desc"),
}, async ({ limit }) => {
    try {
        ensureLogin();
        const procs = await dsmClient.getProcesses();
        const slice = limit ? procs.slice(0, limit) : procs;
        return ok({ count: slice.length, total: procs.length, processes: slice });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_power_action", "Reboot or shutdown the Synology NAS. Requires admin privileges. Mirrors SYNO.Core.System.reboot/shutdown", {
    action: z.enum(["reboot", "shutdown"]).describe("Power action"),
    force: z.boolean().optional().describe("Force immediate action (default true)"),
}, async ({ action, force }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.powerAction(action, force ?? true);
        return ok({ success: okRes, message: okRes ? `${action} command sent` : `Failed to ${action}` });
    }
    catch (e) {
        return err(e.message);
    }
});
// ---------- FILE STATION ----------
server.tool("dsm_list_files", "List files/folders in a DSM shared folder path. Use '/' for share roots. Mirrors SYNO.FileStation.List (list_share + list).", {
    path: z.string().describe("Folder path, e.g. '/' for shares, '/docker', '/video', '/downloads'"),
}, async ({ path }) => {
    try {
        ensureLogin();
        const files = await dsmClient.listFiles(path);
        return ok({ path, count: files.length, files });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_create_folder", "Create a new folder in DSM FileStation. Mirrors SYNO.FileStation.CreateFolder.create", {
    path: z.string().describe("Parent folder path, e.g. '/docker'"),
    name: z.string().describe("New folder name"),
}, async ({ path, name }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.createFolder(path, name);
        return ok({ success: okRes, message: okRes ? `Folder '${name}' created in ${path}` : "Failed to create folder" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_delete_file", "Delete a file or folder (recursive). Mirrors SYNO.FileStation.Delete.start", {
    path: z.string().describe("Full path of file/folder to delete, e.g. '/downloads/old.iso'"),
}, async ({ path }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.deleteFile(path);
        return ok({ success: okRes, message: okRes ? `Deleted ${path}` : "Delete failed or task queued" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_rename_file", "Rename a file or folder. Mirrors SYNO.FileStation.Rename.rename", {
    path: z.string().describe("Full current path, e.g. '/docker/old.txt'"),
    new_name: z.string().describe("New name, e.g. 'new.txt'"),
}, async ({ path, new_name }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.renameFile(path, new_name);
        return ok({ success: okRes, message: okRes ? `Renamed to ${new_name}` : "Rename failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_get_file_content", "Download and return file content as text (for code, csv, log, json, yaml, etc) or base64 for binary. Mirrors SYNO.FileStation.Download", {
    path: z.string().describe("Full file path, e.g. '/docker/docker-compose.yml'"),
    as_base64: z.boolean().optional().describe("Return as base64 instead of utf8 text (for binary files)"),
    max_bytes: z.number().int().optional().describe("Max bytes to read, default 500KB. Truncated if larger"),
}, async ({ path, as_base64, max_bytes }) => {
    try {
        ensureLogin();
        const buf = await dsmClient.getFileContent(path);
        const limit = max_bytes ?? 512 * 1024;
        const slice = buf.length > limit ? buf.subarray(0, limit) : buf;
        const truncated = buf.length > limit;
        if (as_base64) {
            return ok({ path, size: buf.length, truncated, content_base64: slice.toString("base64"), encoding: "base64" });
        }
        else {
            // Try utf8
            const text = slice.toString("utf-8");
            return ok({ path, size: buf.length, truncated, content: text, encoding: "utf-8" });
        }
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_upload_file", "Upload a file to DSM FileStation. Content is base64-encoded or plain text. Mirrors SYNO.FileStation.Upload", {
    folder_path: z.string().describe("Destination folder, e.g. '/docker' or '/downloads'"),
    file_name: z.string().describe("File name, e.g. 'hello.txt'"),
    content_base64: z.string().optional().describe("Base64-encoded file content (for binary)"),
    content_text: z.string().optional().describe("Plain text content (alternative to base64, for text files)"),
}, async ({ folder_path, file_name, content_base64, content_text }) => {
    try {
        ensureLogin();
        if (!content_base64 && !content_text)
            return err("Provide either content_base64 or content_text");
        const buf = content_base64 ? Buffer.from(content_base64, "base64") : Buffer.from(content_text, "utf-8");
        const okRes = await dsmClient.uploadFile(folder_path, file_name, buf);
        return ok({ success: okRes, message: okRes ? `Uploaded ${file_name} (${buf.length} bytes) to ${folder_path}` : "Upload failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_search_files", "Search files by name pattern across a folder (recursive). Mirrors SYNO.FileStation.Search", {
    folder_path: z.string().describe("Folder to search in, e.g. '/' or '/docker'"),
    pattern: z.string().describe("Search pattern, e.g. '*.log' or 'docker'"),
    recursive: z.boolean().optional().describe("Recursive search (default true)"),
}, async ({ folder_path, pattern, recursive }) => {
    try {
        ensureLogin();
        const res = await dsmClient.searchFiles(folder_path, pattern, recursive ?? true);
        return ok(res);
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_list_shares", "List DSM shared folders (top-level). Alias for dsm_list_files with path='/' but explicit", {}, async () => {
    try {
        ensureLogin();
        const shares = await dsmClient.listShares();
        return ok({ count: shares.length, shares });
    }
    catch (e) {
        return err(e.message);
    }
});
// ---------- SHARE LINKS ----------
server.tool("dsm_share_create_link", "Create a public sharing link for a file/folder (FileStation Sharing). Mirrors SYNO.FileStation.Sharing.create", {
    path: z.string().describe("Path to share, e.g. '/docker/docker-compose.yml' or '/video/film.mp4'"),
    password: z.string().optional().describe("Optional password for link"),
    expire_date: z.string().optional().describe("Expiry date YYYY-MM-DD, e.g. '2026-12-31'"),
}, async ({ path, password, expire_date }) => {
    try {
        ensureLogin();
        const link = await dsmClient.createShareLink(path, password, expire_date);
        return ok(link);
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_share_list_links", "List all FileStation sharing links. Mirrors SYNO.FileStation.Sharing.list", {}, async () => {
    try {
        ensureLogin();
        const links = await dsmClient.listShareLinks();
        return ok({ count: links.length, links });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_share_delete_link", "Delete a sharing link by ID. Mirrors SYNO.FileStation.Sharing.delete", {
    id: z.string().describe("Share link ID, e.g. 'abc123'"),
}, async ({ id }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.deleteShareLink(id);
        return ok({ success: okRes });
    }
    catch (e) {
        return err(e.message);
    }
});
// ---------- DOCKER ----------
server.tool("dsm_docker_list_containers", "List Docker/Container Manager containers with CPU/memory usage. Mirrors SYNO.Docker.Container.list + Resource.get", {}, async () => {
    try {
        ensureLogin();
        const containers = await dsmClient.getDockerContainers();
        return ok({ count: containers.length, containers });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_docker_container_action", "Start/stop/restart a Docker container. Mirrors SYNO.Docker.Container.start/stop/restart", {
    name: z.string().describe("Container name or ID, e.g. 'vaultwarden' or 'c1'"),
    action: z.enum(["start", "stop", "restart"]).describe("Action to perform"),
}, async ({ name, action }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.toggleDockerContainer(name, action);
        return ok({ success: okRes, message: okRes ? `Container ${name} ${action} sent` : "Action failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
// ---------- DOWNLOAD STATION ----------
server.tool("dsm_download_list_tasks", "List DownloadStation tasks (HTTP, BT, FTP). Mirrors SYNO.DownloadStation2.Task.list", {}, async () => {
    try {
        ensureLogin();
        const tasks = await dsmClient.getDownloadTasks();
        return ok({ count: tasks.length, tasks });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_download_create_task", "Create a DownloadStation task from URL (http/https, magnet, ftp). Mirrors SYNO.DownloadStation2.Task.create", {
    url: z.string().describe("Download URL or magnet link"),
    destination: z.string().optional().describe("Destination DSM path, e.g. '/downloads' (optional, uses default)"),
}, async ({ url, destination }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.addDownloadTask(url, destination);
        return ok({ success: okRes, message: okRes ? "Download task created" : "Failed to create task" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_download_task_action", "Pause/resume/delete a DownloadStation task. Mirrors SYNO.DownloadStation2.Task.pause/resume/delete", {
    id: z.string().describe("Task ID, e.g. 'dbid_39' or 'dl_1'"),
    action: z.enum(["pause", "resume", "delete"]).describe("Action"),
}, async ({ id, action }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.toggleDownloadTask(id, action);
        return ok({ success: okRes, message: okRes ? `Task ${id} ${action}d` : "Action failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
// ---------- STORAGE ----------
server.tool("dsm_storage_list_volumes", "List Storage Manager volumes and attached disks. Mirrors SYNO.Storage.CGI.Storage.load_info", {}, async () => {
    try {
        ensureLogin();
        const vols = await dsmClient.getStorageVolumes();
        return ok({ count: vols.length, volumes: vols });
    }
    catch (e) {
        return err(e.message);
    }
});
// ---------- PACKAGES ----------
server.tool("dsm_package_list", "List installed DSM packages (Package Center). Mirrors SYNO.Core.Package.list", {}, async () => {
    try {
        ensureLogin();
        const pkgs = await dsmClient.getPackages();
        return ok({ count: pkgs.length, packages: pkgs });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_package_action", "Start or stop a DSM package. Mirrors SYNO.Core.Package.Control.start/stop", {
    id: z.string().describe("Package ID, e.g. 'ContainerManager' or 'DownloadStation'"),
    action: z.enum(["start", "stop"]).describe("Action"),
}, async ({ id, action }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.togglePackage(id, action);
        return ok({ success: okRes, message: okRes ? `Package ${id} ${action} sent` : "Action failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
// ---------- SERVICES ----------
server.tool("dsm_list_services", "List all DSM services (File Sharing: SMB/CIFS, AFP, NFS, FTP, SFTP; System: SSH, Telnet; Network: rsync, WebDAV). Shows enabled/running status, port, and details. Mirrors compound SYNO.Core.FileServ.* + SYNO.Core.Terminal.", {
    category: z.enum(["all", "file", "system", "network"]).optional().describe("Filter by category: file/system/network/all (default all)"),
    enabled_only: z.boolean().optional().describe("If true, only return enabled/running services"),
}, async ({ category, enabled_only }) => {
    try {
        ensureLogin();
        const services = await dsmClient.getServices();
        let filtered = services;
        if (category && category !== "all")
            filtered = filtered.filter((s) => s.category === category);
        if (enabled_only)
            filtered = filtered.filter((s) => s.enabled);
        return ok({ count: filtered.length, total: services.length, services: filtered });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_get_service", "Get details of a single DSM service by ID (smb, afp, nfs, ftp, sftp, ssh, telnet, rsync, webdav). Mirrors SYNO.Core.FileServ.* get.", {
    id: z.string().describe("Service ID: smb | afp | nfs | ftp | sftp | ssh | telnet | rsync | webdav"),
}, async ({ id }) => {
    try {
        ensureLogin();
        const svc = await dsmClient.getService(id);
        if (!svc)
            return err(`Service '${id}' not found`);
        return ok(svc);
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_toggle_service", "Enable or disable a DSM service. Handles read-modify-write: fetches current config then sets enabled flag while preserving other settings (workgroup, domains, ports, etc). Also works for packages as fallback. Use dsm_list_services to find valid IDs.", {
    id: z.string().describe("Service ID: smb | afp | nfs | ftp | sftp | ssh | telnet | rsync | webdav OR package ID like 'ContainerManager'"),
    enabled: z.boolean().describe("true to enable/start, false to disable/stop"),
}, async ({ id, enabled }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.toggleService(id, enabled);
        return ok({ success: okRes, id, enabled, message: okRes ? `Service ${id} ${enabled ? "enabled" : "disabled"}` : "Toggle failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_enable_service", "Enable/start a DSM service (alias for dsm_toggle_service enabled=true). Quick shortcut.", {
    id: z.string().describe("Service ID: smb | afp | nfs | ftp | sftp | ssh | telnet | rsync | webdav"),
}, async ({ id }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.toggleService(id, true);
        return ok({ success: okRes, id, enabled: true, message: okRes ? `Service ${id} enabled` : "Enable failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_disable_service", "Disable/stop a DSM service (alias for dsm_toggle_service enabled=false). Quick shortcut.", {
    id: z.string().describe("Service ID: smb | afp | nfs | ftp | sftp | ssh | telnet | rsync | webdav"),
}, async ({ id }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.toggleService(id, false);
        return ok({ success: okRes, id, enabled: false, message: okRes ? `Service ${id} disabled` : "Disable failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_get_terminal_info", "Get SSH/Telnet terminal status (enable_ssh, enable_telnet, ssh_port). Mirrors SYNO.Core.Terminal.get version 3.", {}, async () => {
    try {
        ensureLogin();
        const info = await dsmClient.getTerminalInfo();
        return ok(info);
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_set_terminal", "Enable/disable SSH/Telnet and set SSH port. Mirrors SYNO.Core.Terminal.set version 3. Requires read-modify-write if port omitted.", {
    enable_ssh: z.boolean().describe("Enable SSH service"),
    enable_telnet: z.boolean().optional().describe("Enable Telnet service (default leaves unchanged)"),
    ssh_port: z.number().int().min(1).max(65535).optional().describe("SSH port, default 22. Preserves current if omitted."),
}, async ({ enable_ssh, enable_telnet, ssh_port }) => {
    try {
        ensureLogin();
        const okRes = await dsmClient.setTerminal(enable_ssh, enable_telnet, ssh_port);
        return ok({ success: okRes, message: okRes ? `Terminal SSH=${enable_ssh} Telnet=${enable_telnet} port=${ssh_port}` : "Set terminal failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_get_file_service_status", "Get summarized file sharing services status (SMB, AFP, NFS, FTP, SFTP). Mirrors dsm_helper fileService() compound.", {}, async () => {
    try {
        ensureLogin();
        const status = await dsmClient.getFileServiceStatus();
        return ok(status);
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_ssh_exec", "Execute a shell command on the NAS (or any host) via SSH (ssh2). Requires host, username, password, command. Port defaults to 22 or current DSM SSH port. Supports demo mock. QuickConnect IDs not supported for SSH — use LAN IP/DDNS.", {
    host: z.string().describe("SSH host — LAN IP or DDNS (e.g., 192.168.1.10). QuickConnect IDs not supported for SSH"),
    port: z.number().int().min(1).max(65535).optional().describe("SSH port, default 22 or current DSM SSH port"),
    username: z.string().describe("SSH username (e.g., admin)"),
    password: z.string().optional().describe("SSH password (or use privateKey)"),
    privateKey: z.string().optional().describe("Private key string (alternative to password)"),
    command: z.string().describe("Shell command to execute, e.g., 'uptime; df -h; ls /volume1'"),
}, async ({ host, port, username, password, privateKey, command }) => {
    try {
        let sshPort = port;
        if (!sshPort) {
            try {
                const info = await dsmClient.getTerminalInfo();
                sshPort = info.ssh_port;
            }
            catch { }
        }
        const res = await dsmClient.execSshCommand({ host, port: sshPort, username, password, privateKey, command });
        if (res.success)
            return ok(res);
        return err(res.error || "SSH exec failed", res);
    }
    catch (e) {
        return err(e.message);
    }
});
// ---------- NOTIFICATIONS ----------
server.tool("dsm_list_notifications", "List DSM system notifications (DSMNotify). Returns grouped by title, parsed messages via DSMNotify.Strings templating, with category/level/time. Mirrors SYNO.Core.DSMNotify notify + SYNO.Core.DSMNotify.Strings.", {
    category: z.enum(["all", "system", "storage", "package", "network", "security", "backup", "file", "app"]).optional().describe("Filter by category"),
    level: z.enum(["all", "info", "warning", "error", "success"]).optional().describe("Filter by severity level"),
    unread_only: z.boolean().optional().describe("Only unread notifications"),
    limit: z.number().int().min(1).max(200).optional().describe("Max to return (default all)"),
}, async ({ category, level, unread_only, limit }) => {
    try {
        ensureLogin();
        let notifs = await dsmClient.getNotifications();
        if (category && category !== "all")
            notifs = notifs.filter((n) => n.category === category);
        if (level && level !== "all")
            notifs = notifs.filter((n) => n.level === level);
        if (unread_only)
            notifs = notifs.filter((n) => !n.read);
        if (limit)
            notifs = notifs.slice(0, limit);
        const unread = notifs.filter((n) => !n.read).length;
        return ok({ count: notifs.length, unread, notifications: notifs });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_get_app_notifications", "List DSM app notifications (App Center, Hyper Backup, Photos, etc). Mirrors SYNO.Core.AppNotify get.", {}, async () => {
    try {
        ensureLogin();
        const apps = await dsmClient.getAppNotifications();
        return ok({ count: apps.length, appNotifications: apps });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_clear_notifications", "Clear all DSM notifications (mark as cleaned). Mirrors SYNO.Core.DSMNotify notify action apply clean all. Demo clears mock.", {}, async () => {
    try {
        ensureLogin();
        const okRes = await dsmClient.clearNotifications();
        return ok({ success: okRes, message: okRes ? "All notifications cleared" : "Clear failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_mark_notifications_read", "Mark all notifications as read (sets lastRead/lastSeen to now). Mirrors DSMNotify load with now.", {}, async () => {
    try {
        ensureLogin();
        const okRes = await dsmClient.markNotificationsRead();
        return ok({ success: okRes, message: okRes ? "Marked as read" : "Failed" });
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_get_notification_strings", "Get DSMNotify string templates (title/msg) map for templating. Mirrors SYNO.Core.DSMNotify.Strings get lang enu.", {}, async () => {
    try {
        ensureLogin();
        const strs = await dsmClient.getNotificationStrings();
        return ok({ count: Object.keys(strs).length, strings: strs });
    }
    catch (e) {
        return err(e.message);
    }
});
// ---------- GENERIC / ADVANCED ----------
server.tool("dsm_get_api_info", "Query DSM API info (query.cgi?api=SYNO.API.Info&method=query). Lists all available APIs and versions. Useful for discovering endpoints.", {}, async () => {
    try {
        ensureLogin();
        const info = await dsmClient.getApiInfo();
        return ok(info);
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_raw_entry_call", "Raw SYNO.Entry.Request call to entry.cgi for any DSM API. Advanced: specify api, method, version, and extra params as JSON string. Mirrors Util.post('entry.cgi', data={api,method,version,...})", {
    api: z.string().describe("API name, e.g. 'SYNO.Core.System' or 'SYNO.FileStation.List'"),
    method: z.string().describe("Method, e.g. 'info', 'list', 'get'"),
    version: z.number().int().min(1).describe("API version, e.g. 1 or 2. Use dsm_get_api_info to find max/min"),
    params_json: z.string().optional().describe("Extra params as JSON string, e.g. '{\"type\":\"current\",\"resource\":[\"cpu\"]}' . Use double-quoted JSON values where needed: '\"current\"'"),
}, async ({ api, method, version, params_json }) => {
    try {
        ensureLogin();
        let extra = {};
        if (params_json) {
            try {
                const parsed = JSON.parse(params_json);
                for (const [k, v] of Object.entries(parsed)) {
                    extra[k] = typeof v === "string" ? v : JSON.stringify(v);
                }
            }
            catch (e) {
                return err(`Invalid params_json: ${e.message}`);
            }
        }
        const res = await dsmClient.rawEntryCall(api, method, version, extra);
        return ok(res);
    }
    catch (e) {
        return err(e.message);
    }
});
server.tool("dsm_get_logs", "Get DSM system logs (Log Center). Mirrors SYNO.Core.SyslogClient.Log.list", {
    limit: z.number().int().min(1).max(200).optional().describe("Number of log entries, default 50"),
}, async ({ limit }) => {
    try {
        ensureLogin();
        const logs = await dsmClient.getLogs(limit ?? 50);
        return ok(logs);
    }
    catch (e) {
        return err(e.message);
    }
});
// ===== Start server =====
async function main() {
    await autoLoginFromEnv();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP] kv-synology-mcp server running on stdio");
}
main().catch((e) => {
    console.error("[MCP] Fatal:", e);
    process.exit(1);
});
//# sourceMappingURL=index.js.map