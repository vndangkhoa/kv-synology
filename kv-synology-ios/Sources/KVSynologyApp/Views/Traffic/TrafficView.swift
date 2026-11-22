import SwiftUI
import KVSynologyCore

@MainActor
public struct TrafficView: View {
    @State private var viewModel: TrafficViewModel
    
    public init() {
        _viewModel = State(initialValue: TrafficViewModel())
    }
    
    public init(viewModel: TrafficViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Direction filter bar
            directionFilterBar
                .padding(.top, 8)
                .padding(.bottom, 6)
            
            // Status / Error Banner
            if let error = viewModel.errorMessage {
                errorBanner(message: error)
            }
            
            // Content List
            if viewModel.isLoading && viewModel.trafficSummary.connections.isEmpty {
                ProgressView("Analyzing Network Traffic...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                mainTrafficContent
            }
        }
        .navigationTitle("Network Traffic")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $viewModel.filterQuery, prompt: "Filter IP, process, country, port...")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    if viewModel.isLiveMonitoring {
                        viewModel.stopLiveMonitoring()
                    } else {
                        viewModel.startLiveMonitoring()
                    }
                } label: {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(viewModel.isLiveMonitoring ? Color.green : Color.gray)
                            .frame(width: 8, height: 8)
                        Text(viewModel.isLiveMonitoring ? "LIVE" : "PAUSED")
                            .font(.caption2.bold())
                            .foregroundColor(viewModel.isLiveMonitoring ? .green : .secondary)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.secondarySystemFill))
                    .clipShape(Capsule())
                }
            }
        }
        .task {
            await viewModel.loadTrafficData()
            viewModel.startLiveMonitoring()
        }
        .onDisappear {
            viewModel.stopLiveMonitoring()
        }
        .refreshable {
            await viewModel.loadTrafficData()
        }
    }
    
    // MARK: - Subviews
    
    private var directionFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(["All", "Inbound", "Outbound", "Local"], id: \.self) { dir in
                    let isSelected = viewModel.selectedDirection == dir
                    Button {
                        viewModel.selectedDirection = dir
                    } label: {
                        Text(dir)
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
    
    private var mainTrafficContent: some View {
        List {
            // Speed Summary Banner
            Section {
                HStack(spacing: 16) {
                    // Inbound / Download Speed
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.down.circle.fill")
                                .foregroundColor(.green)
                            Text("DOWNLOAD")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.secondary)
                        }
                        Text(formatSpeed(viewModel.trafficSummary.currentInboundSpeed))
                            .font(.title3.bold())
                            .fontDesign(.monospaced)
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    Divider()
                        .frame(height: 36)
                    
                    // Outbound / Upload Speed
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.up.circle.fill")
                                .foregroundColor(.blue)
                            Text("UPLOAD")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.secondary)
                        }
                        Text(formatSpeed(viewModel.trafficSummary.currentOutboundSpeed))
                            .font(.title3.bold())
                            .fontDesign(.monospaced)
                            .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.vertical, 4)
            }
            
            // Network Interfaces
            Section(header: Text("Network Interfaces (\(viewModel.trafficSummary.interfaces.count))")) {
                ForEach(viewModel.trafficSummary.interfaces) { iface in
                    NetworkInterfaceRow(iface: iface)
                }
            }
            
            // Top Geographic Countries
            if !viewModel.trafficSummary.topCountries.isEmpty {
                Section(header: Text("Geographic Traffic Distribution")) {
                    ForEach(viewModel.trafficSummary.topCountries, id: \.countryCode) { country in
                        HStack {
                            Text(country.flagEmoji)
                                .font(.title3)
                            Text(country.countryName)
                                .font(.subheadline)
                            Spacer()
                            Text("\(country.activeConnections) conns")
                                .font(.caption.bold())
                                .foregroundColor(.secondary)
                            Text(formatBytes(country.inboundBytes + country.outboundBytes))
                                .font(.caption2.monospaced())
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            
            // Active Connections Table
            Section(header: Text("Active Sockets & Connections (\(viewModel.filteredConnections.count))")) {
                if viewModel.filteredConnections.isEmpty {
                    Text("No matching network connections found.")
                        .foregroundColor(.secondary)
                        .font(.subheadline)
                } else {
                    ForEach(viewModel.filteredConnections) { conn in
                        ConnectionItemRow(conn: conn)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
    
    private func errorBanner(message: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.red)
            Text(message)
                .font(.caption)
            Spacer()
        }
        .padding(8)
        .background(Color.red.opacity(0.12))
        .cornerRadius(8)
        .padding(.horizontal)
    }
    
    private func formatSpeed(_ bytesPerSec: Int64) -> String {
        let kb = Double(bytesPerSec) / 1024.0
        if kb < 1024.0 {
            return String(format: "%.1f KB/s", kb)
        }
        let mb = kb / 1024.0
        return String(format: "%.2f MB/s", mb)
    }
    
    private func formatBytes(_ bytes: Int64) -> String {
        let mb = Double(bytes) / (1024.0 * 1024.0)
        if mb < 1024.0 {
            return String(format: "%.1f MB", mb)
        }
        let gb = mb / 1024.0
        return String(format: "%.2f GB", gb)
    }
}

// MARK: - Network Interface Row

@MainActor
struct NetworkInterfaceRow: View {
    let iface: NetworkInterfaceInfo
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                HStack(spacing: 6) {
                    Circle()
                        .fill(iface.status.lowercased() == "up" ? Color.green : Color.red)
                        .frame(width: 8, height: 8)
                    Text(iface.name)
                        .font(.headline)
                }
                
                Spacer()
                
                Text(iface.speedMbps >= 1000 ? "\(iface.speedMbps / 1000) Gbps" : "\(iface.speedMbps) Mbps")
                    .font(.caption.bold())
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.15))
                    .foregroundColor(.blue)
                    .clipShape(Capsule())
            }
            
            HStack {
                Text("IP: \(iface.ip)")
                    .font(.caption.monospaced())
                Spacer()
                Text("MAC: \(iface.mac)")
                    .font(.caption2.monospaced())
                    .foregroundColor(.secondary)
            }
            
            HStack(spacing: 12) {
                Label("RX: \(formatBytes(iface.rxBytes))", systemImage: "arrow.down")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Label("TX: \(formatBytes(iface.txBytes))", systemImage: "arrow.up")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
    
    private func formatBytes(_ bytes: Int64) -> String {
        let gb = Double(bytes) / (1024.0 * 1024.0 * 1024.0)
        return String(format: "%.2f GB", gb)
    }
}

// MARK: - Connection Item Row

@MainActor
struct ConnectionItemRow: View {
    let conn: NetworkConnectionItem
    
    var isInbound: Bool {
        conn.direction.lowercased() == "inbound"
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                // Country / Origin flag
                Text(conn.geo.flagEmoji)
                    .font(.title3)
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(conn.remoteAddress)
                            .font(.system(.subheadline, design: .monospaced))
                            .fontWeight(.semibold)
                        
                        Text(":\(conn.remotePort)")
                            .font(.caption.monospaced())
                            .foregroundColor(.secondary)
                    }
                    
                    Text("\(conn.geo.countryName) • \(conn.geo.isp)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Process & Protocol Badge
                VStack(alignment: .trailing, spacing: 2) {
                    Text(conn.processName)
                        .font(.caption.bold())
                        .foregroundColor(.accentColor)
                    
                    HStack(spacing: 4) {
                        Text(conn.protocolType)
                            .font(.system(size: 8, weight: .bold))
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(Color(.secondarySystemFill))
                            .clipShape(Capsule())
                        
                        Text(conn.state)
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(conn.state == "ESTABLISHED" ? .green : .secondary)
                    }
                }
            }
            
            // Flow & Speeds
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: isInbound ? "arrow.down.left" : "arrow.up.right")
                        .foregroundColor(isInbound ? .green : .blue)
                        .font(.caption2)
                    Text(conn.direction.capitalized)
                        .font(.caption2.bold())
                        .foregroundColor(isInbound ? .green : .blue)
                    Text("to :\(conn.localPort)")
                        .font(.caption2.monospaced())
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if conn.rxSpeedBytes > 0 || conn.txSpeedBytes > 0 {
                    HStack(spacing: 8) {
                        if conn.rxSpeedBytes > 0 {
                            Text("↓ \(formatSpeed(conn.rxSpeedBytes))")
                                .font(.caption2.monospaced())
                                .foregroundColor(.green)
                        }
                        if conn.txSpeedBytes > 0 {
                            Text("↑ \(formatSpeed(conn.txSpeedBytes))")
                                .font(.caption2.monospaced())
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private func formatSpeed(_ bytes: Int64) -> String {
        let kb = Double(bytes) / 1024.0
        if kb < 1024.0 {
            return String(format: "%.0f KB/s", kb)
        }
        let mb = kb / 1024.0
        return String(format: "%.1f MB/s", mb)
    }
}
