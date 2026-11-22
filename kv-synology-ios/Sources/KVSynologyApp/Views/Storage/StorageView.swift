import SwiftUI
import Charts
import KVSynologyCore

@MainActor
public struct StorageView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = StorageViewModel()
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.lg) {
                    // Storage Pools Summary
                    poolsSection
                    
                    // Volumes Breakdown
                    volumesSection
                    
                    // Physical Drive Slots
                    drivesSection
                }
                .padding(AppSpacing.lg)
            }
            .background(Color.oledBackground.ignoresSafeArea())
            .navigationTitle(AppStrings.tr("storage.title", lang: appState.language))
            .navigationBarTitleDisplayMode(.inline)
            .refreshable {
                viewModel.loadMockStorageData()
            }
        }
    }
    
    // MARK: - Pools Section
    private var poolsSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Label(AppStrings.tr("storage.pools", lang: appState.language), systemImage: "square.stack.3d.down.right.fill")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            ForEach(viewModel.pools) { pool in
                VStack(alignment: .leading, spacing: AppSpacing.sm) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(pool.name)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(Color.textPrimary)
                            Text(pool.raidType)
                                .font(.caption2)
                                .foregroundStyle(Color.dsmVibrantBlue)
                        }
                        
                        Spacer()
                        
                        Text("HEALTHY")
                            .nasStatusChip(color: Color.statusSuccess)
                    }
                    
                    Divider().background(Color.oledBorder)
                    
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(AppStrings.tr("storage.used", lang: appState.language))
                                .font(.caption2)
                                .foregroundStyle(Color.textSecondary)
                            Text(formatTB(pool.usedBytes))
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Color.textPrimary)
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(AppStrings.tr("storage.free", lang: appState.language))
                                .font(.caption2)
                                .foregroundStyle(Color.textSecondary)
                            Text(formatTB(pool.freeBytes))
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Color.textPrimary)
                        }
                    }
                    
                    ProgressView(value: Double(pool.usedBytes), total: Double(pool.totalBytes))
                        .tint(Color.dsmVibrantBlue)
                }
                .nasCard()
            }
        }
    }
    
    // MARK: - Volumes Section
    private var volumesSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Label(AppStrings.tr("storage.volumes", lang: appState.language), systemImage: "internaldrive.fill")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            ForEach(viewModel.volumes) { volume in
                VStack(alignment: .leading, spacing: AppSpacing.md) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(volume.name)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(Color.textPrimary)
                            Text(volume.fsType)
                                .font(.caption2)
                                .foregroundStyle(Color.textSecondary)
                        }
                        
                        Spacer()
                        
                        Text("\(volume.usedPercent)% Used")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(volume.usedPercent > 85 ? Color.statusWarning : Color.statusSuccess)
                    }
                    
                    // Circular Gauge / Progress Bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: AppCornerRadius.full)
                                .fill(Color.oledCardElevated)
                                .frame(height: 12)
                            
                            RoundedRectangle(cornerRadius: AppCornerRadius.full)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.dsmVibrantBlue, Color.statusInfo],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .frame(width: geo.size.width * CGFloat(Double(volume.usedBytes) / Double(volume.totalBytes)), height: 12)
                        }
                    }
                    .frame(height: 12)
                    
                    HStack {
                        HStack(spacing: 4) {
                            Circle().fill(Color.dsmVibrantBlue).frame(width: 8, height: 8)
                            Text("\(formatTB(volume.usedBytes)) Used")
                                .font(.caption2)
                                .foregroundStyle(Color.textSecondary)
                        }
                        
                        Spacer()
                        
                        HStack(spacing: 4) {
                            Circle().fill(Color.oledBorder).frame(width: 8, height: 8)
                            Text("\(formatTB(volume.freeBytes)) Free")
                                .font(.caption2)
                                .foregroundStyle(Color.textSecondary)
                        }
                    }
                }
                .nasCard()
            }
        }
    }
    
    // MARK: - Physical Drives Section
    private var drivesSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.md) {
            Label(AppStrings.tr("storage.drives", lang: appState.language), systemImage: "square.grid.2x2.fill")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: AppSpacing.md) {
                ForEach(viewModel.drives) { drive in
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        HStack {
                            ZStack {
                                Circle()
                                    .fill(Color.dsmVibrantBlue.opacity(0.15))
                                    .frame(width: 28, height: 28)
                                Text("\(drive.slot)")
                                    .font(.caption2.weight(.bold))
                                    .foregroundStyle(Color.dsmVibrantBlue)
                            }
                            
                            Spacer()
                            
                            HStack(spacing: 3) {
                                Image(systemName: "thermometer.medium")
                                Text("\(drive.temp)°C")
                            }
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(drive.temp < 45 ? Color.statusSuccess : Color.statusWarning)
                        }
                        
                        Text(drive.slotName ?? "Drive \(drive.slot)")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.textPrimary)
                        
                        Text(drive.model)
                            .font(.caption2)
                            .foregroundStyle(Color.textSecondary)
                            .lineLimit(2)
                        
                        Divider().background(Color.oledBorder)
                        
                        HStack {
                            Text(formatTB(drive.size))
                                .font(.caption2.weight(.medium))
                                .foregroundStyle(Color.textPrimary)
                            
                            Spacer()
                            
                            Text("SMART OK")
                                .font(.system(size: 9, weight: .bold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.statusSuccess.opacity(0.15))
                                .foregroundStyle(Color.statusSuccess)
                                .clipShape(Capsule())
                        }
                    }
                    .nasCard(padding: AppSpacing.md)
                }
            }
        }
    }
    
    private func formatTB(_ bytes: Int64) -> String {
        let tb = Double(bytes) / (1024.0 * 1024.0 * 1024.0 * 1024.0)
        return String(format: "%.1f TB", tb)
    }
}
