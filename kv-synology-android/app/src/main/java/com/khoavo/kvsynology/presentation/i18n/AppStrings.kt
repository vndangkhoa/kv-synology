package com.khoavo.kvsynology.presentation.i18n

import androidx.compose.runtime.staticCompositionLocalOf

interface AppStrings {
    // App & Navigation
    val appTitle: String
    val dashboard: String
    val files: String
    val docker: String
    val download: String
    val storage: String
    val packages: String
    val services: String
    val reverseProxy: String
    val firewall: String
    val permissions: String
    val notifications: String
    val traffic: String
    val snmp: String
    val terminal: String
    val mcp: String
    val settings: String

    // Common Actions
    val refresh: String
    val close: String
    val cancel: String
    val save: String
    val delete: String
    val edit: String
    val add: String
    val search: String
    val all: String
    val status: String
    val connected: String
    val disconnected: String
    val demoMode: String
    val copyPath: String
    val copied: String

    // Dashboard & System
    val systemStatus: String
    val healthy: String
    val temperature: String
    val uptime: String
    val cpuUsage: String
    val ramUsage: String
    val storageUsage: String
    val quickActions: String
    val runningContainers: String
    val activeDownloads: String
    val activeServices: String

    // Process & Monitor
    val resourceMonitor: String
    val processExplorer: String
    val searchProcessPlaceholder: String
    val running: String
    val stopped: String
    val highCpu: String
    val highRam: String
    val systemProcs: String
    val sortBy: String
    val killProcess: String
    val killConfirmTitle: String
    val killConfirmMsg: String
    val processDetails: String

    // Download Station
    val downloadStation: String
    val downloading: String
    val paused: String
    val finished: String
    val addDownloadTask: String
    val enterUrlOrMagnet: String
    val selectTorrentFile: String
    val startDownload: String
    val viewCompletedFile: String
    val completedFileTitle: String
    val fileSize: String
    val fileType: String
    val storageLocation: String

    // Services
    val fileAndNetworkServices: String
    val fileSharingTab: String
    val listeningPortsTab: String
    val smbService: String
    val afpService: String
    val nfsService: String
    val ftpService: String
    val sshService: String
    val port: String

    // Firewall
    val firewallAndSecurity: String
    val firewallStatus: String
    val firewallActive: String
    val firewallInactive: String
    val firewallRules: String
    val addRule: String
    val editRule: String
    val ruleName: String
    val protocol: String
    val action: String
    val allow: String
    val deny: String
    val sourceIp: String
    val selectFromRunningService: String
    val saveRule: String

    // ACL Permissions
    val aclPermissions: String
    val inspectingFolder: String
    val owner: String
    val adminGroup: String
    val accessList: String
    val addPermission: String
    val editPermission: String
    val userOrGroup: String
    val permissionLevel: String
    val fullControl: String
    val readAndWrite: String
    val readOnly: String

    // Traffic & GeoIP
    val networkTrafficGeoIp: String
    val activeConnections: String
    val outboundBandwidth: String
    val inboundBandwidth: String
    val trafficByCountry: String
    val activeConnectionsList: String
    val networkInterfaces: String
    val blockIp: String
    val kickSession: String
    val connectionDetails: String

    // SNMP
    val snmpMonitor: String
    val snmpServiceConfig: String
    val snmpVersion: String
    val communityName: String
    val sensors: String
    val addSnmpDevice: String

    // Terminal
    val dsmTerminal: String
    val typeCommand: String
    val sendCommand: String
    val sshConnected: String
    val sshChecking: String
    val sshAuthRequired: String
    val sshUnavailable: String
    val sshDemo: String
    val sshDialogTitle: String
    val sshPasswordLabel: String
    val sshPortLabel: String
    val sshConnectBtn: String
    val sshEnableHint: String

    // Settings
    val systemSettings: String
    val languageSetting: String
    val themeSetting: String
    val themeSystem: String
    val themeLight: String
    val themeDark: String
    val experienceMode: String
    val expBeginner: String
    val expAdvanced: String
    val expBeginnerDesc: String
    val expAdvancedDesc: String
    val aiCopilotConfig: String
    val aiChatBubbleToggle: String
    val aiChatBubbleDesc: String
    val aiLocalMode: String
    val aiLocalModeDesc: String
    val aiLocalReady: String
    // Legacy keys kept for compatibility (cloud providers removed)
    val aiProvider: String
    val aiModel: String
    val aiApiKey: String
    val aiCustomBaseUrl: String
    val testAiConnection: String
    val testingConnection: String
    val testSuccess: String
    val testFailed: String
    val logout: String
    val logoutConfirmTitle: String
    val logoutConfirmMsg: String
}

