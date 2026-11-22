import Foundation

/// Physical or NVMe disk drive connected to DSM.
public struct DiskDrive: Codable, Sendable, Identifiable, Hashable {
    public var id: String { serial.isEmpty ? "slot_\(slot)" : serial }
    public var slot: Int
    public var slotName: String?
    public var model: String
    public var serial: String
    public var status: String
    public var temp: Int
    public var size: Int64
    public var health: String
    public var driveType: String
    public var smartStatus: String?

    public init(
        slot: Int,
        slotName: String? = nil,
        model: String = "",
        serial: String = "",
        status: String = "normal",
        temp: Int = 35,
        size: Int64 = 0,
        health: String = "healthy",
        driveType: String = "HDD",
        smartStatus: String? = nil
    ) {
        self.slot = slot
        self.slotName = slotName ?? "Drive \(slot)"
        self.model = model
        self.serial = serial
        self.status = status
        self.temp = temp
        self.size = size
        self.health = health
        self.driveType = driveType
        self.smartStatus = smartStatus
    }
}

/// Backward compatibility alias matching Kotlin codebase.
public typealias DriveInfo = DiskDrive

/// S.M.A.R.T attribute for disk health monitoring.
public struct SmartAttribute: Codable, Sendable, Identifiable, Hashable {
    public var id: Int
    public var name: String
    public var value: Int
    public var worst: Int
    public var threshold: Int
    public var raw: String

    public init(id: Int, name: String, value: Int, worst: Int, threshold: Int, raw: String) {
        self.id = id
        self.name = name
        self.value = value
        self.worst = worst
        self.threshold = threshold
        self.raw = raw
    }
}

/// S.M.A.R.T diagnostic status and telemetry for a disk.
public struct SmartStatus: Codable, Sendable, Identifiable, Hashable {
    public var id: String { diskId }
    public var diskId: String
    public var model: String
    public var serial: String
    public var fwVersion: String
    public var status: String
    public var temperature: Int
    public var powerOnHours: Int64
    public var badSectors: Int
    public var attributes: [SmartAttribute]

    public init(
        diskId: String,
        model: String = "",
        serial: String = "",
        fwVersion: String = "",
        status: String = "healthy",
        temperature: Int = 35,
        powerOnHours: Int64 = 0,
        badSectors: Int = 0,
        attributes: [SmartAttribute] = []
    ) {
        self.diskId = diskId
        self.model = model
        self.serial = serial
        self.fwVersion = fwVersion
        self.status = status
        self.temperature = temperature
        self.powerOnHours = powerOnHours
        self.badSectors = badSectors
        self.attributes = attributes
    }
}

/// Backward compatibility alias matching Kotlin codebase.
public typealias SmartInfo = SmartStatus

/// Storage volume (e.g. /volume1) formatted with btrfs or ext4.
public struct StorageVolume: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var path: String
    public var fsType: String
    public var totalBytes: Int64
    public var usedBytes: Int64
    public var freeBytes: Int64
    public var status: String
    public var drives: [DiskDrive]
    public var raidType: String?

    public init(
        id: String,
        name: String,
        path: String,
        fsType: String = "btrfs",
        totalBytes: Int64 = 0,
        usedBytes: Int64 = 0,
        freeBytes: Int64 = 0,
        status: String = "normal",
        drives: [DiskDrive] = [],
        raidType: String? = "SHR"
    ) {
        self.id = id
        self.name = name
        self.path = path
        self.fsType = fsType
        self.totalBytes = totalBytes
        self.usedBytes = usedBytes
        self.freeBytes = freeBytes
        self.status = status
        self.drives = drives
        self.raidType = raidType
    }

    public var usedPercent: Int {
        guard totalBytes > 0 else { return 0 }
        return Int((Double(usedBytes) / Double(totalBytes)) * 100.0)
    }
}

/// Storage pool aggregating multiple physical drives into RAID configurations.
public struct StoragePool: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var poolPath: String
    public var raidType: String
    public var status: String
    public var totalBytes: Int64
    public var usedBytes: Int64
    public var freeBytes: Int64
    public var drives: [DiskDrive]

    public init(
        id: String,
        name: String,
        poolPath: String = "",
        raidType: String = "SHR",
        status: String = "normal",
        totalBytes: Int64 = 0,
        usedBytes: Int64 = 0,
        freeBytes: Int64 = 0,
        drives: [DiskDrive] = []
    ) {
        self.id = id
        self.name = name
        self.poolPath = poolPath
        self.raidType = raidType
        self.status = status
        self.totalBytes = totalBytes
        self.usedBytes = usedBytes
        self.freeBytes = freeBytes
        self.drives = drives
    }

    public var usedPercent: Int {
        guard totalBytes > 0 else { return 0 }
        return Int((Double(usedBytes) / Double(totalBytes)) * 100.0)
    }
}

/// Data scrubbing state for storage pools.
public struct ScrubState: Codable, Sendable, Hashable {
    public var status: String
    public var progress: Int
    public var poolId: String?

    public init(status: String = "idle", progress: Int = 0, poolId: String? = nil) {
        self.status = status
        self.progress = progress
        self.poolId = poolId
    }
}

/// SSD cache acceleration item.
public struct SsdCacheItem: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var type: String
    public var status: String
    public var totalBytes: Int64
    public var usedBytes: Int64

    public init(
        id: String,
        name: String,
        type: String = "read_write",
        status: String = "normal",
        totalBytes: Int64 = 0,
        usedBytes: Int64 = 0
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.status = status
        self.totalBytes = totalBytes
        self.usedBytes = usedBytes
    }
}
