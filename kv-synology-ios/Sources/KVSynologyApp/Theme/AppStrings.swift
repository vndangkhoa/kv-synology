import Foundation
import SwiftUI

public enum AppLanguage: String, CaseIterable, Identifiable, Codable, Sendable {
    case english = "en"
    case vietnamese = "vi"
    
    public var id: String { rawValue }
    public var code: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .english: return "English"
        case .vietnamese: return "Tiếng Việt"
        }
    }
    
    public var flagEmoji: String {
        switch self {
        case .english: return "🇺🇸"
        case .vietnamese: return "🇻🇳"
        }
    }
}

public struct AppStrings {
    private static let en: [String: String] = [
        // Navigation & General
        "nav.dashboard": "Dashboard",
        "nav.files": "File Station",
        "nav.docker": "Containers",
        "nav.download": "Downloads",
        "nav.storage": "Storage",
        "nav.packages": "Package Center",
        "nav.services": "Services",
        "nav.security": "Security",
        "nav.permissions": "Permissions",
        "nav.notifications": "Notifications",
        "nav.traffic": "Traffic",
        "nav.terminal": "Terminal",
        "nav.ai": "AI Assistant",
        "nav.settings": "Settings",
        "common.cancel": "Cancel",
        "common.confirm": "Confirm",
        "common.save": "Save",
        "common.delete": "Delete",
        "common.refresh": "Refresh",
        "common.done": "Done",
        "common.close": "Close",
        "common.search": "Search...",
        "common.loading": "Loading...",
        "common.error": "Error",
        "common.success": "Success",
        "common.copy": "Copy",
        "common.copied": "Copied to clipboard",
        
        // Login
        "login.title": "KV-Synology",
        "login.subtitle": "Next-Gen Synology DSM Client",
        "login.tab.quickconnect": "QuickConnect",
        "login.tab.direct": "Direct IP / Host",
        "login.qc_placeholder": "QuickConnect ID (e.g. my-nas)",
        "login.host_placeholder": "192.168.1.100 or nas.local",
        "login.port_label": "Port",
        "login.https_toggle": "HTTPS (Secure TLS)",
        "login.account_label": "Account",
        "login.password_label": "Password",
        "login.otp_label": "OTP 6-Digit Code",
        "login.ignore_cert": "Trust Self-Signed Certificates",
        "login.remember_me": "Save NAS Profile",
        "login.connect_button": "Connect to DSM",
        "login.connecting": "Authenticating...",
        "login.demo_button": "Explore Demo Mode (Offline)",
        "login.saved_profiles": "Saved Profiles",
        "login.qc_resolving": "Resolving QuickConnect tunnel...",
        
        // Dashboard
        "dash.telemetry": "System Telemetry",
        "dash.cpu": "CPU Usage",
        "dash.ram": "Memory",
        "dash.network": "Network",
        "dash.disk": "Disk I/O",
        "dash.specs": "Hardware Specs",
        "dash.model": "Model",
        "dash.dsm_ver": "DSM Version",
        "dash.serial": "Serial Number",
        "dash.uptime": "Uptime",
        "dash.thermal": "Thermal Status",
        "dash.processes": "Running Processes",
        "dash.pid": "PID",
        "dash.power_actions": "Power Controls",
        "dash.reboot": "Reboot NAS",
        "dash.shutdown": "Shutdown NAS",
        "dash.reboot_msg": "Are you sure you want to reboot the Synology NAS? Services will temporarily disconnect.",
        "dash.shutdown_msg": "Are you sure you want to shut down the Synology NAS? You will need physical access or WOL to turn it back on.",
        "dash.kill_process": "Kill Process",
        "dash.kill_msg": "Are you sure you want to terminate process",
        
        // Files
        "files.title": "File Station",
        "files.new_folder": "New Folder",
        "files.new_folder_prompt": "Enter folder name:",
        "files.rename": "Rename",
        "files.share": "Create Share Link",
        "files.share_success": "Share Link Created",
        "files.share_copied": "Share URL copied to clipboard",
        "files.delete_confirm": "Are you sure you want to delete",
        "files.empty": "This folder is empty",
        "files.preview": "File Preview",
        "files.code_viewer": "Code Viewer",
        "files.save_changes": "Save Changes",
        "files.saving": "Saving...",
        "files.items_count": "items",
        
        // Docker
        "docker.title": "Container Manager",
        "docker.tab_containers": "Containers",
        "docker.tab_images": "Images",
        "docker.tab_compose": "Projects",
        "docker.status_running": "Running",
        "docker.status_stopped": "Stopped",
        "docker.status_paused": "Paused",
        "docker.action_start": "Start",
        "docker.action_stop": "Stop",
        "docker.action_restart": "Restart",
        "docker.action_logs": "Live Logs",
        "docker.logs_title": "Terminal Output",
        "docker.logs_autoscroll": "Auto-Scroll",
        "docker.no_containers": "No Docker containers found",
        "docker.no_images": "No Docker images found",
        "docker.no_projects": "No Compose projects found",
        
        // Download
        "download.title": "Download Station",
        "download.all": "All",
        "download.downloading": "Downloading",
        "download.paused": "Paused",
        "download.completed": "Completed",
        "download.add_task": "Add Task",
        "download.url_prompt": "Download URL or Magnet Link",
        "download.destination": "Destination Folder",
        "download.start_immediately": "Start Immediately",
        "download.pause": "Pause",
        "download.resume": "Resume",
        "download.delete_task": "Delete Download",
        "download.speed": "Speed",
        "download.eta": "ETA",
        
        // Storage
        "storage.title": "Storage Manager",
        "storage.pools": "Storage Pools",
        "storage.volumes": "Volumes",
        "storage.drives": "Physical Drives",
        "storage.raid_type": "RAID Type",
        "storage.smart_health": "S.M.A.R.T. Health",
        "storage.temp": "Temp",
        "storage.used": "Used",
        "storage.free": "Free",
        "storage.total": "Total",
        "storage.healthy": "Healthy",
        "storage.warning": "Warning",
        "storage.critical": "Critical"
    ]
    
