import SwiftUI
import KVSynologyCore

@MainActor
public struct NotificationsView: View {
    @State private var viewModel: NotificationsViewModel
    
    public init() {
        _viewModel = State(initialValue: NotificationsViewModel())
    }
    
    public init(viewModel: NotificationsViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    public var body: some View {
        VStack(spacing: 0) {
                // Category Filter ScrollView
                categoryFilterView
                    .padding(.vertical, 8)
                
                // Status banners
                if let error = viewModel.errorMessage {
                    statusBanner(message: error, isError: true)
                }
                if let success = viewModel.successMessage {
                    statusBanner(message: success, isError: false)
                }
                
                // Content
                if viewModel.isLoading {
                    ProgressView("Retrieving Notifications...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.filteredNotifications.isEmpty {
                    emptyStateView
                } else {
                    notificationsList
                }
            }
            .navigationTitle("Notification Center")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button {
                            Task { await viewModel.markAllAsRead() }
                        } label: {
                            Label("Mark All as Read", systemImage: "checkmark.circle")
                        }
                        .disabled(viewModel.unreadCount == 0)
                        
                        Button(role: .destructive) {
                            Task { await viewModel.clearAll() }
                        } label: {
                            Label("Clear All Notifications", systemImage: "trash")
                        }
                        .disabled(viewModel.notifications.isEmpty)
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .task {
                if viewModel.notifications.isEmpty {
                    await viewModel.loadNotifications()
                }
            }
            .refreshable {
                await viewModel.loadNotifications()
            }
    }
    
    // MARK: - Filter Bar
    
    private var categoryFilterView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // Unread Only Toggle Pill
                Button {
                    viewModel.unreadOnly.toggle()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: viewModel.unreadOnly ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                        Text("Unread (\(viewModel.unreadCount))")
                    }
                    .font(.subheadline)
                    .fontWeight(viewModel.unreadOnly ? .semibold : .regular)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(viewModel.unreadOnly ? Color.orange : Color(.secondarySystemFill))
                    .foregroundColor(viewModel.unreadOnly ? .white : .primary)
                    .clipShape(Capsule())
                }
                
                // Categories
                ForEach(viewModel.categories, id: \.self) { cat in
                    let isSelected = (viewModel.selectedCategory == cat) || (viewModel.selectedCategory == nil && cat == "All")
                    Button {
                        viewModel.selectedCategory = (cat == "All") ? nil : cat
                    } label: {
                        Text(cat)
                            .font(.subheadline)
                            .fontWeight(isSelected ? .semibold : .regular)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .background(isSelected ? Color.accentColor : Color(.secondarySystemFill))
                            .foregroundColor(isSelected ? .white : .primary)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal)
        }
    }
    
    // MARK: - Notifications List
    
    private var notificationsList: some View {
        List {
            ForEach(viewModel.filteredNotifications) { item in
                NotificationItemRow(item: item, viewModel: viewModel)
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            viewModel.deleteNotification(id: item.id)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                    .swipeActions(edge: .leading) {
                        if !item.read {
                            Button {
                                viewModel.markAsRead(id: item.id)
                            } label: {
                                Label("Read", systemImage: "envelope.open.fill")
                            }
                            .tint(.blue)
                        }
                    }
            }
        }
        .listStyle(.plain)
    }
    
    private var emptyStateView: some View {
        ContentUnavailableView {
            Label("No Notifications", systemImage: "bell.slash")
        } description: {
            Text("Everything is running smoothly on your Synology NAS.")
        }
    }
    
    private func statusBanner(message: String, isError: Bool) -> some View {
        HStack {
            Image(systemName: isError ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                .foregroundColor(isError ? .red : .green)
            Text(message)
                .font(.caption)
                .foregroundColor(.primary)
            Spacer()
            Button {
                if isError { viewModel.errorMessage = nil } else { viewModel.successMessage = nil }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background((isError ? Color.red : Color.green).opacity(0.12))
        .cornerRadius(8)
        .padding(.horizontal)
    }
}

// MARK: - Notification Item Row

@MainActor
struct NotificationItemRow: View {
    let item: NotificationItem
    let viewModel: NotificationsViewModel
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Unread Indicator
            Circle()
                .fill(item.read ? Color.clear : Color.accentColor)
                .frame(width: 8, height: 8)
                .padding(.top, 6)
            
            // Icon
            ZStack {
                Circle()
                    .fill(severityColor(item.level).opacity(0.15))
                    .frame(width: 40, height: 40)
                
                Image(systemName: categoryIcon(item.category))
                    .foregroundColor(severityColor(item.level))
                    .font(.system(size: 18))
            }
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(item.displayTitle.isEmpty ? item.title : item.displayTitle)
                        .font(.headline)
                        .fontWeight(item.read ? .regular : .bold)
                    
                    Spacer()
                    
                    Text(formatRelativeTime(item.time))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                if let firstMsg = item.messages.first {
                    Text(firstMsg)
                        .font(.subheadline)
                        .foregroundColor(item.read ? .secondary : .primary)
                        .lineLimit(3)
                }
                
                HStack(spacing: 6) {
                    Text(item.category.capitalized)
                        .font(.caption2.bold())
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(.secondarySystemFill))
                        .clipShape(Capsule())
                    
                    Text(item.level.uppercased())
                        .font(.system(size: 8, weight: .bold))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(severityColor(item.level).opacity(0.15))
                        .foregroundColor(severityColor(item.level))
                        .clipShape(Capsule())
                }
                .padding(.top, 2)
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            if !item.read {
                viewModel.markAsRead(id: item.id)
            }
        }
    }
    
    private func categoryIcon(_ category: String) -> String {
        switch category.lowercased() {
        case "system": return "gearshape.fill"
        case "storage": return "internaldrive.fill"
        case "package": return "shippingbox.fill"
        case "network": return "network"
        case "security": return "shield.fill"
        case "backup": return "arrow.clockwise.icloud.fill"
        default: return "bell.fill"
        }
    }
    
    private func severityColor(_ level: String) -> Color {
        switch level.lowercased() {
        case "error", "critical": return .red
        case "warning": return .orange
        case "success": return .green
        default: return .blue
        }
    }
    
    private func formatRelativeTime(_ timestamp: Int64) -> String {
        let now = Date().timeIntervalSince1970
        let diff = max(0, Int(now - Double(timestamp)))
        
        if diff < 60 {
            return "Just now"
        } else if diff < 3600 {
            return "\(diff / 60)m ago"
        } else if diff < 86400 {
            return "\(diff / 3600)h ago"
        } else {
            return "\(diff / 86400)d ago"
        }
    }
}
