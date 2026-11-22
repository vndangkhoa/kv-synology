import Foundation
import SwiftUI
import KVSynologyCore

public enum AppearanceMode: String, CaseIterable, Identifiable, Sendable {
    case system = "System"
    case light = "Light"
    case dark = "Dark"
    case oledBlack = "OLED Black"
    
    public var id: String { rawValue }
}

public struct NasProfile: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public var name: String
    public var host: String
    public var port: Int
    public var https: Bool
    public var account: String
    public var isQuickConnect: Bool
    public var isDemo: Bool
    
    public init(
        id: String = UUID().uuidString,
        name: String,
        host: String,
        port: Int = 5001,
        https: Bool = true,
        account: String,
        isQuickConnect: Bool = false,
        isDemo: Bool = false
    ) {
        self.id = id
        self.name = name
        self.host = host
        self.port = port
        self.https = https
        self.account = account
        self.isQuickConnect = isQuickConnect
        self.isDemo = isDemo
    }
}

@Observable
@MainActor
public final class SettingsViewModel {
    public var profiles: [NasProfile] = []
    public var activeProfileId: String = "profile_home"
    
    public var appearanceMode: AppearanceMode = .oledBlack
    public var appLanguage: AppLanguage = .english
    public var isAdvancedMode: Bool = true
    public var pollingIntervalSeconds: Int = 5
    public var biometricLockEnabled: Bool = false
    
    public var mcpToolsCount: Int = 42
    public var mcpServerStatus: String = "Connected (JSON-RPC stdio)"
    public var appVersion: String = "1.0.0 (Build 42)"
    
    public var showingAddProfileSheet: Bool = false
    public var editingProfile: NasProfile? = nil
    
    public var successMessage: String? = nil
    public var errorMessage: String? = nil
    
    private let client: DSMClient?
    
    public init(client: DSMClient? = nil) {
        self.client = client
        loadMockProfilesIfEmpty()
    }
    
    public var activeProfile: NasProfile? {
        profiles.first { $0.id == activeProfileId }
    }
    
    public func switchProfile(id: String) {
        activeProfileId = id
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        successMessage = "Switched to profile: \(activeProfile?.name ?? id)"
    }
    
    public func saveProfile(_ profile: NasProfile) {
        if let idx = profiles.firstIndex(where: { $0.id == profile.id }) {
            profiles[idx] = profile
        } else {
            profiles.append(profile)
        }
        showingAddProfileSheet = false
        editingProfile = nil
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        successMessage = "Profile saved"
    }
    
    public func deleteProfile(id: String) {
        guard profiles.count > 1 else {
            errorMessage = "Cannot delete the only configured profile."
            return
        }
        
        profiles.removeAll { $0.id == id }
        if activeProfileId == id {
            activeProfileId = profiles.first?.id ?? ""
        }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        successMessage = "Profile removed"
    }
    
    public func toggleBiometrics(enabled: Bool) {
        biometricLockEnabled = enabled
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
    
    private func loadMockProfilesIfEmpty() {
        if profiles.isEmpty {
            profiles = [
                NasProfile(
                    id: "profile_home",
                    name: "Home DS920+",
                    host: "synology.local",
                    port: 5001,
                    https: true,
                    account: "admin",
                    isQuickConnect: false,
                    isDemo: false
                ),
                NasProfile(
                    id: "profile_qc",
                    name: "Office QuickConnect",
                    host: "mycompany-dsm",
                    port: 5001,
                    https: true,
                    account: "khoavo",
                    isQuickConnect: true,
                    isDemo: false
                ),
                NasProfile(
                    id: "profile_demo",
                    name: "Offline Demo Simulator",
                    host: "demo.synology.local",
                    port: 5001,
                    https: true,
                    account: "demo_admin",
                    isQuickConnect: false,
                    isDemo: true
                )
            ]
        }
    }
}
