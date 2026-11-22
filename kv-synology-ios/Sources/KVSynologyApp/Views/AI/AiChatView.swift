import SwiftUI
import KVSynologyCore

@MainActor
public struct AiChatView: View {
    @State private var viewModel: AiChatViewModel
    @FocusState private var isInputFocused: Bool
    
    public init() {
        _viewModel = State(initialValue: AiChatViewModel())
    }
    
    public init(viewModel: AiChatViewModel) {
        _viewModel = State(initialValue: viewModel)
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // MCP Active Tools Header
            mcpHeaderBanner
            
            // Chat ScrollView
            chatMessagesView
            
            // Prompt Suggestions Carousel
            promptSuggestionsBar
            
            // Input Bar
            chatInputBar
        }
        .navigationTitle("AI Assistant (MCP)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Section("AI Intelligence Model") {
                        ForEach(viewModel.availableModels, id: \.self) { model in
                            Button {
                                viewModel.selectedModel = model
                            } label: {
                                HStack {
                                    Text(model)
                                    if viewModel.selectedModel == model {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    }
                    
                    Section {
                        Button(role: .destructive) {
                            viewModel.clearHistory()
                        } label: {
                            Label("Clear Chat History", systemImage: "trash")
                        }
                    }
                } label: {
                    Image(systemName: "sparkles")
                }
            }
        }
    }
    
    // MARK: - Header Banner
    
    private var mcpHeaderBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "cpu.fill")
                .foregroundColor(.accentColor)
                .font(.caption)
            Text("Model Context Protocol • 42 Synology Tools Active")
                .font(.caption2.bold())
                .foregroundColor(.secondary)
            Spacer()
            Text(viewModel.selectedModel)
                .font(.system(size: 10, design: .monospaced))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color(.secondarySystemFill))
                .clipShape(Capsule())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
        .background(Color(.systemGray6))
    }
    
    // MARK: - Chat Messages
    
    private var chatMessagesView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.messages) { msg in
                        ChatMessageRow(message: msg)
                            .id(msg.id)
                    }
                    
                    // Typing / Tool Call Indicator
                    if viewModel.isThinking {
                        HStack(spacing: 8) {
                            if let tool = viewModel.activeToolName {
                                HStack(spacing: 6) {
                                    ProgressView().controlSize(.small)
                                    Text("Executing MCP Tool: \(tool)...")
                                        .font(.caption.monospaced())
                                        .foregroundColor(.accentColor)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Color.accentColor.opacity(0.12))
                                .clipShape(Capsule())
                            } else {
                                TypingIndicator()
                            }
                            Spacer()
                        }
                        .padding(.horizontal)
                        .id("typingIndicator")
                    }
                }
                .padding()
            }
            .onChange(of: viewModel.messages.count) {
                if let last = viewModel.messages.last {
                    withAnimation {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
            .onChange(of: viewModel.isThinking) {
                if viewModel.isThinking {
                    withAnimation {
                        proxy.scrollTo("typingIndicator", anchor: .bottom)
                    }
                }
            }
        }
    }
    
    // MARK: - Suggestions Bar
    
    private var promptSuggestionsBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(viewModel.promptSuggestions, id: \.self) { suggestion in
                    Button {
                        viewModel.sendPromptSuggestion(suggestion)
                    } label: {
                        Text(suggestion)
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(.secondarySystemFill))
                            .foregroundColor(.primary)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
        }
    }
    
    // MARK: - Chat Input Bar
    
    private var chatInputBar: some View {
        HStack(spacing: 8) {
            TextField("Ask AI about your Synology...", text: $viewModel.inputText, axis: .vertical)
                .lineLimit(1...4)
                .focused($isInputFocused)
                .padding(10)
                .background(Color(.secondarySystemFill))
                .cornerRadius(18)
            
            Button {
                viewModel.sendMessage()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty ? .gray : .accentColor)
            }
            .disabled(viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty || viewModel.isThinking)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }
}

// MARK: - Chat Message Row

@MainActor
struct ChatMessageRow: View {
    let message: AiChatMessageItem
    
    var isUser: Bool {
        message.sender == .user
    }
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isUser {
                Spacer(minLength: 40)
            } else {
                // Assistant Avatar
                ZStack {
                    Circle()
                        .fill(Color.accentColor.opacity(0.15))
                        .frame(width: 32, height: 32)
                    Image(systemName: "sparkles")
                        .foregroundColor(.accentColor)
                        .font(.caption)
                }
            }
            
            VStack(alignment: isUser ? .trailing : .leading, spacing: 6) {
                // Tool Call Badges if present
                if !message.toolCalls.isEmpty {
                    ForEach(message.toolCalls) { tool in
                        ToolExecutionCard(tool: tool)
                    }
                }
                
                // Text Bubble
                Text(LocalizedStringKey(message.text))
                    .font(.body)
                    .foregroundColor(isUser ? .white : .primary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(isUser ? Color.accentColor : Color(.secondarySystemFill))
                    .cornerRadius(18)
                
                Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 4)
            }
            
            if !isUser {
                Spacer(minLength: 40)
            }
        }
    }
}

// MARK: - Tool Execution Card

@MainActor
struct ToolExecutionCard: View {
    let tool: AiToolCallInfo
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Image(systemName: "wrench.and.screwdriver.fill")
                    .foregroundColor(.orange)
                    .font(.caption2)
                Text(tool.toolName)
                    .font(.caption2.bold())
                    .fontDesign(.monospaced)
                Spacer()
                Text("MCP Tool")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundColor(.secondary)
            }
            
            if let res = tool.result {
                Text(res)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(8)
        .background(Color(.tertiarySystemFill))
        .cornerRadius(10)
    }
}

// MARK: - Typing Indicator

@MainActor
struct TypingIndicator: View {
    @State private var dotOffset: CGFloat = 0
    
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { i in
                Circle()
                    .fill(Color.secondary)
                    .frame(width: 7, height: 7)
                    .offset(y: dotOffset)
                    .animation(
                        Animation.easeInOut(duration: 0.5)
                            .repeatForever()
                            .delay(Double(i) * 0.15),
                        value: dotOffset
                    )
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(.secondarySystemFill))
        .clipShape(Capsule())
        .onAppear {
            dotOffset = -4
        }
    }
}
