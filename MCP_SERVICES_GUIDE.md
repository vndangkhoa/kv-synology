# Services Feature — Webapp + MCP Guide

## Tổng quan

Tính năng **Dịch vụ (Services)** cho phép người dùng xem và bật/tắt mọi dịch vụ đang chạy trên DSM:

| ID | Tên hiển thị | API DSM | Port | Mô tả |
|---|---|---|---|---|
| `smb` | SMB/CIFS | `SYNO.Core.FileServ.SMB` v3 | 445 | Windows File Service |
| `afp` | AFP | `SYNO.Core.FileServ.AFP` v1 | 548 | Apple Filing (legacy) |
| `nfs` | NFS | `SYNO.Core.FileServ.NFS` v2 | 2049 | Linux/Unix |
| `ftp` | FTP | `SYNO.Core.FileServ.FTP` v3 | 21 | FTP/FTPS |
| `sftp` | SFTP | `SYNO.Core.FileServ.FTP.SFTP` v1 | 22 | SSH File Transfer |
| `ssh` | SSH | `SYNO.Core.Terminal` v3 | 22 | Terminal SSH |
| `telnet` | Telnet | `SYNO.Core.Terminal` v3 | 23 | Telnet (khuyên tắt) |
| `rsync` | rsync | `SYNO.Backup.Service.NetworkBackup` | 873 | Network Backup |
| `webdav` | WebDAV | `SYNO.Core.FileServ.ServiceDiscovery` | 5005 | HTTP/WebDAV |
| `<packageId>` | Package | `SYNO.Core.Package.Control` v1 | - | Fallback cho mọi gói |

---

## Webapp (`src/components/services/ServicesTab.tsx`)

### Truy cập
Sidebar > **Dịch vụ** (icon `Settings2`) hoặc BottomNav > **Dịch vụ**. Route `NavTab = "services"`.

### Chức năng
- **Metrics**: tổng dịch vụ, đang bật/chạy, đã tắt.
- **Toolbar**: tìm kiếm (tên/mô tả/API), filter theo `file|system|network|application`, toggle hiện/ẩn gói.
- **Cards**: mỗi dịch vụ hiển thị icon, trạng thái (`running`/`stopped`), port, API, details (workgroup, domain, ...), công tắc toggle.
- **Toggle**: gọi `dsmClient.toggleService(id, !enabled)` với optimistic update + refresh 800ms. Demo mode chỉ đổi `mockServices` trong RAM.
- **Gói ứng dụng**: section riêng lấy `getPackages()`, mỗi card có nút Bật/Tắt gọi `togglePackage`.

### DSM Client (`src/lib/dsm/client.ts`)

```ts
getServices(): Promise<ServiceItem[]>        // Compound Entry.Request sequential
getService(id): Promise<ServiceItem|null>
toggleService(id, enabled): Promise<boolean> // read-modify-write per service
getTerminalInfo(): Promise<TerminalInfo>
setTerminal(enableSsh, enableTelnet?, sshPort?): Promise<boolean>
getFileServiceStatus(): Promise<FileServiceStatus>
```

- `getServices()` thử compound trước, fallback sang `get` từng API nếu compound lỗi (quyền).
- `toggleService()` đọc config hiện tại qua `get`, sau đó `set` với enabled mới + giữ nguyên các trường khác (workgroup, nfs_v4_domain, portnum, etc). Nếu `set` compound fail, thử `set` tối thiểu chỉ với enabled flag.
- Demo: thao tác trên `mockServices` array (clone khi trả về để tránh mutation leak).

### Mock (`src/lib/dsm/mockData.ts`)
9 `mockServices` với `enabled` đa dạng để demo toggle: smb/nfs/sftp/ssh bật, afp/ftp/telnet/rsync/webdav tắt.

### i18n
`nav.services` + `services.*` trong `src/lib/i18n/en.ts` & `vi.ts`.

---

## MCP Server (`mcp/`)

### Tools (7 mới, tổng 37)

```ts
dsm_list_services({ category?, enabled_only? }) // category: all|file|system|network
dsm_get_service({ id })
dsm_toggle_service({ id, enabled })
dsm_enable_service({ id })   // alias enabled=true
dsm_disable_service({ id })  // alias enabled=false
dsm_get_terminal_info({})
dsm_set_terminal({ enable_ssh, enable_telnet?, ssh_port? })
dsm_get_file_service_status({})
```

Tất cả đều port logic từ webapp client sang Node (`mcp/src/dsm/client.ts`): dùng `https`/`http` native, `QuickConnect` resolver, `synotoken`/`did`/`cookie` handling. Demo mode cũng hỗ trợ (khi `dsm_login` với `demo:true`, các service tools thao tác trên `mockServices` RAM).

### Thử nhanh (stdio)

```bash
cd mcp && npm run build

# 1. list (demo)
(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
 sleep 0.3
 echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"dsm_login","arguments":{"host":"demo","account":"admin","demo":true}}}'
 sleep 0.3
 echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"dsm_list_services","arguments":{}}}'
) | node dist/index.js

# 2. toggle SMB off then filter file
(echo '...initialize...'
 echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"dsm_toggle_service","arguments":{"id":"smb","enabled":false}}}'
 echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"dsm_list_services","arguments":{"category":"file"}}}'
) | node dist/index.js

# 3. SSH port change
# dsm_set_terminal { enable_ssh:true, ssh_port:2222 }
```

### Cấu hình MCP client

`mcp.json` / `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kv-synology": {
      "command": "node",
      "args": ["/abs/path/kv-synology/mcp/dist/index.js"],
      "env": { "DSM_HOST": "myid.quickconnect.to", "DSM_USER": "admin", "DSM_PASS": "***" }
    }
  }
}
```

### Lưu ý quyền
- Tất cả `set` APIs yêu cầu tài khoản **admin** hoặc thuộc nhóm `administrators`.
- Nếu thiếu quyền, DSM trả `error: {code: ...}` và MCP trả `isError:true` với message.
- Với NAS sau NAT không port-forward, `QuickConnect` relay (`relay_dn:relay_port`) được ưu tiên fallback — đã test trong `src/dsm/quickconnect.ts`.

---

## Kiểm thử

```bash
# Webapp build
npm run build   # Next.js 15 → 49.4 kB / page, 0 lỗi type

# MCP build + smoke
cd mcp && npm run build
(echo '...' | node dist/index.js)  # 37 tools listed, demo toggle verified
```

Xem thêm `mcp/README.md` và `README.md` (mục Tính năng & Cấu trúc).
