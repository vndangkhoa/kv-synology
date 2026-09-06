# KV-Synology API Parity Audit

| Web Source API Endpoint | Android DSM Client Method | Parameters Supported | Authentication Required | Parity Status |
| :--- | :--- | :--- | :--- | :--- |
| `SYNO.API.Info:query` | `getApiInfo()` | `query=ALL` | No | **PASS** |
| `SYNO.API.Auth:login` | `login()` | `account`, `passwd`, `otp_code` | No | **PASS** |
| `SYNO.API.Auth:logout` | `logout()` | `session` | Yes (`_sid`) | **PASS** |
| `SYNO.Core.System:info` | `getSystemInfo()` | `type="info"` | Yes | **PASS** |
| `SYNO.Core.System.Utilization:get` | `getUtilization()` | - | Yes | **PASS** |
| `SYNO.Core.System.Process:list` | `getProcesses()` | - | Yes | **PASS** |
| `SYNO.Core.System:reboot/shutdown` | `powerAction()` | `method`, `force` | Yes | **PASS** |
| `SYNO.FileStation.List:list` | `listFiles()` / `getFiles()` | `folder_path`, `additional` | Yes | **PASS** |
| `SYNO.FileStation.Download:download` | `getFileStreamUrl()` / `downloadFile()` | `path`, `mode` | Yes | **PASS** |
| `SYNO.FileStation.Upload:upload` | `uploadFile()` | `path`, multipart body | Yes | **PASS** |
| `SYNO.FileStation.CreateFolder:create` | `createFolder()` | `folder_path`, `name` | Yes | **PASS** |
| `SYNO.FileStation.Delete:start` | `deleteFile()` | `path` | Yes | **PASS** |
| `SYNO.FileStation.Rename:rename` | `renameFile()` | `path`, `name` | Yes | **PASS** |
| `SYNO.FileStation.Sharing:create` | `createShareLink()` | `path`, `password`, `expire` | Yes | **PASS** |
| `SYNO.Docker.Container:list` | `getDockerContainers()` | - | Yes | **PASS** |
| `SYNO.Docker.Container:start/stop` | `toggleDockerContainer()` | `id`, `action` | Yes | **PASS** |
| `SYNO.ContainerManager.Project:list` | `getDockerProjects()` | - | Yes | **PASS** |
| `SYNO.Docker.Image:list` | `getDockerImages()` | - | Yes | **PASS** |
| `SYNO.DownloadStation.Task:list` | `getDownloadTasks()` | `additional` | Yes | **PASS** |
| `SYNO.DownloadStation.Task:create` | `addDownloadTask()` | `uri`, `destination` | Yes | **PASS** |
| `SYNO.DownloadStation.Task:pause/resume` | `toggleDownloadTask()` | `id`, `action` | Yes | **PASS** |
| `SYNO.Storage.CGI.Storage:load_info` | `getStorageFullInfo()` / `getStorageVolumes()` | - | Yes | **PASS** |
| `SYNO.Storage.CGI.Smart:get_smart_info`| `getSmartInfo()` | `disk` | Yes | **PASS** |
| `SYNO.Core.Package:list` | `getPackages()` | `additional` | Yes | **PASS** |
| `SYNO.Core.Package.Control:start/stop` | `togglePackage()` | `id`, `action` | Yes | **PASS** |
| `SYNO.Core.FileServ.SMB:get/set` | `getFileServiceStatus()` / `toggleService()` | `enable_smb` | Yes | **PASS** |
| `SYNO.Core.AppPortal.ReverseProxy:list` | `getReverseProxyRules()` | - | Yes | **PASS** |
| `SYNO.Core.Security.Firewall:get/set` | `getFirewallConfig()` / `setFirewallEnabled()` | `enabled` | Yes | **PASS** |
| `SYNO.Core.Security.AutoBlock:get/set` | `getAutoBlockConfig()` / `setAutoBlockConfig()`| `attempts`, `within_minutes` | Yes | **PASS** |
| `SYNO.Core.Security.AutoBlock.Rules:list`| `getBlockedIps()` / `unblockIp()` | `ip` | Yes | **PASS** |
| `SYNO.Core.User:list` | `getDsmUsers()` | - | Yes | **PASS** |
| `SYNO.Core.DSMNotify:list` | `getNotifications()` | - | Yes | **PASS** |
| `SYNO.Core.CurrentConnection:list` | `getLiveDsmConnections()` | `sort_by`, `limit` | Yes | **PASS** |
| `QuickConnect:request_tunnel` | `QuickConnectResolver.resolve()` | `serverID`, `id` | No | **PASS** |
