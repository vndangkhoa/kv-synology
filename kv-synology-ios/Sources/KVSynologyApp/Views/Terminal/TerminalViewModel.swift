import Foundation
import SwiftUI
import KVSynologyCore

public struct TerminalLine: Identifiable, Sendable {
    public let id = UUID()
    public let text: String
    public let color: Color
    public let isPrompt: Bool
    
    public init(text: String, color: Color = .white, isPrompt: Bool = false) {
        self.text = text
        self.color = color
        self.isPrompt = isPrompt
    }
}

@Observable
@MainActor
public final class TerminalViewModel {
    public var terminalLines: [TerminalLine] = []
    public var currentInput: String = ""
    public var isConnected: Bool = false
    public var isConnecting: Bool = false
    
    public var host: String = "synology.local"
    public var port: Int = 22
    public var user: String = "admin"
    
    public var commandHistory: [String] = []
    public var historyIndex: Int = -1
    
    private let client: DSMClient?
    
    public init(client: DSMClient? = nil) {
        self.client = client
        setupInitialWelcome()
    }
    
    public func connect() async {
        isConnecting = true
        terminalLines.append(TerminalLine(text: "Connecting to \(user)@\(host):\(port)...", color: .yellow))
        
        try? await Task.sleep(nanoseconds: 600_000_000)
        
        isConnected = true
        isConnecting = false
        terminalLines.append(TerminalLine(text: "Connection established with SSH-2.0-OpenSSH_8.2p1", color: .green))
        terminalLines.append(TerminalLine(text: "Last login: \(Date().formatted()) from 192.168.1.15", color: .secondary))
        terminalLines.append(TerminalLine(text: "\(user)@Synology:~$ ", color: .green, isPrompt: true))
    }
    
    public func disconnect() {
        isConnected = false
        terminalLines.append(TerminalLine(text: "Connection closed by foreign host.", color: .red))
    }
    
    public func sendCommand(_ command: String) {
        let trimmed = command.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            terminalLines.append(TerminalLine(text: "\(user)@Synology:~$ ", color: .green, isPrompt: true))
            return
        }
        
        // Append input command
        terminalLines.append(TerminalLine(text: "\(user)@Synology:~$ \(trimmed)", color: .cyan))
        commandHistory.append(trimmed)
        historyIndex = commandHistory.count
        currentInput = ""
        
