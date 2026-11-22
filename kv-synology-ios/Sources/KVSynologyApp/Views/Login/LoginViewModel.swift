import Foundation
import SwiftUI
import KVSynologyCore

public enum LoginMode: Int, CaseIterable, Identifiable {
    case quickConnect = 0
    case direct = 1
    
    public var id: Int { rawValue }
}

@Observable
@MainActor
public final class LoginViewModel {
    public var mode: LoginMode = .quickConnect
    public var quickConnectId: String = ""
    public var host: String = ""
    public var portString: String = "5001"
    public var useHttps: Bool = true
    public var account: String = ""
    public var password: String = ""
    public var otpCode: String = ""
    public var isOtpRequired: Bool = false
    public var ignoreCert: Bool = true
    public var rememberProfile: Bool = true
    public var profileName: String = ""
    
    public var isLoading: Bool = false
    public var statusMessage: String? = nil
    public var errorMessage: String? = nil
    public var showErrorAlert: Bool = false
    
    public init() {}
    
    public func fillFromProfile(_ config: ConnectionConfig) {
        if config.isQuickConnect, let qcId = config.quickConnectId {
            self.mode = .quickConnect
            self.quickConnectId = qcId
        } else {
            self.mode = .direct
            self.host = config.host
        }
        self.portString = "\(config.port)"
        self.useHttps = config.https
        self.account = config.account
        self.password = config.password ?? ""
        self.ignoreCert = config.ignoreCert
        self.profileName = config.name
    }
    
    public func performLogin(appState: AppState) async {
        guard !account.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Please enter an account username"
            showErrorAlert = true
            return
        }
        
        let targetHost: String
        let targetPort: Int
        
        if mode == .quickConnect {
            let cleanQc = quickConnectId.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !cleanQc.isEmpty else {
                errorMessage = "Please enter a valid QuickConnect ID"
                showErrorAlert = true
                return
            }
            targetHost = cleanQc
            targetPort = Int(portString) ?? 5001
        } else {
            let cleanHost = host.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !cleanHost.isEmpty else {
                errorMessage = "Please enter a NAS server IP address or domain"
                showErrorAlert = true
                return
            }
            targetHost = cleanHost
            targetPort = Int(portString) ?? (useHttps ? 5001 : 5000)
        }
        
        isLoading = true
        statusMessage = "Connecting to Synology DSM..."
        errorMessage = nil
        
        let config = ConnectionConfig(
            name: profileName.isEmpty ? targetHost : profileName,
            host: targetHost,
            port: targetPort,
            https: useHttps,
            account: account,
            password: password,
            otp: otpCode.isEmpty ? nil : otpCode,
            ignoreCert: ignoreCert,
            isDemo: false
        )
        
        // Simulating realistic authentication network flow
        do {
            try await Task.sleep(nanoseconds: 1_200_000_000)
            
            // Check if user entered demo or test credentials
            if targetHost.contains("demo") || account.lowercased() == "demo" {
                appState.enterDemoMode()
                isLoading = false
                return
            }
            
            // If OTP challenge
            if !isOtpRequired && (account.lowercased().contains("2fa") || account.lowercased().contains("otp")) && otpCode.isEmpty {
                isOtpRequired = true
                isLoading = false
                statusMessage = "Please enter 6-digit OTP security code"
                return
            }
            
            // Successful session
            let session = DsmSession(
                sid: UUID().uuidString.prefix(16).lowercased() + "_sid",
                synoToken: UUID().uuidString.prefix(12).lowercased(),
                did: UUID().uuidString,
                isConnected: true,
                dsmVersion: 7,
                versionString: "DSM 7.2.1-69057 Update 5",
                model: "DS920+",
                hostname: config.name,
                account: account
            )
            
            appState.loginSuccess(config: config, session: session, remember: rememberProfile)
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }
}
