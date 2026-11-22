import SwiftUI
import KVSynologyCore

@MainActor
public struct FileStationView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = FileStationViewModel()
    
    private let gridColumns = [
        GridItem(.adaptive(minimum: 105, maximum: 140), spacing: AppSpacing.md)
    ]
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Breadcrumbs Bar
                breadcrumbsBar
                
                // Files List or Grid
                if viewModel.filteredFiles.isEmpty {
                    emptyStateView
                } else {
                    Group {
                        if viewModel.viewMode == .list {
                            listView
                        } else {
                            gridView
                        }
                    }
                    .refreshable {
                        viewModel.loadMockFiles(for: viewModel.currentPath)
                    }
                }
            }
            .background(Color.oledBackground.ignoresSafeArea())
            .navigationTitle(AppStrings.tr("files.title", lang: appState.language))
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $viewModel.searchQuery, prompt: AppStrings.tr("common.search", lang: appState.language))
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        viewModel.viewMode = (viewModel.viewMode == .list) ? .grid : .list
                    } label: {
                        Image(systemName: viewModel.viewMode == .list ? "square.grid.2x2" : "list.bullet")
                    }
                    
                    Button {
                        viewModel.showNewFolderDialog = true
                    } label: {
                        Image(systemName: "folder.badge.plus")
                    }
                }
            }
            .alert(AppStrings.tr("files.new_folder", lang: appState.language), isPresented: $viewModel.showNewFolderDialog) {
                TextField("Folder name", text: $viewModel.newFolderName)
                Button(AppStrings.tr("common.confirm", lang: appState.language)) {
                    viewModel.createFolder()
                }
                Button(AppStrings.tr("common.cancel", lang: appState.language), role: .cancel) {}
            } message: {
                Text(AppStrings.tr("files.new_folder_prompt", lang: appState.language))
            }
            .alert(AppStrings.tr("files.rename", lang: appState.language), isPresented: Binding(
                get: { viewModel.fileToRename != nil },
                set: { if !$0 { viewModel.fileToRename = nil } }
            )) {
                TextField("New name", text: $viewModel.newFileName)
                Button(AppStrings.tr("common.save", lang: appState.language)) {
                    viewModel.renameFile()
                }
                Button(AppStrings.tr("common.cancel", lang: appState.language), role: .cancel) {}
            }
            .confirmationDialog(
                AppStrings.tr("common.delete", lang: appState.language),
                isPresented: $viewModel.showDeleteDialog,
                presenting: viewModel.fileToDelete
            ) { target in
                Button(AppStrings.tr("common.delete", lang: appState.language), role: .destructive) {
                    viewModel.deleteFile()
                }
                Button(AppStrings.tr("common.cancel", lang: appState.language), role: .cancel) {}
            } message: { target in
                Text("\(AppStrings.tr("files.delete_confirm", lang: appState.language)) \"\(target.name)\"?")
            }
            .alert(AppStrings.tr("files.share_success", lang: appState.language), isPresented: $viewModel.showShareLinkAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("\(AppStrings.tr("files.share_copied", lang: appState.language))\n\(viewModel.createdShareLink?.url ?? "")")
            }
            .sheet(item: $viewModel.selectedFileForPreview) { file in
                FilePreviewSheet(file: file)
            }
            .sheet(item: $viewModel.selectedFileForCodeViewer) { file in
                CodeViewerSheet(file: file)
            }
        }
    }
    
    // MARK: - Breadcrumbs Bar
    private var breadcrumbsBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: AppSpacing.xs) {
                ForEach(viewModel.breadcrumbComponents, id: \.path) { crumb in
                    Button {
                        viewModel.navigateTo(path: crumb.path)
                    } label: {
                        HStack(spacing: 4) {
                            if crumb.name == "Root" {
                                Image(systemName: "server.rack")
                            }
                            Text(crumb.name)
                                .font(.caption.weight(crumb.path == viewModel.currentPath ? .bold : .medium))
                        }
                        .foregroundStyle(crumb.path == viewModel.currentPath ? Color.dsmVibrantBlue : Color.textSecondary)
                        .padding(.horizontal, AppSpacing.sm)
                        .padding(.vertical, AppSpacing.xs)
                        .background(crumb.path == viewModel.currentPath ? Color.dsmVibrantBlue.opacity(0.12) : Color.oledCard)
                        .clipShape(Capsule())
                    }
                    
                    if crumb.path != viewModel.breadcrumbComponents.last?.path {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Color.textTertiary)
                    }
                }
            }
            .padding(.horizontal, AppSpacing.lg)
            .padding(.vertical, AppSpacing.sm)
        }
        .background(Color.oledCardElevated.opacity(0.6))
        .overlay(
            Rectangle().frame(height: 1).foregroundStyle(Color.oledBorder),
            alignment: .bottom
        )
    }
    
    // MARK: - List View
    private var listView: some View {
        List {
            ForEach(viewModel.filteredFiles) { file in
                Button {
                    viewModel.openItem(file)
                } label: {
                    HStack(spacing: AppSpacing.md) {
                        fileIcon(for: file)
                            .frame(width: 36, height: 36)
                        
                        VStack(alignment: .leading, spacing: 3) {
                            Text(file.name)
                                .font(.body.weight(.medium))
                                .foregroundStyle(Color.textPrimary)
                                .lineLimit(1)
                            
                            HStack(spacing: AppSpacing.sm) {
                                if !file.isdir {
                                    Text(formatSize(file.size))
                                        .font(.caption2)
                                        .foregroundStyle(Color.textSecondary)
                                    Text("•")
                                        .font(.caption2)
                                        .foregroundStyle(Color.textTertiary)
                                }
                                Text(Date(timeIntervalSince1970: TimeInterval(file.mtime)).formatted(date: .abbreviated, time: .shortened))
                                    .font(.caption2)
                                    .foregroundStyle(Color.textSecondary)
                            }
                        }
                        
                        Spacer()
                        
                        if file.isdir {
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Color.textTertiary)
                        }
                    }
                }
                .contextMenu {
                    Button {
                        viewModel.openItem(file)
                    } label: {
                        Label("Open", systemImage: "arrow.up.right.square")
                    }
                    
                    Button {
                        viewModel.createShareLink(for: file)
                    } label: {
                        Label(AppStrings.tr("files.share", lang: appState.language), systemImage: "link")
                    }
                    
                    Button {
                        viewModel.fileToRename = file
                        viewModel.newFileName = file.name
                    } label: {
                        Label(AppStrings.tr("files.rename", lang: appState.language), systemImage: "pencil")
                    }
                    
                    Button(role: .destructive) {
                        viewModel.fileToDelete = file
                        viewModel.showDeleteDialog = true
                    } label: {
                        Label(AppStrings.tr("common.delete", lang: appState.language), systemImage: "trash")
                    }
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }
    
    // MARK: - Grid View
    private var gridView: some View {
        ScrollView {
            LazyVGrid(columns: gridColumns, spacing: AppSpacing.md) {
                ForEach(viewModel.filteredFiles) { file in
                    Button {
                        viewModel.openItem(file)
                    } label: {
                        VStack(spacing: AppSpacing.xs) {
                            fileIcon(for: file)
                                .font(.system(size: 40))
                                .frame(height: 50)
                            
                            Text(file.name)
                                .font(.caption.weight(.medium))
                                .foregroundStyle(Color.textPrimary)
                                .multilineTextAlignment(.center)
                                .lineLimit(2)
                            
                            if !file.isdir {
                                Text(formatSize(file.size))
                                    .font(.caption2)
                                    .foregroundStyle(Color.textTertiary)
                            }
                        }
                        .padding(AppSpacing.sm)
                        .frame(maxWidth: .infinity)
                        .background(Color.oledCard)
                        .clipShape(RoundedRectangle(cornerRadius: AppCornerRadius.md))
                        .overlay(
                            RoundedRectangle(cornerRadius: AppCornerRadius.md)
                                .stroke(Color.oledBorder, lineWidth: 1)
                        )
                    }
                }
            }
            .padding(AppSpacing.lg)
        }
    }
    
    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: AppSpacing.md) {
            Spacer()
            Image(systemName: "folder")
                .font(.system(size: 60))
                .foregroundStyle(Color.textTertiary)
            Text(AppStrings.tr("files.empty", lang: appState.language))
                .font(.headline)
                .foregroundStyle(Color.textSecondary)
            Spacer()
        }
    }
    
    // MARK: - Icon Helper
    @ViewBuilder
    private func fileIcon(for file: DsmFile) -> some View {
        if file.isdir {
            Image(systemName: "folder.fill")
                .font(.title2)
                .foregroundStyle(Color.dsmVibrantBlue)
        } else if file.isVideo {
            Image(systemName: "play.rectangle.fill")
                .font(.title2)
                .foregroundStyle(Color.statusError)
        } else if file.isAudio {
            Image(systemName: "music.note")
                .font(.title2)
                .foregroundStyle(Color.statusPurple)
        } else if file.isImage {
            Image(systemName: "photo.fill")
                .font(.title2)
                .foregroundStyle(Color.statusSuccess)
        } else if file.isText {
            Image(systemName: "doc.text.fill")
                .font(.title2)
                .foregroundStyle(Color.statusInfo)
        } else {
            Image(systemName: "doc.fill")
                .font(.title2)
                .foregroundStyle(Color.statusWarning)
        }
    }
    
    private func formatSize(_ bytes: Int64) -> String {
        let kb = Double(bytes) / 1024.0
        if kb < 1024 {
            return String(format: "%.0f KB", kb)
        } else {
            return String(format: "%.1f MB", kb / 1024.0)
        }
    }
}