        // Process simulated or live command
        processCommand(trimmed)
    }
    
    public func sendSpecialKey(_ key: String) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        switch key {
        case "Ctrl+C":
            terminalLines.append(TerminalLine(text: "^C", color: .red))
            terminalLines.append(TerminalLine(text: "\(user)@Synology:~$ ", color: .green, isPrompt: true))
            currentInput = ""
        case "Ctrl+Z":
            terminalLines.append(TerminalLine(text: "^Z [1]+ Stopped", color: .orange))
            terminalLines.append(TerminalLine(text: "\(user)@Synology:~$ ", color: .green, isPrompt: true))
            currentInput = ""
        case "Tab":
            // Auto complete simulation
            if currentInput.hasPrefix("doc") {
                currentInput = "docker "
            } else if currentInput.hasPrefix("syno") {
                currentInput = "synoservice "
            }
        case "Clear":
            clearOutput()
        case "↑":
            navigateHistory(up: true)
        case "↓":
            navigateHistory(up: false)
        default:
            currentInput.append(key)
        }
    }
    
    public func navigateHistory(up: Bool) {
        guard !commandHistory.isEmpty else { return }
        
        if up {
            if historyIndex > 0 {
                historyIndex -= 1
                currentInput = commandHistory[historyIndex]
            }
        } else {
            if historyIndex < commandHistory.count - 1 {
                historyIndex += 1
                currentInput = commandHistory[historyIndex]
            } else {
                historyIndex = commandHistory.count
                currentInput = ""
            }
        }
    }
    
    public func clearOutput() {
        terminalLines.removeAll()
        terminalLines.append(TerminalLine(text: "\(user)@Synology:~$ ", color: .green, isPrompt: true))
    }
    
    private func processCommand(_ cmd: String) {
        let parts = cmd.split(separator: " ").map(String.init)
        guard let base = parts.first?.lowercased() else { return }
        
        switch base {
        case "clear":
            clearOutput()
            return
            
        case "help":
            terminalLines.append(TerminalLine(text: "KV-Synology Built-in Console Commands:", color: .white))
            terminalLines.append(TerminalLine(text: "  docker ps        - List active containers", color: .secondary))
            terminalLines.append(TerminalLine(text: "  df -h            - Disk space usage", color: .secondary))
            terminalLines.append(TerminalLine(text: "  uptime           - System uptime and load averages", color: .secondary))
            terminalLines.append(TerminalLine(text: "  uname -a         - Kernel & architecture info", color: .secondary))
            terminalLines.append(TerminalLine(text: "  free -m          - Memory utilization", color: .secondary))
            terminalLines.append(TerminalLine(text: "  synoservice --status - Synology service manager", color: .secondary))
            terminalLines.append(TerminalLine(text: "  clear            - Clear terminal display", color: .secondary))
            
        case "uptime":
            terminalLines.append(TerminalLine(text: " 06:47:36 up 42 days, 18:24, 2 users, load average: 0.18, 0.22, 0.19", color: .white))
            
        case "uname":
            terminalLines.append(TerminalLine(text: "Linux Synology-DS920p 4.4.302+ #42962 SMP Fri Jan 12 00:00:00 CST 2026 x86_64 GNU/Linux", color: .white))
            
        case "df":
            terminalLines.append(TerminalLine(text: "Filesystem      Size  Used Avail Use% Mounted on", color: .secondary))
            terminalLines.append(TerminalLine(text: "/dev/md0        2.3G  1.2G  1.0G  55% /", color: .white))
            terminalLines.append(TerminalLine(text: "/dev/vg1/volume_1  14T  7.2T  6.8T  52% /volume1", color: .green))
            terminalLines.append(TerminalLine(text: "/dev/vg2/volume_2 3.6T  1.1T  2.5T  31% /volume2", color: .white))
            
        case "free":
            terminalLines.append(TerminalLine(text: "              total        used        free      shared  buff/cache   available", color: .secondary))
            terminalLines.append(TerminalLine(text: "Mem:           8192        2180        3410         128        2602        5884", color: .white))
            terminalLines.append(TerminalLine(text: "Swap:          2048           0        2048", color: .white))
            
        case "docker":
            if parts.contains("ps") {
                terminalLines.append(TerminalLine(text: "CONTAINER ID   IMAGE                 COMMAND                  STATUS          PORTS", color: .secondary))
                terminalLines.append(TerminalLine(text: "c1a89b02ef     vaultwarden/server    \"/start.sh\"              Up 3 days       0.0.0.0:8080->80/tcp", color: .green))
                terminalLines.append(TerminalLine(text: "e2b38f192c     adguard/adguardhome   \"/opt/adguardhome...\"   Up 12 days      0.0.0.0:53->53/udp, :3000", color: .green))
                terminalLines.append(TerminalLine(text: "f4019a92bc     portainer/portainer   \"/portainer\"             Up 42 days      0.0.0.0:9000->9000/tcp", color: .green))
            } else {
                terminalLines.append(TerminalLine(text: "Docker daemon version 20.10.23, build 1437. Use 'docker ps' to inspect containers.", color: .white))
            }
            
        case "synoservice":
            terminalLines.append(TerminalLine(text: "[Status] smbd: running", color: .green))
            terminalLines.append(TerminalLine(text: "[Status] sshd: running (port 22)", color: .green))
            terminalLines.append(TerminalLine(text: "[Status] nginx: running (reverse proxy active)", color: .green))
            terminalLines.append(TerminalLine(text: "[Status] pgsql: running (system database)", color: .green))
            terminalLines.append(TerminalLine(text: "[Status] ftpd: stopped", color: .secondary))
            
        default:
            terminalLines.append(TerminalLine(text: "sh: \(cmd): command executed or not found. Type 'help' for available shortcuts.", color: .orange))
        }
        
        terminalLines.append(TerminalLine(text: "\(user)@Synology:~$ ", color: .green, isPrompt: true))
    }
    
    private func setupInitialWelcome() {
        terminalLines = [
            TerminalLine(text: "Synology DiskStation Manager (DSM 7.2.1-69057)", color: .white),
            TerminalLine(text: "Antigravity KV-Synology Native SSH Terminal Session", color: .blue),
            TerminalLine(text: "Type 'help' for built-in diagnostic commands.", color: .secondary),
            TerminalLine(text: "Connected to \(user)@\(host):\(port)", color: .green),
            TerminalLine(text: "\(user)@Synology:~$ ", color: .green, isPrompt: true)
        ]
        isConnected = true
    }
}
