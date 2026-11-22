import SwiftUI
import KVSynologyCore

@MainActor
public struct AppNavigation: View {
    @Environment(AppState.self) private var appState
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var showMoreSheet: Bool = false
    
    public init() {}
    
    public var body: some View {
        @Bindable var state = appState
        Group {
            if horizontalSizeClass == .regular {
                // iPad & Mac Catalyst: NavigationSplitView
                NavigationSplitView {
                    SidebarView(selectedTab: $state.selectedTab)
                } detail: {
                    detailView(for: state.selectedTab)
                }
            } else {
                // iPhone: Adaptive TabView with Badges
                let currentTabBinding = Binding<AppTab>(
                    get: {
                        isMoreModule(state.selectedTab) ? .settings : state.selectedTab
                    },
                    set: { newTab in
                        state.selectedTab = newTab
                    }
                )
                TabView(selection: currentTabBinding) {
                    DashboardView()
                        .tabItem {
                            Label(AppStrings.tr("nav.dashboard", lang: appState.language), systemImage: AppTab.dashboard.iconName)
                        }
                        .tag(AppTab.dashboard)
                    
                    FileStationView()
                        .tabItem {
                            Label(AppStrings.tr("nav.files", lang: appState.language), systemImage: AppTab.files.iconName)
                        }
                        .tag(AppTab.files)
                    
                    DockerView()
                        .tabItem {
                            Label(AppStrings.tr("nav.docker", lang: appState.language), systemImage: AppTab.docker.iconName)
                        }
                        .badge(appState.runningContainersCount)
                        .tag(AppTab.docker)
                    
                    StorageView()
                        .tabItem {
                            Label(AppStrings.tr("nav.storage", lang: appState.language), systemImage: AppTab.storage.iconName)
                        }
                        .tag(AppTab.storage)
                    
                    MoreModulesView()
                        .tabItem {
                            Label("More", systemImage: "ellipsis.circle.fill")
                        }
                        .badge(appState.unreadNotificationsCount > 0 ? "\(appState.unreadNotificationsCount)" : nil)
                        .tag(AppTab.settings)
                }
                .tint(Color.dsmVibrantBlue)
            }
        }
        .fullScreenCover(isPresented: Binding(
            get: { !appState.isAuthenticated },
            set: { _ in }
        )) {
            LoginView()
        }
    }
    
    // MARK: - Detail Router for iPad
    @ViewBuilder
    private func detailView(for tab: AppTab) -> some View {
        switch tab {
        case .dashboard:
            DashboardView()
        case .files:
            FileStationView()
        case .docker:
            DockerView()
        case .download:
            NavigationStack { DownloadView() }
        case .storage:
            StorageView()
        case .packages:
            NavigationStack { PackagesView() }
        case .services:
            NavigationStack { ServicesView() }
        case .security:
            NavigationStack { SecurityView() }
        case .permissions:
            NavigationStack { PermissionsView() }
        case .notifications:
            NavigationStack { NotificationsView() }
        case .traffic:
            NavigationStack { TrafficView() }
        case .terminal:
            NavigationStack { TerminalView() }
        case .ai:
            NavigationStack { AiChatView() }
        case .settings:
            NavigationStack { SettingsView() }
        }
    }
    
    private func isMoreModule(_ tab: AppTab) -> Bool {
        switch tab {
        case .download, .packages, .services, .security, .permissions, .notifications, .traffic, .terminal, .ai, .settings:
            return true
        default:
            return false
        }
    }
}

// MARK: - More Modules List View (for iPhone Compact Tab)
@MainActor
public struct MoreModulesView: View {
    @Environment(AppState.self) private var appState
    @State private var navigationPath = NavigationPath()
    
    public init() {}
    
    public var body: some View {
        NavigationStack(path: $navigationPath) {
            List {
                Section(header: Text("Management")) {
                    NavigationLink(value: AppTab.packages) {
                        Label(AppStrings.tr("nav.packages", lang: appState.language), systemImage: AppTab.packages.iconName)
                    }
                    
                    NavigationLink(value: AppTab.services) {
                        Label(AppStrings.tr("nav.services", lang: appState.language), systemImage: AppTab.services.iconName)
                    }
                    
                    NavigationLink(value: AppTab.security) {
                        Label(AppStrings.tr("nav.security", lang: appState.language), systemImage: AppTab.security.iconName)
                    }
                    
                    NavigationLink(value: AppTab.permissions) {
                        Label(AppStrings.tr("nav.permissions", lang: appState.language), systemImage: AppTab.permissions.iconName)
                    }
                }
                
                Section(header: Text("Tools & Diagnostics")) {
                    NavigationLink(value: AppTab.download) {
                        HStack {
                            Label(AppStrings.tr("nav.download", lang: appState.language), systemImage: AppTab.download.iconName)
                            Spacer()
                            if appState.activeDownloadsCount > 0 {
                                Text("\(appState.activeDownloadsCount)")
                                    .font(.caption2.weight(.bold))
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 2)
                                    .background(Color.dsmVibrantBlue)
                                    .foregroundStyle(.white)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    
                    NavigationLink(value: AppTab.notifications) {
                        HStack {
                            Label(AppStrings.tr("nav.notifications", lang: appState.language), systemImage: AppTab.notifications.iconName)
                            Spacer()
                            if appState.unreadNotificationsCount > 0 {
                                Text("\(appState.unreadNotificationsCount)")
                                    .font(.caption2.weight(.bold))
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 2)
                                    .background(Color.statusError)
                                    .foregroundStyle(.white)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    
                    NavigationLink(value: AppTab.traffic) {
                        Label(AppStrings.tr("nav.traffic", lang: appState.language), systemImage: AppTab.traffic.iconName)
                    }
                    
                    NavigationLink(value: AppTab.terminal) {
                        Label(AppStrings.tr("nav.terminal", lang: appState.language), systemImage: AppTab.terminal.iconName)
                    }
                    
                    NavigationLink(value: AppTab.ai) {
                        Label(AppStrings.tr("nav.ai", lang: appState.language), systemImage: AppTab.ai.iconName)
                    }
                }
                
                Section(header: Text("Preferences")) {
                    NavigationLink(value: AppTab.settings) {
                        Label(AppStrings.tr("nav.settings", lang: appState.language), systemImage: AppTab.settings.iconName)
                    }
                }
                
                Section {
                    Button(role: .destructive) {
                        appState.logout()
                    } label: {
                        Label("Disconnect NAS", systemImage: "power")
                            .foregroundStyle(Color.statusError)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.oledBackground)
            .navigationTitle("More")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: AppTab.self) { tab in
                destinationView(for: tab)
            }
            .onAppear {
                checkAutoNavigation()
            }
            .onChange(of: appState.selectedTab) { _, _ in
                checkAutoNavigation()
            }
        }
    }
    
    private func checkAutoNavigation() {
        switch appState.selectedTab {
        case .download, .packages, .services, .security, .permissions, .notifications, .traffic, .terminal, .ai:
            navigationPath = NavigationPath()
            navigationPath.append(appState.selectedTab)
        default:
            break
        }
    }
    
    @ViewBuilder
    private func destinationView(for tab: AppTab) -> some View {
        switch tab {
        case .download: DownloadView()
        case .packages: PackagesView()
        case .services: ServicesView()
        case .security: SecurityView()
        case .permissions: PermissionsView()
        case .notifications: NotificationsView()
        case .traffic: TrafficView()
        case .terminal: TerminalView()
        case .ai: AiChatView()
        case .settings: SettingsView()
        default: EmptyView()
        }
    }
}
