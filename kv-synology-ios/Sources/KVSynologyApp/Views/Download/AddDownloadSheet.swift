import SwiftUI
import KVSynologyCore

@MainActor
public struct AddDownloadSheet: View {
    @Environment(\.dismiss) private var dismiss
    public let onAdd: (String, String, Bool) -> Void
    
    @State private var downloadUrl: String = ""
    @State private var destinationFolder: String = "/volume1/downloads"
    @State private var startImmediately: Bool = true
    
    public init(onAdd: @escaping (String, String, Bool) -> Void) {
        self.onAdd = onAdd
    }
    
    public var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Task Source")) {
                    VStack(alignment: .leading, spacing: AppSpacing.sm) {
                        Text("URL or Magnet Link")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.textSecondary)
                        
                        TextField("https://... or magnet:?xt=...", text: $downloadUrl)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        
                        Button {
                            if let clip = UIPasteboard.general.string {
                                downloadUrl = clip
                            }
                        } label: {
                            Label("Paste from Clipboard", systemImage: "doc.on.clipboard")
                                .font(.caption.weight(.medium))
                        }
                    }
                }
                
                Section(header: Text("Target Location")) {
                    TextField("Destination Directory", text: $destinationFolder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    
                    Toggle("Start Immediately", isOn: $startImmediately)
                        .tint(Color.dsmVibrantBlue)
                }
            }
            .navigationTitle("New Download")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        onAdd(downloadUrl, destinationFolder, startImmediately)
                        dismiss()
                    }
                    .font(.body.weight(.semibold))
                    .disabled(downloadUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
