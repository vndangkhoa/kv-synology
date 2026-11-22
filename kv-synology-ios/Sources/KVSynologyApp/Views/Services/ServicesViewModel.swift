import Foundation
import SwiftUI
import KVSynologyCore

public enum ServicesSection: String, CaseIterable, Identifiable, Sendable {
    case fileServices = "File Services"
    case reverseProxy = "Reverse Proxy"
    
    public var id: String { rawValue }
    
    public var iconName: String {
        switch self {
        case .fileServices: return "network"
        case .reverseProxy: return "arrow.triangle.swap"
        }
    }
}

@Observable
@MainActor
public final class ServicesViewModel {
    public var selectedSection: ServicesSection = .fileServices
    public var fileServices: [ServiceItem] = []
    public var reverseProxyRules: [ReverseProxyRule] = []
    public var healthInfo: ReverseProxyHealthInfo = ReverseProxyHealthInfo(nginxSyntaxOk: true, activeRulesCount: 4, orphanedServicesCount: 0)
    
    public var isLoading: Bool = false
    public var togglingServiceIds: Set<String> = []
    public var deletingRuleUuids: Set<String> = []
    
    public var errorMessage: String? = nil
    public var successMessage: String? = nil
    
    public var showingAddRuleSheet: Bool = false
    public var editingRule: ReverseProxyRule? = nil
    
    private let client: DSMClient?
    
    public init(client: DSMClient? = nil) {
        self.client = client
        loadMockDataIfEmpty()
    }
    
