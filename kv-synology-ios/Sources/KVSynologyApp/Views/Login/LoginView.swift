import SwiftUI
import KVSynologyCore

@MainActor
public struct LoginView: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = LoginViewModel()
    @State private var showSavedProfilesSheet: Bool = false
    @State private var showPassword: Bool = false
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AppSpacing.xxl) {
                    // Header Logo & Title
                    headerView
                    
                    // Mode Picker (QuickConnect vs Direct)
                    modePickerView
                    
                    // Main Form Card
                    formCardView
                    
                    // Actions (Login & Demo)
                    actionButtonsView
                    
                    // Saved Profiles Shortcuts
                    if !appState.savedProfiles.isEmpty {
                        savedProfilesSection
                    }
                }
                .padding(.horizontal, AppSpacing.lg)
                .padding(.vertical, AppSpacing.xl)
            }
            .background(Color.oledBackground.ignoresSafeArea())
            .alert("Connection Error", isPresented: $viewModel.showErrorAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "Failed to connect to Synology DSM.")
            }
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        VStack(spacing: AppSpacing.sm) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.dsmVibrantBlue.opacity(0.3), Color.dsmBlue.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)
                
                Image(systemName: "server.rack")
                    .font(.system(size: 38, weight: .bold))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.dsmVibrantBlue, Color.statusInfo],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }
            
            Text(AppStrings.tr("login.title", lang: appState.language))
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(Color.textPrimary)
            
            Text(AppStrings.tr("login.subtitle", lang: appState.language))
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
        }
        .padding(.top, AppSpacing.md)
    }
    
    // MARK: - Mode Picker
    private var modePickerView: some View {
        Picker("Connection Mode", selection: $viewModel.mode) {
            Text(AppStrings.tr("login.tab.quickconnect", lang: appState.language)).tag(LoginMode.quickConnect)
            Text(AppStrings.tr("login.tab.direct", lang: appState.language)).tag(LoginMode.direct)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, AppSpacing.sm)
    }
    
    // MARK: - Form Card
    private var formCardView: some View {
        VStack(spacing: AppSpacing.md) {
            if viewModel.mode == .quickConnect {
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Label("QuickConnect ID", systemImage: "link.circle.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.textSecondary)
                    
                    TextField(AppStrings.tr("login.qc_placeholder", lang: appState.language), text: $viewModel.quickConnectId)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(AppSpacing.md)
                        .background(Color.oledCardElevated)
                        .clipShape(RoundedRectangle(cornerRadius: AppCornerRadius.md))
                }
            } else {
                VStack(alignment: .leading, spacing: AppSpacing.xs) {
                    Label("Host / IP Address", systemImage: "globe")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.textSecondary)
                    
                    TextField(AppStrings.tr("login.host_placeholder", lang: appState.language), text: $viewModel.host)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .padding(AppSpacing.md)
                        .background(Color.oledCardElevated)
                        .clipShape(RoundedRectangle(cornerRadius: AppCornerRadius.md))
                }
                
                HStack(spacing: AppSpacing.md) {
                    VStack(alignment: .leading, spacing: AppSpacing.xs) {
                        Label(AppStrings.tr("login.port_label", lang: appState.language), systemImage: "number")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.textSecondary)
                        
                        TextField("5001", text: $viewModel.portString)
                            .keyboardType(.numberPad)
                            .padding(AppSpacing.md)
                            .background(Color.oledCardElevated)
                            .clipShape(RoundedRectangle(cornerRadius: AppCornerRadius.md))
                    }
                    .frame(width: 100)
                    
                    Toggle(isOn: $viewModel.useHttps) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("HTTPS")
                                .font(.body.weight(.medium))
                            Text("TLS Encrypted")
                                .font(.caption2)
                                .foregroundStyle(Color.textSecondary)
                        }
                    }
                    .tint(Color.dsmVibrantBlue)
                    .padding(.top, AppSpacing.lg)
                }
            }
            
            Divider().background(Color.oledBorder)
            
            // Username
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Label(AppStrings.tr("login.account_label", lang: appState.language), systemImage: "person.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.textSecondary)
                
                TextField("DSM Username", text: $viewModel.account)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .padding(AppSpacing.md)
                    .background(Color.oledCardElevated)
                    .clipShape(RoundedRectangle(cornerRadius: AppCornerRadius.md))
            }
            
            // Password
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                Label(AppStrings.tr("login.password_label", lang: appState.language), systemImage: "lock.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.textSecondary)
                
                HStack {
                    if showPassword {
                        TextField("Password", text: $viewModel.password)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    } else {
                        SecureField("Password", text: $viewModel.password)
                    }
                    
                    Button {
                        showPassword.toggle()
                    } label: {
                        Image(systemName: showPassword ? "eye.slash" : "eye")
                            .foregroundStyle(Color.textSecondary)
                    }
                }
                .padding(AppSpacing.md)
                .background(Color.oledCardElevated)
                .clipShape(RoundedRectangle(cornerRadius: AppCornerRadius.md))
            }
            
            // OTP Field (Shows always or when challenged)
            VStack(alignment: .leading, spacing: AppSpacing.xs) {
                HStack {
                    Label(AppStrings.tr("login.otp_label", lang: appState.language), systemImage: "key.fill")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.textSecondary)
                    Spacer()
                    if viewModel.isOtpRequired {
                        Text("Required")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(Color.statusWarning)
                    } else {
                        Text("Optional")
                            .font(.caption2)
                            .foregroundStyle(Color.textTertiary)
                    }
                }
                
                TextField("123456", text: $viewModel.otpCode)
                    .keyboardType(.numberPad)
                    .padding(AppSpacing.md)
                    .background(Color.oledCardElevated)
                    .clipShape(RoundedRectangle(cornerRadius: AppCornerRadius.md))
            }
            
            Divider().background(Color.oledBorder)
            
            // Toggles
            Toggle(isOn: $viewModel.ignoreCert) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(AppStrings.tr("login.ignore_cert", lang: appState.language))
                        .font(.caption.weight(.medium))
                    Text("Allows self-signed SSL/TLS certificates")
                        .font(.caption2)
                        .foregroundStyle(Color.textSecondary)
                }
            }
            .tint(Color.dsmVibrantBlue)
            
            Toggle(isOn: $viewModel.rememberProfile) {
                Text(AppStrings.tr("login.remember_me", lang: appState.language))
                    .font(.caption.weight(.medium))
            }
            .tint(Color.dsmVibrantBlue)
        }
        .nasCard()
    }
    
    // MARK: - Actions
    private var actionButtonsView: some View {
        VStack(spacing: AppSpacing.md) {
            Button {
                Task {
                    await viewModel.performLogin(appState: appState)
                }
            } label: {
                HStack(spacing: AppSpacing.sm) {
                    if viewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "arrow.right.circle.fill")
                    }
                    Text(viewModel.isLoading ? AppStrings.tr("login.connecting", lang: appState.language) : AppStrings.tr("login.connect_button", lang: appState.language))
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppSpacing.md)
                .background(Color.dsmVibrantBlue)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: AppCornerRadius.md))
            }
            .disabled(viewModel.isLoading)
            
            // Demo Mode
            Button {
                appState.enterDemoMode()
            } label: {
                HStack(spacing: AppSpacing.sm) {
                    Image(systemName: "play.circle.fill")
                        .foregroundStyle(Color.statusSuccess)
                    Text(AppStrings.tr("login.demo_button", lang: appState.language))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.textPrimary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, AppSpacing.md)
                .background(Color.oledCard)
                .overlay(
                    RoundedRectangle(cornerRadius: AppCornerRadius.md)
                        .stroke(Color.statusSuccess.opacity(0.4), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: AppCornerRadius.md))
            }
        }
    }
    
    // MARK: - Saved Profiles Section
    private var savedProfilesSection: some View {
        VStack(alignment: .leading, spacing: AppSpacing.sm) {
            Text(AppStrings.tr("login.saved_profiles", lang: appState.language))
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.textSecondary)
                .textCase(.uppercase)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: AppSpacing.sm) {
                    ForEach(appState.savedProfiles) { profile in
                        Button {
                            viewModel.fillFromProfile(profile)
                        } label: {
                            HStack(spacing: AppSpacing.xs) {
                                Circle()
                                    .fill(profile.isDemo ? Color.statusSuccess : Color.dsmVibrantBlue)
                                    .frame(width: 8, height: 8)
                                Text(profile.name.isEmpty ? profile.host : profile.name)
                                    .font(.caption.weight(.medium))
                                    .foregroundStyle(Color.textPrimary)
                            }
                            .padding(.horizontal, AppSpacing.md)
                            .padding(.vertical, AppSpacing.sm)
                            .background(Color.oledCardElevated)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(Color.oledBorder, lineWidth: 1))
                        }
                    }
                }
            }
        }
    }
}
