import SwiftUI
import KVSynologyCore

@MainActor
public struct ServicesView: View {
    @State private var viewModel: ServicesViewModel
    @State private var searchQuery: String = ""
    
    public init() {
        _viewModel = State(initialValue: ServicesViewModel())
    }
    
    public init(viewModel: ServicesViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    public var body: some View {
        VStack(spacing: 0) {
                // Section Picker
                Picker("Service Type", selection: $viewModel.selectedSection) {
                    ForEach(ServicesSection.allCases) { sec in
                        Label(sec.rawValue, systemImage: sec.iconName)
                            .tag(sec)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 8)
                
                // Status notifications
                if let error = viewModel.errorMessage {
                    statusBanner(message: error, isError: true)
                }
                if let success = viewModel.successMessage {
                    statusBanner(message: success, isError: false)
                }
                
                // Main Content
                if viewModel.isLoading {
                    ProgressView("Loading Services...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    switch viewModel.selectedSection {
                    case .fileServices:
                        fileServicesList
                    case .reverseProxy:
                        reverseProxyList
                    }
                }
            }
            .navigationTitle("Services & Proxy")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchQuery, prompt: "Search services or proxy rules...")
            .toolbar {
                if viewModel.selectedSection == .reverseProxy {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            viewModel.editingRule = nil
                            viewModel.showingAddRuleSheet = true
                        } label: {
                            Image(systemName: "plus.circle.fill")
                        }
                    }
                }
            }
            .sheet(isPresented: $viewModel.showingAddRuleSheet) {
                ReverseProxyEditSheet(rule: viewModel.editingRule, viewModel: viewModel)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
            .task {
                if viewModel.fileServices.isEmpty {
                    await viewModel.loadServices()
                }
            }
            .refreshable {
                await viewModel.loadServices()
            }
    }
    
    // MARK: - File Services List
    
    private var filteredServices: [ServiceItem] {
        if searchQuery.isEmpty {
            return viewModel.fileServices
        }
        let q = searchQuery.lowercased()
        return viewModel.fileServices.filter {
            $0.displayName.lowercased().contains(q) ||
            $0.description.lowercased().contains(q) ||
            ($0.port != nil && String($0.port!).contains(q))
        }
    }
    
    private var fileServicesList: some View {
        List {
            Section(header: Text("Core Sharing & Management Services")) {
                ForEach(filteredServices) { service in
                    ServiceItemRow(service: service, viewModel: viewModel)
                }
            }
            
            Section(footer: Text("Toggling protocols modifies firewall and daemon states immediately on DSM. Sensitive ports like SSH (22) and Telnet (23) should remain protected by strong credentials or restricted to local networks.")) {
                EmptyView()
            }
        }
        .listStyle(.insetGrouped)
    }
    
    // MARK: - Reverse Proxy List
    
    private var filteredProxyRules: [ReverseProxyRule] {
        if searchQuery.isEmpty {
            return viewModel.reverseProxyRules
        }
        let q = searchQuery.lowercased()
        return viewModel.reverseProxyRules.filter {
            $0.description.lowercased().contains(q) ||
            $0.frontend.fqdn.lowercased().contains(q) ||
            $0.backend.fqdn.lowercased().contains(q)
        }
    }
    
