# Synology DSM Helper - API & Model Context Protocol (MCP) Guide for AI Agents

Comprehensive documentation for connecting AI Agents (Claude, Cursor, VS Code Roo Code/Cline, Windsurf, DeepSeek, OpenAI / LangChain / LlamaIndex / Antigravity) to Synology DiskStation Manager (DSM).

---

## 🤖 1. Overview & Capabilities

The **KV Synology MCP Server** (`mcp/`) and WebApp API Gateway (`/api/dsm/[...path]`) provide **42+ standardized tools** allowing AI Agents to inspect, manage, automate, and diagnose a Synology NAS directly via natural language.

### Key Highlights
- **Direct DSM WebAPI Gateway**: Real-time communication via `/webapi/auth.cgi` and `/webapi/entry.cgi`.
- **QuickConnect & DDNS Resolver**: Auto-resolves `myid` or `myid.quickconnect.to` with global relay fallback.
- **SSL Auto-Bypass**: Handles self-signed certificates on local LAN (`ignoreCert: true`).
- **Session & 2FA**: Supports DSM credentials, OTP 2-factor authentication, SynoToken CSRF validation, and 7-day persistence.
- **Demo / Mock Mode**: Fully testable offline without a physical NAS using `demo: true`.

---

## ⚡ 2. Quick Configuration for AI Clients

### A. Claude Desktop
Add to `~/.config/Claude/claude_desktop_config.json` (Linux/macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "kv-synology": {
      "command": "node",
      "args": ["/absolute/path/to/kv-synology/mcp/dist/index.js"],
      "env": {
        "DSM_HOST": "192.168.1.10",
        "DSM_PORT": "5001",
        "DSM_USER": "admin",
        "DSM_PASS": "your-dsm-password",
        "DSM_HTTPS": "true"
      }
    }
  }
}
```

### B. Cursor / VS Code / Windsurf
Add to `.cursor/mcp.json` or `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "synology-dsm": {
      "command": "node",
      "args": ["/absolute/path/to/kv-synology/mcp/dist/index.js"],
      "env": {
        "DSM_HOST": "your-quickconnect-id",
        "DSM_USER": "admin",
        "DSM_PASS": "your-password",
        "DSM_HTTPS": "true"
      }
    }
  }
}
```

### C. Python Agent SDK (LangChain / LlamaIndex / Custom Agent)

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

server_params = StdioServerParameters(
    command="node",
    args=["/absolute/path/to/kv-synology/mcp/dist/index.js"],
    env={
        "DSM_HOST": "192.168.1.10",
        "DSM_PORT": "5001",
        "DSM_USER": "admin",
        "DSM_PASS": "your-password",
        "DSM_HTTPS": "true"
    }
)

async def main():
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # Query system hardware and utilization
            util = await session.call_tool("dsm_get_system_utilization", arguments={})
            print("System Telemetry:", util.content[0].text)

            # List active services
            services = await session.call_tool("dsm_list_services", arguments={"category": "file"})
            print("File Services:", services.content[0].text)

asyncio.run(main())
```

---

## 🛠️ 3. Complete Directory of 42+ MCP Tools

### 1. Authentication & System
| Tool Name | Description | Parameters | DSM WebAPI |
| :--- | :--- | :--- | :--- |
| `dsm_login` | Log in to NAS (supports IP, DDNS, QuickConnect ID, OTP, Demo) | `host`*, `port`, `account`*, `password`, `otp_code`, `https`, `demo` | `SYNO.API.Auth v7` |
| `dsm_logout` | Log out and invalidate the current session token | None | `SYNO.API.Auth.logout` |
| `dsm_status` | Return active session details and connection status | None | Internal Client State |
| `dsm_get_system_info` | Model, CPU model/cores, DSM version, temperature, RAM | None | `SYNO.Core.System.info` |
| `dsm_get_system_utilization` | Real-time CPU%, RAM%, Network RX/TX bytes, Disk I/O | None | `SYNO.Core.System.Utilization` |
| `dsm_list_processes` | List active processes with CPU%, RAM bytes, PID, User | `limit` (optional) | `SYNO.Core.System.Process` |
| `dsm_power_action` | Reboot or shutdown the Synology NAS | `action`* (`reboot` \| `shutdown`), `force` | `SYNO.Core.System` |

