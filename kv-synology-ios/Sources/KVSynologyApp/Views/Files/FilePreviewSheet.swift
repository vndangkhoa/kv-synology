import SwiftUI
import AVKit
import KVSynologyCore

@MainActor
public struct FilePreviewSheet: View {
    public let file: DsmFile
    @Environment(\.dismiss) private var dismiss
    
    @State private var isPlayingAudio: Bool = false
    @State private var audioProgress: Double = 0.35
    @State private var imageScale: CGFloat = 1.0
    
    public init(file: DsmFile) {
        self.file = file
    }
    
    public var body: some View {
        NavigationStack {
            ZStack {
                Color.oledBackground.ignoresSafeArea()
                
                if file.isVideo {
                    videoPlayerView
                } else if file.isAudio {
                    audioPlayerView
                } else if file.isImage {
                    imagePreviewView
                } else {
                    genericDocumentView
                }
            }
            .navigationTitle(file.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .font(.body.weight(.semibold))
                }
            }
        }
    }
    
    // MARK: - Video Player
    private var videoPlayerView: some View {
        VStack(spacing: AppSpacing.md) {
            // High-res preview container with AVPlayer mockup
            ZStack {
                RoundedRectangle(cornerRadius: AppCornerRadius.lg)
                    .fill(Color.black)
                    .frame(height: 320)
                
                VStack(spacing: AppSpacing.md) {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(Color.dsmVibrantBlue)
                    
                    Text("Streaming via Synology Transcoder")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: AppCornerRadius.lg)
                    .stroke(Color.oledBorder, lineWidth: 1)
            )
            .padding(AppSpacing.lg)
            
            fileDetailsCard
            
            Spacer()
        }
    }
    
    // MARK: - Audio Player
    private var audioPlayerView: some View {
        VStack(spacing: AppSpacing.xl) {
            Spacer()
            
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.statusPurple.opacity(0.3), Color.dsmVibrantBlue.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 160, height: 160)
                
                Image(systemName: "music.note")
                    .font(.system(size: 64, weight: .bold))
                    .foregroundStyle(Color.statusPurple)
            }
            
            VStack(spacing: AppSpacing.xs) {
                Text(file.name)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.textPrimary)
                    .multilineTextAlignment(.center)
                
                Text("File Station Audio Streamer")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
            }
            
            // Audio Scrubber
            VStack(spacing: AppSpacing.xs) {
                Slider(value: $audioProgress, in: 0...1)
                    .tint(Color.statusPurple)
                
                HStack {
                    Text("01:24")
                        .font(.caption2)
                        .foregroundStyle(Color.textTertiary)
                    Spacer()
                    Text("03:48")
                        .font(.caption2)
                        .foregroundStyle(Color.textTertiary)
                }
            }
            .padding(.horizontal, AppSpacing.xl)
            
            // Controls
            HStack(spacing: AppSpacing.xxl) {
                Button {} label: {
                    Image(systemName: "backward.fill")
                        .font(.title2)
                        .foregroundStyle(Color.textPrimary)
                }
                
                Button {
                    isPlayingAudio.toggle()
                } label: {
                    Image(systemName: isPlayingAudio ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(Color.statusPurple)
                }
                
                Button {} label: {
                    Image(systemName: "forward.fill")
                        .font(.title2)
                        .foregroundStyle(Color.textPrimary)
                }
            }
            
            Spacer()
        }
        .padding(AppSpacing.lg)
    }
    
    // MARK: - Image Preview
    private var imagePreviewView: some View {
        GeometryReader { proxy in
            ScrollView([.horizontal, .vertical], showsIndicators: false) {
                ZStack {
                    RoundedRectangle(cornerRadius: AppCornerRadius.md)
                        .fill(
                            LinearGradient(
                                colors: [Color(hex: "1F2937"), Color(hex: "111827")],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: proxy.size.width - 32, height: 350)
                    
                    VStack(spacing: AppSpacing.sm) {
                        Image(systemName: "photo.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(Color.dsmVibrantBlue.opacity(0.8))
                        Text(file.name)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(Color.textPrimary)
                    }
                }
                .scaleEffect(imageScale)
                .gesture(
                    MagnificationGesture()
                        .onChanged { val in imageScale = val }
                        .onEnded { _ in imageScale = max(1.0, min(imageScale, 3.0)) }
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
    
    // MARK: - Generic Document
    private var genericDocumentView: some View {
        VStack(spacing: AppSpacing.lg) {
            Spacer()
            
            ZStack {
                Circle()
                    .fill(Color.oledCardElevated)
                    .frame(width: 100, height: 100)
                Image(systemName: "doc.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.statusWarning)
            }
            
            VStack(spacing: AppSpacing.xs) {
                Text(file.name)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.textPrimary)
                Text(formatSize(file.size))
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
            }
            
            fileDetailsCard
            
            Spacer()
        }
        .padding(AppSpacing.lg)
    }
    
    private var fileDetailsCard: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text("File Information")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.textSecondary)
                .textCase(.uppercase)
            
            Divider().background(Color.oledBorder)
            
            HStack {
                Text("Path")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                Spacer()
                Text(file.path)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.textPrimary)
            }
            
            HStack {
                Text("Size")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                Spacer()
                Text(formatSize(file.size))
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.textPrimary)
            }
            
            HStack {
                Text("Owner")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                Spacer()
                Text(file.owner ?? "admin")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.textPrimary)
            }
        }
        .nasCard()
    }
    
    private func formatSize(_ bytes: Int64) -> String {
        let kb = Double(bytes) / 1024.0
        if kb < 1024 {
            return String(format: "%.1f KB", kb)
        } else {
            return String(format: "%.1f MB", kb / 1024.0)
        }
    }
}
