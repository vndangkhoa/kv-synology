import SwiftUI

public enum AppSpacing {
    /// 2 pt
    public static let xxs: CGFloat = 2
    /// 4 pt
    public static let xs: CGFloat = 4
    /// 8 pt
    public static let sm: CGFloat = 8
    /// 12 pt
    public static let md: CGFloat = 12
    /// 16 pt
    public static let lg: CGFloat = 16
    /// 20 pt
    public static let xl: CGFloat = 20
    /// 24 pt
    public static let xxl: CGFloat = 24
    /// 32 pt
    public static let xxxl: CGFloat = 32
}

public enum AppCornerRadius {
    /// 6 pt
    public static let xs: CGFloat = 6
    /// 8 pt
    public static let sm: CGFloat = 8
    /// 12 pt
    public static let md: CGFloat = 12
    /// 16 pt
    public static let lg: CGFloat = 16
    /// 20 pt
    public static let xl: CGFloat = 20
    /// Pill / circle
    public static let full: CGFloat = 999
}

// MARK: - Custom Card Modifiers
public struct NasCardModifier: ViewModifier {
    public var cornerRadius: CGFloat
    public var padding: CGFloat
    public var backgroundColor: Color
    public var borderColor: Color
    
    public init(
        cornerRadius: CGFloat = AppCornerRadius.lg,
        padding: CGFloat = AppSpacing.lg,
        backgroundColor: Color = .oledCard,
        borderColor: Color = .oledBorder
    ) {
        self.cornerRadius = cornerRadius
        self.padding = padding
        self.backgroundColor = backgroundColor
        self.borderColor = borderColor
    }
    
    public func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(borderColor.opacity(0.8), lineWidth: 1)
            )
    }
}

public struct NasStatusChipModifier: ViewModifier {
    public var color: Color
    
    public init(color: Color) {
        self.color = color
    }
    
    public func body(content: Content) -> some View {
        content
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, AppSpacing.sm)
            .padding(.vertical, AppSpacing.xs)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(color.opacity(0.35), lineWidth: 1)
            )
    }
}

public extension View {
    func nasCard(
        cornerRadius: CGFloat = AppCornerRadius.lg,
        padding: CGFloat = AppSpacing.lg,
        backgroundColor: Color = .oledCard,
        borderColor: Color = .oledBorder
    ) -> some View {
        modifier(NasCardModifier(
            cornerRadius: cornerRadius,
            padding: padding,
            backgroundColor: backgroundColor,
            borderColor: borderColor
        ))
    }
    
    func nasStatusChip(color: Color) -> some View {
        modifier(NasStatusChipModifier(color: color))
    }
    
    func nasScreenBackground() -> some View {
        self
            .background(Color.oledBackground.ignoresSafeArea())
    }
}