### 2. Services & Port Management
| Tool Name | Description | Parameters | DSM WebAPI |
| :--- | :--- | :--- | :--- |
| `dsm_list_services` | List all file sharing, system, network, and package services | `category` (`file` \| `system` \| `network` \| `application`) | `SYNO.Core.FileServ.*` |
| `dsm_get_service` | Get detailed state, ports, and configuration of a single service | `id`* (e.g. `smb`, `ssh`, `ftp`) | `SYNO.Core.FileServ.*` |
| `dsm_toggle_service` | Enable or disable any service with read-modify-write safety | `id`*, `enabled`* | `SYNO.Core.FileServ.*` |
| `dsm_enable_service` | Shortcut to turn on a service | `id`* | `SYNO.Core.FileServ.*` |
| `dsm_disable_service` | Shortcut to turn off a service | `id`* | `SYNO.Core.FileServ.*` |
| `dsm_get_terminal_info` | Inspect SSH / Telnet status and current port | None | `SYNO.Core.Terminal v3` |
| `dsm_set_terminal` | Configure SSH / Telnet and change SSH port (e.g. 2222) | `enable_ssh`, `enable_telnet`, `ssh_port` | `SYNO.Core.Terminal v3` |

### 3. File Station
| Tool Name | Description | Parameters | DSM WebAPI |
| :--- | :--- | :--- | :--- |
| `dsm_list_shares` | List top-level shared folders on NAS | None | `SYNO.FileStation.List.list_share` |
| `dsm_list_files` | List folders and files in a given directory path | `folder_path`*, `offset`, `limit`, `sort_by` | `SYNO.FileStation.List.list` |
| `dsm_get_file_content` | Read text contents of YAML, JSON, TXT, ENV, SH, LOG files | `path`*, `max_bytes` | `SYNO.FileStation.Download` |
| `dsm_create_folder` | Create a new folder under a directory | `folder_path`*, `name`* | `SYNO.FileStation.CreateFolder` |
| `dsm_delete_file` | Delete a file or folder permanently | `path`* | `SYNO.FileStation.Delete` |
| `dsm_rename_file` | Rename a file or directory | `path`*, `name`* | `SYNO.FileStation.Rename` |
| `dsm_search_files` | Search for files by pattern across folders | `folder_path`*, `pattern`* | `SYNO.FileStation.Search` |
| `dsm_share_create_link` | Create a public sharing link with optional expiry & password | `path`*, `password`, `expire_days` | `SYNO.FileStation.Sharing` |

### 4. Docker / Container Management
| Tool Name | Description | Parameters | DSM WebAPI |
| :--- | :--- | :--- | :--- |
| `dsm_docker_list_containers` | List all containers with runtime status, CPU%, RAM, image | `status` (`all` \| `running` \| `stopped`) | `SYNO.Docker.Container.list` |
| `dsm_docker_container_action` | Start, stop, or restart a Docker container | `name_or_id`*, `action`* (`start` \| `stop` \| `restart`) | `SYNO.Docker.Container` |

### 5. Download Station
| Tool Name | Description | Parameters | DSM WebAPI |
| :--- | :--- | :--- | :--- |
| `dsm_download_list_tasks` | List download tasks with progress%, speeds, status | `status` (`all` \| `downloading` \| `completed` \| `paused`) | `SYNO.DownloadStation.Task.list` |
| `dsm_download_create_task` | Add a new torrent, magnet link, HTTP/HTTPS/FTP URL download | `uri`*, `destination` | `SYNO.DownloadStation.Task.create` |
| `dsm_download_task_action` | Pause, resume, or delete a download task | `id`*, `action`* (`pause` \| `resume` \| `delete`) | `SYNO.DownloadStation.Task` |

### 6. Storage Manager
| Tool Name | Description | Parameters | DSM WebAPI |
| :--- | :--- | :--- | :--- |
| `dsm_storage_list_volumes` | Get volume capacity (used/total), SHR/Btrfs type, disk vitals | None | `SYNO.Storage.CGI.Storage` |

