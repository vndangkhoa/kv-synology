#!/usr/bin/env bash
# Build statically linked x86_64-unknown-linux-musl binaries (kv-synology + kv-synology-mcp)
# with the embedded Leptos WASM UI for native Synology DSM 7 SPK packaging.
set -euo pipefail

export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$REPO_DIR/rust/dist-musl/x86_64"
UI_DIST="$REPO_DIR/rust/web-ui/dist"

# 1. Ensure embedded Leptos CSR WASM UI is built
if [ ! -f "$UI_DIST/index.html" ] || { [ "${SKIP_UI_BUILD:-0}" != "1" ] && command -v trunk >/dev/null 2>&1; }; then
    echo "==> Building embedded Web UI (Leptos WASM + Tailwind v4)"
    command -v trunk >/dev/null 2>&1 || {
        echo "ERROR: 'trunk' is required to build rust/web-ui/dist" >&2
        exit 1
    }
    (cd "$REPO_DIR/rust/web-ui" && trunk build --release)
fi

[ -f "$UI_DIST/index.html" ] || {
    echo "ERROR: $UI_DIST/index.html missing after UI build" >&2
    exit 1
}

mkdir -p "$OUT_DIR"

# 2. Build statically linked x86_64-unknown-linux-musl binaries
if command -v x86_64-linux-musl-gcc >/dev/null 2>&1; then
    echo "==> Building static musl binaries via host x86_64-linux-musl-gcc"
    export RUSTFLAGS="-C target-feature=+crt-static"
    export CC_x86_64_unknown_linux_musl="x86_64-linux-musl-gcc"
    export CARGO_TARGET_X86_64_UNKNOWN_LINUX_MUSL_LINKER="x86_64-linux-musl-gcc"

    cargo build --release --target x86_64-unknown-linux-musl \
        --manifest-path "$REPO_DIR/rust/app/Cargo.toml"
    cargo build --release --target x86_64-unknown-linux-musl \
        --manifest-path "$REPO_DIR/rust/mcp/Cargo.toml"

    cp "$REPO_DIR/rust/app/target/x86_64-unknown-linux-musl/release/kv-synology" "$OUT_DIR/kv-synology"
    cp "$REPO_DIR/rust/mcp/target/x86_64-unknown-linux-musl/release/kv-synology-mcp" "$OUT_DIR/kv-synology-mcp"
    chmod 755 "$OUT_DIR/kv-synology" "$OUT_DIR/kv-synology-mcp"
else
    echo "==> Building static musl binaries inside rust:1-alpine container"
    command -v docker >/dev/null 2>&1 || {
        echo "ERROR: neither x86_64-linux-musl-gcc nor docker is available" >&2
        exit 1
    }

    docker run --rm \
        -v "$REPO_DIR/rust:/src/rust" \
        -v "kv-synology-musl-cargo:/usr/local/cargo/registry" \
        -v "kv-synology-musl-target:/cache/target" \
        -e HOST_UID="$(id -u)" \
        -e HOST_GID="$(id -g)" \
        rust:1-alpine \
        sh -eu -c '
            apk add --no-cache build-base >/dev/null
            export RUSTFLAGS="-C target-feature=+crt-static"
            export CARGO_TARGET_DIR=/cache/target
            cargo build --release --target x86_64-unknown-linux-musl --manifest-path /src/rust/app/Cargo.toml
            cargo build --release --target x86_64-unknown-linux-musl --manifest-path /src/rust/mcp/Cargo.toml
            mkdir -p /src/rust/dist-musl/x86_64
            cp /cache/target/x86_64-unknown-linux-musl/release/kv-synology /src/rust/dist-musl/x86_64/kv-synology
            cp /cache/target/x86_64-unknown-linux-musl/release/kv-synology-mcp /src/rust/dist-musl/x86_64/kv-synology-mcp
            chmod 755 /src/rust/dist-musl/x86_64/kv-synology /src/rust/dist-musl/x86_64/kv-synology-mcp
            chown -R "$HOST_UID:$HOST_GID" /src/rust/dist-musl
        '
fi

# 3. Verify 100% static linking (no dynamic PT_INTERP header)
for bin in "$OUT_DIR/kv-synology" "$OUT_DIR/kv-synology-mcp"; do
    [ -x "$bin" ] || {
        echo "ERROR: expected binary missing or not executable: $bin" >&2
        exit 1
    }
    if readelf -l "$bin" | grep -q INTERP; then
        echo "ERROR: $bin has a dynamic INTERP segment (not statically linked!)" >&2
        exit 1
    fi
done

ls -lh "$OUT_DIR"/*
file "$OUT_DIR"/*
