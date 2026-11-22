import Foundation

/// Status of a network or system service.
public enum ServiceStatus: String, Codable, Sendable, CaseIterable {
    case running = "running"
    case stopped = "stopped"
    case enabled = "enabled"
    case disabled = "disabled"
    case unknown = "unknown"
}

/// Network or file service running on DSM (SMB, AFP, NFS, SSH, FTP, etc.).
public struct DsmService: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var displayName: String
    public var serviceDescription: String
    public var category: String
    public var enabled: Bool
    public var running: Bool?
    public var status: String
    public var port: Int?
    public var canToggle: Bool

    public enum CodingKeys: String, CodingKey {
        case id
        case name
        case displayName
        case serviceDescription = "description"
        case category
        case enabled
        case running
        case status
        case port
        case canToggle
    }

    public var description: String { serviceDescription }

    public init(
        id: String,
        name: String,
        displayName: String,
        serviceDescription: String? = nil,
        description: String? = nil,
        category: String = "file",
        enabled: Bool,
        running: Bool? = nil,
        status: String = "enabled",
        port: Int? = nil,
        canToggle: Bool = true
    ) {
        self.id = id
        self.name = name
        self.displayName = displayName
        self.serviceDescription = serviceDescription ?? description ?? ""
        self.category = category
        self.enabled = enabled
        self.running = running
        self.status = status
        self.port = port
        self.canToggle = canToggle
    }
}

/// Backward compatibility alias matching Kotlin codebase.
public typealias ServiceItem = DsmService

/// Terminal access configuration (SSH, Telnet).
public struct TerminalInfo: Codable, Sendable, Hashable {
    public var enableSsh: Bool
    public var enableTelnet: Bool
    public var sshPort: Int
    public var hostname: String?

    public init(
        enableSsh: Bool = false,
        enableTelnet: Bool = false,
        sshPort: Int = 22,
        hostname: String? = nil
    ) {
        self.enableSsh = enableSsh
        self.enableTelnet = enableTelnet
        self.sshPort = sshPort
        self.hostname = hostname
    }
}

/// File sharing services status flags.
public struct FileServiceStatus: Codable, Sendable, Hashable {
    public var smbEnabled: Bool
    public var afpEnabled: Bool
    public var nfsEnabled: Bool
    public var ftpEnabled: Bool

    public init(
        smbEnabled: Bool = true,
        afpEnabled: Bool = false,
        nfsEnabled: Bool = false,
        ftpEnabled: Bool = false
    ) {
        self.smbEnabled = smbEnabled
        self.afpEnabled = afpEnabled
        self.nfsEnabled = nfsEnabled
        self.ftpEnabled = ftpEnabled
    }
}

/// Frontend listener configuration in DSM Reverse Proxy.
public struct ReverseProxyFrontend: Codable, Sendable, Hashable {
    /// 0: HTTP, 1: HTTPS
    public var `protocol`: Int
    public var fqdn: String
    public var port: Int
    public var hsts: Bool
    public var http2: Bool

    public init(
        `protocol`: Int = 1,
        fqdn: String,
        port: Int,
        hsts: Bool = false,
        http2: Bool = false
    ) {
        self.`protocol` = `protocol`
        self.fqdn = fqdn
        self.port = port
        self.hsts = hsts
        self.http2 = http2
    }

    public var isHttps: Bool {
        `protocol` == 1
    }
}

/// Backend target destination in DSM Reverse Proxy.
public struct ReverseProxyBackend: Codable, Sendable, Hashable {
    /// 0: HTTP, 1: HTTPS
    public var `protocol`: Int
    public var fqdn: String
    public var port: Int

    public init(
        `protocol`: Int = 0,
        fqdn: String = "localhost",
        port: Int
    ) {
        self.`protocol` = `protocol`
        self.fqdn = fqdn
        self.port = port
    }

    public var isHttps: Bool {
        `protocol` == 1
    }
}

/// Reverse proxy forwarding rule configured on Nginx.
public struct ReverseProxyRule: Codable, Sendable, Identifiable, Hashable {
    public var id: String { uuid }
    public var uuid: String
    public var description: String
    public var frontend: ReverseProxyFrontend
    public var backend: ReverseProxyBackend
    public var proxyConnectTimeout: Int?

    public init(
        uuid: String,
        description: String,
        frontend: ReverseProxyFrontend,
        backend: ReverseProxyBackend,
        proxyConnectTimeout: Int? = nil
    ) {
        self.uuid = uuid
        self.description = description
        self.frontend = frontend
        self.backend = backend
        self.proxyConnectTimeout = proxyConnectTimeout
    }
}

/// Diagnostic health status of the Nginx reverse proxy service.
public struct ReverseProxyHealthInfo: Codable, Sendable, Hashable {
    public var nginxSyntaxOk: Bool
    public var activeRulesCount: Int
    public var orphanedServicesCount: Int

    public init(
        nginxSyntaxOk: Bool = true,
        activeRulesCount: Int = 0,
        orphanedServicesCount: Int = 0
    ) {
        self.nginxSyntaxOk = nginxSyntaxOk
        self.activeRulesCount = activeRulesCount
        self.orphanedServicesCount = orphanedServicesCount
    }
}
