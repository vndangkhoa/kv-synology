import Foundation
import SwiftUI
import KVSynologyCore

@Observable
@MainActor
public final class StorageViewModel {
    public var pools: [StoragePool] = []
    public var volumes: [StorageVolume] = []
    public var drives: [DiskDrive] = []
    public var selectedDiskForDetail: DiskDrive? = nil
    
    public var isLoading: Bool = false
    public var errorMessage: String? = nil
    
    public init() {
        loadMockStorageData()
    }
    
    public func loadMockStorageData() {
        let drive1 = DiskDrive(
            slot: 1,
            slotName: "Drive 1",
            model: "Seagate IronWolf Pro (ST8000NE001)",
            serial: "WSD2091A",
            status: "normal",
            temp: 34,
            size: 8_000_000_000_000,
            health: "healthy",
            driveType: "HDD",
            smartStatus: "Normal"
        )
        
        let drive2 = DiskDrive(
            slot: 2,
            slotName: "Drive 2",
            model: "Seagate IronWolf Pro (ST8000NE001)",
            serial: "WSD2091B",
            status: "normal",
            temp: 35,
            size: 8_000_000_000_000,
            health: "healthy",
            driveType: "HDD",
            smartStatus: "Normal"
        )
        
        let drive3 = DiskDrive(
            slot: 3,
            slotName: "Drive 3",
            model: "WD Red Plus (WD80EFZZ)",
            serial: "WD-WX32A890",
            status: "normal",
            temp: 33,
            size: 8_000_000_000_000,
            health: "healthy",
            driveType: "HDD",
            smartStatus: "Normal"
        )
        
        let drive4 = DiskDrive(
            slot: 4,
            slotName: "Drive 4",
            model: "WD Red Plus (WD80EFZZ)",
            serial: "WD-WX32A891",
            status: "normal",
            temp: 36,
            size: 8_000_000_000_000,
            health: "healthy",
            driveType: "HDD",
            smartStatus: "Normal"
        )
        
        self.drives = [drive1, drive2, drive3, drive4]
        
        let totalPoolBytes: Int64 = 24_000_000_000_000 // 24 TB usable in SHR (1-disk redundancy)
        let usedPoolBytes: Int64 = 11_520_000_000_000 // ~48% used
        
        self.pools = [
            StoragePool(
                id: "storage_pool_1",
                name: "Storage Pool 1",
                poolPath: "storage_pool_1",
                raidType: "Synology Hybrid RAID (SHR)",
                status: "normal",
                totalBytes: totalPoolBytes,
                usedBytes: usedPoolBytes,
                freeBytes: totalPoolBytes - usedPoolBytes,
                drives: self.drives
            )
        ]
        
        self.volumes = [
            StorageVolume(
                id: "volume_1",
                name: "Volume 1",
                path: "/volume1",
                fsType: "Btrfs (Data Integrity Protection)",
                totalBytes: totalPoolBytes,
                usedBytes: usedPoolBytes,
                freeBytes: totalPoolBytes - usedPoolBytes,
                status: "normal",
                drives: self.drives,
                raidType: "SHR"
            )
        ]
    }
}
