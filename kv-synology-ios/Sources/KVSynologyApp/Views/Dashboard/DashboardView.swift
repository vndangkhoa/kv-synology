import SwiftUI
import Charts
import KVSynologyCore

@MainActor
public struct DashboardView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = DashboardViewModel()
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // System Overview Banner
                    systemOverviewCard
                    
                    // Live Telemetry Charts (CPU & RAM)
                    telemetryGrid
                    
                    // Network & Disk I/O Charts
                    throughputGrid
                    
                    // Hardware Specs Card
                    hardwareSpecsCard
                    
                    // Running Processes Section
                    processesCard
                }
                .padding(AppSpacing.lg)
            }
            .background(Color.oledBackground.ignoresSafeArea())
            .navigationTitle(AppStrings.tr("nav.dashboard", lang: appState.language))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Menu {
                        Button(role: .destructive) {
                            viewModel.showRebootAlert = true
                        } label: {
                            Label(AppStrings.tr("dash.reboot", lang: appState.language), systemImage: "arrow.clockwise")
                        }
                        
                        Button(role: .destructive) {
                            viewModel.showShutdownAlert = true
                        } label: {
                            Label(AppStrings.tr("dash.shutdown", lang: appState.language), systemImage: "power")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .foregroundStyle(Color.textPrimary)
                    }
                }
            }
            .confirmationDialog(
                AppStrings.tr("dash.reboot", lang: appState.language),
                isPresented: $viewModel.showRebootAlert,
                titleVisibility: .visible
            ) {
                Button(AppStrings.tr("dash.reboot", lang: appState.language), role: .destructive) {
                    Task { await viewModel.rebootNAS() }
                }
                Button(AppStrings.tr("common.cancel", lang: appState.language), role: .cancel) {}
            } message: {
                Text(AppStrings.tr("dash.reboot_msg", lang: appState.language))
            }
            .confirmationDialog(
                AppStrings.tr("dash.shutdown", lang: appState.language),
                isPresented: $viewModel.showShutdownAlert,
                titleVisibility: .visible
            ) {
                Button(AppStrings.tr("dash.shutdown", lang: appState.language), role: .destructive) {
                    Task { await viewModel.shutdownNAS() }
                }
                Button(AppStrings.tr("common.cancel", lang: appState.language), role: .cancel) {}
            } message: {
                Text(AppStrings.tr("dash.shutdown_msg", lang: appState.language))
            }
            .alert(
                AppStrings.tr("dash.kill_process", lang: appState.language),
                isPresented: $viewModel.showKillProcessAlert,
                presenting: viewModel.processToKill
            ) { proc in
                Button(AppStrings.tr("common.delete", lang: appState.language), role: .destructive) {
                    Task { await viewModel.killProcess(proc) }
                }
                Button(AppStrings.tr("common.cancel", lang: appState.language), role: .cancel) {}
            } message: { proc in
                Text("\(AppStrings.tr("dash.kill_msg", lang: appState.language)) \(proc.name) (PID: \(proc.pid))?")
            }
            .onAppear {
                viewModel.startPolling()
            }
            .onDisappear {
                viewModel.stopPolling()
            }
        }
    }
    
    // MARK: - System Overview Banner
    private var systemOverviewCard: some View {
        HStack(spacing: AppSpacing.md) {
            ZStack {
                Circle()
                    .fill(Color.statusSuccess.opacity(0.15))
                    .frame(width: 48, height: 48)
                Image(systemName: "checkmark.shield.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(Color.statusSuccess)
            }
            
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(viewModel.systemInfo.model)
                        .font(.headline)
                        .foregroundStyle(Color.textPrimary)
                    
                    Spacer()
                    
                    // Thermal badge
                    HStack(spacing: 4) {
                        Image(systemName: "thermometer.medium")
                        Text(viewModel.thermalStatusText)
                    }
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(viewModel.thermalStatusColor.opacity(0.15))
                    .foregroundStyle(viewModel.thermalStatusColor)
                    .clipShape(Capsule())
                }
                
                HStack(spacing: AppSpacing.sm) {
                    Text(viewModel.systemInfo.version)
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                    Text("•")
                        .font(.caption)
                        .foregroundStyle(Color.textTertiary)
                    Text("Uptime: \(viewModel.formattedUptime)")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                }
            }
        }
        .nasCard()
    }
    
    // MARK: - Telemetry Grid (CPU & RAM)
    private var telemetryGrid: some View {
        HStack(alignment: .top, spacing: AppSpacing.md) {
            // CPU Card
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    Label(AppStrings.tr("dash.cpu", lang: appState.language), systemImage: "cpu")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.cpuColor)
                    Spacer()
                    Text(String(format: "%.1f%%", viewModel.currentUtilization.cpuPercent))
                        .font(.title3.weight(.bold))
                        .foregroundStyle(Color.textPrimary)
                }
                
                Chart(viewModel.telemetryHistory) { point in
                    AreaMark(
                        x: .value("Time", point.date),
                        y: .value("CPU", point.cpuPercent)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.cpuColor.opacity(0.35), Color.cpuColor.opacity(0.0)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    
                    LineMark(
                        x: .value("Time", point.date),
                        y: .value("CPU", point.cpuPercent)
                    )
                    .foregroundStyle(Color.cpuColor)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                }
                .chartXAxis(.hidden)
                .chartYScale(domain: 0...100)
                .frame(height: 75)
            }
            .nasCard()
            
            // Memory Card
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    Label(AppStrings.tr("dash.ram", lang: appState.language), systemImage: "memorychip")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.ramColor)
                    Spacer()
                    Text(String(format: "%.1f%%", viewModel.currentUtilization.memoryPercent))
                        .font(.title3.weight(.bold))
                        .foregroundStyle(Color.textPrimary)
                }
                
                Chart(viewModel.telemetryHistory) { point in
                    AreaMark(
                        x: .value("Time", point.date),
                        y: .value("RAM", point.memoryPercent)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.ramColor.opacity(0.35), Color.ramColor.opacity(0.0)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    
                    LineMark(
                        x: .value("Time", point.date),
                        y: .value("RAM", point.memoryPercent)
                    )
                    .foregroundStyle(Color.ramColor)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                }
                .chartXAxis(.hidden)
                .chartYScale(domain: 0...100)
                .frame(height: 75)
            }
            .nasCard()
        }
    }
    
    // MARK: - Throughput Grid (Network & Disk)
    private var throughputGrid: some View {
        HStack(alignment: .top, spacing: AppSpacing.md) {
            // Network Card
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    Label(AppStrings.tr("dash.network", lang: appState.language), systemImage: "arrow.up.arrow.down")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.statusInfo)
                    Spacer()
                }
                
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("↓ \(formatBytes(viewModel.currentUtilization.networkRxBytes))/s")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.networkRxColor)
                        Text("↑ \(formatBytes(viewModel.currentUtilization.networkTxBytes))/s")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.networkTxColor)
                    }
                    Spacer()
                }
                
                Chart(viewModel.telemetryHistory) { point in
                    LineMark(
                        x: .value("Time", point.date),
                        y: .value("Rx", point.networkRxKB)
                    )
                    .foregroundStyle(Color.networkRxColor)
                    .lineStyle(StrokeStyle(lineWidth: 1.5))
                    
                    LineMark(
                        x: .value("Time", point.date),
                        y: .value("Tx", point.networkTxKB)
                    )
                    .foregroundStyle(Color.networkTxColor)
                    .lineStyle(StrokeStyle(lineWidth: 1.5))
                }
                .chartXAxis(.hidden)
                .frame(height: 60)
            }
            .nasCard()
            
            // Disk I/O Card
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack {
                    Label(AppStrings.tr("dash.disk", lang: appState.language), systemImage: "internaldrive")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.diskReadColor)
                    Spacer()
                }
                
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("R: \(formatBytes(viewModel.currentUtilization.diskReadBytes))/s")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.diskReadColor)
                        Text("W: \(formatBytes(viewModel.currentUtilization.diskWriteBytes))/s")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.diskWriteColor)
                    }
                    Spacer()
                }
                
                Chart(viewModel.telemetryHistory) { point in
                    LineMark(
                        x: .value("Time", point.date),
                        y: .value("Read", point.diskReadKB)
                    )
                    .foregroundStyle(Color.diskReadColor)
                    .lineStyle(StrokeStyle(lineWidth: 1.5))
                    
                    LineMark(
                        x: .value("Time", point.date),
                        y: .value("Write", point.diskWriteKB)
                    )
                    .foregroundStyle(Color.diskWriteColor)
                    .lineStyle(StrokeStyle(lineWidth: 1.5))
                }
                .chartXAxis(.hidden)
                .frame(height: 60)
            }
            .nasCard()
        }
    }
    
    // MARK: - Hardware Specs
    private var hardwareSpecsCard: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Label(AppStrings.tr("dash.specs", lang: appState.language), systemImage: "info.circle.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.textPrimary)
            
            Divider().background(Color.oledBorder)
            
            Grid(alignment: .leading, horizontalSpacing: AppSpacing.lg, verticalSpacing: AppSpacing.sm) {
                GridRow {
                    Text("CPU")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                    Text(viewModel.systemInfo.cpuModel.isEmpty ? "Intel Celeron J4125 (4 Cores)" : viewModel.systemInfo.cpuModel)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.textPrimary)
                }
                GridRow {
                    Text("RAM Total")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                    Text("\(viewModel.systemInfo.ramTotal) MB DDR4")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.textPrimary)
                }
                GridRow {
                    Text(AppStrings.tr("dash.serial", lang: appState.language))
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                    Text(viewModel.systemInfo.serial.isEmpty ? "2170QNR641001" : viewModel.systemInfo.serial)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.textPrimary)
                }
            }
        }
        .nasCard()
    }
    
    // MARK: - Processes List
    private var processesCard: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            HStack {
                Label(AppStrings.tr("dash.processes", lang: appState.language), systemImage: "list.bullet.rectangle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.textPrimary)
                
                Spacer()
                
                Text("\(viewModel.processes.count) active")
                    .font(.caption2)
                    .foregroundStyle(Color.textSecondary)
            }
            
            Divider().background(Color.oledBorder)
            
            ForEach(viewModel.processes) { proc in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(proc.name)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(Color.textPrimary)
                        HStack(spacing: 6) {
                            Text("PID: \(proc.pid)")
                                .font(.caption2)
                                .foregroundStyle(Color.textTertiary)
                            Text("•")
                                .font(.caption2)
                                .foregroundStyle(Color.textTertiary)
                            Text(proc.user)
                                .font(.caption2)
                                .foregroundStyle(Color.textSecondary)
                        }
                    }
                    
                    Spacer()
                    
                    HStack(spacing: AppSpacing.md) {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(String(format: "%.1f%% CPU", proc.cpu))
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Color.cpuColor)
                            Text(String(format: "%.1f%% RAM", proc.memory))
                                .font(.caption2)
                                .foregroundStyle(Color.ramColor)
                        }
                        
                        Button {
                            viewModel.processToKill = proc
                            viewModel.showKillProcessAlert = true
                        } label: {
                            Image(systemName: "xmark.circle")
                                .foregroundStyle(Color.statusError.opacity(0.8))
                        }
                    }
                }
                .padding(.vertical, 2)
            }
        }
        .nasCard()
    }
    
    private func formatBytes(_ bytes: Int64) -> String {
        let kb = Double(bytes) / 1024.0
        if kb < 1024 {
            return String(format: "%.0f KB", kb)
        } else {
            return String(format: "%.1f MB", kb / 1024.0)
        }
    }
}
