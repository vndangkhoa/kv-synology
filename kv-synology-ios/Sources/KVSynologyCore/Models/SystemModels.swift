import Foundation

/// System hardware and operating system information returned by DSM.
public struct SystemInfo: Codable, Sendable, Hashable {
    public var model: String
    public var serial: String
    public var version: String
    public var uptime: Int64
    public var temperature: Int
    public var time: String
    public var ramTotal: Int64
    public var ramUsed: Int64
    public var cpuModel: String
    public var cpuCores: Int

    public init(
        model: String = "Synology NAS",
        serial: String = "",
        version: String = "DSM 7.2.1",
        uptime: Int64 = 0,
        temperature: Int = 40,
        time: String = "",
        ramTotal: Int64 = 8192,
        ramUsed: Int64 = 2048,
        cpuModel: String = "",
        cpuCores: Int = 4
    ) {
        self.model = model
        self.serial = serial
        self.version = version
        self.uptime = uptime
        self.temperature = temperature
        self.time = time
        self.ramTotal = ramTotal
        self.ramUsed = ramUsed
        self.cpuModel = cpuModel
        self.cpuCores = cpuCores
    }

    /// Computed RAM usage percentage.
    public var ramUsagePercent: Double {
        guard ramTotal > 0 else { return 0.0 }
        return (Double(ramUsed) / Double(ramTotal)) * 100.0
    }
}

/// Real-time resource utilization snapshot (CPU, RAM, Network, Disk I/O).
public struct SystemUtilization: Codable, Sendable, Hashable {
    public var cpuPercent: Double
    public var memoryPercent: Double
    public var memoryUsedMB: Int64
    public var memoryTotalMB: Int64
    public var networkRxBytes: Int64
    public var networkTxBytes: Int64
    public var diskReadBytes: Int64
    public var diskWriteBytes: Int64
    public var timestamp: Int64

    public init(
        cpuPercent: Double = 0.0,
        memoryPercent: Double = 0.0,
        memoryUsedMB: Int64 = 0,
        memoryTotalMB: Int64 = 0,
        networkRxBytes: Int64 = 0,
        networkTxBytes: Int64 = 0,
        diskReadBytes: Int64 = 0,
        diskWriteBytes: Int64 = 0,
        timestamp: Int64 = Int64(Date().timeIntervalSince1970 * 1000)
    ) {
        self.cpuPercent = cpuPercent
        self.memoryPercent = memoryPercent
        self.memoryUsedMB = memoryUsedMB
        self.memoryTotalMB = memoryTotalMB
        self.networkRxBytes = networkRxBytes
        self.networkTxBytes = networkTxBytes
        self.diskReadBytes = diskReadBytes
        self.diskWriteBytes = diskWriteBytes
        self.timestamp = timestamp
    }
}

/// System process information running on DSM.
public struct DsmProcess: Codable, Sendable, Identifiable, Hashable {
    public var id: Int { pid }
    public var pid: Int
    public var name: String
    public var cpu: Double
    public var memory: Double
    public var user: String
    public var status: String

    public init(
        pid: Int,
        name: String,
        cpu: Double = 0.0,
        memory: Double = 0.0,
        user: String = "root",
        status: String = "running"
    ) {
        self.pid = pid
        self.name = name
        self.cpu = cpu
        self.memory = memory
        self.user = user
        self.status = status
    }
}

/// AI assistant chat message.
public struct ChatMessage: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var role: String
    public var content: String
    public var timestamp: Int64

    public init(
        id: String = UUID().uuidString,
        role: String,
        content: String,
        timestamp: Int64 = Int64(Date().timeIntervalSince1970 * 1000)
    ) {
        self.id = id
        self.role = role
        self.content = content
        self.timestamp = timestamp
    }
}
