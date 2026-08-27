"use client";

import React, { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store/useAppStore";
import { dsmClient } from "@/lib/dsm/client";
import {
  Bot,
  Terminal,
  Cpu,
  Server,
  Key,
  FolderOpen,
  Settings2,
  Bell,
  Boxes,
  DownloadCloud,
  HardDrive,
  Package,
  Search,
  Copy,
  Check,
  Code2,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  FileText,
  Workflow,
  CheckCircle2,
  Lock,
  Flame,
  ArrowRight,
  Download,
} from "lucide-react";

interface MCPTool {
  name: string;
  category: "auth" | "system" | "files" | "services" | "firewall" | "security" | "notifications" | "docker" | "download" | "storage" | "packages" | "advanced";
  descriptionVi: string;
  descriptionEn: string;
  dsmApi: string;
  params: { name: string; type: string; required: boolean; desc: string }[];
  examplePayload: Record<string, any>;
  exampleResponse: Record<string, any>;
}

const MCP_TOOLS: MCPTool[] = [
  // Auth & System
  {
    name: "dsm_login",
    category: "auth",
    descriptionVi: "Xác thực và đăng nhập vào Synology DSM (hỗ trợ IP LAN, DDNS, QuickConnect ID, 2FA OTP, Demo mode).",
    descriptionEn: "Authenticate to Synology DSM (supports LAN IP, DDNS, QuickConnect ID, 2FA OTP, Demo mode).",
    dsmApi: "SYNO.API.Auth v7 (auth.cgi)",
    params: [
      { name: "host", type: "string", required: true, desc: "IP LAN (192.168.1.10), DDNS (nas.synology.me), hoặc QuickConnect ID (myid)" },
      { name: "port", type: "number", required: false, desc: "Cổng DSM (5001 HTTPS, 5000 HTTP, mặc định 5001)" },
      { name: "account", type: "string", required: true, desc: "Tên tài khoản DSM quản trị hoặc user" },
      { name: "password", type: "string", required: false, desc: "Mật khẩu DSM" },
      { name: "otp_code", type: "string", required: false, desc: "Mã OTP 6 số xác thực 2 bước (2FA)" },
      { name: "https", type: "boolean", required: false, desc: "Sử dụng giao thức HTTPS (mặc định true)" },
      { name: "demo", type: "boolean", required: false, desc: "Bật chế độ dữ liệu mẫu không cần NAS thật" },
    ],
    examplePayload: { host: "192.168.1.10", port: 5001, account: "admin", password: "your-password", https: true },
    exampleResponse: { success: true, message: "Login successful", session: { account: "admin", model: "DS920+", version: "DSM 7.2.1-69057" } },
  },
  {
    name: "dsm_get_system_info",
    category: "system",
    descriptionVi: "Lấy thông số phần cứng thiết bị, model NAS, S/N, phiên bản DSM, nhiệt độ, CPU và RAM.",
    descriptionEn: "Get hardware specs, model, serial number, DSM version, thermal temp, CPU, and RAM.",
    dsmApi: "SYNO.Core.System.info (entry.cgi)",
    params: [],
    examplePayload: {},
    exampleResponse: { model: "DS920+", cpuModel: "Intel Celeron J4125", cpuCores: 4, temperature: 42, ramTotal: 8192, ramUsed: 3276, uptime: 846200 },
  },
  {
    name: "dsm_get_system_utilization",
    category: "system",
    descriptionVi: "Lấy số liệu chiếm dụng tài nguyên thời gian thực: % CPU, % RAM, tốc độ mạng RX/TX, tốc độ đọc/ghi ổ đĩa.",
    descriptionEn: "Get real-time telemetry: CPU%, memory%, network RX/TX bytes/sec, and disk read/write throughput.",
    dsmApi: "SYNO.Core.System.Utilization.get (entry.cgi)",
    params: [],
    examplePayload: {},
    exampleResponse: { cpuPercent: 12, memoryPercent: 40, networkRxBytes: 254000, networkTxBytes: 128000, diskReadBytes: 1048576, diskWriteBytes: 524288 },
  },
  {
    name: "dsm_list_processes",
    category: "system",
    descriptionVi: "Liệt kê danh sách các tiến trình đang chạy trên NAS cùng mức tiêu thụ CPU và RAM.",
    descriptionEn: "List running processes with PID, CPU %, memory usage, username, and execution status.",
    dsmApi: "SYNO.Core.System.Process.list (entry.cgi)",
    params: [
      { name: "limit", type: "number", required: false, desc: "Số lượng tiến trình tối đa trả về (mặc định 100)" },
    ],
    examplePayload: { limit: 10 },
    exampleResponse: { count: 10, total: 142, processes: [{ pid: 1420, name: "synoscgi", cpu: 3.2, memory: 45000000, user: "root", status: "running" }] },
  },
  {
    name: "dsm_power_action",
    category: "system",
    descriptionVi: "Khởi động lại (Reboot) hoặc tắt máy (Shutdown) Synology NAS.",
    descriptionEn: "Reboot or shutdown the Synology NAS. Requires admin privileges.",
    dsmApi: "SYNO.Core.System.reboot / shutdown (entry.cgi)",
    params: [
      { name: "action", type: "enum: reboot | shutdown", required: true, desc: "Hành động nguồn: reboot hoặc shutdown" },
      { name: "force", type: "boolean", required: false, desc: "Bắt buộc thực thi ngay lập tức" },
    ],
    examplePayload: { action: "reboot", force: true },
    exampleResponse: { success: true, message: "Reboot initiated" },
  },

  // Services
  {
    name: "dsm_list_services",
    category: "services",
    descriptionVi: "Liệt kê tất cả dịch vụ hệ thống và chia sẻ tệp (SMB, AFP, NFS, FTP, SFTP, SSH, Telnet, rsync, WebDAV) với trạng thái và cổng.",
    descriptionEn: "List all DSM file sharing and system services with enabled/running state, port, and category.",
    dsmApi: "SYNO.Core.FileServ.* & SYNO.Core.Terminal (entry.cgi)",
    params: [
      { name: "category", type: "enum: file | system | network | application", required: false, desc: "Lọc theo danh mục dịch vụ" },
    ],
    examplePayload: { category: "file" },
    exampleResponse: { services: [{ id: "smb", name: "SMB/CIFS", enabled: true, port: 445, category: "file" }] },
  },
  {
    name: "dsm_toggle_service",
    category: "services",
    descriptionVi: "Bật hoặc tắt dịch vụ DSM (tự động bảo toàn cấu hình workgroup, domain và cổng).",
    descriptionEn: "Enable or disable any DSM service while preserving configurations.",
    dsmApi: "SYNO.Core.FileServ.* / SYNO.Core.Terminal.set (entry.cgi)",
    params: [
      { name: "id", type: "string", required: true, desc: "ID dịch vụ: smb, afp, nfs, ftp, sftp, ssh, telnet" },
      { name: "enabled", type: "boolean", required: true, desc: "true để bật, false để tắt" },
    ],
    examplePayload: { id: "ssh", enabled: true },
    exampleResponse: { success: true, id: "ssh", enabled: true },
  },
  {
    name: "dsm_set_terminal",
    category: "services",
    descriptionVi: "Cấu hình dịch vụ Terminal SSH / Telnet và thay đổi số hiệu cổng SSH.",
    descriptionEn: "Configure SSH / Telnet terminal service and change the SSH listening port.",
    dsmApi: "SYNO.Core.Terminal.set v3 (entry.cgi)",
    params: [
      { name: "enable_ssh", type: "boolean", required: false, desc: "Bật/tắt SSH" },
      { name: "enable_telnet", type: "boolean", required: false, desc: "Bật/tắt Telnet" },
      { name: "ssh_port", type: "number", required: false, desc: "Số hiệu cổng SSH mới (1-65535, e.g. 22, 2222)" },
    ],
    examplePayload: { enable_ssh: true, ssh_port: 2222 },
    exampleResponse: { success: true, enable_ssh: true, ssh_port: 2222 },
  },

  // File Station
  {
    name: "dsm_list_files",
    category: "files",
    descriptionVi: "Duyệt danh sách thư mục và tập tin trong đường dẫn File Station trên NAS.",
    descriptionEn: "List files and folders in a given folder path on File Station.",
    dsmApi: "SYNO.FileStation.List.list (entry.cgi)",
    params: [
      { name: "folder_path", type: "string", required: true, desc: "Đường dẫn thư mục bắt đầu bằng dấu /, ví dụ: /homes hoặc /docker" },
      { name: "offset", type: "number", required: false, desc: "Vị trí bắt đầu phân trang (mặc định 0)" },
      { name: "limit", type: "number", required: false, desc: "Số lượng tệp tối đa (mặc định 100)" },
      { name: "sort_by", type: "string", required: false, desc: "Trường sắp xếp: name, size, user, group, mtime" },
    ],
    examplePayload: { folder_path: "/docker", limit: 20 },
    exampleResponse: { total: 5, files: [{ name: "docker-compose.yml", isdir: false, size: 2480, path: "/docker/docker-compose.yml" }] },
  },
  {
    name: "dsm_get_file_content",
    category: "files",
    descriptionVi: "Đọc nội dung văn bản của tập tin trên NAS (hỗ trợ .yml, .json, .txt, .env, .sh, .py, .log).",
    descriptionEn: "Read text content of a file on NAS (yaml, json, env, sh, log, etc.).",
    dsmApi: "SYNO.FileStation.Download.download (entry.cgi)",
    params: [
      { name: "path", type: "string", required: true, desc: "Đường dẫn tuyệt đối của tệp tin, ví dụ: /docker/config.json" },
      { name: "max_bytes", type: "number", required: false, desc: "Kích thước tối đa đọc vào bộ nhớ (mặc định 512KB)" },
    ],
    examplePayload: { path: "/docker/traefik.yml", max_bytes: 65536 },
    exampleResponse: { path: "/docker/traefik.yml", size: 1024, content: "entryPoints:\n  web:\n    address: :80" },
  },
  {
    name: "dsm_share_create_link",
    category: "files",
    descriptionVi: "Tạo liên kết chia sẻ tệp tin hoặc thư mục ra ngoài công khai (có mật khẩu hoặc hạn dùng).",
    descriptionEn: "Generate a public sharing link for a file or directory with optional password & expiration.",
    dsmApi: "SYNO.FileStation.Sharing.create (entry.cgi)",
    params: [
      { name: "path", type: "string", required: true, desc: "Đường dẫn tệp/thư mục cần chia sẻ" },
      { name: "password", type: "string", required: false, desc: "Mật khẩu bảo vệ liên kết" },
      { name: "expire_days", type: "number", required: false, desc: "Số ngày hết hạn liên kết" },
    ],
    examplePayload: { path: "/photos/backup.zip", expire_days: 7 },
    exampleResponse: { id: "link_9283", url: "https://gofile.me/7X9a/backup.zip", expire: "2026-09-03" },
  },

  // Docker
  {
    name: "dsm_docker_list_containers",
    category: "docker",
    descriptionVi: "Liệt kê danh sách tất cả container Docker/Container Manager cùng trạng thái, hình ảnh, CPU & RAM.",
    descriptionEn: "List all Docker containers with runtime status, image, port bindings, and resource usage.",
    dsmApi: "SYNO.Docker.Container.list (entry.cgi)",
    params: [
      { name: "status", type: "enum: all | running | stopped", required: false, desc: "Lọc theo trạng thái container" },
    ],
    examplePayload: { status: "all" },
    exampleResponse: { containers: [{ id: "c_1", name: "nginx-proxy", image: "nginx:alpine", status: "running", cpu: 0.2, memory: "18 MB" }] },
  },
  {
    name: "dsm_docker_container_action",
    category: "docker",
    descriptionVi: "Thực hiện hành động điều khiển container: Khởi chạy (start), Dừng (stop), Khởi động lại (restart).",
    descriptionEn: "Perform lifecycle action on a container: start, stop, or restart.",
    dsmApi: "SYNO.Docker.Container.start/stop/restart (entry.cgi)",
    params: [
      { name: "name_or_id", type: "string", required: true, desc: "Tên hoặc ID của container" },
      { name: "action", type: "enum: start | stop | restart", required: true, desc: "Hành động điều khiển" },
    ],
    examplePayload: { name_or_id: "nginx-proxy", action: "restart" },
    exampleResponse: { success: true, name: "nginx-proxy", status: "running" },
  },

  // Download Station
  {
    name: "dsm_download_list_tasks",
    category: "download",
    descriptionVi: "Liệt kê các tác vụ Download Station (Torrent, URL HTTP/FTP, Magnet link) và tiến độ tải về.",
    descriptionEn: "List Download Station tasks (torrents, URLs, magnet links) and progress.",
    dsmApi: "SYNO.DownloadStation.Task.list (entry.cgi)",
    params: [
      { name: "status", type: "enum: all | downloading | completed | paused | error", required: false, desc: "Lọc theo trạng thái" },
    ],
    examplePayload: { status: "downloading" },
    exampleResponse: { tasks: [{ id: "dbid_1", title: "ubuntu-24.04-desktop.iso", progress: 65.4, downloadSpeed: 12500000 }] },
  },
  {
    name: "dsm_download_create_task",
    category: "download",
    descriptionVi: "Tạo tác vụ tải tệp mới qua liên kết HTTP, HTTPS, FTP hoặc Magnet link Torrent.",
    descriptionEn: "Create a new download task from HTTP/HTTPS/FTP URL or Magnet URI.",
    dsmApi: "SYNO.DownloadStation.Task.create (entry.cgi)",
    params: [
      { name: "uri", type: "string", required: true, desc: "Đường dẫn tải: magnet:?xt=... hoặc http://..." },
      { name: "destination", type: "string", required: false, desc: "Thư mục đích lưu tệp (mặc định /volume1/downloads)" },
    ],
    examplePayload: { uri: "https://releases.ubuntu.com/24.04/ubuntu-24.04-live-server-amd64.iso", destination: "/volume1/downloads" },
    exampleResponse: { success: true, taskId: "dbid_204" },
  },

  // Storage
  {
    name: "dsm_storage_list_volumes",
    category: "storage",
    descriptionVi: "Lấy tình trạng dung lượng các Volume lưu trữ, hệ thống tệp (Btrfs/ext4), dung lượng đã dùng/trống và sức khỏe ổ cứng.",
    descriptionEn: "Get storage volume health, file system type, used/free capacity, and attached drive stats.",
    dsmApi: "SYNO.Storage.CGI.Storage.load_info (entry.cgi)",
    params: [],
    examplePayload: {},
    exampleResponse: { volumes: [{ id: "volume_1", name: "Volume 1", totalBytes: 15400000000000, usedBytes: 8900000000000, status: "normal" }] },
  },

  // Notifications
  {
    name: "dsm_list_notifications",
    category: "notifications",
    descriptionVi: "Lấy danh sách thông báo hệ thống DSM (tự động format chuỗi template thông điệp theo ngữ cảnh).",
    descriptionEn: "List parsed system notifications with level filters and message template formatting.",
    dsmApi: "SYNO.Core.DSMNotify & DSMNotify.Strings (entry.cgi)",
    params: [
      { name: "level", type: "enum: all | info | warning | error", required: false, desc: "Lọc theo mức độ nghiêm trọng" },
      { name: "unread_only", type: "boolean", required: false, desc: "Chỉ lấy thông báo chưa đọc" },
      { name: "limit", type: "number", required: false, desc: "Số lượng thông báo tối đa" },
    ],
    examplePayload: { level: "warning", unread_only: true, limit: 10 },
    exampleResponse: { count: 1, notifications: [{ id: "notif_1", level: "warning", title: "Storage Warning", message: "Volume 1 usage exceeded 85%" }] },
  },
  {
    name: "dsm_clear_notifications",
    category: "notifications",
    descriptionVi: "Xóa toàn bộ hoặc đánh dấu đã đọc tất cả thông báo hệ thống trên DSM.",
    descriptionEn: "Clear or mark all notifications as read on DSM.",
    dsmApi: "SYNO.Core.DSMNotify.notify clean all (entry.cgi)",
    params: [],
    examplePayload: {},
    exampleResponse: { success: true, message: "All notifications cleared" },
  },

  // Packages
  {
    name: "dsm_package_list",
    category: "packages",
    descriptionVi: "Liệt kê danh sách các gói ứng dụng cài đặt từ Synology Package Center.",
    descriptionEn: "List installed packages from Synology Package Center.",
    dsmApi: "SYNO.Core.Package.list (entry.cgi)",
    params: [],
    examplePayload: {},
    exampleResponse: { packages: [{ id: "ContainerManager", name: "Container Manager", version: "20.10.23", status: "running" }] },
  },

  // Firewall & Security
  {
    name: "dsm_firewall_get_status",
    category: "security",
    descriptionVi: "Lấy trạng thái tường lửa DSM và danh sách tất cả các quy tắc lọc cổng đang kích hoạt.",
    descriptionEn: "Get master firewall status, default action, and active port filtering rules.",
    dsmApi: "SYNO.Core.Security.Firewall (entry.cgi)",
    params: [],
    examplePayload: {},
    exampleResponse: { enabled: true, defaultProfile: "default", rulesCount: 6, rules: [{ id: "fw_1", name: "DSM Web", ports: "5000, 5001", action: "allow" }] },
  },
  {
    name: "dsm_firewall_add_rule",
    category: "security",
    descriptionVi: "Tạo hoặc cập nhật một quy tắc tường lửa lọc cổng, giao thức và nguồn IP trên Synology NAS.",
    descriptionEn: "Add or update a firewall port-filtering rule with ports, protocol, source, and allow/deny action.",
    dsmApi: "SYNO.Core.Security.Firewall.Rules (entry.cgi)",
    params: [
      { name: "name", type: "string", required: true, desc: "Tên quy tắc định danh" },
      { name: "ports", type: "string", required: true, desc: "Danh sách cổng (ví dụ: 5000, 5001 hoặc 80,443 hoặc all)" },
      { name: "protocol", type: "enum: tcp | udp | all", required: true, desc: "Giao thức mạng" },
      { name: "source_type", type: "enum: all | subnet | single_ip | geoip", required: true, desc: "Loại nguồn truy cập" },
      { name: "source_value", type: "string", required: true, desc: "Địa chỉ IP hoặc Subnet (192.168.0.0/16, Tất cả)" },
      { name: "action", type: "enum: allow | deny", required: true, desc: "Hành động: cho phép (allow) hoặc từ chối (deny)" },
      { name: "enabled", type: "boolean", required: false, desc: "Kích hoạt quy tắc ngay lập tức" },
    ],
    examplePayload: { name: "Allow SSH from LAN", ports: "22, 2222", protocol: "tcp", source_type: "subnet", source_value: "192.168.31.0/24", action: "allow", enabled: true },
    exampleResponse: { success: true, message: "Firewall rule created", ruleId: "fw_1724738000" },
  },
  {
    name: "dsm_autoblock_get_config",
    category: "security",
    descriptionVi: "Lấy cấu hình tự động khóa IP tấn công brute-force và danh sách các địa chỉ IP đang bị khóa.",
    descriptionEn: "Get brute-force Auto-Block configuration, threshold attempts, and currently blacklisted IPs.",
    dsmApi: "SYNO.Core.Security.AutoBlock (entry.cgi)",
    params: [],
    examplePayload: {},
    exampleResponse: { enabled: true, attempts: 5, withinMinutes: 5, blockedIps: ["185.220.101.4", "194.26.29.112"] },
  },
  {
    name: "dsm_autoblock_unblock_ip",
    category: "security",
    descriptionVi: "Mở khóa cho một địa chỉ IP đã bị hệ thống Auto-Block chặn.",
    descriptionEn: "Unblock and remove a specific IP address from the DSM Auto-Block blacklist.",
    dsmApi: "SYNO.Core.Security.AutoBlock.Rules delete (entry.cgi)",
    params: [
      { name: "ip", type: "string", required: true, desc: "Địa chỉ IP cần mở khóa (ví dụ: 185.220.101.4)" },
    ],
    examplePayload: { ip: "185.220.101.4" },
    exampleResponse: { success: true, message: "IP 185.220.101.4 unblocked" },
  },

  // Advanced
  {
    name: "dsm_raw_entry_call",
    category: "advanced",
    descriptionVi: "Gọi trực tiếp bất kỳ DSM WebAPI endpoint nào qua entry.cgi với API name, version, method và params.",
    descriptionEn: "Invoke any arbitrary DSM WebAPI endpoint directly via entry.cgi.",
    dsmApi: "Direct entry.cgi invocation",
    params: [
      { name: "api", type: "string", required: true, desc: "Tên API, ví dụ: SYNO.Core.SyslogClient.Log" },
      { name: "method", type: "string", required: true, desc: "Tên hàm: get, set, list, query" },
      { name: "version", type: "number", required: true, desc: "Phiên bản API (ví dụ 1, 2, 3)" },
      { name: "params", type: "object", required: false, desc: "Tham số bổ sung gửi kèm request" },
    ],
    examplePayload: { api: "SYNO.Core.SyslogClient.Log", method: "get", version: 1, params: { limit: 5 } },
    exampleResponse: { success: true, data: { total: 5, items: [] } },
  },
];

const AI_SCENARIOS = [
  {
    title: "Chẩn đoán tình trạng quá tải CPU & Bộ nhớ NAS",
    category: "Giám sát & Chẩn đoán",
    userPrompt: "Kiểm tra xem Synology NAS của tôi có đang bị quá tải không và chỉ ra tiến trình nào đang chiếm nhiều CPU nhất?",
    agentThought: "1. Gọi dsm_get_system_utilization để lấy CPU/RAM hiện tại.\n2. Gọi dsm_list_processes với limit=5 để xác định top tiến trình chiếm CPU cao nhất.",
    toolCalls: [
      { tool: "dsm_get_system_utilization", params: {} },
      { tool: "dsm_list_processes", params: { limit: 5 } },
    ],
    agentResponse: "NAS của bạn hiện đang hoạt động ở mức **78.4% CPU** và **42.1% RAM** (Nhiệt độ ổn định 41°C). Tiến trình `ffmpeg` (PID #8491) từ Plex Media Server đang chuyển mã video chiếm 64.2% CPU.",
  },
  {
    title: "Bảo mật & Đổi cổng dịch vụ SSH",
    category: "Bảo mật & Dịch vụ",
    userPrompt: "Tắt dịch vụ FTP đi và đổi cổng SSH sang 2222 giúp tôi để tăng cường bảo mật.",
    agentThought: "1. Tắt dịch vụ FTP bằng dsm_toggle_service(id: 'ftp', enabled: false).\n2. Đổi cổng SSH và bật lại qua dsm_set_terminal(enable_ssh: true, ssh_port: 2222).",
    toolCalls: [
      { tool: "dsm_toggle_service", params: { id: "ftp", enabled: false } },
      { tool: "dsm_set_terminal", params: { enable_ssh: true, ssh_port: 2222 } },
    ],
    agentResponse: "Đã tắt hoàn tất dịch vụ chia sẻ tệp **FTP** và đổi thành công cổng **SSH sang 2222**. Bạn có thể kết nối lại qua `ssh -p 2222 admin@<NAS_IP>`.",
  },
  {
    title: "Tải file Torrent & Kiểm tra tiến độ Download Station",
    category: "Tải về & Đa phương tiện",
    userPrompt: "Thêm link magnet tải bản Ubuntu 24.04 này vào Download Station và báo tiến độ khi xong.",
    agentThought: "1. Gọi dsm_download_create_task với URI magnet.\n2. Lấy danh sách tác vụ bằng dsm_download_list_tasks để báo thông tin.",
    toolCalls: [
      { tool: "dsm_download_create_task", params: { uri: "magnet:?xt=urn:btih:ubuntu2404...", destination: "/volume1/downloads" } },
      { tool: "dsm_download_list_tasks", params: { status: "downloading" } },
    ],
    agentResponse: "Đã thêm tác vụ tải `ubuntu-24.04-desktop.iso` vào Download Station thành công. Tệp đang được lưu vào `/volume1/downloads` với tốc độ tải ban đầu là 12.4 MB/s.",
  },
];

export const McpDocsTab: React.FC = () => {
  const { session, language } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<"quickstart" | "tools" | "scenarios" | "api" | "export">("quickstart");
  const [selectedClient, setSelectedClient] = useState<"claude" | "cursor" | "windsurf" | "python" | "curl">("claude");
  const [toolSearch, setToolSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedTool, setExpandedTool] = useState<string | null>("dsm_login");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Editable config fields
  const clientCfg = dsmClient.getConfig();
  const [cfgHost, setCfgHost] = useState(clientCfg?.host || session.hostname || "192.168.1.10");
  const [cfgUser, setCfgUser] = useState(clientCfg?.account || session.account || "admin");
  const [cfgPort, setCfgPort] = useState(String(clientCfg?.port || 5001));
  const [cfgPass, setCfgPass] = useState(clientCfg?.password || "your-dsm-password");
  const [cfgHttps, setCfgHttps] = useState(clientCfg?.https ?? true);

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtered tools
  const filteredTools = useMemo(() => {
    return MCP_TOOLS.filter((t) => {
      const matchCat = selectedCategory === "all" || t.category === selectedCategory;
      const matchSearch =
        t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
        t.descriptionVi.toLowerCase().includes(toolSearch.toLowerCase()) ||
        t.descriptionEn.toLowerCase().includes(toolSearch.toLowerCase()) ||
        t.dsmApi.toLowerCase().includes(toolSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [toolSearch, selectedCategory]);

  // Config snippet generation
  const generatedConfig = useMemo(() => {
    const absPath = "/path/to/kv-synology/mcp/dist/index.js";
    if (selectedClient === "claude") {
      return JSON.stringify(
        {
          mcpServers: {
            "kv-synology": {
              command: "node",
              args: [absPath],
              env: {
                DSM_HOST: cfgHost,
                DSM_PORT: cfgPort,
                DSM_USER: cfgUser,
                DSM_PASS: cfgPass,
                DSM_HTTPS: cfgHttps ? "true" : "false",
              },
            },
          },
        },
        null,
        2
      );
    }
    if (selectedClient === "cursor" || selectedClient === "windsurf") {
      return JSON.stringify(
        {
          mcpServers: {
            "synology-dsm": {
              command: "node",
              args: [absPath],
              env: {
                DSM_HOST: cfgHost,
                DSM_PORT: cfgPort,
                DSM_USER: cfgUser,
                DSM_PASS: cfgPass,
                DSM_HTTPS: cfgHttps ? "true" : "false",
              },
            },
          },
        },
        null,
        2
      );
    }
    if (selectedClient === "python") {
      return `from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Parameters to launch KV Synology MCP server
server_params = StdioServerParameters(
    command="node",
    args=["${absPath}"],
    env={
        "DSM_HOST": "${cfgHost}",
        "DSM_PORT": "${cfgPort}",
        "DSM_USER": "${cfgUser}",
        "DSM_PASS": "${cfgPass}",
        "DSM_HTTPS": "${cfgHttps ? "true" : "false"}",
    }
)

async def run_synology_agent():
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # List available tools
            tools = await session.list_tools()
            print(f"Connected! Available tools: {len(tools.tools)}")
            
            # Call DSM System Info tool
            result = await session.call_tool("dsm_get_system_info", arguments={})
            print("DSM System Info:", result.content[0].text)
`;
    }
    return `# Direct Proxy HTTP API Call (Next.js backend)
curl -X POST "http://localhost:8088/api/dsm/entry.cgi" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "api=SYNO.Core.System&method=info&version=1"`;
  }, [selectedClient, cfgHost, cfgPort, cfgUser, cfgPass, cfgHttps]);

  // Full Markdown export for AI Agent Context
  const generateFullMarkdown = () => {
    let md = `# Synology DSM Helper - AI Agent System Tool Context\n\n`;
    md += `You have access to a Synology NAS through the \`kv-synology\` MCP server with ${MCP_TOOLS.length} specialized tools.\n\n`;
    md += `## Available MCP Tools\n\n`;
    for (const tool of MCP_TOOLS) {
      md += `### \`${tool.name}\`\n`;
      md += `- **Description**: ${tool.descriptionVi} (${tool.descriptionEn})\n`;
      md += `- **DSM WebAPI**: \`${tool.dsmApi}\`\n`;
      if (tool.params.length > 0) {
        md += `- **Parameters**:\n`;
        for (const p of tool.params) {
          md += `  - \`${p.name}\` (${p.type}${p.required ? ", required" : ", optional"}): ${p.desc}\n`;
        }
      } else {
        md += `- **Parameters**: None\n`;
      }
      md += `- **Example Payload**: \`${JSON.stringify(tool.examplePayload)}\`\n\n`;
    }
    return md;
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200 w-full">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20 shrink-0">
              <Bot className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Tài liệu API & MCP Server cho AI Agent
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  Model Context Protocol v1.0
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  42 Tools Sẵn Sàng
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Hướng dẫn tích hợp AI Agents (Claude Desktop, Cursor, VS Code, Roo Code, Python Agent SDK) điều khiển trực tiếp Synology DSM qua 42+ công cụ MCP và WebAPI.
              </p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(generateFullMarkdown(), "export-full-top")}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow flex items-center justify-center gap-2 shrink-0 self-start lg:self-center"
          >
            {copiedKey === "export-full-top" ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Đã sao chép Context!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Sao chép Prompt cho AI</span>
              </>
            )}
          </button>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4 mt-4 border-t border-slate-200/60 dark:border-slate-800/80">
          {[
            { id: "quickstart", label: "⚡ Thiết lập Kết nối", icon: Zap },
            { id: "tools", label: `🛠️ Tra cứu 42 Tools (${MCP_TOOLS.length})`, icon: SlidersHorizontal },
            { id: "scenarios", label: "💬 Kịch bản Mẫu AI", icon: Workflow },
            { id: "api", label: "🌐 DSM WebAPI Architecture", icon: Globe },
            { id: "export", label: "📋 Xuất Markdown Context", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? "bg-sky-500 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 1: Quickstart & Config Generator */}
      {activeSubTab === "quickstart" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Parameters Inputs */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-sky-500" />
                  Cấu hình kết nối NAS
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Auto-populated</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold mb-1 block">
                    Host (IP LAN / DDNS / QuickConnect ID)
                  </label>
                  <input
                    type="text"
                    value={cfgHost}
                    onChange={(e) => setCfgHost(e.target.value)}
                    placeholder="192.168.1.10 hoặc myid"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-semibold mb-1 block">
                      Cổng DSM (Port)
                    </label>
                    <input
                      type="number"
                      value={cfgPort}
                      onChange={(e) => setCfgPort(e.target.value)}
                      placeholder="5001"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-semibold mb-1 block">
                      Tài khoản (User)
                    </label>
                    <input
                      type="text"
                      value={cfgUser}
                      onChange={(e) => setCfgUser(e.target.value)}
                      placeholder="admin"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-semibold mb-1 block">
                    Mật khẩu DSM
                  </label>
                  <input
                    type="password"
                    value={cfgPass}
                    onChange={(e) => setCfgPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">Giao thức HTTPS</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfgHttps}
                      onChange={(e) => setCfgHttps(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500" />
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                💡 <strong>Mẹo QuickConnect:</strong> Bạn chỉ cần nhập QuickConnect ID (ví dụ: <code className="text-sky-600 font-mono">myid</code>). Server MCP sẽ tự động phân giải qua Synology Global Relay.
              </div>
            </div>

            {/* Generated Config Code Box */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
                    {[
                      { id: "claude", label: "Claude Desktop" },
                      { id: "cursor", label: "Cursor / VS Code" },
                      { id: "python", label: "Python Agent SDK" },
                      { id: "curl", label: "cURL Proxy" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClient(c.id as any)}
                        className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
                          selectedClient === c.id
                            ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => copyToClipboard(generatedConfig, "gen-config")}
                    className="p-1.5 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKey === "gen-config" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "gen-config" ? "Đã chép" : "Sao chép"}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                  Dán cấu hình này vào file cài đặt MCP của trợ lý AI:
                </p>

                <div className="mt-2 relative rounded-xl bg-slate-950 p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800">
                  <pre className="whitespace-pre">{generatedConfig}</pre>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Vị trí file cấu hình Claude Desktop: <code className="font-mono text-slate-600 dark:text-slate-300">~/.config/Claude/claude_desktop_config.json</code></span>
              </div>
            </div>
          </div>

          {/* Quick Install & Run Commands */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-500" />
              Khởi chạy MCP Server độc lập
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 text-slate-300 border border-slate-800 space-y-1">
                <p className="text-slate-500 text-[11px]"># 1. Biên dịch MCP server</p>
                <p className="text-emerald-400">cd mcp && npm install && npm run build</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 text-slate-300 border border-slate-800 space-y-1">
                <p className="text-slate-500 text-[11px]"># 2. Chạy thử nghiệm với MCP Inspector</p>
                <p className="text-sky-400">npx @modelcontextprotocol/inspector node dist/index.js</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 42 Tools Directory */}
      {activeSubTab === "tools" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
                placeholder="Tìm kiếm tool theo tên, chức năng, DSM API (ví dụ: dsm_list_services, files, docker)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-semibold overflow-x-auto">
              {[
                { id: "all", label: "Tất cả" },
                { id: "auth", label: "Auth" },
                { id: "system", label: "Hệ thống" },
                { id: "services", label: "Dịch vụ" },
                { id: "files", label: "File Station" },
                { id: "docker", label: "Docker" },
                { id: "download", label: "Download" },
                { id: "storage", label: "Lưu trữ" },
                { id: "notifications", label: "Thông báo" },
                { id: "advanced", label: "WebAPI" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all ${
                    selectedCategory === c.id
                      ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tools List Cards */}
          <div className="space-y-3">
            {filteredTools.map((tool) => {
              const isExpanded = expandedTool === tool.name;
              return (
                <div
                  key={tool.name}
                  className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
                >
                  {/* Tool Header */}
                  <div
                    onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 shrink-0 font-mono font-bold text-xs">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {tool.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700">
                            {tool.dsmApi}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
                            {tool.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {tool.descriptionVi}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(JSON.stringify(tool.examplePayload, null, 2), `tool-${tool.name}`);
                        }}
                        className="p-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
                        title="Sao chép JSON mẫu"
                      >
                        {copiedKey === `tool-${tool.name}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Payload</span>
                      </button>
                      <span className="text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-4 text-xs">
                      <div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {tool.descriptionVi}
                        </p>
                        <p className="text-slate-400 text-[11px] mt-0.5 italic">
                          {tool.descriptionEn}
                        </p>
                      </div>

                      {/* Parameters Table */}
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-sky-500" />
                          Tham số đầu vào (Arguments Schema):
                        </h5>
                        {tool.params.length === 0 ? (
                          <p className="text-slate-400 text-[11px] italic bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                            Không có tham số bắt buộc.
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 text-[11px]">
                                <tr>
                                  <th className="px-3 py-2">Tên</th>
                                  <th className="px-3 py-2">Kiểu</th>
                                  <th className="px-3 py-2">Bắt buộc</th>
                                  <th className="px-3 py-2">Mô tả</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                                {tool.params.map((p) => (
                                  <tr key={p.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                    <td className="px-3 py-2 font-bold text-sky-600 dark:text-sky-400">{p.name}</td>
                                    <td className="px-3 py-2 text-indigo-500">{p.type}</td>
                                    <td className="px-3 py-2">
                                      {p.required ? (
                                        <span className="text-rose-500 font-bold">Required</span>
                                      ) : (
                                        <span className="text-slate-400">Optional</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 font-sans text-slate-600 dark:text-slate-300">{p.desc}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* JSON Payload & Response Preview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Ví dụ Payload gọi Tool:
                          </span>
                          <pre className="p-3 rounded-xl bg-slate-950 text-sky-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
                            {JSON.stringify(tool.examplePayload, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            Ví dụ Kết quả trả về (JSON Response):
                          </span>
                          <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
                            {JSON.stringify(tool.exampleResponse, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AI Scenarios & Prompt Recipes */}
      {activeSubTab === "scenarios" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {AI_SCENARIOS.map((scen, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {scen.title}
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700">
                    {scen.category}
                  </span>
                </div>

                {/* User Prompt */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    👤 Người dùng hỏi (User Prompt):
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                    &ldquo;{scen.userPrompt}&rdquo;
                  </p>
                </div>

                {/* Agent Thought & Tool Calls */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/30 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" /> Suy luận & Hành động của AI Agent:
                  </span>
                  <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {scen.agentThought}
                  </pre>

                  <div className="pt-2 flex flex-wrap gap-2">
                    {scen.toolCalls.map((tc, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2.5 py-1 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] border border-slate-800 flex items-center gap-1.5"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        {tc.tool}({JSON.stringify(tc.params)})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Agent Response */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Câu trả lời từ AI (Final Response):
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    {scen.agentResponse}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DSM WebAPI Architecture */}
      {activeSubTab === "api" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-sky-500" />
              Kiến trúc Synology DSM WebAPI & Proxy Gateway
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Synology DSM cung cấp giao diện JSON-RPC qua 2 CGI gateway chính: <code className="font-mono text-sky-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">/webapi/auth.cgi</code> (Xác thực đăng nhập) và <code className="font-mono text-sky-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">/webapi/entry.cgi</code> (Thực thi mọi API dịch vụ).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Key className="w-4 h-4 text-amber-500" />
                  1. Xác thực & Session
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Gọi <code className="font-mono">SYNO.API.Auth</code> v7 với tài khoản, mật khẩu, OTP. DSM trả về cookie <code className="font-mono">id</code>, <code className="font-mono">did</code> và <code className="font-mono">SynoToken</code> (CSRF token) được tự động lưu trong session 7 ngày.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Zap className="w-4 h-4 text-sky-500" />
                  2. QuickConnect Relay
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Gửi yêu cầu tới <code className="font-mono">global.quickconnect.to</code> để phân giải IP LAN trực tiếp (ping-pong test). Nếu không cùng mạng, tự động chuyển sang relay proxy an toàn.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  3. Next.js API Proxy
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Endpoint <code className="font-mono">/api/dsm/[...path]</code> chuyển tiếp yêu cầu từ Web/MCP tới NAS, bỏ qua chứng chỉ tự ký SSL và xử lý CORS tự động.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: Markdown Export */}
      {activeSubTab === "export" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-500" />
                  Toàn văn Prompt & Schemas cho AI Agent
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sao chép toàn bộ mô tả 42 công cụ để nạp vào System Prompt của LLM
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(generateFullMarkdown(), "export-raw-md")}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow flex items-center gap-2 shrink-0"
              >
                {copiedKey === "export-raw-md" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === "export-raw-md" ? "Đã sao chép" : "Sao chép Markdown"}</span>
              </button>
            </div>

            <div className="rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] border border-slate-800">
              <pre className="whitespace-pre-wrap leading-relaxed">{generateFullMarkdown()}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
