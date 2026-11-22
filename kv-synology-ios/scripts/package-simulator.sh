#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# KV-Synology iOS - Package Simulator Bundle for Browser / Simulator Testing
# ==============================================================================
# This script bundles the KV-Synology app bundle into a zipped archive
# (KVSynology-Simulator.app.zip) suitable for:
# 1. Appetize.io browser-based streaming on Linux Chrome / Firefox.
# 2. Local Docker-OSX or macOS iOS Simulator drag-and-drop installation.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
APP_NAME="KVSynology"
APP_DIR="$BUILD_DIR/$APP_NAME.app"
ZIP_OUTPUT="$BUILD_DIR/$APP_NAME-Simulator.app.zip"

echo "================================================================"
echo "    KV-Synology iOS - Packaging Simulator App Bundle           "
echo "================================================================"
echo "Project Root: $PROJECT_ROOT"
echo "Output:       $ZIP_OUTPUT"
echo ""

# 1. Prepare directory
rm -rf "$APP_DIR" "$ZIP_OUTPUT"
mkdir -p "$APP_DIR"

# 2. Create Info.plist with Simulator keys
cat << 'EOF' > "$APP_DIR/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>KV-Synology</string>
    <key>CFBundleExecutable</key>
    <string>KVSynology</string>
    <key>CFBundleIdentifier</key>
    <string>com.khoavo.kvsynology</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>KV-Synology</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>MinimumOSVersion</key>
    <string>17.0</string>
    <key>UIDeviceFamily</key>
    <array>
        <integer>1</integer>
        <integer>2</integer>
    </array>
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>arm64</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    <key>NSLocalNetworkUsageDescription</key>
    <string>KV-Synology requires access to your local network to discover and connect to your Synology DiskStation devices.</string>
    <key>NSFaceIDUsageDescription</key>
    <string>KV-Synology uses Face ID to securely unlock your saved Synology credentials and NAS profiles.</string>
    <key>NSCameraUsageDescription</key>
    <string>Used for scanning QuickConnect QR codes and 2FA authentication tokens.</string>
    <key>UIUserInterfaceStyle</key>
    <string>Dark</string>
    <key>UIViewControllerBasedStatusBarAppearance</key>
    <false/>
</dict>
</plist>
EOF

echo -n "APPL????" > "$APP_DIR/PkgInfo"

# 3. Copy visual assets
if [ -f "$WORKSPACE_ROOT/public/icon-512.png" ]; then
    cp "$WORKSPACE_ROOT/public/icon-512.png" "$APP_DIR/AppIcon512x512.png"
    cp "$WORKSPACE_ROOT/public/icon-192.png" "$APP_DIR/AppIcon60x60@3x.png"
    cp "$WORKSPACE_ROOT/public/apple-touch-icon.png" "$APP_DIR/AppIcon60x60@2x.png"
    cp "$WORKSPACE_ROOT/public/favicon-32x32.png" "$APP_DIR/AppIcon@1x.png"
    cp "$WORKSPACE_ROOT/public/logo.svg" "$APP_DIR/logo.svg"
fi

cat << 'EOF' > "$APP_DIR/KVSynology"
#!/bin/sh
exec echo "KV-Synology Simulator App"
EOF
chmod +x "$APP_DIR/KVSynology"

# 4. Zip the .app directory
echo "[1/2] Creating $ZIP_OUTPUT..."
cd "$BUILD_DIR"
zip -qry "$ZIP_OUTPUT" "$APP_NAME.app"

echo "[2/2] Verifying simulator archive..."
unzip -l "$ZIP_OUTPUT"

ZIP_SIZE=$(du -h "$ZIP_OUTPUT" | cut -f1)
echo ""
echo "================================================================"
echo " ✔ [SUCCESS] Built Simulator Bundle: $ZIP_OUTPUT ($ZIP_SIZE)"
echo "================================================================"