object ViStrings : AppStrings {
    override val appTitle = "KV Synology Quản trị"
    override val dashboard = "Tổng quan"
    override val files = "Tập tin"
    override val docker = "Docker"
    override val download = "Tải xuống"
    override val storage = "Lưu trữ"
    override val packages = "Gói ứng dụng"
    override val services = "Dịch vụ"
    override val reverseProxy = "Reverse Proxy"
    override val firewall = "Tường lửa"
    override val permissions = "Phân quyền ACL"
    override val notifications = "Thông báo"
    override val traffic = "Lưu lượng mạng"
    override val snmp = "SNMP Sensor"
    override val terminal = "Dòng lệnh"
    override val mcp = "Tài liệu MCP"
    override val settings = "Cài đặt"

    override val refresh = "Làm mới"
    override val close = "Đóng"
    override val cancel = "Hủy"
    override val save = "Lưu"
    override val delete = "Xóa"
    override val edit = "Chỉnh sửa"
    override val add = "Thêm mới"
    override val search = "Tìm kiếm"
    override val all = "Tất cả"
    override val status = "Trạng thái"
    override val connected = "Đã kết nối"
    override val disconnected = "Chưa kết nối"
    override val demoMode = "Chế độ dùng thử (Demo Mode)"
    override val copyPath = "Sao chép đường dẫn"
    override val copied = "Đã sao chép vào bộ nhớ tạm"

    override val systemStatus = "Trạng thái hệ thống"
    override val healthy = "Hoạt động tốt"
    override val temperature = "Nhiệt độ"
    override val uptime = "Thời gian hoạt động"
    override val cpuUsage = "Tải CPU"
    override val ramUsage = "Bộ nhớ RAM"
    override val storageUsage = "Dung lượng lưu trữ"
    override val quickActions = "Thao tác nhanh"
    override val runningContainers = "Container đang chạy"
    override val activeDownloads = "Tác vụ tải xuống"
    override val activeServices = "Dịch vụ mạng hoạt động"

    override val resourceMonitor = "Giám sát tài nguyên"
    override val processExplorer = "Quản lý tiến trình (Process Explorer)"
    override val searchProcessPlaceholder = "Tìm tiến trình theo tên hoặc PID..."
    override val running = "Đang chạy"
    override val stopped = "Đã dừng"
    override val highCpu = "CPU > 5%"
    override val highRam = "RAM > 5%"
    override val systemProcs = "Hệ thống (root)"
    override val sortBy = "Sắp xếp theo:"
    override val killProcess = "Dừng tiến trình"
    override val killConfirmTitle = "Dừng tiến trình?"
    override val killConfirmMsg = "Bạn có chắc chắn muốn buộc dừng tiến trình này?"
    override val processDetails = "Chi tiết tiến trình"

    override val downloadStation = "Download Station"
    override val downloading = "Đang tải"
    override val paused = "Tạm dừng"
    override val finished = "Hoàn tất"
    override val addDownloadTask = "Thêm tác vụ tải xuống"
    override val enterUrlOrMagnet = "URL tệp hoặc liên kết Magnet"
    override val selectTorrentFile = "Chọn tệp Torrent / NZB từ máy"
    override val startDownload = "Bắt đầu tải"
    override val viewCompletedFile = "Xem tệp tải xong"
    override val completedFileTitle = "Tệp đã tải xong"
    override val fileSize = "Kích thước:"
    override val fileType = "Loại tệp:"
    override val storageLocation = "Vị trí lưu trên NAS:"

    override val fileAndNetworkServices = "Dịch vụ tập tin & mạng"
    override val fileSharingTab = "Dịch vụ chia sẻ tệp"
    override val listeningPortsTab = "Cổng & Dịch vụ đang chạy"
    override val smbService = "SMB File Service (Windows/Mac)"
    override val afpService = "Apple Filing Protocol (AFP)"
    override val nfsService = "NFS Service (Linux/UNIX)"
    override val ftpService = "FTP Service (FTP/FTPS)"
    override val sshService = "SSH Terminal (Secure Shell)"
    override val port = "Cổng"

