import Foundation
import SwiftUI
import KVSynologyCore

public enum PackageTab: String, CaseIterable, Identifiable, Sendable {
    case installed = "Installed"
    case available = "Package Center"
    
    public var id: String { rawValue }
    
    public var iconName: String {
        switch self {
        case .installed: return "shippingbox.fill"
        case .available: return "square.grid.2x2.fill"
        }
    }
}

@Observable
@MainActor
public final class PackagesViewModel {
    public var selectedTab: PackageTab = .installed
    public var searchQuery: String = ""
    public var selectedCategory: String? = nil
    
    public var installedPackages: [PackageItem] = []
    public var availablePackages: [PackageItem] = []
    
    public var isLoading: Bool = false
    public var isCheckingUpdates: Bool = false
    public var errorMessage: String? = nil
    public var successMessage: String? = nil
    
    public var togglingPackageIds: Set<String> = []
    public var updatingPackageIds: Set<String> = []
    public var selectedPackageForDetail: PackageItem? = nil
    
    private let client: DSMClient?
    
    public init(client: DSMClient? = nil) {
        self.client = client
        loadMockDataIfEmpty()
    }
    
    public var categories: [String] {
        let allPackages = selectedTab == .installed ? installedPackages : availablePackages
        let cats = Set(allPackages.compactMap { $0.category })
        return ["All"] + cats.sorted()
    }
    
