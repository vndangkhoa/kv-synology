import SwiftUI
import KVSynologyCore

@main
@MainActor
public struct KVSynologyApp: App {
    @State private var appState = AppState()
    
    public init() {}
    
    public var body: some Scene {
        WindowGroup {
            AppNavigation()
                .environment(appState)
                .preferredColorScheme(appState.isPureOledBlack ? .dark : nil)
                .tint(Color.dsmVibrantBlue)
        }
    }
}
