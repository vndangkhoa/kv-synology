import SwiftUI

public extension Color {
    // MARK: - Brand & Accent Colors
    /// Synology DSM Brand Blue
    static let dsmBlue = Color(hex: "0066CC")
    /// Vibrant iOS DSM Blue
    static let dsmVibrantBlue = Color(hex: "0A84FF")
    /// Secondary Teal Accent
    static let dsmTeal = Color(hex: "30B0C7")
    
    // MARK: - OLED True Black & Dark Surfaces
    /// OLED Pure Black background (#000000)
    static let oledBackground = Color(hex: "000000")
    /// Primary dark card surface (#121214)
    static let oledCard = Color(hex: "121214")
    /// Elevated dark surface (#1C1C1E)
    static let oledCardElevated = Color(hex: "1C1C1E")
    /// Secondary elevated surface (#252528)
    static let oledCardSubtle = Color(hex: "252528")
    /// Border stroke color (#2C2C2E)
    static let oledBorder = Color(hex: "2C2C2E")
    /// Subtle divider line color (#3A3A3C)
    static let oledDivider = Color(hex: "3A3A3C")
    
    // MARK: - Text Colors
    static let textPrimary = Color(hex: "FFFFFF")
    static let textSecondary = Color(hex: "8E8E93")
    static let textTertiary = Color(hex: "636366")
    
    // MARK: - Semantic Status Colors
    /// Status success green (#30D158)
    static let statusSuccess = Color(hex: "30D158")
    /// Status warning orange (#FF9F0A)
    static let statusWarning = Color(hex: "FF9F0A")
    /// Status error red (#FF453A)
    static let statusError = Color(hex: "FF453A")
    /// Status info cyan (#64D2FF)
    static let statusInfo = Color(hex: "64D2FF")
    /// Status purple (#BF5AF2)
    static let statusPurple = Color(hex: "BF5AF2")
    
    // MARK: - Hardware & Telemetry Colors
    static let cpuColor = Color(hex: "0A84FF")
    static let ramColor = Color(hex: "30D158")
    static let networkRxColor = Color(hex: "64D2FF")
    static let networkTxColor = Color(hex: "BF5AF2")
    static let diskReadColor = Color(hex: "FF9F0A")
    static let diskWriteColor = Color(hex: "FF453A")

    // MARK: - Hex Initializer
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