### 7. Notifications
| Tool Name | Description | Parameters | DSM WebAPI |
| :--- | :--- | :--- | :--- |
| `dsm_list_notifications` | List parsed notifications with level & template formatting | `level`, `unread_only`, `limit` | `SYNO.Core.DSMNotify` |
| `dsm_get_app_notifications` | List package & app-level notifications | None | `SYNO.Core.AppNotify` |
| `dsm_clear_notifications` | Clear or mark all system notifications as read | None | `SYNO.Core.DSMNotify` |

### 8. Package Center
| Tool Name | Description | Parameters | DSM WebAPI |
| :--- | :--- | :--- | :--- |
| `dsm_package_list` | List installed packages from Package Center | None | `SYNO.Core.Package.list` |
| `dsm_package_action` | Start, stop, or uninstall a package | `id`*, `action`* (`start` \| `stop` \| `uninstall`) | `SYNO.Core.Package.Control` |

### 9. Raw & Advanced WebAPI
| Tool Name | Description | Parameters | DSM WebAPI |
| :--- | :--- | :--- | :--- |
| `dsm_raw_entry_call` | Invoke any arbitrary DSM WebAPI endpoint directly | `api`*, `method`*, `version`*, `params` | Direct `entry.cgi` |
| `dsm_get_logs` | Query system syslog events and security logs | `limit`, `level` | `SYNO.Core.SyslogClient.Log` |
| `dsm_get_api_info` | Query `SYNO.API.Info` to discover all supported APIs on this DSM | `query` (optional) | `SYNO.API.Info` |

---

## 💬 4. AI Agent Prompting Examples & Workflows

### Example 1: System Health & Diagnostic
**User Prompt**: `"NAS của tôi có đang bị nghẽn CPU hoặc hết dung lượng không?"`

**AI Agent Actions**:
1. Calls `dsm_get_system_utilization()` -> CPU: 14%, Memory: 42%, Disk I/O: 2.1 MB/s.
2. Calls `dsm_storage_list_volumes()` -> Volume 1: SHR / Btrfs, 58% used (6.5 TB free).
3. Calls `dsm_get_system_info()` -> Temperature: 41°C.

**AI Agent Response**:
> "Synology DS920+ của bạn đang ở trạng thái rất khỏe mạnh và mát mẻ (41°C). CPU chỉ chiếm 14%, RAM 42% và Volume 1 còn trống 6.5 TB (58% đã dùng)."

---

### Example 2: Service & Port Management
**User Prompt**: `"Tắt dịch vụ chia sẻ FTP và đổi cổng SSH sang 2222 giúp tôi."`

**AI Agent Actions**:
1. Calls `dsm_toggle_service(id: "ftp", enabled: false)`.
2. Calls `dsm_set_terminal(enable_ssh: true, ssh_port: 2222)`.

**AI Agent Response**:
> "Đã tắt hoàn tất dịch vụ FTP và chuyển cổng SSH sang 2222. Bạn có thể kiểm tra lại bằng lệnh `ssh -p 2222 admin@<NAS_IP>`."

---

## 🌐 5. DSM WebAPI Architecture & REST Proxies

```
[ AI Agent / Claude / Cursor ]
             │  (JSON-RPC / stdio)
             ▼
[ KV Synology MCP Server ]  ────────► [ Next.js WebApp Proxy ]
             │                                   │
             │ (/webapi/auth.cgi & entry.cgi)    │ (/api/dsm/[...path])
             ▼                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     Synology DSM 7.2+                       │
│  - SYNO.API.Auth v7 (Session / SynoToken / Did)             │
│  - SYNO.Core.System / Utilization / Process / Terminal      │
│  - SYNO.Core.FileServ (SMB, AFP, NFS, FTP, SFTP)            │
│  - SYNO.FileStation (List, Download, Sharing, Search)       │
│  - SYNO.Docker (Container Manager)                          │
│  - SYNO.DownloadStation (Torrent, URL, Magnet)              │
│  - SYNO.Storage.CGI.Storage (Storage Pools & Volumes)       │
│  - SYNO.Core.DSMNotify & AppNotify                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📄 License
GPL-3.0-only — Part of the `kv-synology` open-source distribution.
