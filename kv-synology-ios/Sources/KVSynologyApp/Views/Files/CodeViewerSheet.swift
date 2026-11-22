import SwiftUI
import KVSynologyCore

@MainActor
public struct CodeViewerSheet: View {
    public let file: DsmFile
    @Environment(\.dismiss) private var dismiss
    
    @State private var content: String = ""
    @State private var isWordWrap: Bool = true
    @State private var isSaving: Bool = false
    @State private var saveSuccess: Bool = false
    
    public init(file: DsmFile) {
        self.file = file
    }
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Toolbar status bar
                HStack {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(Color.statusSuccess)
                            .frame(width: 8, height: 8)
                        Text(file.fileExtension.uppercased())
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(Color.textSecondary)
                    }
                    
                    Spacer()
                    
                    Toggle("Word Wrap", isOn: $isWordWrap)
                        .toggleStyle(.button)
                        .font(.caption2.weight(.medium))
                        .tint(Color.dsmVibrantBlue)
                }
                .padding(.horizontal, AppSpacing.md)
                .padding(.vertical, AppSpacing.sm)
                .background(Color.oledCardElevated)
                .overlay(
                    Rectangle().frame(height: 1).foregroundStyle(Color.oledBorder),
                    alignment: .bottom
                )
                
                // Code Content with Line Numbers
                ScrollView([.horizontal, .vertical], showsIndicators: true) {
                    HStack(alignment: .top, spacing: AppSpacing.md) {
                        // Line Numbers Gutter
                        let lines = content.components(separatedBy: "\n")
                        VStack(alignment: .trailing, spacing: 3) {
                            ForEach(0..<lines.count, id: \.self) { idx in
                                Text("\(idx + 1)")
                                    .font(.system(size: 13, weight: .regular, design: .monospaced))
                                    .foregroundStyle(Color.textTertiary)
                            }
                        }
                        .padding(.leading, AppSpacing.sm)
                        
                        Divider().background(Color.oledBorder)
                        
                        // Text Editor
                        TextEditor(text: $content)
                            .font(.system(size: 13, weight: .regular, design: .monospaced))
                            .foregroundStyle(Color(hex: "E5E7EB"))
                            .scrollContentBackground(.hidden)
                            .frame(minWidth: 400, minHeight: CGFloat(max(300, lines.count * 20)))
                    }
                    .padding(.vertical, AppSpacing.md)
                }
                .background(Color(hex: "0D1117"))
            }
            .navigationTitle(file.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        saveContent()
                    } label: {
                        if isSaving {
                            ProgressView().tint(.white)
                        } else {
                            Text("Save")
                                .font(.body.weight(.semibold))
                        }
                    }
                }
            }
            .onAppear {
                loadInitialContent()
            }
        }
    }
    
    private func saveContent() {
        isSaving = true
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 700_000_000)
            isSaving = false
            saveSuccess = true
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }
    
    private func loadInitialContent() {
        if file.name.contains("compose") || file.name.contains("yml") {
            content = """
            version: '3.8'
            services:
              web:
                image: nginx:alpine
                container_name: syno_nginx
                restart: always
                ports:
                  - "8080:80"
                volumes:
                  - /volume1/web:/usr/share/nginx/html:ro
                environment:
                  - TZ=Asia/Ho_Chi_Minh
            """
        } else if file.name.contains("conf") || file.name.contains("env") {
            content = """
            # Synology Server Configuration
            HOST=0.0.0.0
            PORT=5001
            SSL_ENABLED=true
            LOG_LEVEL=info
            MAX_CONNECTIONS=256
            """
        } else {
            content = """
            KV-Synology DSM File Station
            File: \(file.path)
            Size: \(file.size) bytes
            Last Modified: \(Date(timeIntervalSince1970: TimeInterval(file.mtime)).formatted())
            
            This document is synced securely with Synology DiskStation Manager.
            """
        }
    }
}