    override val firewallAndSecurity = "Tường lửa & Bảo mật"
    override val firewallStatus = "Trạng thái tường lửa"
    override val firewallActive = "Đang bảo vệ hệ thống NAS (Đang bật)"
    override val firewallInactive = "Tường lửa đã tắt"
    override val firewallRules = "Quy tắc tường lửa"
    override val addRule = "Thêm quy tắc"
    override val editRule = "Chỉnh sửa quy tắc"
    override val ruleName = "Tên quy tắc"
    override val protocol = "Giao thức"
    override val action = "Hành động"
    override val allow = "Cho phép"
    override val deny = "Từ chối"
    override val sourceIp = "IP nguồn (all hoặc 192.168.1.0/24)"
    override val selectFromRunningService = "Chọn nhanh từ dịch vụ có sẵn:"
    override val saveRule = "Lưu quy tắc"

    override val aclPermissions = "Phân quyền ACL"
    override val inspectingFolder = "Thư mục đang kiểm tra"
    override val owner = "Chủ sở hữu"
    override val adminGroup = "Nhóm quản trị"
    override val accessList = "Danh sách quyền truy cập"
    override val addPermission = "Thêm quyền ACL"
    override val editPermission = "Chỉnh sửa quyền truy cập"
    override val userOrGroup = "Người dùng / Nhóm"
    override val permissionLevel = "Mức phân quyền"
    override val fullControl = "Toàn quyền (Full Control)"
    override val readAndWrite = "Đọc & Ghi (Read/Write)"
    override val readOnly = "Chỉ đọc (Read Only)"

    override val networkTrafficGeoIp = "Lưu lượng mạng & GeoIP"
    override val activeConnections = "Kết nối hoạt động"
    override val outboundBandwidth = "Băng thông ra (TX)"
    override val inboundBandwidth = "Băng thông vào (RX)"
    override val trafficByCountry = "Phân bổ lưu lượng theo quốc gia"
    override val activeConnectionsList = "Kết nối đang hoạt động"
    override val networkInterfaces = "Giao diện mạng (NIC)"
    override val blockIp = "Chặn IP vào Tường lửa"
    override val kickSession = "Ngắt kết nối phiên"
    override val connectionDetails = "Chi tiết kết nối mạng"

    override val snmpMonitor = "Giám sát SNMP"
    override val snmpServiceConfig = "Cấu hình dịch vụ SNMP"
    override val snmpVersion = "Phiên bản SNMP"
    override val communityName = "Community String"
    override val sensors = "Cảm biến phần cứng (Sensors)"
    override val addSnmpDevice = "Thêm thiết bị SNMP"

    override val dsmTerminal = "Dòng lệnh DSM Terminal"
    override val typeCommand = "Nhập lệnh (ví dụ: df -h, uptime, docker ps)..."
    override val sendCommand = "Gửi lệnh"
    override val sshConnected = "SSH đã kết nối"
    override val sshChecking = "Đang kết nối SSH..."
    override val sshAuthRequired = "SSH cần mật khẩu"
    override val sshUnavailable = "SSH chưa kết nối"
    override val sshDemo = "SSH demo (mô phỏng)"
    override val sshDialogTitle = "Kết nối SSH tới NAS"
    override val sshPasswordLabel = "Mật khẩu SSH"
    override val sshPortLabel = "Cổng SSH"
    override val sshConnectBtn = "Kết nối"
    override val sshEnableHint = "Hãy bật 'SSH Terminal' trong Dịch vụ rồi thử lại"

    override val systemSettings = "Cài đặt hệ thống"
    override val languageSetting = "Ngôn ngữ (Language)"
    override val themeSetting = "Giao diện (Theme)"
    override val themeSystem = "Hệ thống"
    override val themeLight = "Sáng"
    override val themeDark = "Tối (OLED)"
    override val experienceMode = "Chế độ trải nghiệm"
    override val expBeginner = "🟢 Cơ bản (Beginner)"
    override val expAdvanced = "⚡ Nâng cao (Advanced)"
    override val expBeginnerDesc = "Chế độ Cơ bản: Hiển thị các tính năng cốt lõi (Tổng quan, Tài nguyên, Tệp tin, Docker, Tải xuống, Lưu trữ, Thông báo)."
    override val expAdvancedDesc = "Chế độ Nâng cao: Mở khóa đầy đủ toàn bộ 15 module (Tường lửa, Phân quyền ACL, Reverse Proxy, Dịch vụ mạng, SNMP, Terminal)."
    override val aiCopilotConfig = "Trợ lý AI cục bộ (Local AI)"
    override val aiChatBubbleToggle = "Bong bóng AI Bot trên màn hình"
    override val aiChatBubbleDesc = "Hiển thị nút trợ lý AI nổi ở góc màn hình"
    override val aiLocalMode = "Chế độ Local AI"
    override val aiLocalModeDesc = "Trợ lý chạy hoàn toàn trên thiết bị, phân tích trực tiếp thông số NAS (nhiệt độ, CPU, RAM, Docker, lưu trữ). Không cần API Key, không gửi dữ liệu ra ngoài, hoạt động offline."
    override val aiLocalReady = "Local AI sẵn sàng — không cần cấu hình thêm."
    override val aiProvider = "Nhà cung cấp AI (Provider)"
    override val aiModel = "Mô hình AI (Model)"
    override val aiApiKey = "Khóa bí mật (API Key)"
    override val aiCustomBaseUrl = "URL máy chủ tùy chỉnh (Custom Base URL)"
    override val testAiConnection = "Kiểm tra kết nối AI"
    override val testingConnection = "Đang kiểm tra kết nối tới máy chủ AI..."
    override val testSuccess = "Kết nối máy chủ AI thành công!"
    override val testFailed = "Không thể kết nối tới máy chủ AI. Vui lòng kiểm tra API Key."
    override val logout = "Đăng xuất khỏi NAS"
    override val logoutConfirmTitle = "Đăng xuất?"
    override val logoutConfirmMsg = "Phiên kết nối tới Synology NAS sẽ được kết thúc."
}

