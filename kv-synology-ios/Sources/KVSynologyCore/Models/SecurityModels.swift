import Foundation

/// Synology DSM Firewall rule specification.
public struct FirewallRule: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var ports: String
    public var protocolType: String
    public var sourceType: String
    public var sourceValue: String
    public var action: String
    public var enabled: Bool
    public var order: Int

    public enum CodingKeys: String, CodingKey {
        case id
        case name
        case ports
        case protocolType = "protocol"
        case sourceType
        case sourceValue
        case action
        case enabled
        case order
    }

    public var `protocol`: String { protocolType }

    public init(
        id: String,
        name: String,
        ports: String = "all",
        protocolType: String? = nil,
        `protocol`: String? = nil,
        sourceType: String = "all",
        sourceValue: String = "all",
        action: String = "allow",
        enabled: Bool = true,
        order: Int = 1
    ) {
        self.id = id
        self.name = name
        self.ports = ports
        self.protocolType = protocolType ?? `protocol` ?? "all"
        self.sourceType = sourceType
        self.sourceValue = sourceValue
        self.action = action
        self.enabled = enabled
        self.order = order
    }
}

/// Global firewall configuration profile and ruleset.
public struct FirewallConfig: Codable, Sendable, Hashable {
    public var enabled: Bool
    public var defaultProfile: String
    public var allowUnmatched: Bool
    public var rules: [FirewallRule]

    public init(
        enabled: Bool = true,
        defaultProfile: String = "default",
        allowUnmatched: Bool = true,
        rules: [FirewallRule] = []
    ) {
        self.enabled = enabled
        self.defaultProfile = defaultProfile
        self.allowUnmatched = allowUnmatched
        self.rules = rules
    }
}

/// Auto-block configuration protecting against brute-force logins.
public struct AutoBlockConfig: Codable, Sendable, Hashable {
    public var enabled: Bool
    public var attempts: Int
    public var withinMinutes: Int
    public var enableUnblock: Bool
    public var unblockDays: Int
    public var blockedCount: Int
    public var allowedCount: Int

    public init(
        enabled: Bool = true,
        attempts: Int = 5,
        withinMinutes: Int = 10,
        enableUnblock: Bool = true,
        unblockDays: Int = 7,
        blockedCount: Int = 0,
        allowedCount: Int = 0
    ) {
        self.enabled = enabled
        self.attempts = attempts
        self.withinMinutes = withinMinutes
        self.enableUnblock = enableUnblock
        self.unblockDays = unblockDays
        self.blockedCount = blockedCount
        self.allowedCount = allowedCount
    }
}

/// IP address blocked by Auto-block mechanism.
public struct BlockedIp: Codable, Sendable, Identifiable, Hashable {
    public var id: String { ip }
    public var ip: String
    public var denyTime: String
    public var expireTime: String?
    public var country: String?

    public init(
        ip: String,
        denyTime: String,
        expireTime: String? = nil,
        country: String? = nil
    ) {
        self.ip = ip
        self.denyTime = denyTime
        self.expireTime = expireTime
        self.country = country
    }
}

/// Backward compatibility alias matching Kotlin codebase.
public typealias BlockedIpItem = BlockedIp

/// Security audit finding item from Security Advisor.
public struct SecurityAuditItem: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var severity: String // "critical", "warning", "info"
    public var title: String
    public var itemDescription: String
    public var recommendation: String

    public enum CodingKeys: String, CodingKey {
        case id
        case severity
        case title
        case itemDescription = "description"
        case recommendation
    }

    public var description: String { itemDescription }

    public init(
        id: String,
        severity: String,
        title: String,
        itemDescription: String? = nil,
        description: String? = nil,
        recommendation: String
    ) {
        self.id = id
        self.severity = severity
        self.title = title
        self.itemDescription = itemDescription ?? description ?? ""
        self.recommendation = recommendation
    }
}

/// Security scan result aggregate report from DSM Security Advisor.
public struct SecurityScanResult: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var scanTimestamp: Int64
    public var status: String // "healthy", "warning", "danger"
    public var riskLevel: String // "low", "medium", "high"
    public var itemsChecked: Int
    public var warningsCount: Int
    public var criticalCount: Int
    public var issues: [SecurityAuditItem]
    public var recommendations: [String]

    public init(
        id: String = UUID().uuidString,
        scanTimestamp: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        status: String = "healthy",
        riskLevel: String = "low",
        itemsChecked: Int = 45,
        warningsCount: Int = 0,
        criticalCount: Int = 0,
        issues: [SecurityAuditItem] = [],
        recommendations: [String] = []
    ) {
        self.id = id
        self.scanTimestamp = scanTimestamp
        self.status = status
        self.riskLevel = riskLevel
        self.itemsChecked = itemsChecked
        self.warningsCount = warningsCount
        self.criticalCount = criticalCount
        self.issues = issues
        self.recommendations = recommendations
    }
}