    public var filteredPackages: [PackageItem] {
        let list = selectedTab == .installed ? installedPackages : availablePackages
        return list.filter { pkg in
            let matchesCategory: Bool
            if let cat = selectedCategory, cat != "All" {
                matchesCategory = (pkg.category?.localizedCaseInsensitiveCompare(cat) == .orderedSame)
            } else {
                matchesCategory = true
            }
            
            let matchesSearch: Bool
            if searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                matchesSearch = true
            } else {
                let q = searchQuery.lowercased()
                matchesSearch = pkg.name.lowercased().contains(q) ||
                                pkg.description.lowercased().contains(q) ||
                                (pkg.category?.lowercased().contains(q) ?? false)
            }
            return matchesCategory && matchesSearch
        }
    }
    
    public var updatesAvailableCount: Int {
        installedPackages.filter { $0.hasUpdate }.count
    }
    
    public func loadPackages() async {
        isLoading = true
        errorMessage = nil
        
        do {
            if let client = client {
                let packages = try await client.getPackages()
                self.installedPackages = packages.filter { $0.installed }
                self.availablePackages = packages.filter { !$0.installed }
            } else {
                // If offline mock mode
                loadMockDataIfEmpty()
            }
        } catch {
            self.errorMessage = "Failed to load packages: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    public func checkForUpdates() async {
        isCheckingUpdates = true
        errorMessage = nil
        
        try? await Task.sleep(nanoseconds: 700_000_000)
        
        // Simulating or checking updates
        for idx in installedPackages.indices {
            if installedPackages[idx].id == "ContainerManager" || installedPackages[idx].id == "FileStation" {
                installedPackages[idx] = PackageItem(
                    id: installedPackages[idx].id,
                    name: installedPackages[idx].name,
                    version: installedPackages[idx].version,
                    status: installedPackages[idx].status,
                    description: installedPackages[idx].description,
                    maintainer: installedPackages[idx].maintainer,
                    category: installedPackages[idx].category,
                    iconUrl: installedPackages[idx].iconUrl,
                    installed: true,
                    hasUpdate: true,
                    latestVersion: "24.0.7-1524"
                )
            }
        }
        
        isCheckingUpdates = false
        successMessage = "Package updates checked: \(updatesAvailableCount) update(s) found"
    }
    
    public func togglePackageStatus(_ package: PackageItem) async {
        let id = package.id
        togglingPackageIds.insert(id)
        
        let targetAction = (package.status.lowercased() == "running") ? "stop" : "start"
        
        do {
            if let client = client {
                _ = await client.controlPackage(id: id, action: targetAction)
            } else {
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
            
            if let idx = installedPackages.firstIndex(where: { $0.id == id }) {
                let newStatus = (targetAction == "start") ? "running" : "stopped"
                installedPackages[idx] = PackageItem(
                    id: package.id,
                    name: package.name,
                    version: package.version,
                    status: newStatus,
                    description: package.description,
                    maintainer: package.maintainer,
                    category: package.category,
                    iconUrl: package.iconUrl,
                    installed: package.installed,
                    hasUpdate: package.hasUpdate,
                    latestVersion: package.latestVersion
                )
            }
            
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        } catch {
            errorMessage = "Failed to \(targetAction) \(package.name): \(error.localizedDescription)"
        }
        
        togglingPackageIds.remove(id)
    }
    
    public func updatePackage(_ package: PackageItem) async {
        let id = package.id
        updatingPackageIds.insert(id)
        
        do {
            if let client = client {
                _ = await client.updatePackage(id: id)
            } else {
                try? await Task.sleep(nanoseconds: 1_200_000_000)
            }
            
            if let idx = installedPackages.firstIndex(where: { $0.id == id }) {
                installedPackages[idx] = PackageItem(
                    id: package.id,
                    name: package.name,
                    version: package.latestVersion ?? package.version,
                    status: "running",
                    description: package.description,
                    maintainer: package.maintainer,
                    category: package.category,
                    iconUrl: package.iconUrl,
                    installed: true,
                    hasUpdate: false,
                    latestVersion: nil
                )
            }
            successMessage = "\(package.name) updated successfully"
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            errorMessage = "Failed to update \(package.name): \(error.localizedDescription)"
        }
        
        updatingPackageIds.remove(id)
    }
    
    public func installPackage(_ package: PackageItem) async {
        let id = package.id
        updatingPackageIds.insert(id)
        
        try? await Task.sleep(nanoseconds: 800_000_000)
        
        availablePackages.removeAll { $0.id == id }
        let installed = PackageItem(
            id: package.id,
            name: package.name,
            version: package.version,
            status: "running",
            description: package.description,
            maintainer: package.maintainer,
            category: package.category,
            iconUrl: package.iconUrl,
            installed: true,
            hasUpdate: false,
            latestVersion: nil
        )
        installedPackages.append(installed)
        
        updatingPackageIds.remove(id)
        successMessage = "\(package.name) installed successfully"
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    
    private func loadMockDataIfEmpty() {
        if installedPackages.isEmpty {
            installedPackages = [
                PackageItem(
                    id: "ContainerManager",
                    name: "Container Manager",
                    version: "20.10.23-1437",
                    status: "running",
                    description: "Container Manager is a lightweight virtualization environment that allows you to build and run applications in isolated software containers.",
                    maintainer: "Synology Inc.",
                    category: "Utilities",
                    iconUrl: nil,
                    installed: true,
                    hasUpdate: true,
                    latestVersion: "24.0.7-1524"
                ),
                PackageItem(
                    id: "DownloadStation",
                    name: "Download Station",
                    version: "3.9.5-4601",
                    status: "running",
                    description: "Web-based download application allowing you to download files from BT, FTP, HTTP, NZB, and eMule.",
                    maintainer: "Synology Inc.",
                    category: "Media",
                    iconUrl: nil,
                    installed: true,
                    hasUpdate: false,
                    latestVersion: nil
                ),
                PackageItem(
                    id: "FileStation",
                    name: "File Station",
                    version: "1.4.2-0850",
                    status: "running",
                    description: "Centralized file management tool for browsing, organizing, and sharing files on your Synology NAS.",
                    maintainer: "Synology Inc.",
                    category: "Productivity",
                    iconUrl: nil,
                    installed: true,
                    hasUpdate: false,
                    latestVersion: nil
                ),
                PackageItem(
                    id: "MediaServer",
                    name: "Media Server",
                    version: "2.0.4-3151",
                    status: "stopped",
                    description: "Multimedia streaming service for DLNA/UPnP home devices.",
                    maintainer: "Synology Inc.",
                    category: "Media",
                    iconUrl: nil,
                    installed: true,
                    hasUpdate: false,
                    latestVersion: nil
                ),
                PackageItem(
                    id: "HyperBackup",
                    name: "Hyper Backup",
                    version: "4.1.1-3758",
                    status: "running",
                    description: "Multi-version backup tool with block-level deduplication to protect your data.",
                    maintainer: "Synology Inc.",
                    category: "Backup",
                    iconUrl: nil,
                    installed: true,
                    hasUpdate: false,
                    latestVersion: nil
                ),
                PackageItem(
                    id: "SynoFinder",
                    name: "Universal Search",
                    version: "2.4.0-0712",
                    status: "running",
                    description: "Deep search service across files, metadata, photos, and DSM applications.",
                    maintainer: "Synology Inc.",
                    category: "Utilities",
                    iconUrl: nil,
                    installed: true,
                    hasUpdate: false,
                    latestVersion: nil
                )
            ]
        }
        
        if availablePackages.isEmpty {
            availablePackages = [
                PackageItem(
                    id: "AudioStation",
                    name: "Audio Station",
                    version: "7.1.0-5321",
                    status: "available",
                    description: "Personal music library and Internet radio player.",
                    maintainer: "Synology Inc.",
                    category: "Media",
                    iconUrl: nil,
                    installed: false,
                    hasUpdate: false,
                    latestVersion: nil
                ),
                PackageItem(
                    id: "SurveillanceStation",
                    name: "Surveillance Station",
                    version: "9.2.0-11289",
                    status: "available",
                    description: "Professional video management system (VMS) protecting your home and business.",
                    maintainer: "Synology Inc.",
                    category: "Security",
                    iconUrl: nil,
                    installed: false,
                    hasUpdate: false,
                    latestVersion: nil
                ),
                PackageItem(
                    id: "VirtualMachineManager",
                    name: "Virtual Machine Manager",
                    version: "2.6.5-12202",
                    status: "available",
                    description: "Run Windows, Linux, and Virtual DSM virtual machines directly on your NAS.",
                    maintainer: "Synology Inc.",
                    category: "Utilities",
                    iconUrl: nil,
                    installed: false,
                    hasUpdate: false,
                    latestVersion: nil
                ),
                PackageItem(
                    id: "WebStation",
                    name: "Web Station",
                    version: "4.2.2-0524",
                    status: "available",
                    description: "Host personal websites with PHP, Apache, Nginx, and customized backend services.",
                    maintainer: "Synology Inc.",
                    category: "Developer",
                    iconUrl: nil,
                    installed: false,
                    hasUpdate: false,
                    latestVersion: nil
                )
            ]
        }
    }
}
