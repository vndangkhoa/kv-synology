import SwiftUI
import KVSynologyCore

@MainActor
public struct PermissionsView: View {
    @State private var viewModel: PermissionsViewModel
    
    public init() {
        _viewModel = State(initialValue: PermissionsViewModel())
    }
    
    public init(viewModel: PermissionsViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    public var body: some View {
        VStack(spacing: 0) {
                // Tab Picker
                Picker("Permissions Tab", selection: $viewModel.selectedTab) {
                    ForEach(PermissionsTab.allCases) { tab in
                        Label(tab.rawValue, systemImage: tab.iconName)
                            .tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 8)
                
                // Status banners
                if let error = viewModel.errorMessage {
                    statusBanner(message: error, isError: true)
                }
                if let success = viewModel.successMessage {
                    statusBanner(message: success, isError: false)
                }
                
                if viewModel.isLoading {
                    ProgressView("Reading Access Control Lists...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    switch viewModel.selectedTab {
                    case .folders:
                        folderAclView
                    case .matrix:
                        matrixGridView
                    case .users:
                        usersAndGroupsView
                    }
                }
            }
            .navigationTitle("Access & Permissions")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                if viewModel.folderAcls.isEmpty {
                    await viewModel.loadPermissions()
                }
            }
            .refreshable {
                await viewModel.loadPermissions()
            }
    }
    
    // MARK: - Folder ACL View
    
    private var folderAclView: some View {
        List {
            // Folder Selector / Tree
            Section(header: Text("Shared Folder Directory")) {
                ForEach(viewModel.folderTree) { node in
                    FolderTreeRow(node: node, selectedFolder: viewModel.selectedFolder) { path in
                        Task { await viewModel.selectFolder(path) }
                    }
                }
            }
            
            // ACL Details for selected folder
            if let acl = viewModel.currentFolderAcl {
                Section(header: Text("Folder ACL Details: \(acl.path)")) {
                    LabeledContent("Owner", value: acl.owner)
                    LabeledContent("Primary Group", value: acl.group)
                    LabeledContent("POSIX Mode", value: acl.posixPerm)
                        .fontDesign(.monospaced)
                    LabeledContent("ACL Enhanced Mode", value: acl.isAclMode ? "Active" : "Legacy POSIX")
                }
                
                Section(header: Text("Access Control Entries (\(acl.accessList.count))")) {
                    ForEach(acl.accessList, id: \.targetName) { access in
                        FolderAccessRow(access: access, folderPath: acl.path, viewModel: viewModel)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
    
    // MARK: - Matrix Grid View
    
    private var matrixGridView: some View {
        ScrollView([.horizontal, .vertical]) {
            VStack(alignment: .leading, spacing: 0) {
                // Table Header
                HStack(spacing: 0) {
                    Text("User / Group")
                        .font(.caption.bold())
                        .foregroundColor(.secondary)
                        .frame(width: 120, alignment: .leading)
                        .padding(10)
                        .background(Color(.systemGray6))
                    
                    ForEach(viewModel.matrixData.folders, id: \.self) { folder in
                        let name = (folder as NSString).lastPathComponent
                        Text(name)
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                            .frame(width: 110, alignment: .center)
                            .padding(10)
                            .background(Color(.systemGray6))
                    }
                }
                Divider()
                
                // Table Rows
                ForEach(viewModel.matrixData.users, id: \.name) { user in
                    HStack(spacing: 0) {
                        HStack(spacing: 6) {
                            Image(systemName: user.isAdmin ? "person.crop.circle.badge.checkmark" : "person.crop.circle")
                                .foregroundColor(user.isAdmin ? .blue : .secondary)
                                .font(.caption)
                            Text(user.name)
                                .font(.caption.bold())
                                .lineLimit(1)
                        }
                        .frame(width: 120, alignment: .leading)
                        .padding(10)
                        .background(Color(.systemBackground))
                        
                        ForEach(viewModel.matrixData.folders, id: \.self) { folder in
                            let cell = viewModel.matrixData.matrix[user.name]?[folder]
                            let level = cell?.level ?? "deny"
                            
                            VStack(spacing: 2) {
                                Text(levelAbbreviation(level))
                                    .font(.system(size: 10, weight: .bold))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 3)
                                    .background(accessLevelColor(level).opacity(0.18))
                                    .foregroundColor(accessLevelColor(level))
                                    .clipShape(Capsule())
                                
                                Text(cell?.inheritance ?? "direct")
                                    .font(.system(size: 8))
                                    .foregroundColor(.secondary)
                            }
                            .frame(width: 110, alignment: .center)
                            .padding(.vertical, 8)
                            .background(Color(.systemBackground))
                        }
                    }
                    Divider()
                }
            }
            .padding()
        }
    }
    
    // MARK: - Users & Groups View
    
    private var usersAndGroupsView: some View {
        List {
            Section(header: Text("Local Users (\(viewModel.users.count))")) {
                ForEach(viewModel.users, id: \.name) { user in
                    HStack(spacing: 12) {
                        Image(systemName: user.isAdmin ? "person.badge.shield.checkmark.fill" : "person.fill")
                            .font(.title3)
                            .foregroundColor(user.isAdmin ? .orange : .accentColor)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(user.name)
                                    .font(.headline)
                                if user.isAdmin {
                                    Text("ADMIN")
                                        .font(.system(size: 9, weight: .bold))
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 2)
                                        .background(Color.orange.opacity(0.15))
                                        .foregroundColor(.orange)
                                        .clipShape(Capsule())
                                }
                            }
                            
                            if let desc = user.userDescription ?? user.description {
                                Text(desc)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        Text(user.status.capitalized)
                            .font(.caption2.bold())
                            .foregroundColor(user.status == "active" ? .green : .secondary)
                    }
                }
            }
            
            Section(header: Text("User Groups (\(viewModel.groups.count))")) {
                ForEach(viewModel.groups, id: \.name) { group in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Label(group.name, systemImage: "person.2.fill")
                                .font(.headline)
                            Spacer()
                            Text("GID: \(group.gid)")
                                .font(.caption.monospaced())
                                .foregroundColor(.secondary)
                        }
                        
                        if let desc = group.groupDescription ?? group.description {
                            Text(desc)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        if !group.members.isEmpty {
                            Text("Members: \(group.members.joined(separator: ", "))")
                                .font(.caption2)
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .listStyle(.insetGrouped)
    }
    
    private func levelAbbreviation(_ level: String) -> String {
        switch level.lowercased() {
        case "full_control": return "Full"
        case "read_write": return "R/W"
        case "read_only": return "Read"
        default: return "Deny"
        }
    }
    
    private func accessLevelColor(_ level: String) -> Color {
        switch level.lowercased() {
        case "full_control": return .green
        case "read_write": return .blue
        case "read_only": return .teal
        default: return .red
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

// MARK: - Folder Tree Row

@MainActor
struct FolderTreeRow: View {
    let node: FolderTreeNode
    let selectedFolder: String
    let onSelect: (String) -> Void
    
    var isSelected: Bool {
        selectedFolder == node.path
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                onSelect(node.path)
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: isSelected ? "folder.fill" : "folder")
                        .foregroundColor(isSelected ? .accentColor : .secondary)
                    
                    Text(node.name)
                        .font(.body)
                        .fontWeight(isSelected ? .semibold : .regular)
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    Text(node.path)
                        .font(.caption2.monospaced())
                        .foregroundColor(.secondary)
                    
                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.caption.bold())
                            .foregroundColor(.accentColor)
                    }
                }
                .padding(.vertical, 4)
            }
            
            if let children = node.children {
                ForEach(children) { child in
                    Button {
                        onSelect(child.path)
                    } label: {
                        HStack(spacing: 8) {
                            Text("↳")
                                .foregroundColor(.secondary)
                                .padding(.leading, 16)
                            
                            Image(systemName: selectedFolder == child.path ? "folder.fill" : "folder")
                                .foregroundColor(selectedFolder == child.path ? .accentColor : .secondary)
                            
                            Text(child.name)
                                .font(.subheadline)
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            if selectedFolder == child.path {
                                Image(systemName: "checkmark")
                                    .font(.caption.bold())
                                    .foregroundColor(.accentColor)
                            }
                        }
                        .padding(.vertical, 3)
                    }
                }
            }
        }
    }
}

// MARK: - Folder Access Row

@MainActor
struct FolderAccessRow: View {
    let access: FolderUserAccess
    let folderPath: String
    let viewModel: PermissionsViewModel
    
    @State private var showingEditMenu = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: access.isGroup ? "person.2.fill" : "person.fill")
                    .foregroundColor(access.isGroup ? .indigo : .blue)
                
                Text(access.targetName)
                    .font(.headline)
                
                Spacer()
                
                // Access Level Chip
                Menu {
                    Button("Full Control") {
                        Task { await viewModel.updateUserAccess(folderPath: folderPath, targetName: access.targetName, level: "full_control") }
                    }
                    Button("Read & Write") {
                        Task { await viewModel.updateUserAccess(folderPath: folderPath, targetName: access.targetName, level: "read_write") }
                    }
                    Button("Read Only") {
                        Task { await viewModel.updateUserAccess(folderPath: folderPath, targetName: access.targetName, level: "read_only") }
                    }
                    Button(role: .destructive) {
                        Task { await viewModel.updateUserAccess(folderPath: folderPath, targetName: access.targetName, level: "deny") }
                    } label: {
                        Text("Deny Access")
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(formatLevel(access.level))
                            .font(.caption.bold())
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 8))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(levelColor(access.level).opacity(0.15))
                    .foregroundColor(levelColor(access.level))
                    .clipShape(Capsule())
                }
            }
            
            // Effective Rights Pills
            HStack(spacing: 6) {
                rightChip("Read", active: access.rights.read)
                rightChip("Write", active: access.rights.write)
                rightChip("Exec", active: access.rights.execute)
                rightChip("Delete", active: access.rights.delete)
                
                Spacer()
                
                Text(access.inheritance)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
    
    private func rightChip(_ label: String, active: Bool) -> some View {
        Text(label)
            .font(.system(size: 9, weight: .semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(active ? Color.green.opacity(0.15) : Color.gray.opacity(0.12))
            .foregroundColor(active ? .green : .secondary)
            .clipShape(Capsule())
    }
    
    private func formatLevel(_ level: String) -> String {
        switch level.lowercased() {
        case "full_control": return "Full Control"
        case "read_write": return "Read / Write"
        case "read_only": return "Read Only"
        default: return "Deny"
        }
    }
    
    private func levelColor(_ level: String) -> Color {
        switch level.lowercased() {
        case "full_control": return .green
        case "read_write": return .blue
        case "read_only": return .teal
        default: return .red
        }
    }
}
