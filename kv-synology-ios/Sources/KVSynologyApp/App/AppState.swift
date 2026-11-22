import Foundation
import SwiftUI
import KVSynologyCore

public enum AppConnectionState: Equatable, Sendable {
    case disconnected
    case connecting
    case connected
    case demo
}

public enum AppTab: String, CaseIterable, Identifiable, Sendable {
    case dashboard = "dashboard"
    case files = "files"
    case docker = "docker"
    case download = "download"
    case storage = "storage"
    case packages = "packages"
    case services = "services"
    case security = "security"
    case permissions = "permissions"
    case notifications = "notifications"
    case traffic = "traffic"
    case terminal = "terminal"
    case ai = "ai"
    case settings = "settings"
    
    public var id: String { rawValue }
    
    public var iconName: String {
        switch self {
        case .dashboard: return "gauge.with.needle.fill"
        case .files: return "folder.fill"
        case .docker: return "shippingbox.fill"
        case .download: return "arrow.down.circle.fill"
        case .storage: return "internaldrive.fill"
        case .packages: return "square.grid.2x2.fill"
        case .services: return "network"
        case .security: return "shield.lefthalf.filled"
        case .permissions: return "person.badge.shield.checkmark.fill"
        case .notifications: return "bell.fill"
        case .traffic: return "chart.xyaxis.line"
        case .terminal: return "terminal.fill"
        case .ai: return "sparkles"
        case .settings: return "gearshape.fill"
        }
    }
    
    public func localizedTitle(lang: AppLanguage) -> String {
        switch self {
        case .dashboard: return AppStrings.tr("nav.dashboard", lang: lang)
        case .files: return AppStrings.tr("nav.files", lang: lang)
        case .docker: return AppStrings.tr("nav.docker", lang: lang)
        case .download: return AppStrings.tr("nav.download", lang: lang)
        case .storage: return AppStrings.tr("nav.storage", lang: lang)
        case .packages: return AppStrings.tr("nav.packages", lang: lang)
        case .services: return AppStrings.tr("nav.services", lang: lang)
        case .security: return AppStrings.tr("nav.security", lang: lang)
        case .permissions: return AppStrings.tr("nav.permissions", lang: lang)
        case .notifications: return AppStrings.tr("nav.notifications", lang: lang)
        case .traffic: return AppStrings.tr("nav.traffic", lang: lang)
        case .terminal: return AppStrings.tr("nav.terminal", lang: lang)
        case .ai: return AppStrings.tr("nav.ai", lang: lang)
        case .settings: return AppStrings.tr("nav.settings", lang: lang)
        }
    }
    
    /// Main tabs presented on iPhone bottom bar
    public static var primaryTabs: [AppTab] {
        [.dashboard, .files, .docker, .download, .storage]
    }
    
    /// Advanced tabs accessed via "More" or Sidebar
    public static var secondaryTabs: [AppTab] {
        [.packages, .services, .security, .permissions, .notifications, .traffic, .terminal, .ai, .settings]
    }
}

public enum ExperienceMode: String, CaseIterable, Sendable {
    case beginner = "beginner"
    case advanced = "advance"
    
    public var title: String {
        switch self {
        case .beginner: return "🟢 Cơ bản (Beginner)"
        case .advanced: return "⚡ Nâng cao (Advanced)"
        }
    }
    
    public var description: String {
        switch self {
        case .beginner:
            return "Chế độ Cơ bản: Hiển thị các tính năng cốt lõi (Tổng quan, Tệp tin, Docker, Tải xuống, Lưu trữ, Thông báo)."
        case .advanced:
            return "Chế độ Nâng cao: Mở khóa toàn bộ 14+ công cụ quản trị chuyên sâu (Dòng lệnh SSH, Tường lửa, Phân quyền ACL, Dịch vụ, Gói ứng dụng, Lưu lượng mạng, Trợ lý AI MCP)."
        }
    }
}

@Observable
@MainActor
public final class AppState {
    public var activeProfile: ConnectionConfig?
    public var savedProfiles: [ConnectionConfig] = []
    public var currentSession: DsmSession?
    public var connectionState: AppConnectionState = .disconnected
    
    public var selectedTab: AppTab = .dashboard
    public var language: AppLanguage = .english
    public var isPureOledBlack: Bool = true
    public var experienceMode: ExperienceMode = .advanced
    
    public var visibleDrawerTabs: [AppTab] {
        if experienceMode == .beginner {
            return [.dashboard, .files, .docker, .download, .storage, .settings]
        } else {
            return AppTab.allCases
        }
    }
    
    // Live badging telemetry
    public var unreadNotificationsCount: Int = 2
    public var activeDownloadsCount: Int = 3
    public var runningContainersCount: Int = 4
    
