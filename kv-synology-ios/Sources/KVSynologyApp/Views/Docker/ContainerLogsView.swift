import SwiftUI
import KVSynologyCore

@MainActor
public struct ContainerLogsView: View {
    public let container: DockerContainerDetails
    @Environment(\.dismiss) private var dismiss
    
    @State private var logs: [String] = []
    @State private var searchQuery: String = ""
    @State private var autoScroll: Bool = true
    @State private var isCopied: Bool = false
    
    public init(container: DockerContainerDetails) {
        self.container = container
    }
    
    public var filteredLogs: [String] {
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return logs }
        return logs.filter { $0.lowercased().contains(q) }
    }
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search & Filter Bar
                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Color.textSecondary)
                    
                    TextField("Filter logs...", text: $searchQuery)
                        .font(.caption)
                    
                    if !searchQuery.isEmpty {
                        Button {
                            searchQuery = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(Color.textSecondary)
                        }
                    }
                    
                    Divider().frame(height: 16)
                    
                    Toggle(isOn: $autoScroll) {
                        Text("Auto-Scroll")
                            .font(.caption2.weight(.medium))
                    }
                    .toggleStyle(.button)
                    .tint(Color.dsmVibrantBlue)
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
                .background(Color.oledCardElevated)
                .overlay(
                    Rectangle().frame(height: 1).foregroundStyle(Color.oledBorder),
                    alignment: .bottom
                )
                
                // Terminal Output Area
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 3) {
                            ForEach(Array(filteredLogs.enumerated()), id: \.offset) { index, line in
                                HStack(alignment: .top, spacing: AppSpacing.sm) {
                                    Text("\(index + 1)")
                                        .font(.system(size: 11, design: .monospaced))
                                        .foregroundStyle(Color.textTertiary)
                                        .frame(width: 32, alignment: .trailing)
                                    
                                    Text(line)
                                        .font(.system(size: 12, design: .monospaced))
                                        .foregroundStyle(colorForLogLine(line))
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                                .id(index)
                            }
                        }
                        .padding(AppSpacing.md)
                    }
                    .background(Color(hex: "080B10"))
                    .onChange(of: logs.count) {
                        if autoScroll, let last = logs.indices.last {
                            withAnimation {
                                proxy.scrollTo(last, anchor: .bottom)
                            }
                        }
                    }
                }
            }
            .navigationTitle("\(container.name) Logs")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: AppSpacing.md) {
                        Button {
                            copyLogs()
                        } label: {
                            Image(systemName: isCopied ? "checkmark" : "doc.on.doc")
                                .foregroundStyle(isCopied ? Color.statusSuccess : Color.textPrimary)
                        }
                        
                        Button {
                            reloadLogs()
                        } label: {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                }
            }
            .onAppear {
                reloadLogs()
            }
        }
    }
    
    private func copyLogs() {
        UIPasteboard.general.string = logs.joined(separator: "\n")
        isCopied = true
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            isCopied = false
        }
    }
    
    private func reloadLogs() {
        let timestamp = "2026-09-23T06:40:"
        logs = [
            "[\(timestamp)01Z] [info] Starting \(container.name) version 2.19.4...",
            "[\(timestamp)02Z] [info] Initializing Synology DSM Docker runtime engine",
            "[\(timestamp)05Z] [info] Listening on configured ports: \(container.ports.joined(separator: ", "))",
            "[\(timestamp)08Z] [info] Memory allocated: \(container.memoryUsage), CPU Limit: 2.0 cores",
            "[\(timestamp)12Z] [debug] Healthcheck ping: 200 OK (latency: 1.4ms)",
            "[\(timestamp)18Z] [info] Accepted connection from 192.168.1.15:52410",
            "[\(timestamp)22Z] [info] Processed GET /api/v1/status in 4.2ms - 200 OK",
            "[\(timestamp)25Z] [warn] High file descriptor usage: 142/1024",
            "[\(timestamp)30Z] [info] Database connection pool synced successfully",
            "[\(timestamp)36Z] [info] Heartbeat sent to Synology Notification Daemon",
            "[\(timestamp)42Z] [info] Worker thread pool running: 4 workers idle"
        ]
    }
    
    private func colorForLogLine(_ line: String) -> Color {
        if line.contains("[error]") || line.contains("failed") {
            return Color.statusError
        } else if line.contains("[warn]") {
            return Color.statusWarning
        } else if line.contains("[debug]") {
            return Color.textSecondary
        } else {
            return Color(hex: "00FF99") // Terminal bright green
        }
    }
}