    public func loadServices() async {
        isLoading = true
        errorMessage = nil
        
        do {
            if let client = client {
                self.fileServices = await client.getFileServices()
                self.reverseProxyRules = await client.getReverseProxyRules()
            } else {
                loadMockDataIfEmpty()
            }
        } catch {
            self.errorMessage = "Failed to load services: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    public func toggleService(_ service: ServiceItem) async {
        let id = service.id
        togglingServiceIds.insert(id)
        let targetState = !service.enabled
        
        do {
            if let client = client {
                _ = await client.toggleService(id: id, enable: targetState)
            } else {
                try? await Task.sleep(nanoseconds: 400_000_000)
            }
            
            if let idx = fileServices.firstIndex(where: { $0.id == id }) {
                fileServices[idx] = ServiceItem(
                    id: service.id,
                    name: service.name,
                    displayName: service.displayName,
                    description: service.description,
                    category: service.category,
                    enabled: targetState,
                    running: targetState,
                    status: targetState ? "enabled" : "disabled",
                    port: service.port,
                    canToggle: service.canToggle
                )
            }
            
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            successMessage = "\(service.displayName) \(targetState ? "enabled" : "disabled")"
        } catch {
            errorMessage = "Failed to update \(service.displayName): \(error.localizedDescription)"
        }
        
        togglingServiceIds.remove(id)
    }
    
    public func saveReverseProxyRule(_ rule: ReverseProxyRule) async {
        isLoading = true
        errorMessage = nil
        
        do {
            if let client = client {
                let isExisting = reverseProxyRules.contains(where: { $0.uuid == rule.uuid })
                if isExisting {
                    _ = try await client.updateReverseProxyRule(rule: rule)
                } else {
                    _ = try await client.addReverseProxyRule(rule: rule)
                }
            } else {
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
            
            if let idx = reverseProxyRules.firstIndex(where: { $0.uuid == rule.uuid }) {
                reverseProxyRules[idx] = rule
            } else {
                reverseProxyRules.insert(rule, at: 0)
            }
            
            healthInfo = ReverseProxyHealthInfo(
                nginxSyntaxOk: true,
                activeRulesCount: reverseProxyRules.count,
                orphanedServicesCount: healthInfo.orphanedServicesCount
            )
            
            showingAddRuleSheet = false
            editingRule = nil
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            successMessage = "Reverse Proxy rule saved"
        } catch {
            errorMessage = "Failed to save reverse proxy rule: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    public func deleteReverseProxyRule(uuid: String) async {
        deletingRuleUuids.insert(uuid)
        
        do {
            if let client = client {
                _ = try await client.deleteReverseProxyRule(uuid: uuid)
            } else {
                try? await Task.sleep(nanoseconds: 400_000_000)
            }
            
            reverseProxyRules.removeAll { $0.uuid == uuid }
            healthInfo = ReverseProxyHealthInfo(
                nginxSyntaxOk: true,
                activeRulesCount: reverseProxyRules.count,
                orphanedServicesCount: healthInfo.orphanedServicesCount
            )
            
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            successMessage = "Rule deleted"
        } catch {
            errorMessage = "Failed to delete rule: \(error.localizedDescription)"
        }
        
        deletingRuleUuids.remove(uuid)
    }
    
    private func loadMockDataIfEmpty() {
        if fileServices.isEmpty {
            fileServices = [
                ServiceItem(
                    id: "smb",
                    name: "smb",
                    displayName: "SMB / CIFS",
                    description: "Windows File Sharing protocol for Windows, Mac & Linux clients.",
                    category: "file",
                    enabled: true,
                    running: true,
                    status: "enabled",
                    port: 445,
                    canToggle: true
                ),
                ServiceItem(
                    id: "afp",
                    name: "afp",
                    displayName: "AFP",
                    description: "Apple Filing Protocol legacy service for Time Machine & macOS.",
                    category: "file",
                    enabled: false,
                    running: false,
                    status: "disabled",
                    port: 548,
                    canToggle: true
                ),
                ServiceItem(
                    id: "nfs",
                    name: "nfs",
                    displayName: "NFS Service",
                    description: "Network File System for UNIX & Linux server volume mounting.",
                    category: "file",
                    enabled: true,
                    running: true,
                    status: "enabled",
                    port: 2049,
                    canToggle: true
                ),
                ServiceItem(
                    id: "ftp",
                    name: "ftp",
                    displayName: "FTP / FTPS",
                    description: "File Transfer Protocol with TLS encryption option.",
                    category: "file",
                    enabled: false,
                    running: false,
                    status: "disabled",
                    port: 21,
                    canToggle: true
                ),
                ServiceItem(
                    id: "sftp",
                    name: "sftp",
                    displayName: "SFTP",
                    description: "Secure File Transfer Protocol over SSH channel.",
                    category: "file",
                    enabled: true,
                    running: true,
                    status: "enabled",
                    port: 22,
                    canToggle: true
                ),
                ServiceItem(
                    id: "ssh",
                    name: "ssh",
                    displayName: "SSH Terminal",
                    description: "Secure Shell remote command line administration.",
                    category: "system",
                    enabled: true,
                    running: true,
                    status: "enabled",
                    port: 22,
                    canToggle: true
                ),
                ServiceItem(
                    id: "telnet",
                    name: "telnet",
                    displayName: "Telnet",
                    description: "Insecure unencrypted remote console access.",
                    category: "system",
                    enabled: false,
                    running: false,
                    status: "disabled",
                    port: 23,
                    canToggle: true
                ),
                ServiceItem(
                    id: "rsync",
                    name: "rsync",
                    displayName: "rsync Service",
                    description: "Remote differential incremental file synchronization service.",
                    category: "backup",
                    enabled: true,
                    running: true,
                    status: "enabled",
                    port: 873,
                    canToggle: true
                ),
                ServiceItem(
                    id: "webdav",
                    name: "webdav",
                    displayName: "WebDAV",
                    description: "HTTP/HTTPS-based remote distributed file authoring.",
                    category: "file",
                    enabled: false,
                    running: false,
                    status: "disabled",
                    port: 5005,
                    canToggle: true
                )
            ]
        }
        
        if reverseProxyRules.isEmpty {
            reverseProxyRules = [
                ReverseProxyRule(
                    uuid: "rule_vault",
                    description: "Bitwarden / Vaultwarden Password Manager",
                    frontend: ReverseProxyFrontend(protocol: 1, fqdn: "vault.myds.me", port: 443, hsts: true, http2: true),
                    backend: ReverseProxyBackend(protocol: 0, fqdn: "localhost", port: 8080),
                    proxyConnectTimeout: 60
                ),
                ReverseProxyRule(
                    uuid: "rule_portainer",
                    description: "Portainer Docker UI",
                    frontend: ReverseProxyFrontend(protocol: 1, fqdn: "docker.myds.me", port: 443, hsts: true, http2: true),
                    backend: ReverseProxyBackend(protocol: 0, fqdn: "localhost", port: 9000),
                    proxyConnectTimeout: 60
                ),
                ReverseProxyRule(
                    uuid: "rule_adguard",
                    description: "AdGuard Home DNS Admin",
                    frontend: ReverseProxyFrontend(protocol: 1, fqdn: "adguard.myds.me", port: 443, hsts: true, http2: true),
                    backend: ReverseProxyBackend(protocol: 0, fqdn: "localhost", port: 3000),
                    proxyConnectTimeout: 60
                ),
                ReverseProxyRule(
                    uuid: "rule_homeassistant",
                    description: "Home Assistant IoT Hub",
                    frontend: ReverseProxyFrontend(protocol: 1, fqdn: "hass.myds.me", port: 443, hsts: true, http2: true),
                    backend: ReverseProxyBackend(protocol: 0, fqdn: "localhost", port: 8123),
                    proxyConnectTimeout: 60
                )
            ]
        }
    }
}