    private var reverseProxyList: some View {
        List {
            // Nginx Health Banner
            Section {
                HStack(spacing: 12) {
                    Image(systemName: viewModel.healthInfo.nginxSyntaxOk ? "checkmark.shield.fill" : "exclamationmark.shield.fill")
                        .font(.title2)
                        .foregroundColor(viewModel.healthInfo.nginxSyntaxOk ? .green : .red)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(viewModel.healthInfo.nginxSyntaxOk ? "Nginx Reverse Proxy Active" : "Nginx Configuration Warning")
                            .font(.headline)
                        Text("\(viewModel.healthInfo.activeRulesCount) active routing rule(s) configured.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding(.vertical, 4)
            }
            
            Section(header: Text("Inbound Proxy Rules (\(filteredProxyRules.count))")) {
                if filteredProxyRules.isEmpty {
                    Text("No reverse proxy rules configured.")
                        .foregroundColor(.secondary)
                        .font(.subheadline)
                } else {
                    ForEach(filteredProxyRules, id: \.uuid) { rule in
                        ReverseProxyRuleRow(rule: rule, viewModel: viewModel)
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    Task { await viewModel.deleteReverseProxyRule(uuid: rule.uuid) }
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                                
                                Button {
                                    viewModel.editingRule = rule
                                    viewModel.showingAddRuleSheet = true
                                } label: {
                                    Label("Edit", systemImage: "pencil")
                                }
                                .tint(.blue)
                            }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
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

// MARK: - Service Item Row

@MainActor
struct ServiceItemRow: View {
    let service: ServiceItem
    let viewModel: ServicesViewModel
    
    var isToggling: Bool {
        viewModel.togglingServiceIds.contains(service.id)
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(service.enabled ? Color.accentColor : Color.gray.opacity(0.3))
                    .frame(width: 40, height: 40)
                
                Image(systemName: serviceIcon)
                    .foregroundColor(.white)
                    .font(.system(size: 18))
            }
            
            // Name & Port
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(service.displayName)
                        .font(.headline)
                    
                    if let port = service.port {
                        Text(":\(port)")
                            .font(.caption.bold())
                            .fontDesign(.monospaced)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(.secondarySystemFill))
                            .clipShape(Capsule())
                    }
                }
                
                Text(service.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            Spacer()
            
            // 1-Click Toggle
            if isToggling {
                ProgressView()
                    .controlSize(.small)
            } else {
                Toggle("", isOn: Binding(
                    get: { service.enabled },
                    set: { _ in
                        Task { await viewModel.toggleService(service) }
                    }
                ))
                .labelsHidden()
                .disabled(!service.canToggle)
            }
        }
        .padding(.vertical, 4)
    }
    
    private var serviceIcon: String {
        switch service.id.lowercased() {
        case "smb": return "folder.badge.gearshape"
        case "afp": return "apple.logo"
        case "nfs": return "externaldrive.connected.to.line.below"
        case "ftp": return "arrow.left.arrow.right"
        case "sftp": return "lock.shield"
        case "ssh": return "terminal.fill"
        case "telnet": return "antenna.radiowaves.left.and.right"
        case "rsync": return "arrow.triangle.2.circlepath"
        case "webdav": return "cloud.fill"
        default: return "network"
        }
    }
}

// MARK: - Reverse Proxy Rule Row

@MainActor
struct ReverseProxyRuleRow: View {
    let rule: ReverseProxyRule
    let viewModel: ServicesViewModel
    
    var isDeleting: Bool {
        viewModel.deletingRuleUuids.contains(rule.uuid)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(rule.description)
                    .font(.headline)
                Spacer()
                if isDeleting {
                    ProgressView().controlSize(.small)
                } else {
                    HStack(spacing: 4) {
                        if rule.frontend.hsts {
                            badgeText("HSTS", color: .purple)
                        }
                        if rule.frontend.http2 {
                            badgeText("HTTP/2", color: .blue)
                        }
                    }
                }
            }
            
            // Mapping Flow
            HStack(spacing: 8) {
                // Source Frontend
                VStack(alignment: .leading, spacing: 2) {
                    Text("PUBLIC")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.secondary)
                    Text("\(rule.frontend.protocol == 1 ? "https" : "http")://\(rule.frontend.fqdn):\(rule.frontend.port)")
                        .font(.caption.bold())
                        .fontDesign(.monospaced)
                        .foregroundColor(.primary)
                }
                
                Image(systemName: "arrow.right")
                    .font(.caption.bold())
                    .foregroundColor(.accentColor)
                
                // Destination Backend
                VStack(alignment: .leading, spacing: 2) {
                    Text("INTERNAL")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.secondary)
                    Text("\(rule.backend.protocol == 1 ? "https" : "http")://\(rule.backend.fqdn):\(rule.backend.port)")
                        .font(.caption.bold())
                        .fontDesign(.monospaced)
                        .foregroundColor(.secondary)
                }
            }
            .padding(8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemFill))
            .cornerRadius(8)
        }
        .padding(.vertical, 4)
    }
    
    private func badgeText(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 9, weight: .bold))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundColor(color)
            .clipShape(Capsule())
    }
}

