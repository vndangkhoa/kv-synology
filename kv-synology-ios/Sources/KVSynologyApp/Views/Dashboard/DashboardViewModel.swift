import Foundation
import SwiftUI
import KVSynologyCore

public struct TelemetryDataPoint: Identifiable, Sendable {
    public var id = UUID()
    public var date: Date
    public var cpuPercent: Double
    public var memoryPercent: Double
    public var networkRxKB: Double
    public var networkTxKB: Double
    public var diskReadKB: Double
    public var diskWriteKB: Double
}

@Observable
@MainActor
public final class DashboardViewModel {
    public var systemInfo: SystemInfo = SystemInfo(
        model: "Synology DS920+",
        serial: "2170QNR641001",
        version: "DSM 7.2.1-69057 Update 5",
        uptime: 846200,
        temperature: 42,
        time: "2026-09-23 06:45:00",
        ramTotal: 8192,
        ramUsed: 3276,
        cpuModel: "Intel Celeron J4125 (4 Cores, 2.0 GHz)",
        cpuCores: 4
    )
    
    public var currentUtilization: SystemUtilization = SystemUtilization(
        cpuPercent: 24.5,
        memoryPercent: 40.0,
        memoryUsedMB: 3276,
        memoryTotalMB: 8192,
        networkRxBytes: 1024 * 1024 * 3,
        networkTxBytes: 1024 * 512,
        diskReadBytes: 1024 * 256,
        diskWriteBytes: 1024 * 512
    )
    
    public var telemetryHistory: [TelemetryDataPoint] = []
    public var processes: [DsmProcess] = []
    public var isLoading: Bool = false
    public var errorMessage: String? = nil
    public var isPolling: Bool = false
    
    public var showRebootAlert: Bool = false
    public var showShutdownAlert: Bool = false
    public var processToKill: DsmProcess? = nil
    public var showKillProcessAlert: Bool = false
    
    private var pollingTask: Task<Void, Never>? = nil
    
    public init() {
        seedInitialHistory()
        loadMockProcesses()
    }
    
    // MARK: - Lifecycle
    
    public func startPolling() {
        guard !isPolling else { return }
        isPolling = true
        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.fetchLatestTelemetry()
                try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds
            }
        }
    }
    
    public func stopPolling() {
        isPolling = false
        pollingTask?.cancel()
        pollingTask = nil
    }
    
    // MARK: - Fetching
    
    public func fetchLatestTelemetry() async {
        // Generate realistic jitter for real-time visualization
        let jitterCpu = max(5.0, min(95.0, currentUtilization.cpuPercent + Double.random(in: -4.0...4.0)))
        let jitterMem = max(30.0, min(80.0, currentUtilization.memoryPercent + Double.random(in: -0.5...0.5)))
        let rx = Int64(Double.random(in: 0.5...8.0) * 1024 * 1024)
        let tx = Int64(Double.random(in: 0.2...4.0) * 1024 * 1024)
        let dRead = Int64(Double.random(in: 0.1...3.0) * 1024 * 1024)
        let dWrite = Int64(Double.random(in: 0.2...5.0) * 1024 * 1024)
        
        self.currentUtilization = SystemUtilization(
            cpuPercent: jitterCpu,
            memoryPercent: jitterMem,
            memoryUsedMB: Int64(8192 * (jitterMem / 100.0)),
            memoryTotalMB: 8192,
            networkRxBytes: rx,
            networkTxBytes: tx,
            diskReadBytes: dRead,
            diskWriteBytes: dWrite
        )
        
        let newPoint = TelemetryDataPoint(
            date: Date(),
            cpuPercent: jitterCpu,
            memoryPercent: jitterMem,
            networkRxKB: Double(rx) / 1024.0,
            networkTxKB: Double(tx) / 1024.0,
            diskReadKB: Double(dRead) / 1024.0,
            diskWriteKB: Double(dWrite) / 1024.0
        )
        
        self.telemetryHistory.append(newPoint)
        if self.telemetryHistory.count > 25 {
            self.telemetryHistory.removeFirst()
        }
    }
    
    public func killProcess(_ process: DsmProcess) async {
        processes.removeAll { $0.pid == process.pid }
    }
    
    public func rebootNAS() async {
        // Power action trigger
    }
    
    public func shutdownNAS() async {
        // Power action trigger
    }
    
    // MARK: - Formatters
    
    public var formattedUptime: String {
        let totalSeconds = systemInfo.uptime
        let days = totalSeconds / 86400
        let hours = (totalSeconds % 86400) / 3600
        let minutes = (totalSeconds % 3600) / 60
        if days > 0 {
            return "\(days)d \(hours)h \(minutes)m"
        } else {
            return "\(hours)h \(minutes)m"
        }
    }
    
    public var thermalStatusColor: Color {
        if systemInfo.temperature < 48 {
            return .statusSuccess
        } else if systemInfo.temperature < 65 {
            return .statusWarning
        } else {
            return .statusError
        }
    }
    
    public var thermalStatusText: String {
        if systemInfo.temperature < 48 {
            return "Normal (\(systemInfo.temperature)°C)"
        } else if systemInfo.temperature < 65 {
            return "Warm (\(systemInfo.temperature)°C)"
        } else {
            return "Overheating (\(systemInfo.temperature)°C)"
        }
    }
    
    // MARK: - Mock Seeding
    
    private func seedInitialHistory() {
        let now = Date()
        var points: [TelemetryDataPoint] = []
        for i in (0..<20).reversed() {
            let date = now.addingTimeInterval(Double(-i * 3))
            let cpu = Double.random(in: 18.0...35.0)
            let mem = Double.random(in: 39.0...42.0)
            points.append(
                TelemetryDataPoint(
                    date: date,
                    cpuPercent: cpu,
                    memoryPercent: mem,
                    networkRxKB: Double.random(in: 120...2048),
                    networkTxKB: Double.random(in: 80...1024),
                    diskReadKB: Double.random(in: 50...800),
                    diskWriteKB: Double.random(in: 100...1500)
                )
            )
        }
        self.telemetryHistory = points
    }
    
    private func loadMockProcesses() {
        self.processes = [
            DsmProcess(pid: 12450, name: "dockerd", cpu: 8.4, memory: 4.2, user: "root", status: "running"),
            DsmProcess(pid: 14210, name: "syno-cloud-syncd", cpu: 5.2, memory: 2.8, user: "admin", status: "running"),
            DsmProcess(pid: 8932, name: "synoscgi", cpu: 3.1, memory: 1.9, user: "http", status: "running"),
            DsmProcess(pid: 1845, name: "smbd", cpu: 2.7, memory: 3.5, user: "root", status: "running"),
            DsmProcess(pid: 412, name: "postgres", cpu: 1.8, memory: 6.4, user: "postgres", status: "running"),
            DsmProcess(pid: 2210, name: "transmission-daemon", cpu: 1.5, memory: 3.1, user: "admin", status: "running"),
            DsmProcess(pid: 902, name: "nginx", cpu: 1.1, memory: 1.2, user: "root", status: "running")
        ]
    }
}
