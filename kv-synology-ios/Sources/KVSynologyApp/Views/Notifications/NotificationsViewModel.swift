import Foundation
import SwiftUI
import KVSynologyCore

@Observable
@MainActor
public final class NotificationsViewModel {
    public var notifications: [NotificationItem] = []
    public var selectedCategory: String? = nil
    public var unreadOnly: Bool = false
    
    public var isLoading: Bool = false
    public var errorMessage: String? = nil
    public var successMessage: String? = nil
    
    private let client: DSMClient?
    
    public init(client: DSMClient? = nil) {
        self.client = client
        loadMockDataIfEmpty()
    }
    
    public var unreadCount: Int {
        notifications.filter { !$0.read }.count
    }
    
    public var categories: [String] {
        let cats = Set(notifications.map { $0.category.capitalized })
        return ["All"] + cats.sorted()
    }
    
    public var filteredNotifications: [NotificationItem] {
        notifications.filter { item in
            let matchesCategory: Bool
            if let cat = selectedCategory, cat != "All" {
                matchesCategory = (item.category.localizedCaseInsensitiveCompare(cat) == .orderedSame)
            } else {
                matchesCategory = true
            }
            
            let matchesUnread = unreadOnly ? !item.read : true
            return matchesCategory && matchesUnread
        }
    }
    
    public func loadNotifications() async {
        isLoading = true
        errorMessage = nil
        
        do {
            if let client = client {
                self.notifications = try await client.getNotifications()
            } else {
                loadMockDataIfEmpty()
            }
        } catch {
            self.errorMessage = "Failed to load notifications: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    public func markAsRead(id: String) {
        if let idx = notifications.firstIndex(where: { $0.id == id }) {
            let n = notifications[idx]
            notifications[idx] = NotificationItem(
                id: n.id,
                title: n.title,
                displayTitle: n.displayTitle,
                category: n.category,
                level: n.level,
                messages: n.messages,
                time: n.time,
                read: true
            )
        }
    }
    
    public func markAllAsRead() async {
        do {
            if let client = client {
                _ = try await client.markAllNotificationsRead()
            } else {
                try? await Task.sleep(nanoseconds: 200_000_000)
            }
            
            notifications = notifications.map { n in
                NotificationItem(
                    id: n.id,
                    title: n.title,
                    displayTitle: n.displayTitle,
                    category: n.category,
                    level: n.level,
                    messages: n.messages,
                    time: n.time,
                    read: true
                )
            }
            
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            successMessage = "All notifications marked as read"
        } catch {
            errorMessage = "Failed to mark as read: \(error.localizedDescription)"
        }
    }
    
    public func clearAll() async {
        do {
            if let client = client {
                _ = try await client.clearAllNotifications()
            } else {
                try? await Task.sleep(nanoseconds: 200_000_000)
            }
            
            notifications.removeAll()
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            successMessage = "All notifications cleared"
        } catch {
            errorMessage = "Failed to clear notifications: \(error.localizedDescription)"
        }
    }
    
    public func deleteNotification(id: String) {
        notifications.removeAll { $0.id == id }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
    
    private func loadMockDataIfEmpty() {
        if notifications.isEmpty {
            let now = Int64(Date().timeIntervalSince1970)
            notifications = [
                NotificationItem(
                    id: "notif_1",
                    title: "Security Advisor",
                    displayTitle: "Auto-Block Alert",
                    category: "Security",
                    level: "warning",
                    messages: ["Host 185.220.101.5 was blocked after 5 failed SSH login attempts."],
                    time: now - 300,
                    read: false
                ),
                NotificationItem(
                    id: "notif_2",
                    title: "Storage Manager",
                    displayTitle: "Data Scrubbing Complete",
                    category: "Storage",
                    level: "info",
                    messages: ["Storage Pool 1 finished scheduled monthly data scrubbing. 0 bad sectors detected."],
                    time: now - 3600,
                    read: false
                ),
                NotificationItem(
                    id: "notif_3",
                    title: "Container Manager",
                    displayTitle: "Container Unexpected Exit",
                    category: "Package",
                    level: "error",
                    messages: ["Container 'c3_uptime_kuma' stopped unexpectedly with exit code 137 (OOMKilled)."],
                    time: now - 14400,
                    read: false
                ),
                NotificationItem(
                    id: "notif_4",
                    title: "Package Center",
                    displayTitle: "Package Update Available",
                    category: "Package",
                    level: "info",
                    messages: ["Container Manager v24.0.7 is available for installation."],
                    time: now - 86400,
                    read: true
                ),
                NotificationItem(
                    id: "notif_5",
                    title: "Network",
                    displayTitle: "DDNS IP Registered",
                    category: "Network",
                    level: "success",
                    messages: ["Synology DDNS hostname syno.myds.me successfully bound to WAN IP 14.161.45.10."],
                    time: now - 172800,
                    read: true
                ),
                NotificationItem(
                    id: "notif_6",
                    title: "Hyper Backup",
                    displayTitle: "Backup Task Successful",
                    category: "Backup",
                    level: "success",
                    messages: ["Task 'Nightly Cloud Offsite' completed in 14 minutes. Transferred 1.4 GB."],
                    time: now - 259200,
                    read: true
                )
            ]
        }
    }
}
