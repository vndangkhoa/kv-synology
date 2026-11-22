import Foundation

/// Status of an installed package in Package Center.
public enum PackageStatus: String, Codable, Sendable, CaseIterable {
    case running = "running"
    case stopped = "stopped"
    case updating = "updating"
    case error = "error"
    case unknown = "unknown"

    public static func from(raw: String) -> PackageStatus {
        switch raw.lowercased() {
        case "running", "active":
            return .running
        case "stopped", "inactive":
            return .stopped
        case "updating", "installing":
            return .updating
        case "error", "broken":
            return .error
        default:
            return .unknown
        }
    }
}

/// Package or application installed from Package Center or third-party sources.
public struct DsmPackage: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var version: String
    public var status: String
    public var description: String
    public var maintainer: String
    public var category: String?
    public var iconUrl: String?
    public var installed: Bool
    public var hasUpdate: Bool
    public var latestVersion: String?

    public init(
        id: String,
        name: String,
        version: String,
        status: String = "running",
        description: String = "",
        maintainer: String = "Synology",
        category: String? = nil,
        iconUrl: String? = nil,
        installed: Bool = true,
        hasUpdate: Bool = false,
        latestVersion: String? = nil
    ) {
        self.id = id
        self.name = name
        self.version = version
        self.status = status
        self.description = description
        self.maintainer = maintainer
        self.category = category
        self.iconUrl = iconUrl
        self.installed = installed
        self.hasUpdate = hasUpdate
        self.latestVersion = latestVersion
    }

    public var packageStatus: PackageStatus {
        PackageStatus.from(raw: status)
    }

    public var isRunning: Bool {
        packageStatus == .running
    }
}

/// Backward compatibility alias matching Kotlin codebase.
public typealias PackageItem = DsmPackage

/// Third-party Package Center repository server.
public struct PackageServer: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var url: String
    public var enabled: Bool
    public var isDefault: Bool

    public init(
        id: String,
        name: String,
        url: String,
        enabled: Bool = true,
        isDefault: Bool = false
    ) {
        self.id = id
        self.name = name
        self.url = url
        self.enabled = enabled
        self.isDefault = isDefault
    }
}
