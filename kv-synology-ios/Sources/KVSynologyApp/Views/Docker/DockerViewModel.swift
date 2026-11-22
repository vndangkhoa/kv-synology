import Foundation
import SwiftUI
import KVSynologyCore

public enum DockerTab: String, CaseIterable, Identifiable {
    case containers = "Containers"
    case images = "Images"
    case compose = "Compose"
    
    public var id: String { rawValue }
}

@Observable
@MainActor
public final class DockerViewModel {
    public var selectedTab: DockerTab = .containers
    public var searchQuery: String = ""
    public var containers: [DockerContainerDetails] = []
    public var images: [DockerImage] = []
    public var composeProjects: [DockerProject] = []
    
    public var isLoading: Bool = false
    public var selectedContainerForLogs: DockerContainerDetails? = nil
    public var errorMessage: String? = nil
    public var actionFeedbackMessage: String? = nil
    
    public init() {
        loadMockData()
    }
    
    // MARK: - Computed Filters
    public var filteredContainers: [DockerContainerDetails] {
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return containers }
        return containers.filter {
            $0.name.lowercased().contains(q) ||
            $0.image.lowercased().contains(q) ||
            $0.status.lowercased().contains(q)
        }
    }
    
    public var filteredImages: [DockerImage] {
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return images }
        return images.filter {
            $0.repository.lowercased().contains(q) ||
            $0.tag.lowercased().contains(q)
        }
    }
    
    public var filteredProjects: [DockerProject] {
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return composeProjects }
        return composeProjects.filter {
            $0.name.lowercased().contains(q) ||
            $0.status.lowercased().contains(q)
        }
    }
    
    // MARK: - Container Actions
    public func toggleContainer(id: String, action: String) async {
        guard let idx = containers.firstIndex(where: { $0.id == id }) else { return }
        
        let newStatus: String
        switch action.lowercased() {
        case "start": newStatus = "running"
        case "stop": newStatus = "stopped"
        case "restart": newStatus = "running"
        default: newStatus = containers[idx].status == "running" ? "stopped" : "running"
        }
        
        // Optimistic update
        var updated = containers[idx]
        updated.status = newStatus
        if newStatus == "running" {
            updated.cpuUsage = Double.random(in: 0.5...4.5)
            updated.memoryUsage = "\(Int.random(in: 45...180)) MB"
        } else {
            updated.cpuUsage = 0.0
            updated.memoryUsage = "0 MB"
        }
        containers[idx] = updated
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    
    public func deleteContainer(id: String) async {
        containers.removeAll { $0.id == id }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    
    public func toggleProject(id: String, action: String) async {
        guard let idx = composeProjects.firstIndex(where: { $0.id == id }) else { return }
        let newStatus = action.lowercased() == "start" ? "running" : "stopped"
        composeProjects[idx].status = newStatus
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    
    // MARK: - Mock Data
    public func loadMockData() {
        self.containers = [
            DockerContainerDetails(
                id: "c_portainer_01",
                name: "portainer-ce",
                image: "portainer/portainer-ce:latest",
                status: "running",
                created: "2026-08-10",
                ports: ["9000:9000", "9443:9443"],
                cpuUsage: 1.2,
                memoryUsage: "84 MB",
                uptime: "14 days",
                restartPolicy: "always"
            ),
            DockerContainerDetails(
                id: "c_vaultwarden_02",
                name: "vaultwarden",
                image: "vaultwarden/server:latest",
                status: "running",
                created: "2026-08-15",
                ports: ["8888:80"],
                cpuUsage: 0.8,
                memoryUsage: "48 MB",
                uptime: "21 days",
                restartPolicy: "always"
            ),
            DockerContainerDetails(
                id: "c_plex_03",
                name: "plex-media-server",
                image: "linuxserver/plex:latest",
                status: "running",
                created: "2026-07-20",
                ports: ["32400:32400", "3005:3005"],
                cpuUsage: 4.6,
                memoryUsage: "412 MB",
                uptime: "7 days",
                restartPolicy: "unless-stopped"
            ),
            DockerContainerDetails(
                id: "c_pihole_04",
                name: "pihole-dns",
                image: "pihole/pihole:latest",
                status: "stopped",
                created: "2026-09-01",
                ports: ["53:53/udp", "8081:80"],
                cpuUsage: 0.0,
                memoryUsage: "0 MB",
                uptime: nil,
                restartPolicy: "always"
            )
        ]
        
        self.images = [
            DockerImage(id: "img_01", repository: "portainer/portainer-ce", tag: "latest", sizeMB: 280, sizeFormatted: "280 MB", created: "3 weeks ago", containersCount: 1, isUsed: true),
            DockerImage(id: "img_02", repository: "vaultwarden/server", tag: "latest", sizeMB: 195, sizeFormatted: "195 MB", created: "1 month ago", containersCount: 1, isUsed: true),
            DockerImage(id: "img_03", repository: "linuxserver/plex", tag: "latest", sizeMB: 750, sizeFormatted: "750 MB", created: "2 weeks ago", containersCount: 1, isUsed: true),
            DockerImage(id: "img_04", repository: "pihole/pihole", tag: "latest", sizeMB: 310, sizeFormatted: "310 MB", created: "5 days ago", containersCount: 1, isUsed: false),
            DockerImage(id: "img_05", repository: "redis", tag: "7.2-alpine", sizeMB: 42, sizeFormatted: "42 MB", created: "2 months ago", containersCount: 0, isUsed: false)
        ]
        
        self.composeProjects = [
            DockerProject(
                id: "proj_media",
                name: "media-stack",
                status: "running",
                path: "/volume1/docker/media-stack",
                services: [
                    DockerProjectService(name: "plex", image: "linuxserver/plex:latest", status: "running", ports: ["32400:32400"]),
                    DockerProjectService(name: "tautulli", image: "linuxserver/tautulli:latest", status: "running", ports: ["8181:8181"])
                ],
                created: "2026-07-20"
            ),
            DockerProject(
                id: "proj_monitor",
                name: "monitoring-stack",
                status: "running",
                path: "/volume1/docker/monitoring",
                services: [
                    DockerProjectService(name: "prometheus", image: "prom/prometheus:latest", status: "running", ports: ["9090:9090"]),
                    DockerProjectService(name: "grafana", image: "grafana/grafana:latest", status: "running", ports: ["3000:3000"])
                ],
                created: "2026-08-01"
            )
        ]
    }
}
