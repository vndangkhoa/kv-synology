import SwiftUI
import KVSynologyCore

@MainActor
public struct PackagesView: View {
    @State private var viewModel: PackagesViewModel
    @State private var showingDetailSheet = false
    
    public init() {
        _viewModel = State(initialValue: PackagesViewModel())
    }
    
    public init(viewModel: PackagesViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    public var body: some View {
        VStack(spacing: 0) {
                // Top Segmented Tab Picker
                tabPicker
                    .padding(.horizontal)
                    .padding(.top, 8)
                    .padding(.bottom, 6)
                
                // Category Filter Pills
                categoryFilterBar
                    .padding(.bottom, 8)
                
                // Status banners
                if let error = viewModel.errorMessage {
                    errorBanner(message: error)
                }
                if let success = viewModel.successMessage {
                    successBanner(message: success)
                }
                
                // Content List
                if viewModel.isLoading {
                    loadingView
                } else if viewModel.filteredPackages.isEmpty {
                    emptyStateView
                } else {
                    packageListView
                }
            }
            .navigationTitle("Package Center")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $viewModel.searchQuery, prompt: "Search packages...")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        Task { await viewModel.checkForUpdates() }
                    } label: {
                        if viewModel.isCheckingUpdates {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Label("Check Updates", systemImage: "arrow.triangle.2.circlepath")
                        }
                    }
                    .disabled(viewModel.isCheckingUpdates)
                }
            }
            .sheet(item: $viewModel.selectedPackageForDetail) { pkg in
                PackageDetailSheet(package: pkg, viewModel: viewModel)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
            .task {
                if viewModel.installedPackages.isEmpty {
                    await viewModel.loadPackages()
                }
            }
            .refreshable {
                await viewModel.loadPackages()
            }
    }
    
    // MARK: - Subviews
    
    private var tabPicker: some View {
        Picker("Packages View", selection: $viewModel.selectedTab) {
            ForEach(PackageTab.allCases) { tab in
                HStack(spacing: 6) {
                    Image(systemName: tab.iconName)
                    Text(tab.rawValue)
                    if tab == .installed && viewModel.updatesAvailableCount > 0 {
                        Text("\(viewModel.updatesAvailableCount)")
                            .font(.caption2.bold())
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .clipShape(Capsule())
                    }
                }
                .tag(tab)
            }
        }
        .pickerStyle(.segmented)
    }
    
    private var categoryFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
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
    
    private var packageListView: some View {
        List {
            if viewModel.selectedTab == .installed && viewModel.updatesAvailableCount > 0 {
                Section {
                    HStack(spacing: 12) {
                        Image(systemName: "exclamationmark.arrow.triangle.2.circlepath")
                            .font(.title2)
                            .foregroundColor(.orange)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Updates Available")
                                .font(.headline)
                            Text("\(viewModel.updatesAvailableCount) package(s) can be upgraded.")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Button("Update All") {
                            Task {
                                for pkg in viewModel.installedPackages where pkg.hasUpdate {
                                    await viewModel.updatePackage(pkg)
                                }
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.orange)
                        .font(.caption.bold())
                    }
                    .padding(.vertical, 4)
                }
            }
            
            Section(header: Text(viewModel.selectedTab == .installed ? "Installed Packages (\(viewModel.filteredPackages.count))" : "Available in Center (\(viewModel.filteredPackages.count))")) {
                ForEach(viewModel.filteredPackages) { pkg in
                    PackageRowView(package: pkg, viewModel: viewModel)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            viewModel.selectedPackageForDetail = pkg
                        }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.3)
            Text("Loading Synology packages...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var emptyStateView: some View {
        ContentUnavailableView {
            Label(
                viewModel.searchQuery.isEmpty ? "No Packages Found" : "No Results for \"\(viewModel.searchQuery)\"",
                systemImage: "shippingbox"
            )
        } description: {
            Text(viewModel.searchQuery.isEmpty ? "No packages match the selected category." : "Check your spelling or filter settings.")
        }
    }
    
    private func errorBanner(message: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.red)
            Text(message)
                .font(.caption)
                .foregroundColor(.primary)
            Spacer()
            Button {
                viewModel.errorMessage = nil
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.red.opacity(0.12))
        .cornerRadius(8)
        .padding(.horizontal)
    }
    
    private func successBanner(message: String) -> some View {
        HStack {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
            Text(message)
                .font(.caption)
                .foregroundColor(.primary)
            Spacer()
            Button {
                viewModel.successMessage = nil
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.green.opacity(0.12))
        .cornerRadius(8)
        .padding(.horizontal)
    }
}

// MARK: - Package Row View

@MainActor
struct PackageRowView: View {
    let package: PackageItem
    let viewModel: PackagesViewModel
    
    var isRunning: Bool {
        package.status.lowercased() == "running"
    }
    
    var isToggling: Bool {
        viewModel.togglingPackageIds.contains(package.id)
    }
    
    var isUpdating: Bool {
        viewModel.updatingPackageIds.contains(package.id)
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Package Icon
            packageIcon
            
            // Info Column
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(package.name)
                        .font(.headline)
                        .lineLimit(1)
                    
                    if package.hasUpdate {
                        Text("UPDATE")
                            .font(.system(size: 9, weight: .bold))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .clipShape(Capsule())
                    }
                }
                
                HStack(spacing: 8) {
                    statusBadge
                    
                    Text("v\(package.version)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .fontDesign(.monospaced)
                }
                
                if !package.description.isEmpty {
                    Text(package.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }
            
            Spacer()
            
            // Actions
            if package.installed {
                installedActions
            } else {
                availableActions
            }
        }
        .padding(.vertical, 4)
    }
    
    private var packageIcon: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(iconBackgroundColor)
                .frame(width: 44, height: 44)
            
            Image(systemName: iconSystemName)
                .font(.system(size: 20))
                .foregroundColor(.white)
        }
    }
    
    private var statusBadge: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 6, height: 6)
            Text(package.status.capitalized)
                .font(.caption2.bold())
                .foregroundColor(statusColor)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(statusColor.opacity(0.12))
        .clipShape(Capsule())
    }
    
    private var installedActions: some View {
        HStack(spacing: 8) {
            if package.hasUpdate {
                Button {
                    Task { await viewModel.updatePackage(package) }
                } label: {
                    if isUpdating {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title3)
                            .foregroundColor(.orange)
                    }
                }
                .buttonStyle(.plain)
                .disabled(isUpdating)
            }
            
            Button {
                Task { await viewModel.togglePackageStatus(package) }
            } label: {
                if isToggling {
                    ProgressView()
                        .controlSize(.small)
                } else {
                    Image(systemName: isRunning ? "pause.circle.fill" : "play.circle.fill")
                        .font(.title2)
                        .foregroundColor(isRunning ? .orange : .green)
                }
            }
            .buttonStyle(.plain)
            .disabled(isToggling)
        }
    }
    
    private var availableActions: some View {
        Button {
            Task { await viewModel.installPackage(package) }
        } label: {
            if isUpdating {
                ProgressView()
                    .controlSize(.small)
            } else {
                Text("Install")
                    .font(.caption.bold())
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.accentColor)
                    .foregroundColor(.white)
                    .clipShape(Capsule())
            }
        }
        .buttonStyle(.plain)
        .disabled(isUpdating)
    }
    
    private var statusColor: Color {
        switch package.status.lowercased() {
        case "running": return .green
        case "stopped": return .orange
        case "broken", "error": return .red
        default: return .blue
        }
    }
    
    private var iconSystemName: String {
        switch package.id.lowercased() {
        case let s where s.contains("docker") || s.contains("container"): return "shippingbox.fill"
        case let s where s.contains("download"): return "arrow.down.circle.fill"
        case let s where s.contains("file"): return "folder.fill"
        case let s where s.contains("audio") || s.contains("music"): return "music.note"
        case let s where s.contains("surveillance") || s.contains("camera"): return "video.fill"
        case let s where s.contains("backup"): return "arrow.clockwise.icloud.fill"
        case let s where s.contains("search") || s.contains("finder"): return "magnifyingglass"
        case let s where s.contains("virtual") || s.contains("vmm"): return "cpu"
        case let s where s.contains("web"): return "globe"
        default: return "app.fill"
        }
    }
    
    private var iconBackgroundColor: Color {
        switch package.id.lowercased() {
        case let s where s.contains("container"): return .blue
        case let s where s.contains("download"): return .green
        case let s where s.contains("file"): return .indigo
        case let s where s.contains("audio"): return .pink
        case let s where s.contains("surveillance"): return .orange
        case let s where s.contains("backup"): return .teal
        default: return .purple
        }
    }
}

