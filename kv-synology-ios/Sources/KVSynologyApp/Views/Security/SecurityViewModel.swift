import Foundation
import SwiftUI
import KVSynologyCore

public enum SecurityTab: String, CaseIterable, Identifiable, Sendable {
    case advisor = "Advisor"
    case firewall = "Firewall"
    case autoBlock = "Auto-Block"
    
    public var id: String { rawValue }
    
    public var iconName: String {
        switch self {
        case .advisor: return "shield.lefthalf.filled"
        case .firewall: return "flame.fill"
        case .autoBlock: return "hand.raised.fill"
        }
    }
}

@Observable
@MainActor
public final class SecurityViewModel {
    public var selectedTab: SecurityTab = .advisor
    
    public var firewallConfig: FirewallConfig = FirewallConfig(enabled: true, defaultProfile: "default", allowUnmatched: true, rules: [])
    public var autoBlockConfig: AutoBlockConfig = AutoBlockConfig(enabled: true, attempts: 5, withinMinutes: 10, enableUnblock: true, unblockDays: 7, blockedCount: 4, allowedCount: 3)
    public var blockedIps: [BlockedIpItem] = []
    public var allowedIps: [String] = ["192.168.1.0/24", "10.0.0.0/8", "127.0.0.1"]
    public var auditItems: [SecurityAuditItem] = []
    public var securityScore: Int = 92
    
    public var isLoading: Bool = false
    public var unblockingIps: Set<String> = []
    public var togglingRuleIds: Set<String> = []
    
    public var errorMessage: String? = nil
    public var successMessage: String? = nil
    
    public var showingAddRuleSheet: Bool = false
    public var showingAddWhitelistSheet: Bool = false
    
    private let client: DSMClient?
    
    public init(client: DSMClient? = nil) {
        self.client = client
        loadMockDataIfEmpty()
    }
    
