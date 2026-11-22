import SwiftUI
import KVSynologyCore

@MainActor
public struct SettingsView: View {
    @State private var viewModel: SettingsViewModel
    
    public init() {
        _viewModel = State(initialValue: SettingsViewModel())
    }
    
    public init(viewModel: SettingsViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    public var body: some View {
        Form {
                // Multi-NAS Profiles Section
                profilesSection
                
                // Appearance & Theming
                appearanceSection
                
                // Localization & Language
                languageSection
                
                // Experience & Telemetry Controls
                experienceSection
                
                // Security & Biometrics
                securitySection
                
                // Model Context Protocol (MCP) Server Status
                mcpServerSection
                
                // About KV-Synology
                aboutSection
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $viewModel.showingAddProfileSheet) {
                ProfileEditSheet(profile: viewModel.editingProfile, viewModel: viewModel)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
            .alert("Notice", isPresented: Binding(
                get: { viewModel.errorMessage != nil || viewModel.successMessage != nil },
                set: { _ in
                    viewModel.errorMessage = nil
                    viewModel.successMessage = nil
                }
            )) {
                Button("OK") {}
            } message: {
                Text(viewModel.errorMessage ?? viewModel.successMessage ?? "")
            }
    }
    
    // MARK: - Profiles Section
    
    private var profilesSection: some View {
        Section(header: Text("Synology NAS Profiles")) {
            ForEach(viewModel.profiles) { profile in
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text(profile.name)
                                .font(.headline)
                            if profile.id == viewModel.activeProfileId {
                                Text("ACTIVE")
                                    .font(.system(size: 9, weight: .bold))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.green.opacity(0.15))
                                    .foregroundColor(.green)
                                    .clipShape(Capsule())
                            }
                        }
                        
                        Text("\(profile.account) • \(profile.host):\(profile.port)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    if profile.id == viewModel.activeProfileId {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.accentColor)
                    }
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    viewModel.switchProfile(id: profile.id)
                }
                .swipeActions(edge: .trailing) {
                    if viewModel.profiles.count > 1 {
                        Button(role: .destructive) {
                            viewModel.deleteProfile(id: profile.id)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                    
                    Button {
                        viewModel.editingProfile = profile
                        viewModel.showingAddProfileSheet = true
                    } label: {
                        Label("Edit", systemImage: "pencil")
                    }
                    .tint(.blue)
                }
            }
            
            Button {
                viewModel.editingProfile = nil
                viewModel.showingAddProfileSheet = true
            } label: {
                Label("Add Another NAS Profile", systemImage: "plus.circle")
            }
        }
    }
    
    // MARK: - Appearance Section
    
    private var appearanceSection: some View {
        Section(header: Text("Appearance")) {
            Picker("Theme", selection: $viewModel.appearanceMode) {
                ForEach(AppearanceMode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.navigationLink)
            
            if viewModel.appearanceMode == .oledBlack {
                HStack {
                    Image(systemName: "moon.stars.fill")
                        .foregroundColor(.indigo)
                    Text("OLED True Black Enabled")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
    
    // MARK: - Language Section
    
    private var languageSection: some View {
        Section(header: Text("Language / Ngôn ngữ")) {
            Picker("App Language", selection: $viewModel.appLanguage) {
                ForEach(AppLanguage.allCases) { lang in
                    Text("\(lang.flagEmoji) \(lang.displayName)").tag(lang)
                }
            }
            .pickerStyle(.navigationLink)
        }
    }
    
    // MARK: - Experience & Polling
    
    private var experienceSection: some View {
        Section(header: Text("Experience & Polling")) {
            Toggle("Advanced Mode", isOn: $viewModel.isAdvancedMode)
            
            if !viewModel.isAdvancedMode {
                Text("Beginner mode hides SSH terminal, reverse proxy and low-level diagnostic logs.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Picker("Telemetry Refresh Rate", selection: $viewModel.pollingIntervalSeconds) {
                Text("5 seconds (Fast)").tag(5)
                Text("10 seconds (Standard)").tag(10)
                Text("30 seconds").tag(30)
                Text("60 seconds (Battery Saver)").tag(60)
                Text("Manual Refresh Only").tag(0)
            }
        }
    }
    
    // MARK: - Security Section
    
    private var securitySection: some View {
        Section(header: Text("Security")) {
            Toggle("Require Face ID / Passcode", isOn: Binding(
                get: { viewModel.biometricLockEnabled },
                set: { val in viewModel.toggleBiometrics(enabled: val) }
            ))
        }
    }
    
    // MARK: - MCP Server Section
    
    private var mcpServerSection: some View {
        Section(header: Text("Model Context Protocol (MCP) Server")) {
            LabeledContent("Server Status", value: viewModel.mcpServerStatus)
            LabeledContent("Loaded Tool Modules", value: "\(viewModel.mcpToolsCount) Synology Tools")
            LabeledContent("Protocol Transport", value: "JSON-RPC 2.0 stdio")
        }
    }
    
    // MARK: - About Section
    
    private var aboutSection: some View {
        Section(header: Text("About")) {
            LabeledContent("App Version", value: viewModel.appVersion)
            LabeledContent("Built for", value: "iOS 17+ • Swift 6")
            
            Link(destination: URL(string: "https://github.com/vndangkhoa/kv-synology")!) {
                HStack {
                    Text("Source Repository")
                    Spacer()
                    Image(systemName: "arrow.up.right.square")
                        .foregroundColor(.secondary)
                }
            }
        }
    }
}

// MARK: - Profile Edit Sheet

@MainActor
struct ProfileEditSheet: View {
    @Environment(\.dismiss) private var dismiss
    let profile: NasProfile?
    let viewModel: SettingsViewModel
    
    @State private var name: String = ""
    @State private var host: String = ""
    @State private var port: String = "5001"
    @State private var https: Bool = true
    @State private var account: String = "admin"
    @State private var isQuickConnect: Bool = false
    @State private var isDemo: Bool = false
    
    init(profile: NasProfile?, viewModel: SettingsViewModel) {
        self.profile = profile
        self.viewModel = viewModel
        
        if let p = profile {
            _name = State(initialValue: p.name)
            _host = State(initialValue: p.host)
            _port = State(initialValue: String(p.port))
            _https = State(initialValue: p.https)
            _account = State(initialValue: p.account)
            _isQuickConnect = State(initialValue: p.isQuickConnect)
            _isDemo = State(initialValue: p.isDemo)
        }
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Profile Info")) {
                    TextField("Friendly Name (e.g. Home NAS)", text: $name)
                    Toggle("QuickConnect ID", isOn: $isQuickConnect)
                    Toggle("Offline Demo Mode", isOn: $isDemo)
                }
                
                Section(header: Text(isQuickConnect ? "QuickConnect" : "Host & Network")) {
                    TextField(isQuickConnect ? "QuickConnect ID" : "IP or Hostname (e.g. synology.local)", text: $host)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    if !isQuickConnect && !isDemo {
                        TextField("Port", text: $port)
                            .keyboardType(.numberPad)
                        Toggle("Use HTTPS", isOn: $https)
                    }
                }
                
                Section(header: Text("Credentials")) {
                    TextField("Account Username", text: $account)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                }
            }
            .navigationTitle(profile == nil ? "New NAS Profile" : "Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let newProfile = NasProfile(
                            id: profile?.id ?? UUID().uuidString,
                            name: name.isEmpty ? host : name,
                            host: host,
                            port: Int(port) ?? (https ? 5001 : 5000),
                            https: https,
                            account: account,
                            isQuickConnect: isQuickConnect,
                            isDemo: isDemo
                        )
                        viewModel.saveProfile(newProfile)
                    }
                    .disabled(host.trimmingCharacters(in: .whitespaces).isEmpty || account.isEmpty)
                }
            }
        }
    }
}
