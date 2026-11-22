import SwiftUI
import KVSynologyCore

@MainActor
public struct DockerView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = DockerViewModel()
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Color.textSecondary)
                    TextField(AppStrings.tr("common.search", lang: appState.language), text: $viewModel.searchQuery)
                        .font(.system(size: 14))
                        .foregroundStyle(Color.textPrimary)
                    if !viewModel.searchQuery.isEmpty {
                        Button {
                            viewModel.searchQuery = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(Color.textSecondary)
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.oledCardElevated)
                .cornerRadius(10)
                .padding(.horizontal, AppSpacing.lg)
                .padding(.vertical, 8)
                
                // Segmented Tab Picker
                tabPickerView
                
                // Content Views
                Group {
                    switch viewModel.selectedTab {
                    case .containers:
                        containersListView
                    case .images:
                        imagesListView
                    case .compose:
                        composeProjectsListView
                    }
                }
                .refreshable {
                    viewModel.loadMockData()
                }
            }
            .background(Color.oledBackground.ignoresSafeArea())
            .navigationTitle(AppStrings.tr("docker.title", lang: appState.language))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.loadMockData()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color.dsmVibrantBlue)
                    }
                }
            }
            .sheet(item: $viewModel.selectedContainerForLogs) { container in
                ContainerLogsView(container: container)
            }
        }
    }
    
    // MARK: - Tab Picker
    private var tabPickerView: some View {
        Picker("Category", selection: $viewModel.selectedTab) {
            Text(AppStrings.tr("docker.tab_containers", lang: appState.language)).tag(DockerTab.containers)
            Text(AppStrings.tr("docker.tab_images", lang: appState.language)).tag(DockerTab.images)
            Text(AppStrings.tr("docker.tab_compose", lang: appState.language)).tag(DockerTab.compose)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, AppSpacing.lg)
        .padding(.vertical, AppSpacing.sm)
        .background(Color.oledCardElevated.opacity(0.6))
        .overlay(
            Rectangle().frame(height: 1).foregroundStyle(Color.oledBorder),
            alignment: .bottom
        )
    }
    
    // MARK: - Containers List
    private var containersListView: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.md) {
                if viewModel.filteredContainers.isEmpty {
                    emptyState(text: AppStrings.tr("docker.no_containers", lang: appState.language), icon: "shippingbox")
                } else {
                    ForEach(viewModel.filteredContainers) { container in
                        containerCard(container)
                    }
                }
            }
            .padding(AppSpacing.lg)
        }
    }
    
    // MARK: - Container Card
    private func statusChip(_ container: DockerContainerDetails) -> some View {
        let isRunning = container.isRunning
        let color = isRunning ? Color.statusSuccess : Color.textTertiary
        let text = isRunning ? "RUNNING" : "STOPPED"
        return Text(text)
            .nasStatusChip(color: color)
    }
    
    private func containerCard(_ container: DockerContainerDetails) -> some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            // Header: Name & Status Chip
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(container.name)
                        .font(.headline)
                        .foregroundStyle(Color.textPrimary)
                    
                    Text(container.image)
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                        .lineLimit(1)
                }
                
                Spacer()
                
                statusChip(container)
            }
            
            Divider().background(Color.oledBorder)
            
            // Metrics: CPU, RAM, Ports
            HStack(spacing: AppSpacing.lg) {
                if container.isRunning {
                    HStack(spacing: 4) {
                        Image(systemName: "cpu")
                            .foregroundStyle(Color.cpuColor)
                        Text(String(format: "%.1f%%", container.cpuUsage))
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.textPrimary)
                    }
                    
                    HStack(spacing: 4) {
                        Image(systemName: "memorychip")
                            .foregroundStyle(Color.ramColor)
                        Text(container.memoryUsage)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.textPrimary)
                    }
                }
                
                if !container.ports.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "network")
                            .foregroundStyle(Color.statusInfo)
                        Text(container.ports.joined(separator: ", "))
                            .font(.caption2)
                            .foregroundStyle(Color.textSecondary)
                            .lineLimit(1)
                    }
                }
                
                Spacer()
            }
            
            // Action Buttons
            HStack(spacing: AppSpacing.sm) {
                Button {
                    Task {
                        await viewModel.toggleContainer(id: container.id, action: container.isRunning ? "stop" : "start")
                    }
                } label: {
                    Label(
                        container.isRunning ? AppStrings.tr("docker.action_stop", lang: appState.language) : AppStrings.tr("docker.action_start", lang: appState.language),
                        systemImage: container.isRunning ? "stop.fill" : "play.fill"
                    )
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, AppSpacing.md)
                    .padding(.vertical, AppSpacing.sm)
                    .background(container.isRunning ? Color.statusError.opacity(0.15) : Color.statusSuccess.opacity(0.15))
                    .foregroundStyle(container.isRunning ? Color.statusError : Color.statusSuccess)
                    .clipShape(Capsule())
                }
                
                if container.isRunning {
                    Button {
                        Task {
                            await viewModel.toggleContainer(id: container.id, action: "restart")
                        }
                    } label: {
                        Label(AppStrings.tr("docker.action_restart", lang: appState.language), systemImage: "arrow.clockwise")
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, AppSpacing.md)
                            .padding(.vertical, AppSpacing.sm)
                            .background(Color.oledCardElevated)
                            .foregroundStyle(Color.textPrimary)
                            .clipShape(Capsule())
                    }
                }
                
                Spacer()
                
                Button {
                    viewModel.selectedContainerForLogs = container
                } label: {
                    Label(AppStrings.tr("docker.action_logs", lang: appState.language), systemImage: "terminal")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, AppSpacing.md)
                        .padding(.vertical, AppSpacing.sm)
                        .background(Color.dsmVibrantBlue.opacity(0.15))
                        .foregroundStyle(Color.dsmVibrantBlue)
                        .clipShape(Capsule())
                }
            }
        }
        .nasCard()
    }
    
    // MARK: - Images List
    private var imagesListView: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.sm) {
                if viewModel.filteredImages.isEmpty {
                    emptyState(text: AppStrings.tr("docker.no_images", lang: appState.language), icon: "square.stack.3d.up")
                } else {
                    ForEach(viewModel.filteredImages) { image in
                        HStack(spacing: AppSpacing.md) {
                            ZStack {
                                RoundedRectangle(cornerRadius: AppCornerRadius.sm)
                                    .fill(Color.oledCardElevated)
                                    .frame(width: 44, height: 44)
                                Image(systemName: "shippingbox.fill")
                                    .foregroundStyle(Color.statusInfo)
                            }
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(image.repository)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(Color.textPrimary)
                                
                                HStack(spacing: AppSpacing.xs) {
                                    Text(image.tag)
                                        .font(.caption2.weight(.bold))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 1)
                                        .background(Color.dsmVibrantBlue.opacity(0.2))
                                        .foregroundStyle(Color.dsmVibrantBlue)
                                        .clipShape(Capsule())
                                    
                                    Text(image.sizeFormatted)
                                        .font(.caption2)
                                        .foregroundStyle(Color.textSecondary)
                                }
                            }
                            
                            Spacer()
                            
                            if image.isUsed {
                                Text("IN USE")
                                    .nasStatusChip(color: Color.statusSuccess)
                            }
                        }
                        .padding(AppSpacing.md)
                        .nasCard()
                    }
                }
            }
            .padding(AppSpacing.lg)
        }
    }
    
    // MARK: - Compose Projects List
    private var composeProjectsListView: some View {
        ScrollView {
            LazyVStack(spacing: AppSpacing.md) {
                if viewModel.filteredProjects.isEmpty {
                    emptyState(text: AppStrings.tr("docker.no_projects", lang: appState.language), icon: "square.3.layers.3d")
                } else {
                    ForEach(viewModel.filteredProjects) { project in
                        VStack(alignment: .leading, spacing: AppSpacing.sm) {
                            HStack {
                                Label(project.name, systemImage: "square.3.layers.3d.down.right")
                                    .font(.headline)
                                    .foregroundStyle(Color.textPrimary)
                                
                                Spacer()
                                
                                Text(project.status.uppercased())
                                    .nasStatusChip(color: project.isRunning ? Color.statusSuccess : Color.textTertiary)
                            }
                            
                            Text(project.path)
                                .font(.caption2)
                                .foregroundStyle(Color.textTertiary)
                            
                            Divider().background(Color.oledBorder)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Services (\(project.services.count))")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(Color.textSecondary)
                                
                                ForEach(project.services) { service in
                                    HStack {
                                        Circle()
                                            .fill(service.status == "running" ? Color.statusSuccess : Color.textTertiary)
                                            .frame(width: 6, height: 6)
                                        Text(service.name)
                                            .font(.caption.weight(.medium))
                                            .foregroundStyle(Color.textPrimary)
                                        Spacer()
                                        Text(service.image)
                                            .font(.caption2)
                                            .foregroundStyle(Color.textSecondary)
                                    }
                                }
                            }
                        }
                        .nasCard()
                    }
                }
            }
            .padding(AppSpacing.lg)
        }
    }
    
    // MARK: - Empty Helper
    private func emptyState(text: String, icon: String) -> some View {
        VStack(spacing: AppSpacing.md) {
            Spacer().frame(height: 60)
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(Color.textTertiary)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
        }
    }
}
