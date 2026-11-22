use crate::models::{ExperienceMode, Language, NavTab, ThemeMode};

pub const fn tr(lang: Language, vi: &'static str, en: &'static str) -> &'static str {
    match lang {
        Language::Vi => vi,
        Language::En => en,
    }
}

pub const fn nav_label(lang: Language, tab: NavTab) -> &'static str {
    match (lang, tab) {
        (Language::Vi, NavTab::Dashboard) => "Tổng quan",
        (Language::En, NavTab::Dashboard) => "Dashboard",
        (Language::Vi, NavTab::Monitor) => "Giám sát tài nguyên",
        (Language::En, NavTab::Monitor) => "Resource Monitor",
        (Language::Vi, NavTab::Snmp) => "Giám sát SNMP (PRTG)",
        (Language::En, NavTab::Snmp) => "SNMP Monitor",
        (Language::Vi, NavTab::Traffic) => "Lưu lượng & GeoIP",
        (Language::En, NavTab::Traffic) => "Traffic & GeoIP",
        (Language::Vi, NavTab::Files) => "Quản lý tệp",
        (Language::En, NavTab::Files) => "File Station",
        (Language::Vi, NavTab::Permissions) => "Kiểm tra Phân quyền",
        (Language::En, NavTab::Permissions) => "Permissions",
        (Language::Vi, NavTab::Docker) => "Docker / Container",
        (Language::En, NavTab::Docker) => "Docker Containers",
        (Language::Vi, NavTab::Download) => "Download Station",
        (Language::En, NavTab::Download) => "Download Station",
        (Language::Vi, NavTab::Storage) => "Quản lý lưu trữ",
        (Language::En, NavTab::Storage) => "Storage Manager",
        (Language::Vi, NavTab::Packages) => "Trung tâm gói",
        (Language::En, NavTab::Packages) => "Package Center",
        (Language::Vi, NavTab::Services) => "Dịch vụ hệ thống",
        (Language::En, NavTab::Services) => "Services",
        (Language::Vi, NavTab::ReverseProxy) => "Reverse Proxy",
        (Language::En, NavTab::ReverseProxy) => "Reverse Proxy",
        (Language::Vi, NavTab::Firewall) => "Tường lửa & Bảo mật",
        (Language::En, NavTab::Firewall) => "Firewall & Security",
        (Language::Vi, NavTab::Notifications) => "Trung tâm Thông báo",
        (Language::En, NavTab::Notifications) => "Notifications",
        (Language::Vi, NavTab::Reports) => "Báo cáo Vận hành",
        (Language::En, NavTab::Reports) => "Operational Reports",
        (Language::Vi, NavTab::Terminal) => "SSH Terminal",
        (Language::En, NavTab::Terminal) => "SSH Terminal",
        (Language::Vi, NavTab::Mcp) => "API & MCP (AI Agent)",
        (Language::En, NavTab::Mcp) => "API & MCP Hub",
        (Language::Vi, NavTab::Settings) => "Cài đặt & Hệ thống",
        (Language::En, NavTab::Settings) => "Settings",
    }
}

pub const fn theme_label(lang: Language, mode: ThemeMode) -> &'static str {
    match (lang, mode) {
        (Language::Vi, ThemeMode::System) => "Theo hệ thống",
        (Language::En, ThemeMode::System) => "System",
        (Language::Vi, ThemeMode::Light) => "Sáng",
        (Language::En, ThemeMode::Light) => "Light",
        (Language::Vi, ThemeMode::Dark) => "Tối",
        (Language::En, ThemeMode::Dark) => "Dark",
        (Language::Vi, ThemeMode::Gemini) => "Gemini AI",
        (Language::En, ThemeMode::Gemini) => "Gemini AI",
    }
}

pub const fn exp_label(lang: Language, mode: ExperienceMode) -> &'static str {
    match (lang, mode) {
        (Language::Vi, ExperienceMode::Beginner) => "Cơ bản",
        (Language::En, ExperienceMode::Beginner) => "Beginner",
        (Language::Vi, ExperienceMode::Advance) => "Nâng cao",
        (Language::En, ExperienceMode::Advance) => "Advance",
    }
}

pub fn format_bytes(bytes: u64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;
    const TB: f64 = GB * 1024.0;
    let b = bytes as f64;
    if b >= TB {
        format!("{:.2} TB", b / TB)
    } else if b >= GB {
        format!("{:.2} GB", b / GB)
    } else if b >= MB {
        format!("{:.1} MB", b / MB)
    } else if b >= KB {
        format!("{:.1} KB", b / KB)
    } else {
        format!("{bytes} B")
    }
}

pub fn format_speed(bps: u64) -> String {
    format!("{}/s", format_bytes(bps))
}

pub fn format_uptime(secs: u64) -> String {
    let days = secs / 86400;
    let hours = (secs % 86400) / 3600;
    let mins = (secs % 3600) / 60;
    format!("{days}d {hours:02}h {mins:02}m")
}