    private static let vi: [String: String] = [
        // Navigation & General
        "nav.dashboard": "Bảng điều khiển",
        "nav.files": "Quản lý tệp tin",
        "nav.docker": "Bộ chứa Docker",
        "nav.download": "Trạm tải xuống",
        "nav.storage": "Lưu trữ & Ổ đĩa",
        "nav.packages": "Trung tâm gói",
        "nav.services": "Dịch vụ mạng",
        "nav.security": "Bảo mật & Tường lửa",
        "nav.permissions": "Phân quyền ACL",
        "nav.notifications": "Thông báo",
        "nav.traffic": "Lưu lượng mạng",
        "nav.terminal": "Cửa sổ lệnh SSH",
        "nav.ai": "Trợ lý AI MCP",
        "nav.settings": "Cài đặt ứng dụng",
        "common.cancel": "Hủy bỏ",
        "common.confirm": "Xác nhận",
        "common.save": "Lưu",
        "common.delete": "Xóa",
        "common.refresh": "Làm mới",
        "common.done": "Xong",
        "common.close": "Đóng",
        "common.search": "Tìm kiếm...",
        "common.loading": "Đang tải...",
        "common.error": "Lỗi",
        "common.success": "Thành công",
        "common.copy": "Sao chép",
        "common.copied": "Đã sao chép vào bộ nhớ tạm",
        
        // Login
        "login.title": "KV-Synology",
        "login.subtitle": "Trình quản lý Synology DSM thế hệ mới",
        "login.tab.quickconnect": "QuickConnect",
        "login.tab.direct": "IP / Tên miền trực tiếp",
        "login.qc_placeholder": "QuickConnect ID (ví dụ: my-nas)",
        "login.host_placeholder": "192.168.1.100 hoặc nas.local",
        "login.port_label": "Cổng",
        "login.https_toggle": "HTTPS (Bảo mật TLS)",
        "login.account_label": "Tài khoản",
        "login.password_label": "Mật khẩu",
        "login.otp_label": "Mã xác thực 2 bước OTP (6 chữ số)",
        "login.ignore_cert": "Bỏ qua lỗi chứng chỉ SSL tự ký",
        "login.remember_me": "Lưu cấu hình máy chủ này",
        "login.connect_button": "Kết nối tới DSM",
        "login.connecting": "Đang xác thực...",
        "login.demo_button": "Trải nghiệm chế độ Demo (Ngoại tuyến)",
        "login.saved_profiles": "Hồ sơ máy chủ đã lưu",
        "login.qc_resolving": "Đang định tuyến đường hầm QuickConnect...",
        
        // Dashboard
        "dash.telemetry": "Thông số thời gian thực",
        "dash.cpu": "Mức sử dụng CPU",
        "dash.ram": "Bộ nhớ RAM",
        "dash.network": "Lưu lượng mạng",
        "dash.disk": "Tốc độ đọc/ghi ổ cứng",
        "dash.specs": "Cấu hình phần cứng",
        "dash.model": "Dòng máy",
        "dash.dsm_ver": "Phiên bản DSM",
        "dash.serial": "Số sê-ri",
        "dash.uptime": "Thời gian hoạt động",
        "dash.thermal": "Nhiệt độ hệ thống",
        "dash.processes": "Tiến trình đang chạy",
        "dash.pid": "PID",
        "dash.power_actions": "Điều khiển nguồn",
        "dash.reboot": "Khởi động lại NAS",
        "dash.shutdown": "Tắt nguồn NAS",
        "dash.reboot_msg": "Bạn có chắc chắn muốn khởi động lại máy chủ Synology? Các dịch vụ mạng sẽ tạm thời ngắt kết nối.",
        "dash.shutdown_msg": "Bạn có chắc chắn muốn tắt nguồn máy chủ Synology? Bạn cần ấn nút nguồn vật lý hoặc bật qua Wake-on-LAN để mở lại.",
        "dash.kill_process": "Buộc dừng tiến trình",
        "dash.kill_msg": "Bạn có chắc chắn muốn dừng tiến trình",
        
        // Files
        "files.title": "File Station",
        "files.new_folder": "Tạo thư mục mới",
        "files.new_folder_prompt": "Nhập tên thư mục mới:",
        "files.rename": "Đổi tên",
        "files.share": "Tạo liên kết chia sẻ",
        "files.share_success": "Đã tạo liên kết chia sẻ",
        "files.share_copied": "Đã sao chép liên kết chia sẻ vào bộ nhớ tạm",
        "files.delete_confirm": "Bạn có chắc chắn muốn xóa",
        "files.empty": "Thư mục này hiện đang trống",
        "files.preview": "Xem trước tệp",
        "files.code_viewer": "Trình xem mã nguồn",
        "files.save_changes": "Lưu thay đổi",
        "files.saving": "Đang lưu...",
        "files.items_count": "mục",
        
        // Docker
        "docker.title": "Quản lý Container",
        "docker.tab_containers": "Bộ chứa",
        "docker.tab_images": "Hình ảnh (Images)",
        "docker.tab_compose": "Dự án Compose",
        "docker.status_running": "Đang chạy",
        "docker.status_stopped": "Đã dừng",
        "docker.status_paused": "Tạm dừng",
        "docker.action_start": "Bật",
        "docker.action_stop": "Tắt",
        "docker.action_restart": "Khởi động lại",
        "docker.action_logs": "Nhật ký trực tiếp",
        "docker.logs_title": "Nhật ký Container",
        "docker.logs_autoscroll": "Tự cuộn xuống",
        "docker.no_containers": "Không tìm thấy bộ chứa Docker nào",
        "docker.no_images": "Không tìm thấy hình ảnh nào",
        "docker.no_projects": "Không có dự án Compose nào",
        
        // Download
        "download.title": "Download Station",
        "download.all": "Tất cả",
        "download.downloading": "Đang tải",
        "download.paused": "Tạm dừng",
        "download.completed": "Hoàn tất",
        "download.add_task": "Thêm tác vụ tải",
        "download.url_prompt": "Liên kết tải về (URL) hoặc Magnet Link",
        "download.destination": "Thư mục lưu trữ đích",
        "download.start_immediately": "Bắt đầu tải ngay lập tức",
        "download.pause": "Tạm dừng",
        "download.resume": "Tiếp tục",
        "download.delete_task": "Xóa tác vụ",
        "download.speed": "Tốc độ",
        "download.eta": "Thời gian còn lại",
        
        // Storage
        "storage.title": "Quản lý lưu trữ",
        "storage.pools": "Nhóm lưu trữ (Pools)",
        "storage.volumes": "Ổ đĩa logic (Volumes)",
        "storage.drives": "Ổ đĩa vật lý (Disks)",
        "storage.raid_type": "Kiểu RAID",
        "storage.smart_health": "Sức khỏe S.M.A.R.T.",
        "storage.temp": "Nhiệt độ",
        "storage.used": "Đã dùng",
        "storage.free": "Còn trống",
        "storage.total": "Tổng dung lượng",
        "storage.healthy": "Tốt",
        "storage.warning": "Cảnh báo",
        "storage.critical": "Nguy hiểm"
    ]
    
    public static func tr(_ key: String, lang: AppLanguage = .english) -> String {
        switch lang {
        case .english:
            return en[key] ?? key
        case .vietnamese:
            return vi[key] ?? en[key] ?? key
        }
    }
}
