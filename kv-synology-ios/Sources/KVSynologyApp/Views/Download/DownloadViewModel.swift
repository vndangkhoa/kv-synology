import Foundation
import SwiftUI
import KVSynologyCore

public enum DownloadTab: String, CaseIterable, Identifiable {
    case all = "All"
    case downloading = "Downloading"
    case paused = "Paused"
    case completed = "Completed"
    
    public var id: String { rawValue }
}

@Observable
@MainActor
public final class DownloadViewModel {
    public var selectedTab: DownloadTab = .all
    public var searchQuery: String = ""
    public var tasks: [DownloadTask] = []
    public var showAddSheet: Bool = false
    public var isLoading: Bool = false
    
    public var totalDownloadSpeed: Int64 = 0
    public var totalUploadSpeed: Int64 = 0
    
    public init(loadMock: Bool = false) {
        if loadMock {
            loadMockTasks()
        } else {
            self.tasks = []
        }
        calculateSpeeds()
    }
    
    public var filteredTasks: [DownloadTask] {
        var result = tasks
        
        switch selectedTab {
        case .all:
            break
        case .downloading:
            result = result.filter { $0.status == .downloading || $0.status == .waiting }
        case .paused:
            result = result.filter { $0.status == .paused }
        case .completed:
            result = result.filter { $0.status == .finished }
        }
        
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !q.isEmpty {
            result = result.filter { $0.title.lowercased().contains(q) }
        }
        
        return result
    }
    
    public func pauseTask(id: String) {
        if let idx = tasks.firstIndex(where: { $0.id == id }) {
            tasks[idx].status = .paused
            tasks[idx].downloadSpeed = 0
            tasks[idx].uploadSpeed = 0
            calculateSpeeds()
        }
    }
    
    public func resumeTask(id: String) {
        if let idx = tasks.firstIndex(where: { $0.id == id }) {
            tasks[idx].status = .downloading
            tasks[idx].downloadSpeed = Int64.random(in: 1024 * 500...1024 * 3500)
            tasks[idx].uploadSpeed = Int64.random(in: 1024 * 100...1024 * 600)
            calculateSpeeds()
        }
    }
    
    public func deleteTask(id: String) {
        tasks.removeAll { $0.id == id }
        calculateSpeeds()
    }
    
    public func addTask(uri: String, destination: String = "/volume1/downloads", startImmediately: Bool = true) {
        let clean = uri.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        
        let title = clean.components(separatedBy: "/").last?.components(separatedBy: "?").first ?? "Download Task"
        let newTask = DownloadTask(
            id: UUID().uuidString.prefix(8).lowercased() + "_task",
            title: title.isEmpty ? "New Download" : title,
            size: 1024 * 1024 * 450,
            status: startImmediately ? .downloading : .paused,
            progress: 0.05,
            downloadSpeed: startImmediately ? 1024 * 1024 * 2 : 0,
            uploadSpeed: startImmediately ? 1024 * 150 : 0,
            type: clean.hasPrefix("magnet:") ? "bt" : "http",
            uri: clean,
            destination: destination,
            createdTime: Int64(Date().timeIntervalSince1970)
        )
        tasks.insert(newTask, at: 0)
        calculateSpeeds()
    }
    
    private func calculateSpeeds() {
        totalDownloadSpeed = tasks.reduce(0) { $0 + $1.downloadSpeed }
        totalUploadSpeed = tasks.reduce(0) { $0 + $1.uploadSpeed }
    }
    
    public func loadMockTasks() {
        self.tasks = [
            DownloadTask(
                id: "dl_ubuntu_01",
                title: "ubuntu-24.04-desktop-amd64.iso",
                size: 1024 * 1024 * 1024 * 4 + 1024 * 1024 * 200,
                status: .downloading,
                progress: 0.72,
                downloadSpeed: 1024 * 1024 * 8, // 8 MB/s
                uploadSpeed: 1024 * 450,
                type: "bt",
                destination: "/volume1/downloads/iso"
            ),
            DownloadTask(
                id: "dl_syno_dsm_02",
                title: "DSM_DS920+_69057.pat",
                size: 1024 * 1024 * 380,
                status: .downloading,
                progress: 0.35,
                downloadSpeed: 1024 * 1024 * 3, // 3 MB/s
                uploadSpeed: 0,
                type: "http",
                destination: "/volume1/downloads/firmware"
            ),
            DownloadTask(
                id: "dl_backup_03",
                title: "photos_archive_2025.zip",
                size: 1024 * 1024 * 850,
                status: .paused,
                progress: 0.48,
                downloadSpeed: 0,
                uploadSpeed: 0,
                type: "http",
                destination: "/volume1/downloads"
            ),
            DownloadTask(
                id: "dl_debian_04",
                title: "debian-12.5.0-netinst.iso",
                size: 1024 * 1024 * 650,
                status: .finished,
                progress: 1.0,
                downloadSpeed: 0,
                uploadSpeed: 1024 * 120, // Seeding
                type: "bt",
                destination: "/volume1/downloads/iso"
            )
        ]
    }
}
