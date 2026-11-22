import Foundation
import SwiftUI
import KVSynologyCore

public enum AiSender: String, Codable, Sendable {
    case user
    case assistant
    case system
    case tool
}

public struct AiToolCallInfo: Identifiable, Sendable {
    public let id = UUID()
    public let toolName: String
    public let parameters: String
    public let result: String?
    public let status: String // "running", "completed", "failed"
    
    public init(toolName: String, parameters: String = "", result: String? = nil, status: String = "completed") {
        self.toolName = toolName
        self.parameters = parameters
        self.result = result
        self.status = status
    }
}

public struct AiChatMessageItem: Identifiable, Sendable {
    public let id: String
    public let sender: AiSender
    public let text: String
    public let timestamp: Date
    public let toolCalls: [AiToolCallInfo]
    
    public init(id: String = UUID().uuidString, sender: AiSender, text: String, timestamp: Date = Date(), toolCalls: [AiToolCallInfo] = []) {
        self.id = id
        self.sender = sender
        self.text = text
        self.timestamp = timestamp
        self.toolCalls = toolCalls
    }
}

@Observable
@MainActor
public final class AiChatViewModel {
    public var messages: [AiChatMessageItem] = []
    public var inputText: String = ""
    public var isThinking: Bool = false
    public var activeToolName: String? = nil
    public var selectedModel: String = "gemini-2.5-flash"
    
    public let promptSuggestions = [
        "Check disk health",
        "Restart container",
        "Show blocked IPs",
        "Check system temps",
        "Clean Docker cache"
    ]
    
    public let availableModels = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "claude-3-5-sonnet",
        "gpt-4o"
    ]
    
    private let client: DSMClient?
    
    public init(client: DSMClient? = nil) {
        self.client = client
        setupInitialWelcome()
    }
    
    public func sendPromptSuggestion(_ suggestion: String) {
        inputText = suggestion
        sendMessage()
    }
    
    public func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        
        // Add User Message
        let userMsg = AiChatMessageItem(sender: .user, text: text)
        messages.append(userMsg)
        inputText = ""
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        
        Task {
            await generateResponse(for: text)
        }
    }
    
    public func clearHistory() {
        messages.removeAll()
        setupInitialWelcome()
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }
    
    private func generateResponse(for query: String) async {
        isThinking = true
        activeToolName = nil
        
        let q = query.lowercased()
        
        if q.contains("disk") || q.contains("storage") || q.contains("health") {
            activeToolName = "synology_get_storage_pools"
            try? await Task.sleep(nanoseconds: 700_000_000)
            
            let toolCall = AiToolCallInfo(
                toolName: "synology_get_storage_pools",
                parameters: "{\"pool_id\": \"pool_1\"}",
                result: "StoragePool 1 (RAID 5) healthy. Total: 16.0 TB, Used: 8.4 TB (52%). All 4 drives SMART status: Healthy.",
                status: "completed"
            )
            
            isThinking = false
            activeToolName = nil
            
            let response = AiChatMessageItem(
                sender: .assistant,
                text: "I checked your storage pools via the DSM MCP Server.\n\nAll drives are in **Healthy** SMART status with zero bad sectors. Storage Pool 1 has **7.6 TB free** out of 16.0 TB capacity (52% utilization). Data scrubbing was performed recently with no errors.",
                toolCalls: [toolCall]
            )
            messages.append(response)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            
        } else if q.contains("block") || q.contains("ip") {
            activeToolName = "synology_get_blocked_ips"
            try? await Task.sleep(nanoseconds: 600_000_000)
            
            let toolCall = AiToolCallInfo(
                toolName: "synology_get_blocked_ips",
                parameters: "{}",
                result: "4 IP addresses currently blocked in DSM Auto-Block list: 185.220.101.5 (DE), 45.154.255.89 (RU), 103.149.28.14 (CN), 193.32.162.77 (NL).",
                status: "completed"
            )
            
            isThinking = false
            activeToolName = nil
            
            let response = AiChatMessageItem(
                sender: .assistant,
                text: "Here are the currently blocked IP addresses:\n\n• `185.220.101.5` (Germany 🇩🇪) — Blocked 5m ago (SSH brute force)\n• `45.154.255.89` (Russia 🇷🇺) — Blocked 3h ago\n• `103.149.28.14` (China 🇨🇳) — Blocked 8h ago\n• `193.32.162.77` (Netherlands 🇳🇱) — Blocked 12h ago\n\nWould you like me to unblock any of these addresses or add a subnet to the permanent whitelist?",
                toolCalls: [toolCall]
            )
            messages.append(response)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            
        } else if q.contains("temp") || q.contains("cpu") {
            activeToolName = "synology_get_system_telemetry"
            try? await Task.sleep(nanoseconds: 500_000_000)
            
            let toolCall = AiToolCallInfo(
                toolName: "synology_get_system_telemetry",
                parameters: "{}",
                result: "CPU Temperature: 41°C. System Temperature: 38°C. Fan Mode: Quiet Mode (Normal).",
                status: "completed"
            )
            
            isThinking = false
            activeToolName = nil
            
            let response = AiChatMessageItem(
                sender: .assistant,
                text: "Your Synology NAS is operating well within optimal thermal limits:\n\n• **CPU Temperature**: 41°C\n• **System Board**: 38°C\n• **Drive Bays**: 32°C - 35°C\n• **Fan Speed**: Quiet Mode (all 2 fans spinning normally)",
                toolCalls: [toolCall]
            )
            messages.append(response)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            
        } else if q.contains("docker") || q.contains("container") {
            activeToolName = "docker_container_action"
            try? await Task.sleep(nanoseconds: 800_000_000)
            
            let toolCall = AiToolCallInfo(
                toolName: "docker_container_action",
                parameters: "{\"container\": \"vaultwarden\", \"action\": \"restart\"}",
                result: "Container 'vaultwarden' restarted successfully. Uptime: 3 seconds.",
                status: "completed"
            )
            
            isThinking = false
            activeToolName = nil
            
            let response = AiChatMessageItem(
                sender: .assistant,
                text: "Executed container lifecycle operation via Container Manager MCP tool.\n\nContainer `vaultwarden` has been restarted and is now healthy on port `8080`.",
                toolCalls: [toolCall]
            )
            messages.append(response)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            
        } else {
            try? await Task.sleep(nanoseconds: 900_000_000)
            isThinking = false
            activeToolName = nil
            
            let response = AiChatMessageItem(
                sender: .assistant,
                text: "I am connected to your Synology NAS with 42 Model Context Protocol (MCP) server tools. I can inspect system telemetry, manage Docker containers, query File Station, check SMART disk attributes, and adjust firewall rules. How can I help you today?"
            )
            messages.append(response)
        }
    }
    
    private func setupInitialWelcome() {
        messages = [
            AiChatMessageItem(
                sender: .assistant,
                text: "👋 Hello! I am your **KV-Synology AI Assistant**, powered by the Model Context Protocol (MCP).\n\nI have direct tool access to your DiskStation to inspect performance, execute container workflows, query file systems, and configure security rules. Select a suggestion below or ask any question."
            )
        ]
    }
}