    public func loadSecurityData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            if let client = client {
                self.firewallConfig = await client.getFirewallConfig()
                self.blockedIps = await client.getBlockedIps()
            } else {
                loadMockDataIfEmpty()
            }
        } catch {
            self.errorMessage = "Failed to load security info: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    public func toggleFirewall(enabled: Bool) async {
        isLoading = true
        do {
            if let client = client {
                _ = await client.toggleFirewall(enabled: enabled)
            } else {
                try? await Task.sleep(nanoseconds: 300_000_000)
            }
            firewallConfig = FirewallConfig(
                enabled: enabled,
                defaultProfile: firewallConfig.defaultProfile,
                allowUnmatched: firewallConfig.allowUnmatched,
                rules: firewallConfig.rules
            )
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            successMessage = "Firewall \(enabled ? "enabled" : "disabled")"
        } catch {
            errorMessage = "Failed to update firewall: \(error.localizedDescription)"
        }
        isLoading = false
    }
    
    public func toggleRule(ruleId: String, enabled: Bool) async {
        togglingRuleIds.insert(ruleId)
        do {
            if let client = client {
                _ = try await client.toggleFirewallRule(name: ruleId, enabled: enabled)
            } else {
                try? await Task.sleep(nanoseconds: 300_000_000)
            }
            
            if let idx = firewallConfig.rules.firstIndex(where: { $0.id == ruleId }) {
                var updated = firewallConfig.rules
                let r = updated[idx]
                updated[idx] = FirewallRule(
                    id: r.id,
                    name: r.name,
                    ports: r.ports,
                    protocol: r.protocol,
                    sourceType: r.sourceType,
                    sourceValue: r.sourceValue,
                    action: r.action,
                    enabled: enabled,
                    order: r.order
                )
                firewallConfig = FirewallConfig(
                    enabled: firewallConfig.enabled,
                    defaultProfile: firewallConfig.defaultProfile,
                    allowUnmatched: firewallConfig.allowUnmatched,
                    rules: updated
                )
            }
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } catch {
            errorMessage = "Failed to toggle rule: \(error.localizedDescription)"
        }
        togglingRuleIds.remove(ruleId)
    }
    
    public func addFirewallRule(_ rule: FirewallRule) async {
        isLoading = true
        do {
            if let client = client {
                _ = try await client.addFirewallRule(rule: rule)
            } else {
                try? await Task.sleep(nanoseconds: 400_000_000)
            }
            
            var updated = firewallConfig.rules
            updated.insert(rule, at: 0)
            firewallConfig = FirewallConfig(
                enabled: firewallConfig.enabled,
                defaultProfile: firewallConfig.defaultProfile,
                allowUnmatched: firewallConfig.allowUnmatched,
                rules: updated
            )
            showingAddRuleSheet = false
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            successMessage = "Firewall rule created"
        } catch {
            errorMessage = "Failed to add rule: \(error.localizedDescription)"
        }
        isLoading = false
    }
    
    public func deleteFirewallRule(_ ruleId: String) async {
        do {
            if let client = client {
                _ = try await client.deleteFirewallRule(name: ruleId)
            } else {
                try? await Task.sleep(nanoseconds: 300_000_000)
            }
            
            var updated = firewallConfig.rules
            updated.removeAll { $0.id == ruleId }
            firewallConfig = FirewallConfig(
                enabled: firewallConfig.enabled,
                defaultProfile: firewallConfig.defaultProfile,
                allowUnmatched: firewallConfig.allowUnmatched,
                rules: updated
            )
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            successMessage = "Rule removed"
        } catch {
            errorMessage = "Failed to remove rule: \(error.localizedDescription)"
        }
    }
    
    public func unblockIp(_ ip: String) async {
        unblockingIps.insert(ip)
        do {
            if let client = client {
                _ = await client.unblockIp(ip: ip)
            } else {
                try? await Task.sleep(nanoseconds: 400_000_000)
            }
            
            blockedIps.removeAll { $0.ip == ip }
            autoBlockConfig = AutoBlockConfig(
                enabled: autoBlockConfig.enabled,
                attempts: autoBlockConfig.attempts,
                withinMinutes: autoBlockConfig.withinMinutes,
                enableUnblock: autoBlockConfig.enableUnblock,
                unblockDays: autoBlockConfig.unblockDays,
                blockedCount: blockedIps.count,
                allowedCount: autoBlockConfig.allowedCount
            )
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            successMessage = "IP \(ip) unblocked successfully"
        } catch {
            errorMessage = "Failed to unblock \(ip): \(error.localizedDescription)"
        }
        unblockingIps.remove(ip)
    }
    
    public func addWhitelistIp(_ ip: String) async {
        isLoading = true
        try? await Task.sleep(nanoseconds: 300_000_000)
        if !allowedIps.contains(ip) {
            allowedIps.append(ip)
        }
        showingAddWhitelistSheet = false
        isLoading = false
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        successMessage = "\(ip) added to whitelist"
    }
    
    private func loadMockDataIfEmpty() {
        if firewallConfig.rules.isEmpty {
            firewallConfig = FirewallConfig(
                enabled: true,
                defaultProfile: "default",
                allowUnmatched: true,
                rules: [
                    FirewallRule(id: "rule_1", name: "Management Web UI", ports: "5000, 5001", protocol: "TCP", sourceType: "subnet", sourceValue: "192.168.1.0/24", action: "allow", enabled: true, order: 1),
                    FirewallRule(id: "rule_2", name: "SSH Secure Shell", ports: "22", protocol: "TCP", sourceType: "subnet", sourceValue: "192.168.1.0/24", action: "allow", enabled: true, order: 2),
                    FirewallRule(id: "rule_3", name: "Public Reverse Proxy", ports: "80, 443", protocol: "TCP", sourceType: "all", sourceValue: "all", action: "allow", enabled: true, order: 3),
                    FirewallRule(id: "rule_4", name: "Block Tor / Known Malicious", ports: "all", protocol: "all", sourceType: "ip", sourceValue: "198.51.100.42", action: "deny", enabled: true, order: 4),
                    FirewallRule(id: "rule_5", name: "Docker Webhook Port", ports: "9000", protocol: "TCP", sourceType: "subnet", sourceValue: "10.0.0.0/8", action: "allow", enabled: false, order: 5)
                ]
            )
        }
        
        if blockedIps.isEmpty {
            blockedIps = [
                BlockedIpItem(ip: "185.220.101.5", denyTime: "2026-09-22 21:14:02", expireTime: "2026-09-29 21:14:02", country: "DE"),
                BlockedIpItem(ip: "45.154.255.89", denyTime: "2026-09-22 18:32:45", expireTime: "2026-09-29 18:32:45", country: "RU"),
                BlockedIpItem(ip: "103.149.28.14", denyTime: "2026-09-22 14:08:19", expireTime: "2026-09-29 14:08:19", country: "CN"),
                BlockedIpItem(ip: "193.32.162.77", denyTime: "2026-09-22 09:45:10", expireTime: "2026-09-29 09:45:10", country: "NL")
            ]
        }
        
        if auditItems.isEmpty {
            auditItems = [
                SecurityAuditItem(
                    id: "sec_1",
                    severity: "warning",
                    title: "Default 'admin' Account Active",
                    description: "The default system administrator username 'admin' is susceptible to brute-force attacks.",
                    recommendation: "Create a personalized admin account and disable the built-in 'admin' user."
                ),
                SecurityAuditItem(
                    id: "sec_2",
                    severity: "critical",
                    title: "Unencrypted HTTP Port 5000 Exposed",
                    description: "Port 5000 allows plain text HTTP transmission of passwords over the network.",
                    recommendation: "Enable automatic HTTP to HTTPS redirect in External Access settings."
                ),
                SecurityAuditItem(
                    id: "sec_3",
                    severity: "info",
                    title: "Firewall Profile Active",
                    description: "Synology firewall is actively inspecting incoming traffic across all network adapters.",
                    recommendation: "Ensure strict rules for SSH and administrative interfaces."
                ),
                SecurityAuditItem(
                    id: "sec_4",
                    severity: "info",
                    title: "2-Factor Authentication",
                    description: "2FA (OTP) enforcement is enabled for all administrator group accounts.",
                    recommendation: "Consider requiring hardware security keys (FIDO2/WebAuthn)."
                )
            ]
        }
    }
}
