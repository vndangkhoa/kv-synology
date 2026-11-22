import SwiftUI
import KVSynologyCore

@MainActor
public struct TerminalView: View {
    @State private var viewModel: TerminalViewModel
    @FocusState private var isInputFocused: Bool
    
    private let quickCommands = [
        "docker ps",
        "df -h",
        "uptime",
        "free -m",
        "uname -a",
        "synoservice --status",
        "clear"
    ]
    
    private let accessoryKeys = [
        "Esc", "Tab", "Ctrl+C", "Ctrl+Z", "|", "/", "~", "-", "↑", "↓", "Clear"
    ]
    
    public init() {
        _viewModel = State(initialValue: TerminalViewModel())
    }
    
    public init(viewModel: TerminalViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Connection Status Header Bar
            connectionStatusBar
            
            // Terminal Console Canvas (OLED Black)
            terminalCanvas
            
            // Accessory Keys Toolbar (Floating above keyboard)
            accessoryKeyboardBar
            
            // Input Prompt Bar
            inputPromptBar
        }
        .background(Color.black.ignoresSafeArea())
        .navigationTitle("SSH Console")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Section("Quick Diagnostic Commands") {
                        ForEach(quickCommands, id: \.self) { cmd in
                            Button(cmd) {
                                viewModel.sendCommand(cmd)
                            }
                        }
                    }
                    
                    Section {
                        Button(role: .destructive) {
                            viewModel.clearOutput()
                        } label: {
                            Label("Clear Screen", systemImage: "trash")
                        }
                        
                        Button {
                            if viewModel.isConnected {
                                viewModel.disconnect()
                            } else {
                                Task { await viewModel.connect() }
                            }
                        } label: {
                            Label(
                                viewModel.isConnected ? "Disconnect" : "Reconnect",
                                systemImage: viewModel.isConnected ? "network.slash" : "network"
                            )
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundColor(.white)
                }
            }
        }
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }
    
    // MARK: - Connection Status Header
    
    private var connectionStatusBar: some View {
        HStack {
            Circle()
                .fill(viewModel.isConnected ? Color.green : Color.red)
                .frame(width: 8, height: 8)
            
            Text(viewModel.isConnected ? "\(viewModel.user)@\(viewModel.host):\(viewModel.port)" : "Disconnected")
                .font(.caption.monospaced())
                .foregroundColor(.white.opacity(0.8))
            
            Spacer()
            
            if viewModel.isConnecting {
                ProgressView()
                    .controlSize(.small)
                    .tint(.white)
            } else {
                Text("UTF-8 • xterm-256color")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.white.opacity(0.5))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
        .background(Color(.systemGray6).opacity(0.2))
    }
    
    // MARK: - Terminal Canvas
    
    private var terminalCanvas: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 3) {
                    ForEach(viewModel.terminalLines) { line in
                        Text(line.text)
                            .font(.system(size: 13, design: .monospaced))
                            .foregroundColor(line.color)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .id(line.id)
                    }
                }
                .padding(12)
            }
            .background(Color.black)
            .onChange(of: viewModel.terminalLines.count) {
                if let last = viewModel.terminalLines.last {
                    withAnimation(.easeOut(duration: 0.1)) {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
            .onTapGesture {
                isInputFocused = true
            }
        }
    }
    
    // MARK: - Accessory Keyboard Bar
    
    private var accessoryKeyboardBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(accessoryKeys, id: \.self) { key in
                    Button {
                        viewModel.sendSpecialKey(key)
                    } label: {
                        Text(key)
                            .font(.system(size: 12, weight: .semibold, design: .monospaced))
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color(.systemGray5).opacity(0.35))
                            .cornerRadius(6)
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
        }
        .background(Color(.systemGray6).opacity(0.15))
    }
    
    // MARK: - Input Prompt Bar
    
    private var inputPromptBar: some View {
        HStack(spacing: 8) {
            Text("$")
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundColor(.green)
            
            TextField("Enter command...", text: $viewModel.currentInput)
                .font(.system(size: 14, design: .monospaced))
                .foregroundColor(.white)
                .focused($isInputFocused)
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .onSubmit {
                    viewModel.sendCommand(viewModel.currentInput)
                }
            
            Button {
                viewModel.sendCommand(viewModel.currentInput)
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title3)
                    .foregroundColor(.accentColor)
            }
            .disabled(viewModel.currentInput.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(.systemGray6).opacity(0.3))
    }
}
