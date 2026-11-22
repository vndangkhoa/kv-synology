import Foundation

/// SNMP credentials configuration (v2c / v3).
public struct SnmpCredentials: Codable, Sendable, Hashable {
    public var version: String
    public var community: String
    public var v3User: String?
    public var v3AuthPass: String?
    public var v3PrivPass: String?

    public init(
        version: String = "v2c",
        community: String = "public",
        v3User: String? = nil,
        v3AuthPass: String? = nil,
        v3PrivPass: String? = nil
    ) {
        self.version = version
        self.community = community
        self.v3User = v3User
        self.v3AuthPass = v3AuthPass
        self.v3PrivPass = v3PrivPass
    }
}

/// SNMP sensor reading (ping, cpu, memory, traffic, uptime, disk).
public struct SnmpSensor: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var kind: String // "ping", "cpu", "memory", "traffic", "uptime", "disk"
    public var unit: String
    public var value: Double?
    public var status: String // "up", "warn", "down"
    public var history: [Double]

    public init(
        id: String,
        name: String,
        kind: String = "ping",
        unit: String = "%",
        value: Double? = nil,
        status: String = "up",
        history: [Double] = []
    ) {
        self.id = id
        self.name = name
        self.kind = kind
        self.unit = unit
        self.value = value
        self.status = status
        self.history = history
    }
}

/// Managed SNMP network device or DSM host.
public struct SnmpDevice: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var host: String
    public var port: Int
    public var credentials: SnmpCredentials
    public var sensors: [SnmpSensor]
    public var status: String

    public init(
        id: String,
        name: String,
        host: String,
        port: Int = 161,
        credentials: SnmpCredentials = SnmpCredentials(),
        sensors: [SnmpSensor] = [],
        status: String = "up"
    ) {
        self.id = id
        self.name = name
        self.host = host
        self.port = port
        self.credentials = credentials
        self.sensors = sensors
        self.status = status
    }
}
