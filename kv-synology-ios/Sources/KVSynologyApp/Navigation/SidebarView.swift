import SwiftUI
import KVSynologyCore

@MainActor
public struct SidebarView: View {
    @Environment(AppState.self) private var appState
    @Binding var selectedTab: AppTab
    
    public init(selectedTab: Binding<AppTab>) {
        self._selectedTab = selectedTab
    }
    
    public var body: some View {
        List {
            // Profile & NAS Status Header
            nasProfileSection
            
            // Primary Modules
            Section(header: Text("Core Services")) {
                sidebarRow(for: .dashboard)
                sidebarRow(for: .files)
                sidebarRow(for: .docker, badge: "\(appState.runningContainersCount)")
                sidebarRow(for: .download, badge: "\(appState.activeDownloadsCount)")
                sidebarRow(for: .storage)
            }
            
            // Management Modules
            Section(header: Text("Management")) {
                sidebarRow(for: .packages)
                sidebarRow(for: .services)
                sidebarRow(for: .security)
                sidebarRow(for: .permissions)
            }
            
            // Diagnostics & Tools
            Section(header: Text("Tools & Diagnostics")) {
                sidebarRow(for: .notifications, badge: appState.unreadNotificationsCount > 0 ? "\(appState.unreadNotificationsCount)" : nil)
                sidebarRow(for: .traffic)
                sidebarRow(for: .terminal)
                sidebarRow(for: .ai)
            }
            
            // Settings
            Section {
                sidebarRow(for: .settings)
            }
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
        .background(Color.oledBackground)
        .navigationTitle("KV-Synology")
    }
    
    // MARK: - Profile Card
    private var nasProfileSection: some View {
        Section {
            VStack(alignment: .leading, spacing: AppSpacing.sm) {
                HStack(spacing: AppSpacing.md) {
                    ZStack {
                        Circle()
                            .fill(Color.dsmVibrantBlue.opacity(0.15))
                            .frame(width: 44, height: 44)
                        Image(systemName: "server.rack")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(Color.dsmVibrantBlue)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(appState.currentSession?.hostname ?? appState.activeProfile?.name ?? "Synology NAS")
                            .font(.headline)
                            .foregroundStyle(Color.textPrimary)
                            .lineLimit(1)
                        
                        HStack(spacing: 6) {
                            Circle()
                                .fill(appState.isAuthenticated ? Color.statusSuccess : Color.statusError)
                                .frame(width: 8, height: 8)
                            Text(appState.isDemoMode ? "Demo Mode" : (appState.isAuthenticated ? "Connected" : "Disconnected"))
                                .font(.caption2.weight(.medium))
                                .foregroundStyle(Color.textSecondary)
                        }
                    }
                    
                    Spacer()
                    
                    // Profile Switcher Menu
                    Menu {
                        ForEach(appState.savedProfiles) { profile in
                            Button {
                                appState.switchProfile(to: profile)
                            } label: {
                                HStack {
                                    Text(profile.name.isEmpty ? profile.host : profile.name)
                                    if profile.id == appState.activeProfile?.id {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                        
                        Divider()
                        
                        Button(role: .destructive) {
                            appState.logout()
                        } label: {
                            Label("Disconnect", systemImage: "power")
                        }
                    } label: {
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.textSecondary)
                            .padding(AppSpacing.xs)
                    }
                }
                
                if let model = appState.currentSession?.model {
                    HStack {
                        Text(model)
                            .font(.caption2)
                            .padding(.horizontal, AppSpacing.sm)
                            .padding(.vertical, 2)
                            .background(Color.oledCardSubtle)
                            .clipShape(Capsule())
                        
                        if let dsmVer = appState.currentSession?.versionString {
                            Text(dsmVer)
                                .font(.caption2)
                                .foregroundStyle(Color.textSecondary)
                        }
                    }
                }
            }
            .padding(.vertical, AppSpacing.xs)
        }
    }
    
    // MARK: - Row Helper
    private func sidebarRow(for tab: AppTab, badge: String? = nil) -> some View {
        Button {
            selectedTab = tab
        } label: {
            HStack {
                Label(tab.localizedTitle(lang: appState.language), systemImage: tab.iconName)
                    .foregroundStyle(selectedTab == tab ? Color.dsmVibrantBlue : Color.textPrimary)
                
                Spacer()
                
                if let badge = badge {
                    Text(badge)
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(selectedTab == tab ? Color.dsmVibrantBlue : Color.oledCardElevated)
                        .foregroundStyle(selectedTab == tab ? Color.white : Color.textSecondary)
                        .clipShape(Capsule())
                }
            }
        }
        .listRowBackground(
            selectedTab == tab ?
                RoundedRectangle(cornerRadius: AppCornerRadius.sm).fill(Color.dsmVibrantBlue.opacity(0.12)) :
                nil
        )
    }
}
