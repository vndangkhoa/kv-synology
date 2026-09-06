# KV-Synology API Matrix

This matrix documents the Synology DSM WebAPI endpoints, methods, and parameters discovered directly in the repository source code (`src/lib/dsm/client.ts` and `src/app/api/dsm/[...path]/route.ts`).

| DSM API Name | Method | WebAPI Path | Version(s) | Key Parameters | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SYNO.API.Info** | query | `query.cgi` | 1 | `query=ALL` or `query=SYNO.API.Auth` | Discover supported APIs, paths, max/min versions |
| **SYNO.API.Auth** | login | `auth.cgi` / `entry.cgi` | 7, 6, 3, 2, 1 | `account`, `passwd`, `otp_code`, `session=DSMHelper`, `format=sid` | Authenticate and obtain `sid`, `SynoToken` |
| **SYNO.API.Auth** | logout | `auth.cgi` / `entry.cgi` | 1 | `session=DSMHelper`, `_sid` | Invalidate active session |
| **SYNO.Core.System** | info | `entry.cgi` | 1, 2 | `type="info"` | Model, serial, firmware version, uptime, temperature |
| **SYNO.Core.System.Utilization** | get | `entry.cgi` | 1 | `_sid` | Real-time CPU, RAM, Network RX/TX, Disk I/O |
| **SYNO.Core.System.Process** | list | `entry.cgi` | 1 | `_sid` | Running processes, CPU %, memory usage, PID |
| **SYNO.Core.System** | shutdown / reboot | `entry.cgi` | 1 | `force=true` | System power management |
| **SYNO.FileStation.List** | list_share / list | `entry.cgi` | 2 | `folder_path`, `filetype="all"`, `additional=["size","owner","time","perm"]` | List shared folders and directory contents |
| **SYNO.FileStation.Download** | download | `entry.cgi` | 2 | `path`, `mode="open"` / `mode="download"` | Stream file or download binary |
| **SYNO.FileStation.Thumb** | get | `entry.cgi` | 2 | `path`, `size="original"`, `animate="true"` | Image thumbnail generation |
| **SYNO.FileStation.Upload** | upload | `entry.cgi` | 2 | `path`, `create_parents=true`, `overwrite=true`, multipart binary | File upload |
| **SYNO.FileStation.CreateFolder**| create | `entry.cgi` | 2 | `folder_path`, `name` | Create new directory |
| **SYNO.FileStation.Rename** | rename | `entry.cgi` | 2 | `path`, `name` | Rename file or folder |
| **SYNO.FileStation.Delete** | start | `entry.cgi` | 2 | `path` | Delete file or folder |
| **SYNO.FileStation.Sharing** | create / list / delete | `entry.cgi` | 2 | `path`, `password`, `date_expired` | Public share link management |
| **SYNO.FileStation.ACL** | get | `entry.cgi` | 1 | `file_path` | Detailed POSIX & Windows ACL rights |
| **SYNO.Docker.Container** | list / start / stop / restart | `entry.cgi` | 1 | `name`, `id` | Container lifecycle management |
| **SYNO.Docker.Container.Log** | get | `entry.cgi` | 1 | `name`, `tail=100` | Fetch container standard output logs |
| **SYNO.ContainerManager.Project**| list / get / start / stop | `entry.cgi` | 1 | `name`, `compose_path` | Docker Compose projects and YAML configurations |
| **SYNO.Docker.Image** | list / pull / delete | `entry.cgi` | 1 | `repository`, `tag` | Docker image lifecycle |
| **SYNO.DownloadStation.Task** | list | `entry.cgi` | 1 | `offset=0`, `limit=100`, `additional="detail,transfer,file"` | Download task list and statistics |
| **SYNO.DownloadStation.Task** | pause / resume / delete | `entry.cgi` | 1 | `id`, `force_complete=false` | Task actions |
| **SYNO.DownloadStation.Task** | create | `entry.cgi` | 1 | `uri`, `destination` | Create task via URL / Magnet |
| **SYNO.DownloadStation.Statistic**| getinfo | `entry.cgi` | 1 | - | Download Station upload/download aggregate speeds |
| **SYNO.DownloadStation.Schedule** | getconfig / setconfig | `entry.cgi` | 1 | `enabled`, `emule_enabled` | Bandwidth scheduler configuration |
| **SYNO.DownloadStation.RSS.Site** | list / create / delete | `entry.cgi` | 1 | `url` | RSS site subscription management |
| **SYNO.DownloadStation.BTSearch** | start / list / clean | `entry.cgi` | 1 | `keyword`, `module="all"` | BitTorrent search engine integration |
| **SYNO.Storage.CGI.Storage** | load_info | `storage.cgi` | 1 | - | Overall storage topology (volumes, pools, disks) |
| **SYNO.Storage.CGI.Smart** | get_smart_info | `smart.cgi` | 1 | `disk` | S.M.A.R.T attributes and temperature |
| **SYNO.Storage.CGI.Scrubbing** | status / start / stop | `scrubbing.cgi` | 1 | `pool_id` | Btrfs / RAID data scrubbing |
| **SYNO.Core.Package** | list | `entry.cgi` | 1, 2 | `additional=["description","maintainer","icon"]` | Installed package inventory |
| **SYNO.Core.Package.Control** | start / stop / update | `entry.cgi` | 1 | `id`, `action` | Package lifecycle control |
| **SYNO.Core.Package.Server** | list / add / delete | `entry.cgi` | 1 | `name`, `url` | Package source repositories |
| **SYNO.Core.FileServ.SMB** | get / set | `entry.cgi` | 1 | `enable_smb`, `workgroup` | SMB / CIFS service settings |
| **SYNO.Core.FileServ.AFP** | get / set | `entry.cgi` | 1 | `enable_afp` | Apple Filing Protocol |
| **SYNO.Core.FileServ.NFS** | get / set | `entry.cgi` | 1 | `enable_nfs` | Network File System |
| **SYNO.Core.FileServ.FTP** | get / set | `entry.cgi` | 1 | `enable_ftp`, `port` | FTP / FTPS service |
| **SYNO.Core.Terminal** | get / set | `entry.cgi` | 1 | `enable_ssh`, `ssh_port`, `enable_telnet` | Remote management services |
| **SYNO.Core.AppPortal.ReverseProxy**| list / create / update / delete| `entry.cgi` | 1 | `frontend`, `backend`, `customize_headers` | DSM Nginx Reverse Proxy rules |
| **SYNO.Core.Security.Firewall** | get / set | `entry.cgi` | 1 | `enabled`, `allow_unmatched` | Global firewall switch |
| **SYNO.Core.Security.Firewall.Rules**| list / set | `entry.cgi` | 1 | `rules` JSON array | Port, protocol, source IP/GeoIP rules |
| **SYNO.Core.Security.AutoBlock** | get / set | `entry.cgi` | 1 | `attempts`, `within_minutes`, `enable_unblock` | Brute force auto-block protection |
| **SYNO.Core.Security.AutoBlock.Rules**| list / delete / add | `entry.cgi` | 1 | `ip` | Blocked & allowed IP management |
| **SYNO.Core.Security.DoS** | get / set | `entry.cgi` | 1 | `enabled` | Denial of Service network protection |
| **SYNO.Core.User** / **Group** | list | `entry.cgi` | 1 | `offset=0`, `limit=500` | Users and local security groups |
| **SYNO.Core.DSMNotify** | list / clear | `entry.cgi` | 1 | - | System notification alerts |
| **SYNO.Core.CurrentConnection** | list | `entry.cgi` | 1 | `sort_by="time"`, `limit=200` | Active connected user sessions and IP addresses |
| **QuickConnect Serv.php** | request_tunnel / get_server_info| `Serv.php` | 1 | `serverID`, `id="dsm_portal_https"` | QuickConnect tunnel and candidate discovery |
