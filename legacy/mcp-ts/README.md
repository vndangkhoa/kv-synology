# KV Synology MCP Server

Model Context Protocol server for **Synology DSM**, ported from [apaipai/dsm_helper](https://gitee.com/apaipai/dsm_helper) (Flutter) and [kv-synology](https://git.khoavo.myds.me/vndangkhoa/kv-synology) (Next.js Web).

Giao tiếp trực tiếp với NAS qua DSM WebAPI (`/webapi/auth.cgi` + `entry.cgi`), hỗ trợ **QuickConnect ID** (`myid` / `myid.quickconnect.to`) với relay fallback, bỏ qua self-signed SSL.

## Features (42 tools)

### Auth & System
- `dsm_login` / `dsm_logout` / `dsm_status`
- `dsm_get_system_info` (`SYNO.Core.System.info`)
- `dsm_get_system_utilization` (`SYNO.Core.System.Utilization`)
- `dsm_list_processes` / `dsm_power_action`

### File Station
- `dsm_list_files` / `dsm_list_shares` / `dsm_create_folder` / `dsm_delete_file` / `dsm_rename_file`
- `dsm_get_file_content` / `dsm_upload_file` / `dsm_search_files`
- `dsm_share_create_link` / `dsm_share_list_links` / `dsm_share_delete_link`

### Services  ⭐ NEW
> Bật/tắt bất kỳ dịch vụ đang chạy: file sharing + system + network + package services

- `dsm_list_services` — list all DSM services (SMB/CIFS, AFP, NFS, FTP, SFTP, SSH, Telnet, rsync, WebDAV) with enabled/running, port, API, category filter
- `dsm_get_service` — single service detail
- `dsm_toggle_service` — generic enable/disable (read-modify-write, preserves workgroup/domain/ports)
- `dsm_enable_service` / `dsm_disable_service` — shortcuts
- `dsm_get_terminal_info` / `dsm_set_terminal` — SSH/Telnet (`SYNO.Core.Terminal` v3)
- `dsm_get_file_service_status` — summarized SMB/AFP/NFS/FTP/SFTP

DSM mapping:
```
SMB  -> SYNO.Core.FileServ.SMB  get/set v3  (enable_samba, workgroup)
AFP  -> SYNO.Core.FileServ.AFP  get/set v1  (enable_afp)
NFS  -> SYNO.Core.FileServ.NFS  get/set v2  (enable_nfs, enable_nfs_v4, nfs_v4_domain)
FTP  -> SYNO.Core.FileServ.FTP  get/set v3  (enable_ftp, portnum 21, etc)
SFTP -> SYNO.Core.FileServ.FTP.SFTP get/set v1 (enable, sftp_portnum 22)
SSH/Telnet -> SYNO.Core.Terminal get/set v3 (enable_ssh, enable_telnet, ssh_port)
rsync/webdav -> placeholder / SYNO.Backup.Service.NetworkBackup
Package services fallback -> SYNO.Core.Package.Control start/stop
```

### Docker / Download / Storage / Packages
- `dsm_docker_list_containers` / `dsm_docker_container_action`
- `dsm_download_list_tasks` / `dsm_download_create_task` / `dsm_download_task_action`
- `dsm_storage_list_volumes` (`SYNO.Storage.CGI.Storage`)
- `dsm_package_list` / `dsm_package_action`

### Notifications  ⭐ NEW
> Trung tâm thông báo DSM — SYNO.Core.DSMNotify + AppNotify

- `dsm_list_notifications` — list system notifications (parsed via `DSMNotify.Strings` templating, filter by `category`/`level`/`unread_only`/`limit`, grouped like Flutter `notify.dart`)
- `dsm_get_app_notifications` — `SYNO.Core.AppNotify get`
- `dsm_clear_notifications` — `SYNO.Core.DSMNotify notify clean all`
- `dsm_mark_notifications_read` — mark all read (load with `now`)
- `dsm_get_notification_strings` — `SYNO.Core.DSMNotify.Strings get lang enu` (template map)

### Advanced
- `dsm_get_api_info` (`SYNO.API.Info` query all)
- `dsm_raw_entry_call` (any `entry.cgi` API)
- `dsm_get_logs` (`SYNO.Core.SyslogClient.Log`)

## Install

```bash
cd mcp
npm install
npm run build
```

## Run (stdio)

```bash
node dist/index.js
# or
npm start
```

## MCP Client Config

### Claude Desktop / VS Code / Cursor (`mcp.json` / `claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "kv-synology": {
      "command": "node",
      "args": ["/absolute/path/kv-synology/mcp/dist/index.js"],
      "env": {
        "DSM_HOST": "myid.quickconnect.to",
        "DSM_USER": "admin",
        "DSM_PASS": "your-password",
        "DSM_OTP": "",
        "DSM_PORT": "5001",
        "DSM_HTTPS": "true"
      }
    }
  }
}
```

- `DSM_HOST` supports: `192.168.1.10`, `nas.synology.me`, `myid`, `myid.quickconnect.to`, `https://host:5001`
- If `DSM_HOST`/`DSM_USER`/`DSM_PASS` env is set, the server **auto-logins** on start. Otherwise call `dsm_login` tool first.
- For local LAN with self-signed cert, leave `DSM_HTTPS=true` (rejectUnauthorized=false).

### Without env — tool login

```
1. call dsm_login { host:"192.168.1.10", account:"admin", password:"***" }
2. call dsm_list_services
3. call dsm_toggle_service { id:"smb", enabled:false }
4. call dsm_enable_service { id:"ssh" }
```

Demo mode (no NAS needed):
```json
{ "host":"demo", "account":"admin", "demo": true }
```
Then `dsm_list_services` returns 9 mock services toggled in-memory.

## Examples

```bash
# inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

```
User: "List my file sharing services and disable FTP"
AI -> dsm_list_services { category:"file" }
AI -> dsm_disable_service { id:"ftp" }

User: "Is SSH enabled? Change port to 2222"
AI -> dsm_get_terminal_info {}
AI -> dsm_set_terminal { enable_ssh:true, ssh_port:2222 }

User: "Show my unread warnings from last DSM notifications"
AI -> dsm_list_notifications { level:"warning", unread_only:true, limit:10 }
AI -> dsm_clear_notifications {}
```

## Development

- `npm run build` — tsc to `dist/`
- `npm run dev` — tsx watch
- QuickConnect resolver in `src/dsm/quickconnect.ts` (same as Next.js proxy `src/app/api/dsm/[...path]/route.ts`)
- DSM client in `src/dsm/client.ts` (Node https/http with keepAlive, handles synotoken/did/cookie)

## License

GPL-3.0-only — same as kv-synology and dsm_helper (Apache-2.0 original, migrated to GPL for kv-synology distribution).
