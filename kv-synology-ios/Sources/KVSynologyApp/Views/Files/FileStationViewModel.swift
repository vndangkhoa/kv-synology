import Foundation
import SwiftUI
import KVSynologyCore

public enum FileViewMode: String, CaseIterable, Identifiable {
    case list = "list"
    case grid = "grid"
    
    public var id: String { rawValue }
}

@Observable
@MainActor
public final class FileStationViewModel {
    public var currentPath: String = "/volume1"
    public var pathHistory: [String] = ["/volume1"]
    public var files: [DsmFile] = []
    public var searchQuery: String = ""
    public var viewMode: FileViewMode = .list
    
    public var isLoading: Bool = false
    public var errorMessage: String? = nil
    public var statusMessage: String? = nil
    
    // Sheets & Dialogs
    public var selectedFileForPreview: DsmFile? = nil
    public var selectedFileForCodeViewer: DsmFile? = nil
    public var showNewFolderDialog: Bool = false
    public var newFolderName: String = ""
    public var fileToRename: DsmFile? = nil
    public var newFileName: String = ""
    public var fileToDelete: DsmFile? = nil
    public var showDeleteDialog: Bool = false
    public var createdShareLink: FileShareLink? = nil
    public var showShareLinkAlert: Bool = false
    
    public init() {
        loadMockFiles(for: currentPath)
    }
    
    // MARK: - Breadcrumbs
    public var breadcrumbComponents: [(name: String, path: String)] {
        let parts = currentPath.split(separator: "/").map(String.init)
        var result: [(name: String, path: String)] = [("Root", "/")]
        var runningPath = ""
        for part in parts {
            runningPath += "/" + part
            result.append((part, runningPath))
        }
        return result
    }
    
    public var filteredFiles: [DsmFile] {
        let query = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return files }
        return files.filter { $0.name.lowercased().contains(query) }
    }
    
    // MARK: - Navigation
    public func navigateTo(path: String) {
        currentPath = path
        loadMockFiles(for: path)
    }
    
    public func openItem(_ item: DsmFile) {
        if item.isdir {
            navigateTo(path: item.path)
        } else if item.isText {
            selectedFileForCodeViewer = item
        } else {
            selectedFileForPreview = item
        }
    }
    
    public func goBack() {
        let components = currentPath.split(separator: "/").map(String.init)
        if components.count > 1 {
            let parentPath = "/" + components.dropLast().joined(separator: "/")
            navigateTo(path: parentPath)
        } else if components.count == 1 {
            navigateTo(path: "/")
        }
    }
    
    // MARK: - Actions
    public func createFolder() {
        let clean = newFolderName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        let newFolder = DsmFile(
            path: "\(currentPath)/\(clean)",
            name: clean,
            isdir: true,
            size: 4096,
            mtime: Int64(Date().timeIntervalSince1970),
            owner: "admin"
        )
        files.insert(newFolder, at: 0)
        newFolderName = ""
        showNewFolderDialog = false
    }
    
    public func renameFile() {
        guard let target = fileToRename else { return }
        let clean = newFileName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        
        if let idx = files.firstIndex(where: { $0.path == target.path }) {
            let parent = target.path.components(separatedBy: "/").dropLast().joined(separator: "/")
            files[idx] = DsmFile(
                path: "\(parent)/\(clean)",
                name: clean,
                isdir: target.isdir,
                size: target.size,
                mtime: Int64(Date().timeIntervalSince1970),
                owner: target.owner
            )
        }
        fileToRename = nil
        newFileName = ""
    }
    
    public func deleteFile() {
        guard let target = fileToDelete else { return }
        files.removeAll { $0.path == target.path }
        fileToDelete = nil
        showDeleteDialog = false
    }
    
    public func createShareLink(for item: DsmFile) {
        let shareId = UUID().uuidString.prefix(8).lowercased()
        let link = FileShareLink(
            id: String(shareId),
            url: "https://gofile.me/\(shareId)",
            path: item.path,
            name: item.name
        )
        self.createdShareLink = link
        self.showShareLinkAlert = true
        UIPasteboard.general.string = link.url
    }
    
    // MARK: - Mock Files Data
    public func loadMockFiles(for path: String) {
        isLoading = true
        defer { isLoading = false }
        
        let now = Int64(Date().timeIntervalSince1970)
        
        switch path {
        case "/":
            self.files = [
                DsmFile(path: "/volume1", name: "volume1", isdir: true, size: 0, mtime: now - 3600 * 24 * 30, owner: "root"),
                DsmFile(path: "/volume2", name: "volume2", isdir: true, size: 0, mtime: now - 3600 * 24 * 10, owner: "root")
            ]
        case "/volume1":
            self.files = [
                DsmFile(path: "/volume1/docker", name: "docker", isdir: true, size: 0, mtime: now - 3600 * 12, owner: "admin"),
                DsmFile(path: "/volume1/downloads", name: "downloads", isdir: true, size: 0, mtime: now - 3600 * 3, owner: "admin"),
                DsmFile(path: "/volume1/homes", name: "homes", isdir: true, size: 0, mtime: now - 3600 * 24 * 60, owner: "root"),
                DsmFile(path: "/volume1/media", name: "media", isdir: true, size: 0, mtime: now - 3600 * 48, owner: "admin"),
                DsmFile(path: "/volume1/web", name: "web", isdir: true, size: 0, mtime: now - 3600 * 24 * 5, owner: "http"),
                DsmFile(path: "/volume1/notes.txt", name: "notes.txt", isdir: false, size: 2048, mtime: now - 3600, owner: "admin"),
                DsmFile(path: "/volume1/syno_report.pdf", name: "syno_report.pdf", isdir: false, size: 1024 * 450, mtime: now - 7200, owner: "admin")
            ]
        case "/volume1/docker":
            self.files = [
                DsmFile(path: "/volume1/docker/compose.yml", name: "compose.yml", isdir: false, size: 1540, mtime: now - 1800, owner: "admin"),
                DsmFile(path: "/volume1/docker/env.conf", name: "env.conf", isdir: false, size: 512, mtime: now - 3600, owner: "admin"),
                DsmFile(path: "/volume1/docker/portainer_data", name: "portainer_data", isdir: true, size: 0, mtime: now - 3600 * 10, owner: "admin"),
                DsmFile(path: "/volume1/docker/nginx.conf", name: "nginx.conf", isdir: false, size: 3200, mtime: now - 7200, owner: "admin")
            ]
        case "/volume1/media":
            self.files = [
                DsmFile(path: "/volume1/media/demo_trailer.mp4", name: "demo_trailer.mp4", isdir: false, size: 1024 * 1024 * 45, mtime: now - 3600 * 5, owner: "admin"),
                DsmFile(path: "/volume1/media/nas_soundtrack.mp3", name: "nas_soundtrack.mp3", isdir: false, size: 1024 * 1024 * 8, mtime: now - 3600 * 15, owner: "admin"),
                DsmFile(path: "/volume1/media/wallpaper.jpg", name: "wallpaper.jpg", isdir: false, size: 1024 * 1024 * 3, mtime: now - 3600 * 2, owner: "admin")
            ]
        default:
            self.files = [
                DsmFile(path: "\(path)/sample.txt", name: "sample.txt", isdir: false, size: 1024, mtime: now, owner: "admin")
            ]
        }
    }
}