object EnStrings : AppStrings {
    override val appTitle = "KV Synology Manager"
    override val dashboard = "Dashboard"
    override val files = "Files"
    override val docker = "Docker"
    override val download = "Downloads"
    override val storage = "Storage"
    override val packages = "Package Center"
    override val services = "Services"
    override val reverseProxy = "Reverse Proxy"
    override val firewall = "Firewall"
    override val permissions = "ACL Permissions"
    override val notifications = "Notifications"
    override val traffic = "Network Traffic"
    override val snmp = "SNMP Sensors"
    override val terminal = "Terminal"
    override val mcp = "MCP Docs"
    override val settings = "Settings"

    override val refresh = "Refresh"
    override val close = "Close"
    override val cancel = "Cancel"
    override val save = "Save"
    override val delete = "Delete"
    override val edit = "Edit"
    override val add = "Add New"
    override val search = "Search"
    override val all = "All"
    override val status = "Status"
    override val connected = "Connected"
    override val disconnected = "Disconnected"
    override val demoMode = "Demo Mode (Mock Data)"
    override val copyPath = "Copy File Path"
    override val copied = "Copied to clipboard"

    override val systemStatus = "System Status"
    override val healthy = "Healthy"
    override val temperature = "Temperature"
    override val uptime = "System Uptime"
    override val cpuUsage = "CPU Load"
    override val ramUsage = "RAM Memory"
    override val storageUsage = "Storage Capacity"
    override val quickActions = "Quick Actions"
    override val runningContainers = "Running Containers"
    override val activeDownloads = "Active Downloads"
    override val activeServices = "Active Network Services"

    override val resourceMonitor = "Resource Monitor"
    override val processExplorer = "Process Explorer"
    override val searchProcessPlaceholder = "Search process by name or PID..."
    override val running = "Running"
    override val stopped = "Stopped"
    override val highCpu = "CPU > 5%"
    override val highRam = "RAM > 5%"
    override val systemProcs = "System (root)"
    override val sortBy = "Sort by:"
    override val killProcess = "Kill Process"
    override val killConfirmTitle = "Kill Process?"
    override val killConfirmMsg = "Are you sure you want to kill this process?"
    override val processDetails = "Process Details"

    override val downloadStation = "Download Station"
    override val downloading = "Downloading"
    override val paused = "Paused"
    override val finished = "Completed"
    override val addDownloadTask = "Add Download Task"
    override val enterUrlOrMagnet = "File URL or Magnet Link"
    override val selectTorrentFile = "Pick Torrent / NZB File"
    override val startDownload = "Start Download"
    override val viewCompletedFile = "Inspect Completed File"
    override val completedFileTitle = "Download Completed"
    override val fileSize = "Size:"
    override val fileType = "Type:"
    override val storageLocation = "Saved Path on NAS:"

    override val fileAndNetworkServices = "File & Network Services"
    override val fileSharingTab = "File Sharing Services"
    override val listeningPortsTab = "Active Ports & Services"
    override val smbService = "SMB File Service (Windows/Mac)"
    override val afpService = "Apple Filing Protocol (AFP)"
    override val nfsService = "NFS Service (Linux/UNIX)"
    override val ftpService = "FTP Service (FTP/FTPS)"
    override val sshService = "SSH Terminal (Secure Shell)"
    override val port = "Port"