// MARK: - Reverse Proxy Edit Sheet

@MainActor
struct ReverseProxyEditSheet: View {
    @Environment(\.dismiss) private var dismiss
    let rule: ReverseProxyRule?
    let viewModel: ServicesViewModel
    
    @State private var description: String = ""
    @State private var frontendProtocol: Int = 1 // 1: HTTPS
    @State private var frontendFqdn: String = ""
    @State private var frontendPort: String = "443"
    @State private var enableHsts: Bool = true
    @State private var enableHttp2: Bool = true
    
    @State private var backendProtocol: Int = 0 // 0: HTTP
    @State private var backendFqdn: String = "localhost"
    @State private var backendPort: String = "8080"
    
    init(rule: ReverseProxyRule?, viewModel: ServicesViewModel) {
        self.rule = rule
        self.viewModel = viewModel
        
        if let r = rule {
            _description = State(initialValue: r.description)
            _frontendProtocol = State(initialValue: r.frontend.protocol)
            _frontendFqdn = State(initialValue: r.frontend.fqdn)
            _frontendPort = State(initialValue: String(r.frontend.port))
            _enableHsts = State(initialValue: r.frontend.hsts)
            _enableHttp2 = State(initialValue: r.frontend.http2)
            _backendProtocol = State(initialValue: r.backend.protocol)
            _backendFqdn = State(initialValue: r.backend.fqdn)
            _backendPort = State(initialValue: String(r.backend.port))
        }
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("General Information")) {
                    TextField("Description (e.g. Vaultwarden)", text: $description)
                }
                
                Section(header: Text("Source (Frontend)")) {
                    Picker("Protocol", selection: $frontendProtocol) {
                        Text("HTTPS").tag(1)
                        Text("HTTP").tag(0)
                    }
                    .pickerStyle(.segmented)
                    
                    TextField("Hostname (e.g. vault.myds.me)", text: $frontendFqdn)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    TextField("Port", text: $frontendPort)
                        .keyboardType(.numberPad)
                    
                    Toggle("Enable HSTS", isOn: $enableHsts)
                    Toggle("Enable HTTP/2", isOn: $enableHttp2)
                }
                
                Section(header: Text("Destination (Backend Service)")) {
                    Picker("Protocol", selection: $backendProtocol) {
                        Text("HTTP").tag(0)
                        Text("HTTPS").tag(1)
                    }
                    .pickerStyle(.segmented)
                    
                    TextField("Hostname", text: $backendFqdn)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    TextField("Port", text: $backendPort)
                        .keyboardType(.numberPad)
                }
            }
            .navigationTitle(rule == nil ? "Add Reverse Proxy" : "Edit Reverse Proxy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let newRule = ReverseProxyRule(
                            uuid: rule?.uuid ?? "rule_\(UUID().uuidString.prefix(8))",
                            description: description.isEmpty ? frontendFqdn : description,
                            frontend: ReverseProxyFrontend(
                                protocol: frontendProtocol,
                                fqdn: frontendFqdn,
                                port: Int(frontendPort) ?? 443,
                                hsts: enableHsts,
                                http2: enableHttp2
                            ),
                            backend: ReverseProxyBackend(
                                protocol: backendProtocol,
                                fqdn: backendFqdn,
                                port: Int(backendPort) ?? 80
                            ),
                            proxyConnectTimeout: 60
                        )
                        Task {
                            await viewModel.saveReverseProxyRule(newRule)
                            dismiss()
                        }
                    }
                    .disabled(frontendFqdn.trimmingCharacters(in: .whitespaces).isEmpty || backendPort.isEmpty)
                }
            }
        }
    }
}
