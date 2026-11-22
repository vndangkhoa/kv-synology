import Foundation

/// Geographic and ISP metadata for an IP address.
public struct IpGeoInfo: Codable, Sendable, Hashable {
    public var ip: String
    public var countryCode: String
    public var countryName: String
    public var flagEmoji: String
    public var isp: String
    public var isPrivate: Bool

    public init(
        ip: String,
        countryCode: String = "VN",
        countryName: String = "Vietnam",
        flagEmoji: String = "🇻🇳",
        isp: String = "Local Network",
        isPrivate: Bool = false
    ) {
        self.ip = ip
        self.countryCode = countryCode
        self.countryName = countryName
        self.flagEmoji = flagEmoji
        self.isp = isp
        self.isPrivate = isPrivate
    }
}

/// Active socket or service connection to the NAS.
public struct ActiveConnection: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var direction: String // "inbound", "outbound", "local"
    public var localAddress: String
    public var localPort: Int
    public var remoteAddress: String
    public var remotePort: Int
    public var protocolType: String
    public var state: String
    public var processName: String
    public var geo: IpGeoInfo
    public var rxSpeedBytes: Int64
    public var txSpeedBytes: Int64

    public enum CodingKeys: String, CodingKey {
        case id
        case direction
        case localAddress
        case localPort
        case remoteAddress
        case remotePort
        case protocolType = "protocol"
        case state
        case processName
        case geo
        case rxSpeedBytes
        case txSpeedBytes
    }

    public init(
        id: String,
        direction: String = "inbound",
        localAddress: String,
        localPort: Int,
        remoteAddress: String,
        remotePort: Int,
        protocolType: String = "TCP",
        state: String = "ESTABLISHED",
        processName: String,
        geo: IpGeoInfo? = nil,
        rxSpeedBytes: Int64 = 0,
        txSpeedBytes: Int64 = 0
    ) {
        self.id = id
        self.direction = direction
        self.localAddress = localAddress
        self.localPort = localPort
        self.remoteAddress = remoteAddress
        self.remotePort = remotePort
        self.protocolType = protocolType
        self.state = state
        self.processName = processName
        self.geo = geo ?? IpGeoInfo(ip: remoteAddress)
        self.rxSpeedBytes = rxSpeedBytes
        self.txSpeedBytes = txSpeedBytes
    }
}

/// Backward compatibility alias matching Kotlin codebase.
public typealias NetworkConnectionItem = ActiveConnection

/// Traffic aggregation grouped by geographical country or network zone.
public struct CountryTrafficSummary: Codable, Sendable, Identifiable, Hashable {
    public var id: String { countryCode }
    public var countryCode: String
    public var countryName: String
    public var flagEmoji: String
    public var activeConnections: Int
    public var outboundBytes: Int64
    public var inboundBytes: Int64

    public init(
        countryCode: String,
        countryName: String,
        flagEmoji: String,
        activeConnections: Int,
        outboundBytes: Int64,
        inboundBytes: Int64
    ) {
        self.countryCode = countryCode
        self.countryName = countryName
        self.flagEmoji = flagEmoji
        self.activeConnections = activeConnections
        self.outboundBytes = outboundBytes
        self.inboundBytes = inboundBytes
    }
}

/// Network interface configuration and traffic metrics.
public struct NetworkInterfaceStats: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var ip: String
    public var mask: String
    public var mac: String
    public var status: String
    public var speedMbps: Int
    public var rxBytes: Int64
    public var txBytes: Int64

    public init(
        id: String,
        name: String,
        ip: String,
        mask: String = "255.255.255.0",
        mac: String = "",
        status: String = "up",
        speedMbps: Int = 1000,
        rxBytes: Int64 = 0,
        txBytes: Int64 = 0
    ) {
        self.id = id
        self.name = name
        self.ip = ip
        self.mask = mask
        self.mac = mac
        self.status = status
        self.speedMbps = speedMbps
        self.rxBytes = rxBytes
        self.txBytes = txBytes
    }
}

/// Backward compatibility alias matching Kotlin codebase.
public typealias NetworkInterfaceInfo = NetworkInterfaceStats

/// Global network traffic overview.
public struct TrafficSummary: Codable, Sendable, Hashable {
    public var totalConnections: Int
    public var outboundConnections: Int
    public var inboundConnections: Int
    public var localConnections: Int
    public var currentOutboundSpeed: Int64
    public var currentInboundSpeed: Int64
    public var topCountries: [CountryTrafficSummary]
    public var connections: [ActiveConnection]
    public var interfaces: [NetworkInterfaceStats]

    public init(
        totalConnections: Int = 0,
        outboundConnections: Int = 0,
        inboundConnections: Int = 0,
        localConnections: Int = 0,
        currentOutboundSpeed: Int64 = 0,
        currentInboundSpeed: Int64 = 0,
        topCountries: [CountryTrafficSummary] = [],
        connections: [ActiveConnection] = [],
        interfaces: [NetworkInterfaceStats] = []
    ) {
        self.totalConnections = totalConnections
        self.outboundConnections = outboundConnections
        self.inboundConnections = inboundConnections
        self.localConnections = localConnections
        self.currentOutboundSpeed = currentOutboundSpeed
        self.currentInboundSpeed = currentInboundSpeed
        self.topCountries = topCountries
        self.connections = connections
        self.interfaces = interfaces
    }
}