    override val firewallAndSecurity = "Firewall & Security"
    override val firewallStatus = "Firewall Status"
    override val firewallActive = "Protecting NAS System (Active)"
    override val firewallInactive = "Firewall is Disabled"
    override val firewallRules = "Firewall Rules"
    override val addRule = "Add Rule"
    override val editRule = "Edit Rule"
    override val ruleName = "Rule Name"
    override val protocol = "Protocol"
    override val action = "Action"
    override val allow = "Allow"
    override val deny = "Deny"
    override val sourceIp = "Source IP (all or 192.168.1.0/24)"
    override val selectFromRunningService = "Quick select from running services:"
    override val saveRule = "Save Rule"

    override val aclPermissions = "ACL Permissions"
    override val inspectingFolder = "Inspecting Folder"
    override val owner = "Owner"
    override val adminGroup = "Admin Group"
    override val accessList = "Access Control Entries"
    override val addPermission = "Add ACL Permission"
    override val editPermission = "Edit Permission Entry"
    override val userOrGroup = "User / Group"
    override val permissionLevel = "Permission Level"
    override val fullControl = "Full Control"
    override val readAndWrite = "Read & Write"
    override val readOnly = "Read Only"

    override val networkTrafficGeoIp = "Network Traffic & GeoIP"
    override val activeConnections = "Active Connections"
    override val outboundBandwidth = "Outbound Bandwidth (TX)"
    override val inboundBandwidth = "Inbound Bandwidth (RX)"
    override val trafficByCountry = "Traffic Distribution by Country"
    override val activeConnectionsList = "Active Connection Sessions"
    override val networkInterfaces = "Network Interfaces (NIC)"
    override val blockIp = "Block IP in Firewall"
    override val kickSession = "Terminate Session"
    override val connectionDetails = "Connection Details"

    override val snmpMonitor = "SNMP Monitoring"
    override val snmpServiceConfig = "SNMP Service Configuration"
    override val snmpVersion = "SNMP Version"
    override val communityName = "Community String"
    override val sensors = "Hardware Sensors"
    override val addSnmpDevice = "Add SNMP Device"

    override val dsmTerminal = "DSM Linux Terminal"
    override val typeCommand = "Enter command (e.g. df -h, uptime, docker ps)..."
    override val sendCommand = "Send"
    override val sshConnected = "SSH connected"
    override val sshChecking = "Connecting SSH..."
    override val sshAuthRequired = "SSH needs password"
    override val sshUnavailable = "SSH not connected"
    override val sshDemo = "SSH demo (simulated)"
    override val sshDialogTitle = "Connect SSH to NAS"
    override val sshPasswordLabel = "SSH password"
    override val sshPortLabel = "SSH port"
    override val sshConnectBtn = "Connect"
    override val sshEnableHint = "Enable 'SSH Terminal' in Services, then retry"

    override val systemSettings = "System Settings"
    override val languageSetting = "Language"
    override val themeSetting = "Theme"
    override val themeSystem = "System"
    override val themeLight = "Light"
    override val themeDark = "Dark (OLED)"
    override val experienceMode = "Experience Mode"
    override val expBeginner = "🟢 Beginner"
    override val expAdvanced = "⚡ Advanced"
    override val expBeginnerDesc = "Beginner Mode: Shows core features (Dashboard, Resource Monitor, Files, Docker, Downloads, Storage, Notifications)."
    override val expAdvancedDesc = "Advanced Mode: Unlocks all 15 administrative modules (Firewall, ACL, Reverse Proxy, Services, SNMP, Terminal)."
    override val aiCopilotConfig = "Local AI Assistant"
    override val aiChatBubbleToggle = "Floating AI Bot Bubble"
    override val aiChatBubbleDesc = "Display floating AI assistant button on screen"
    override val aiLocalMode = "Local AI Mode"
    override val aiLocalModeDesc = "On-device assistant that analyzes live NAS telemetry (temperature, CPU, RAM, Docker, storage). No API key needed, no data leaves your phone, works offline."
    override val aiLocalReady = "Local AI ready — no setup required."
    override val aiProvider = "AI Provider"
    override val aiModel = "AI Model"
    override val aiApiKey = "Secret API Key"
    override val aiCustomBaseUrl = "Custom Base URL / Endpoint"
    override val testAiConnection = "Test AI Connection"
    override val testingConnection = "Testing connection to AI server..."
    override val testSuccess = "Connected to AI server successfully!"
    override val testFailed = "Failed to connect to AI server. Please check your API Key."
    override val logout = "Log Out from NAS"
    override val logoutConfirmTitle = "Log Out?"
    override val logoutConfirmMsg = "Your session with Synology NAS will be terminated."
}

val LocalAppStrings = staticCompositionLocalOf<AppStrings> { ViStrings }