    private let profilesKey = "kKVSynologySavedProfiles"
    private let activeProfileIdKey = "kKVSynologyActiveProfileId"
    private let languageKey = "kKVSynologyAppLanguage"
    private let oledKey = "kKVSynologyOledBlack"
    
    public init() {
        loadPersistedState()
    }
    
    public var isDemoMode: Bool {
        connectionState == .demo || (activeProfile?.isDemo ?? false)
    }
    
    public var isAuthenticated: Bool {
        connectionState == .connected || connectionState == .demo
    }
    
    // MARK: - Actions
    
    public func enterDemoMode() {
        let demoConfig = ConnectionConfig(
            id: "demo-nas-id",
            name: "Synology DS920+ (Demo)",
            host: "demo.synology.local",
            port: 5001,
            https: true,
            account: "admin",
            password: nil,
            otp: nil,
            ignoreCert: true,
            isDemo: true
        )
        self.activeProfile = demoConfig
        self.currentSession = DsmSession(
            sid: "demo-session-token",
            synoToken: "demo-syno-token",
            did: "demo-device-id",
            cookie: "id=demo",
            isConnected: true,
            dsmVersion: 7,
            versionString: "DSM 7.2.1-69057 Update 5",
            model: "DS920+",
            hostname: "Demo-Synology-NAS",
            account: "admin"
        )
        self.connectionState = .demo
        self.selectedTab = .dashboard
    }
    
    public func loginSuccess(config: ConnectionConfig, session: DsmSession, remember: Bool = true) {
        self.activeProfile = config
        self.currentSession = session
        self.connectionState = config.isDemo ? .demo : .connected
        self.selectedTab = .dashboard
        
        if remember {
            saveProfile(config)
        }
    }
    
    public func logout() {
        self.activeProfile = nil
        self.currentSession = nil
        self.connectionState = .disconnected
        UserDefaults.standard.removeObject(forKey: activeProfileIdKey)
    }
    
    public func switchProfile(to profile: ConnectionConfig) {
        if profile.isDemo {
            enterDemoMode()
            return
        }
        self.activeProfile = profile
        self.connectionState = .connecting
        // Transition to connected if session is cached
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.connectionState = .connected
        }
    }
    
    public func saveProfile(_ config: ConnectionConfig) {
        if let idx = savedProfiles.firstIndex(where: { $0.id == config.id || ($0.host == config.host && $0.account == config.account) }) {
            savedProfiles[idx] = config
        } else {
            savedProfiles.append(config)
        }
        persistProfiles()
    }
    
    public func deleteProfile(id: String) {
        savedProfiles.removeAll { $0.id == id }
        persistProfiles()
        if activeProfile?.id == id {
            logout()
        }
    }
    
    public func setLanguage(_ lang: AppLanguage) {
        self.language = lang
        UserDefaults.standard.set(lang.rawValue, forKey: languageKey)
    }
    
    public func toggleOledBlack(_ isOled: Bool) {
        self.isPureOledBlack = isOled
        UserDefaults.standard.set(isOled, forKey: oledKey)
    }
    
    // MARK: - Persistence
    
    private func loadPersistedState() {
        if let langCode = UserDefaults.standard.string(forKey: languageKey),
           let lang = AppLanguage(rawValue: langCode) {
            self.language = lang
        }
        
        if UserDefaults.standard.object(forKey: oledKey) != nil {
            self.isPureOledBlack = UserDefaults.standard.bool(forKey: oledKey)
        }
        
        if let data = UserDefaults.standard.data(forKey: profilesKey),
           let decoded = try? JSONDecoder().decode([ConnectionConfig].self, from: data) {
            self.savedProfiles = decoded
        }
        
        // Auto-load demo if no saved profiles
        if savedProfiles.isEmpty {
            let defaultDemo = ConnectionConfig(
                id: "default-demo",
                name: "Demo NAS (DS920+)",
                host: "demo.synology.local",
                port: 5001,
                https: true,
                account: "admin",
                isDemo: true
            )
            savedProfiles.append(defaultDemo)
        }
        
        if let modeStr = UserDefaults.standard.string(forKey: "kKVSynologyExperienceMode"),
           let mode = ExperienceMode(rawValue: modeStr) {
            self.experienceMode = mode
        }
        
        // Command-line arguments for deterministic simulator inspection
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-demo") {
            enterDemoMode()
        }
        for (i, arg) in args.enumerated() {
            if arg == "-tab", i + 1 < args.count, let tab = AppTab(rawValue: args[i + 1]) {
                self.selectedTab = tab
            }
            if arg == "-mode", i + 1 < args.count, let mode = ExperienceMode(rawValue: args[i + 1]) {
                self.experienceMode = mode
            }
        }
    }
    
    private func persistProfiles() {
        if let encoded = try? JSONEncoder().encode(savedProfiles) {
            UserDefaults.standard.set(encoded, forKey: profilesKey)
        }
    }
}
