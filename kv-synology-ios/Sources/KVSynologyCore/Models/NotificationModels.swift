import Foundation

/// Functional category of a notification.
public enum NotificationCategory: String, Codable, Sendable, CaseIterable {
    case system = "system"
    case storage = "storage"
    case security = "security"
    case backup = "backup"
    case network = "network"
    case general = "general"

    public static func from(raw: String) -> NotificationCategory {
        switch raw.lowercased() {
        case "system": return .system
        case "storage", "disk", "raid": return .storage
        case "security", "firewall", "autoblock": return .security
        case "backup", "hyperbackup": return .backup
        case "network": return .network
        default: return .general
        }
    }
}

/// Severity level of a notification.
public enum NotificationSeverity: String, Codable, Sendable, CaseIterable {
    case info = "info"
    case warning = "warning"
    case error = "error"
    case success = "success"

    public static func from(raw: String) -> NotificationSeverity {
        let lower = raw.lowercased()
        if lower.contains("error") || lower.contains("danger") || lower.contains("crit") {
            return .error
        } else if lower.contains("warn") {
            return .warning
        } else if lower.contains("succ") || lower.contains("ok") {
            return .success
        } else {
            return .info
        }
    }
}

/// Notification item dispatched by DSM notification center.
public struct DsmNotification: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var title: String
    public var displayTitle: String
    public var category: String
    public var level: String // "info", "warning", "error", "success"
    public var messages: [String]
    public var time: Int64
    public var read: Bool

    public init(
        id: String,
        title: String,
        displayTitle: String = "",
        category: String = "system",
        level: String = "info",
        messages: [String] = [],
        time: Int64 = Int64(Date().timeIntervalSince1970),
        read: Bool = false
    ) {
        self.id = id
        self.title = title
        self.displayTitle = displayTitle.isEmpty ? title.replacingOccurrences(of: "_", with: " ").capitalized : displayTitle
        self.category = category
        self.level = level
        self.messages = messages
        self.time = time
        self.read = read
    }

    public var severity: NotificationSeverity {
        NotificationSeverity.from(raw: level)
    }

    public var notificationCategory: NotificationCategory {
        NotificationCategory.from(raw: category)
    }
}

/// Backward compatibility alias matching Kotlin codebase.
public typealias NotificationItem = DsmNotification

/// Local application notification.
public struct AppNotifyItem: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var title: String
    public var content: String
    public var level: String
    public var time: Int64
    public var unread: Bool

    public init(
        id: String,
        title: String,
        content: String,
        level: String = "info",
        time: Int64 = Int64(Date().timeIntervalSince1970),
        unread: Bool = true
    ) {
        self.id = id
        self.title = title
        self.content = content
        self.level = level
        self.time = time
        self.unread = unread
    }
}
