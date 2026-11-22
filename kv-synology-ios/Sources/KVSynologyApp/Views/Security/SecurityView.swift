import SwiftUI
import KVSynologyCore

@MainActor
public struct SecurityView: View {
    @State private var viewModel: SecurityViewModel
    
    public init() {
        _viewModel = State(initialValue: SecurityViewModel())
    }
    
    public init(viewModel: SecurityViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    public var body: some View {
        VStack(spacing: 0) {
                // Segmented Tab Picker
                Picker("Security Module", selection: $viewModel.selectedTab) {
                    ForEach(SecurityTab.allCases) { tab in
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
                
                // Content Switcher
                if viewModel.isLoading {
                    ProgressView("Analyzing Security...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    switch viewModel.selectedTab {
                    case .advisor:
                        advisorView
                    case .firewall:
                        firewallView
                    case .autoBlock:
                        autoBlockView
                    }
                }
            }
            .navigationTitle("Security Center")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if viewModel.selectedTab == .firewall {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            viewModel.showingAddRuleSheet = true
                        } label: {
                            Image(systemName: "plus.circle.fill")
                        }
                    }
                } else if viewModel.selectedTab == .autoBlock {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            viewModel.showingAddWhitelistSheet = true
                        } label: {
                            Label("Whitelist", systemImage: "plus.shield")
                        }
                    }
                }
            }
            .sheet(isPresented: $viewModel.showingAddRuleSheet) {
                AddFirewallRuleSheet(viewModel: viewModel)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
            .sheet(isPresented: $viewModel.showingAddWhitelistSheet) {
                AddWhitelistSheet(viewModel: viewModel)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
            .task {
                if viewModel.firewallConfig.rules.isEmpty {
                    await viewModel.loadSecurityData()
                }
            }
            .refreshable {
                await viewModel.loadSecurityData()
            }
    }
    
    // MARK: - Advisor View
    
    private var advisorView: some View {
        List {
            // Security Score Hero Card
            Section {
                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .stroke(Color(.tertiarySystemFill), lineWidth: 12)
                            .frame(width: 120, height: 120)
                        
                        Circle()
                            .trim(from: 0, to: CGFloat(viewModel.securityScore) / 100.0)
                            .stroke(
                                viewModel.securityScore >= 90 ? Color.green : (viewModel.securityScore >= 70 ? Color.orange : Color.red),
                                style: StrokeStyle(lineWidth: 12, lineCap: .round)
                            )
                            .rotationEffect(.degrees(-90))
                            .frame(width: 120, height: 120)
                        
                        VStack(spacing: 2) {
                            Text("\(viewModel.securityScore)%")
                                .font(.system(size: 32, weight: .bold, design: .rounded))
                            Text("HEALTHY")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.green)
                        }
                    }
                    .padding(.top, 8)
                    
                    VStack(spacing: 4) {
                        Text("Security Advisor Overview")
                            .font(.headline)
                        Text("Baseline check completed. 1 critical issue and 1 warning require your attention.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .listRowBackground(Color.clear)
            }
            
            // Audit Items
            Section(header: Text("Audit Recommendations (\(viewModel.auditItems.count))")) {
                ForEach(viewModel.auditItems) { item in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 8) {
                            Circle()
                                .fill(severityColor(item.severity))
                                .frame(width: 8, height: 8)
                            
                            Text(item.title)
                                .font(.subheadline.bold())
                            
                            Spacer()
                            
                            Text(item.severity.uppercased())
                                .font(.system(size: 9, weight: .bold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(severityColor(item.severity).opacity(0.15))
                                .foregroundColor(severityColor(item.severity))
                                .clipShape(Capsule())
                        }
                        
                        Text(item.description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        HStack(alignment: .top, spacing: 4) {
                            Image(systemName: "lightbulb.fill")
                                .font(.caption2)
                                .foregroundColor(.orange)
                            Text(item.recommendation)
                                .font(.caption2)
                                .foregroundColor(.primary)
                        }
                        .padding(6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.secondarySystemFill))
                        .cornerRadius(6)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .listStyle(.insetGrouped)
    }
    
    // MARK: - Firewall View
    
    private var firewallView: some View {
        List {
            // Master Firewall Toggle
            Section {
                Toggle("Enable DSM Firewall", isOn: Binding(
                    get: { viewModel.firewallConfig.enabled },
                    set: { val in Task { await viewModel.toggleFirewall(enabled: val) } }
                ))
                .font(.headline)
                
                HStack {
                    Text("If no rules match")
                        .font(.subheadline)
                    Spacer()
                    Text(viewModel.firewallConfig.allowUnmatched ? "Allow Traffic" : "Deny Traffic")
                        .font(.caption.bold())
                        .foregroundColor(viewModel.firewallConfig.allowUnmatched ? .green : .red)
                }
            }
            
            Section(header: Text("Active Firewall Rules (\(viewModel.firewallConfig.rules.count))")) {
                ForEach(viewModel.firewallConfig.rules) { rule in
                    FirewallRuleRow(rule: rule, viewModel: viewModel)
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                Task { await viewModel.deleteFirewallRule(rule.id) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
    
    // MARK: - Auto-Block View
    
    private var autoBlockView: some View {
        List {
            Section(header: Text("Protection Threshold")) {
                HStack {
                    Label("Trigger Rate", systemImage: "timer")
                    Spacer()
                    Text("\(viewModel.autoBlockConfig.attempts) attempts in \(viewModel.autoBlockConfig.withinMinutes) mins")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Label("Auto-Unblock Window", systemImage: "calendar.badge.clock")
                    Spacer()
                    Text("After \(viewModel.autoBlockConfig.unblockDays) days")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            
            Section(header: Text("Blocked IP Addresses (\(viewModel.blockedIps.count))")) {
                if viewModel.blockedIps.isEmpty {
                    Text("No suspicious IP addresses currently blocked.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                } else {
                    ForEach(viewModel.blockedIps, id: \.ip) { item in
                        BlockedIpRow(item: item, viewModel: viewModel)
                    }
                }
            }
            
            Section(header: Text("Whitelisted Subnets & IPs (\(viewModel.allowedIps.count))")) {
                ForEach(viewModel.allowedIps, id: \.self) { ip in
                    HStack {
                        Image(systemName: "checkmark.shield.fill")
                            .foregroundColor(.green)
                        Text(ip)
                            .font(.system(.body, design: .monospaced))
                        Spacer()
                        Text("Never Blocked")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
    
    private func severityColor(_ sev: String) -> Color {
        switch sev.lowercased() {
        case "critical": return .red
        case "warning": return .orange
        default: return .blue
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

// MARK: - Firewall Rule Row

@MainActor
struct FirewallRuleRow: View {
    let rule: FirewallRule
    let viewModel: SecurityViewModel
    
    var isToggling: Bool {
        viewModel.togglingRuleIds.contains(rule.id)
    }
    
    var isAllow: Bool {
        rule.action.lowercased() == "allow"
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Allow / Deny badge
            Text(rule.action.uppercased())
                .font(.system(size: 10, weight: .bold))
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .background(isAllow ? Color.green.opacity(0.15) : Color.red.opacity(0.15))
                .foregroundColor(isAllow ? .green : .red)
                .clipShape(Capsule())
            
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(rule.name)
                        .font(.headline)
                    Text("#\(rule.order)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                HStack(spacing: 8) {
                    Text("Ports: \(rule.ports)")
                        .font(.caption2)
                        .fontDesign(.monospaced)
                    
                    Text("•")
                        .foregroundColor(.secondary)
                    
                    Text("Src: \(rule.sourceValue)")
                        .font(.caption2)
                        .fontDesign(.monospaced)
                }
                .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if isToggling {
                ProgressView().controlSize(.small)
            } else {
                Toggle("", isOn: Binding(
                    get: { rule.enabled },
                    set: { val in
                        Task { await viewModel.toggleRule(ruleId: rule.id, enabled: val) }
                    }
                ))
                .labelsHidden()
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Blocked IP Row

@MainActor
struct BlockedIpRow: View {
    let item: BlockedIpItem
    let viewModel: SecurityViewModel
    
    var isUnblocking: Bool {
        viewModel.unblockingIps.contains(item.ip)
    }
    
    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.red.opacity(0.15))
                    .frame(width: 36, height: 36)
                Image(systemName: "hand.raised.fill")
                    .foregroundColor(.red)
                    .font(.caption)
            }
            
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(item.ip)
                        .font(.system(.body, design: .monospaced))
                        .fontWeight(.semibold)
                    
                    if let c = item.country {
                        Text(countryFlag(countryCode: c))
                            .font(.subheadline)
                    }
                }
                
                Text("Blocked on: \(item.denyTime)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if isUnblocking {
                ProgressView().controlSize(.small)
            } else {
                Button("Unblock") {
                    Task { await viewModel.unblockIp(item.ip) }
                }
                .font(.caption.bold())
                .buttonStyle(.bordered)
                .tint(.red)
            }
        }
        .padding(.vertical, 2)
    }
    
    private func countryFlag(countryCode: String) -> String {
        let base : UInt32 = 127397
        var s = ""
        for v in countryCode.uppercased().unicodeScalars {
            s.unicodeScalars.append(UnicodeScalar(base + v.value)!)
        }
        return s
    }
}

// MARK: - Add Firewall Rule Sheet

@MainActor
struct AddFirewallRuleSheet: View {
    @Environment(\.dismiss) private var dismiss
    let viewModel: SecurityViewModel
    
    @State private var name: String = ""
    @State private var ports: String = "443"
    @State private var proto: String = "TCP"
    @State private var sourceValue: String = "192.168.1.0/24"
    @State private var action: String = "allow"
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Rule Info")) {
                    TextField("Rule Name", text: $name)
                    Picker("Action", selection: $action) {
                        Text("Allow").tag("allow")
                        Text("Deny").tag("deny")
                    }
                    .pickerStyle(.segmented)
                }
                
                Section(header: Text("Network Target")) {
                    TextField("Ports (e.g. 5001 or all)", text: $ports)
                    Picker("Protocol", selection: $proto) {
                        Text("TCP").tag("TCP")
                        Text("UDP").tag("UDP")
                        Text("ALL").tag("ALL")
                    }
                    .pickerStyle(.segmented)
                    
                    TextField("Source IP / CIDR (e.g. 192.168.1.0/24)", text: $sourceValue)
                }
            }
            .navigationTitle("New Firewall Rule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let rule = FirewallRule(
                            id: "rule_\(UUID().uuidString.prefix(6))",
                            name: name.isEmpty ? "Rule \(ports)" : name,
                            ports: ports,
                            protocol: proto,
                            sourceType: sourceValue == "all" ? "all" : "subnet",
                            sourceValue: sourceValue,
                            action: action,
                            enabled: true,
                            order: viewModel.firewallConfig.rules.count + 1
                        )
                        Task {
                            await viewModel.addFirewallRule(rule)
                            dismiss()
                        }
                    }
                    .disabled(ports.isEmpty || sourceValue.isEmpty)
                }
            }
        }
    }
}

// MARK: - Add Whitelist Sheet

@MainActor
struct AddWhitelistSheet: View {
    @Environment(\.dismiss) private var dismiss
    let viewModel: SecurityViewModel
    @State private var ipOrCidr: String = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Trusted Address or Subnet"), footer: Text("Whitelisted IPs are exempt from Auto-Block failed login detection.")) {
                    TextField("e.g. 192.168.1.50 or 10.0.0.0/16", text: $ipOrCidr)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                }
            }
            .navigationTitle("Add to Whitelist")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        Task {
                            await viewModel.addWhitelistIp(ipOrCidr)
                            dismiss()
                        }
                    }
                    .disabled(ipOrCidr.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
