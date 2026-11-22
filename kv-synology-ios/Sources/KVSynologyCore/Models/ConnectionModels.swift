import Foundation

/// Connection configuration representing target Synology NAS credentials and settings.
public struct ConnectionConfig: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var host: String
    public var port: Int
    public var https: Bool
    public var account: String
    public var password: String?
    public var otp: String?
    public var ignoreCert: Bool
    public var isDemo: Bool

    public init(
        id: String = UUID().uuidString,
        name: String = "",
        host: String = "",
        port: Int = 5001,
        https: Bool = true,
        account: String = "",
        password: String? = nil,
        otp: String? = nil,
        ignoreCert: Bool = true,
        isDemo: Bool = false
    ) {
        self.id = id
        self.name = name.isEmpty ? (host.isEmpty ? "Synology NAS" : host) : name
        self.host = host
        self.port = port
        self.https = https
        self.account = account
        self.password = password
        self.otp = otp
        self.ignoreCert = ignoreCert
        self.isDemo = isDemo
    }

    /// Complete HTTP/HTTPS URL for the NAS endpoint.
    public var baseUrl: String {
        let scheme = https ? "https" : "http"
        return "\(scheme)://\(host):\(port)"
    }

    /// Whether the host is a QuickConnect ID.
    public var isQuickConnect: Bool {
        let clean = host.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return clean.hasSuffix(".quickconnect.to") ||
            (!clean.contains(".") && !clean.contains(":") && clean != "localhost" && !clean.isEmpty)
    }

    /// Canonical QuickConnect ID extracted from host.
    public var quickConnectId: String? {
        guard isQuickConnect else { return nil }
        let clean = host.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if clean.hasSuffix(".quickconnect.to") {
            return String(clean.dropLast(".quickconnect.to".count))
        }
        return clean
    }
}

/// Represents an active authenticated session with Synology DSM.
public struct DsmSession: Codable, Sendable, Hashable {
    public var sid: String
    public var synoToken: String?
    public var did: String?
    public var cookie: String?
    public var isConnected: Bool
    public var dsmVersion: Int
    public var versionString: String
    public var model: String
    public var hostname: String
    public var account: String

    public init(
        sid: String = "",
        synoToken: String? = nil,
        did: String? = nil,
        cookie: String? = nil,
        isConnected: Bool = false,
        dsmVersion: Int = 7,
        versionString: String = "",
        model: String = "",
        hostname: String = "",
        account: String = ""
    ) {
        self.sid = sid
        self.synoToken = synoToken
        self.did = did
        self.cookie = cookie
        self.isConnected = isConnected
        self.dsmVersion = dsmVersion
        self.versionString = versionString
        self.model = model
        self.hostname = hostname
        self.account = account
    }
}
