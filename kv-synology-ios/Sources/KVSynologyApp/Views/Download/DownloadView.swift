import SwiftUI
import KVSynologyCore

@MainActor
public struct DownloadView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = DownloadViewModel()
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Aggregate Speed Banner
            speedBannerView
            
            // Categorized Tabs
            tabPickerView
            
            // Tasks List
            if viewModel.filteredTasks.isEmpty {
                emptyStateView
            } else {
                ScrollView {
                    LazyVStack(spacing: AppSpacing.md) {
                        ForEach(viewModel.filteredTasks) { task in
                            downloadTaskCard(task)
                        }
                    }
                    .padding(AppSpacing.lg)
                }
                .refreshable {
                    viewModel.loadMockTasks()
                }
            }
        }
        .background(Color.oledBackground.ignoresSafeArea())
        .navigationTitle(AppStrings.tr("download.title", lang: appState.language))
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $viewModel.searchQuery, prompt: AppStrings.tr("common.search", lang: appState.language))
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    viewModel.showAddSheet = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundStyle(Color.dsmVibrantBlue)
                }
            }
        }
        .sheet(isPresented: $viewModel.showAddSheet) {
            AddDownloadSheet { uri, dest, startNow in
                viewModel.addTask(uri: uri, destination: dest, startImmediately: startNow)
            }
        }
    }
    
    // MARK: - Speed Banner
    private var speedBannerView: some View {
        HStack(spacing: AppSpacing.xl) {
            HStack(spacing: AppSpacing.sm) {
                Image(systemName: "arrow.down.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Color.statusSuccess)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("DOWNLOAD")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.textSecondary)
                    Text("\(formatSpeed(viewModel.totalDownloadSpeed))/s")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(Color.textPrimary)
                }
            }
            
            Spacer()
            
            HStack(spacing: AppSpacing.sm) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Color.statusPurple)
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("UPLOAD")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.textSecondary)
                    Text("\(formatSpeed(viewModel.totalUploadSpeed))/s")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(Color.textPrimary)
                }
            }
        }
        .padding(.horizontal, AppSpacing.lg)
        .padding(.vertical, AppSpacing.md)
        .background(Color.oledCardElevated.opacity(0.8))
        .overlay(
            Rectangle().frame(height: 1).foregroundStyle(Color.oledBorder),
            alignment: .bottom
        )
    }
    
    // MARK: - Tab Picker
    private var tabPickerView: some View {
        Picker("Category", selection: $viewModel.selectedTab) {
            Text(AppStrings.tr("download.all", lang: appState.language)).tag(DownloadTab.all)
            Text(AppStrings.tr("download.downloading", lang: appState.language)).tag(DownloadTab.downloading)
            Text(AppStrings.tr("download.paused", lang: appState.language)).tag(DownloadTab.paused)
            Text(AppStrings.tr("download.completed", lang: appState.language)).tag(DownloadTab.completed)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, AppSpacing.lg)
        .padding(.vertical, AppSpacing.sm)
    }
    
    // MARK: - Task Card
    private func downloadTaskCard(_ task: DownloadTask) -> some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            HStack(alignment: .top, spacing: AppSpacing.sm) {
                ZStack {
                    RoundedRectangle(cornerRadius: AppCornerRadius.sm)
                        .fill(task.type == "bt" ? Color.statusPurple.opacity(0.2) : Color.dsmVibrantBlue.opacity(0.2))
                        .frame(width: 36, height: 36)
                    Image(systemName: task.type == "bt" ? "point.3.connected.trianglepath.dotted" : "arrow.down.doc.fill")
                        .foregroundStyle(task.type == "bt" ? Color.statusPurple : Color.dsmVibrantBlue)
                }
                
                VStack(alignment: .leading, spacing: 3) {
                    Text(task.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.textPrimary)
                        .lineLimit(1)
                    
                    HStack(spacing: AppSpacing.xs) {
                        Text(formatBytes(Int64(Double(task.size) * task.progress)))
                            .font(.caption2)
                            .foregroundStyle(Color.textSecondary)
                        Text("/")
                            .font(.caption2)
                            .foregroundStyle(Color.textTertiary)
                        Text(formatBytes(task.size))
                            .font(.caption2)
                            .foregroundStyle(Color.textSecondary)
                        
                        if let dest = task.destination {
                            Text("•")
                                .font(.caption2)
                                .foregroundStyle(Color.textTertiary)
                            Text(dest)
                                .font(.caption2)
                                .foregroundStyle(Color.textTertiary)
                                .lineLimit(1)
                        }
                    }
                }
                
                Spacer()
                
                taskStatusBadge(task.status)
            }
            
            // Progress Bar
            ProgressView(value: task.progress)
                .tint(progressTint(for: task.status))
            
            // Stats & Actions Row
            HStack {
                if task.status == .downloading {
                    HStack(spacing: AppSpacing.sm) {
                        Label("\(formatSpeed(task.downloadSpeed))/s", systemImage: "arrow.down")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(Color.statusSuccess)
                        
                        if task.uploadSpeed > 0 {
                            Label("\(formatSpeed(task.uploadSpeed))/s", systemImage: "arrow.up")
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(Color.statusPurple)
                        }
                    }
                } else if task.status == .finished {
                    Label("Completed", systemImage: "checkmark.circle.fill")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(Color.statusSuccess)
                } else {
                    Text("Paused")
                        .font(.caption2)
                        .foregroundStyle(Color.textTertiary)
                }
                
                Spacer()
                
                // Controls
                HStack(spacing: AppSpacing.md) {
                    if task.status == .downloading {
                        Button {
                            viewModel.pauseTask(id: task.id)
                        } label: {
                            Image(systemName: "pause.fill")
                                .font(.caption)
                                .foregroundStyle(Color.textSecondary)
                        }
                    } else if task.status == .paused {
                        Button {
                            viewModel.resumeTask(id: task.id)
                        } label: {
                            Image(systemName: "play.fill")
                                .font(.caption)
                                .foregroundStyle(Color.statusSuccess)
                        }
                    }
                    
                    Button {
                        viewModel.deleteTask(id: task.id)
                    } label: {
                        Image(systemName: "trash")
                            .font(.caption)
                            .foregroundStyle(Color.statusError.opacity(0.8))
                    }
                }
            }
        }
        .nasCard()
    }
    
    // MARK: - Helpers
    private func taskStatusBadge(_ status: DownloadTaskStatus) -> some View {
        switch status {
        case .downloading:
            return Text("DL").nasStatusChip(color: Color.statusSuccess)
        case .waiting:
            return Text("QUEUED").nasStatusChip(color: Color.statusWarning)
        case .paused:
            return Text("PAUSED").nasStatusChip(color: Color.textTertiary)
        case .finished:
            return Text("DONE").nasStatusChip(color: Color.statusInfo)
        case .error:
            return Text("ERROR").nasStatusChip(color: Color.statusError)
        }
    }
    
    private func progressTint(for status: DownloadTaskStatus) -> Color {
        switch status {
        case .downloading: return Color.statusSuccess
        case .waiting: return Color.statusWarning
        case .paused: return Color.textTertiary
        case .finished: return Color.statusInfo
        case .error: return Color.statusError
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer()
            Image(systemName: "arrow.down.circle")
                .font(.system(size: 48))
                .foregroundStyle(Color.textTertiary)
            Text("No download tasks in this view")
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
            Spacer()
        }
    }
    
    private func formatBytes(_ bytes: Int64) -> String {
        let mb = Double(bytes) / (1024.0 * 1024.0)
        if mb > 1024 {
            return String(format: "%.2f GB", mb / 1024.0)
        } else {
            return String(format: "%.1f MB", mb)
        }
    }
    
    private func formatSpeed(_ bytesPerSec: Int64) -> String {
        let kb = Double(bytesPerSec) / 1024.0
        if kb > 1024 {
            return String(format: "%.1f MB", kb / 1024.0)
        } else {
            return String(format: "%.0f KB", kb)
        }
    }
}