// MARK: - Package Detail Sheet

@MainActor
struct PackageDetailSheet: View {
    let package: PackageItem
    let viewModel: PackagesViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .center, spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(Color.accentColor.opacity(0.15))
                                .frame(width: 72, height: 72)
                            Image(systemName: "shippingbox.fill")
                                .font(.system(size: 36))
                                .foregroundColor(.accentColor)
                        }
                        
                        Text(package.name)
                            .font(.title2.bold())
                        
                        HStack(spacing: 8) {
                            Text(package.status.uppercased())
                                .font(.caption.bold())
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(package.status.lowercased() == "running" ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
                                .foregroundColor(package.status.lowercased() == "running" ? .green : .orange)
                                .clipShape(Capsule())
                            
                            if let cat = package.category {
                                Text(cat)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Color(.secondarySystemFill))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
                    .padding(.vertical, 8)
                }
                
                Section(header: Text("Description")) {
                    Text(package.description.isEmpty ? "No description provided." : package.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Section(header: Text("Details")) {
                    LabeledContent("Installed Version", value: package.version)
                        .fontDesign(.monospaced)
                    
                    if let latest = package.latestVersion {
                        LabeledContent("Latest Available", value: latest)
                            .fontDesign(.monospaced)
                            .foregroundColor(.orange)
                    }
                    
                    LabeledContent("Maintainer", value: package.maintainer)
                    LabeledContent("Identifier", value: package.id)
                        .fontDesign(.monospaced)
                }
                
                Section {
                    if package.installed {
                        Button {
                            Task {
                                await viewModel.togglePackageStatus(package)
                                dismiss()
                            }
                        } label: {
                            HStack {
                                Spacer()
                                Label(
                                    package.status.lowercased() == "running" ? "Stop Package" : "Start Package",
                                    systemImage: package.status.lowercased() == "running" ? "stop.fill" : "play.fill"
                                )
                                Spacer()
                            }
                            .foregroundColor(package.status.lowercased() == "running" ? .orange : .green)
                        }
                        
                        if package.hasUpdate {
                            Button {
                                Task {
                                    await viewModel.updatePackage(package)
                                    dismiss()
                                }
                            } label: {
                                HStack {
                                    Spacer()
                                    Label("Upgrade to Latest Version", systemImage: "arrow.up.circle.fill")
                                    Spacer()
                                }
                                .foregroundColor(.white)
                            }
                            .listRowBackground(Color.orange)
                        }
                    } else {
                        Button {
                            Task {
                                await viewModel.installPackage(package)
                                dismiss()
                            }
                        } label: {
                            HStack {
                                Spacer()
                                Label("Install Package", systemImage: "arrow.down.circle.fill")
                                Spacer()
                            }
                            .foregroundColor(.white)
                        }
                        .listRowBackground(Color.accentColor)
                    }
                }
            }
            .navigationTitle("Package Information")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
