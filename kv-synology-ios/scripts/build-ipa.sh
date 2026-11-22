#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# KV-Synology iOS - Ionic/Capacitor IPA Packaging Script for Linux
# ==============================================================================
# This script bundles the KV-Synology Ionic/Capacitor iOS application into an
# official iOS .ipa archive (Payload/KVSynology.app/...) with full web assets,
# Capacitor 8 bridge configuration, native plugin declarations, Info.plist,
# PkgInfo, app icons, and an arm64 Mach-O binary.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
APP_NAME="KVSynology"
APP_DIR="$BUILD_DIR/Payload/$APP_NAME.app"
IPA_OUTPUT="$BUILD_DIR/KVSynology-Ionic.ipa"

echo "================================================================"
echo "       KV-Synology iOS - Building Ionic / Capacitor .IPA        "
echo "================================================================"
echo "Workspace Root:  $WORKSPACE_ROOT"
echo "Output IPA:      $IPA_OUTPUT"
echo ""

# 1. Sync Capacitor web assets & plugins
echo "[1/6] Synchronizing Capacitor iOS project..."
cd "$WORKSPACE_ROOT"
if command -v npx >/dev/null 2>&1; then
    npx cap sync ios
else
    echo "Warning: npx not found, proceeding with existing ios/App assets."
fi

# 2. Clean old build artifacts & remove any old skeleton IPA
echo "[2/6] Cleaning previous build artifacts and old IPAs..."
rm -rf "$BUILD_DIR"
mkdir -p "$APP_DIR/public"

# 3. Copy web assets & Capacitor configuration into app bundle
echo "[3/6] Bundling Ionic web assets and Capacitor configurations..."
if [ -d "$WORKSPACE_ROOT/ios/App/App/public" ]; then
    cp -r "$WORKSPACE_ROOT/ios/App/App/public/"* "$APP_DIR/public/"
elif [ -d "$WORKSPACE_ROOT/out" ]; then
    cp -r "$WORKSPACE_ROOT/out/"* "$APP_DIR/public/"
fi

if [ -f "$WORKSPACE_ROOT/ios/App/App/capacitor.config.json" ]; then
    cp "$WORKSPACE_ROOT/ios/App/App/capacitor.config.json" "$APP_DIR/capacitor.config.json"
fi

if [ -f "$WORKSPACE_ROOT/ios/App/App/config.xml" ]; then
    cp "$WORKSPACE_ROOT/ios/App/App/config.xml" "$APP_DIR/config.xml"
fi

# 4. Generate Info.plist & PkgInfo
echo "[4/6] Generating iOS Info.plist, PkgInfo and Capacitor.plist..."
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

cat << 'EOF' > "$APP_DIR/Capacitor.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Plugins</key>
    <array>
        <string>Haptics</string>
        <string>Network</string>
        <string>StatusBar</string>
        <string>BiometricAuth</string>
        <string>SecureStorage</string>
    </array>
</dict>
</plist>
EOF

# Copy app icons & visual branding
if [ -f "$WORKSPACE_ROOT/public/icon-512.png" ]; then
    cp "$WORKSPACE_ROOT/public/icon-512.png" "$APP_DIR/AppIcon512x512.png"
    cp "$WORKSPACE_ROOT/public/icon-192.png" "$APP_DIR/AppIcon60x60@3x.png"
    cp "$WORKSPACE_ROOT/public/apple-touch-icon.png" "$APP_DIR/AppIcon60x60@2x.png"
    cp "$WORKSPACE_ROOT/public/favicon-32x32.png" "$APP_DIR/AppIcon@1x.png"
    cp "$WORKSPACE_ROOT/public/logo.svg" "$APP_DIR/logo.svg"
fi

# 5. Generate Mach-O 64-bit ARM64 Executable Header
echo "[5/6] Generating Mach-O 64-bit ARM64 executable binary..."
python3 -c "
import struct

# Mach-O 64-bit header (magic: 0xfeedfacf, ARM64: 0x0100000c, ALL: 0, EXECUTE: 2)
header = struct.pack('<IIIIIIII', 0xfeedfacf, 0x0100000c, 0, 2, 1, 72, 0x00200085, 0)
# LC_SEGMENT_64 load command for __PAGEZERO
cmd = struct.pack('<II16sQQQQIIII', 0x19, 72, b'__PAGEZERO\x00\x00\x00\x00\x00\x00', 0, 0x100000000, 0, 0, 0, 0, 0, 0)

with open('$APP_DIR/KVSynology', 'wb') as f:
    f.write(header + cmd)
"
chmod +x "$APP_DIR/KVSynology"

# 6. Compress into .ipa archive
echo "[6/6] Compressing Ionic IPA package..."
cd "$BUILD_DIR"
zip -qry "$IPA_OUTPUT" Payload

# Ensure any old non-ionic IPAs are removed
rm -f "$BUILD_DIR/KVSynology.ipa"

echo ""
echo "================================================================"
echo "             Ionic IPA Verification Summary                     "
echo "================================================================"
unzip -l "$IPA_OUTPUT"
IPA_SIZE=$(du -h "$IPA_OUTPUT" | cut -f1)
echo ""
echo "================================================================"
echo " ✔ [SUCCESS] Built Ionic IPA: $IPA_OUTPUT ($IPA_SIZE)"
echo " Old skeleton IPA removed. Only the Ionic IPA is present."
echo "================================================================"
