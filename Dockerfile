# syntax=docker/dockerfile:1.6
# KV Synology — 100% Pure Rust multi-stage multi-arch Docker image (GPL-3.0)

FROM --platform=$BUILDPLATFORM rust:1-bookworm AS web-ui-builder
ARG BUILDARCH
WORKDIR /src

RUN set -eu; \
    rustup target add wasm32-unknown-unknown; \
    if [ "$BUILDARCH" = "arm64" ]; then \
        TRUNK_ARCH="aarch64-unknown-linux-gnu"; \
        TW_ARCH="arm64"; \
    else \
        TRUNK_ARCH="x86_64-unknown-linux-musl"; \
        TW_ARCH="x64"; \
    fi; \
    curl -fsSL "https://github.com/trunk-rs/trunk/releases/download/v0.22.2/trunk-${TRUNK_ARCH}.tar.gz" \
        | tar -xz -C /usr/local/bin trunk; \
    chmod +x /usr/local/bin/trunk; \
    curl -fsSL "https://github.com/tailwindlabs/tailwindcss/releases/download/v4.3.5/tailwindcss-linux-${TW_ARCH}" \
        -o /usr/local/bin/tailwindcss; \
    chmod +x /usr/local/bin/tailwindcss

COPY public ./public
COPY rust/web-ui ./rust/web-ui
RUN cd rust/web-ui && trunk build --release

FROM --platform=$BUILDPLATFORM rust:1-bookworm AS rust-builder
ARG BUILDARCH
ARG TARGETARCH
WORKDIR /src

RUN set -eu; \
    if [ "$TARGETARCH" = "arm64" ] && [ "$BUILDARCH" != "arm64" ]; then \
        apt-get update; \
        apt-get install -y --no-install-recommends gcc-aarch64-linux-gnu libc6-dev-arm64-cross; \
        rm -rf /var/lib/apt/lists/*; \
        rustup target add aarch64-unknown-linux-gnu; \
    elif [ "$TARGETARCH" = "amd64" ] && [ "$BUILDARCH" != "amd64" ]; then \
        apt-get update; \
        apt-get install -y --no-install-recommends gcc-x86-64-linux-gnu libc6-dev-amd64-cross; \
        rm -rf /var/lib/apt/lists/*; \
        rustup target add x86_64-unknown-linux-gnu; \
    fi

COPY rust ./rust
COPY --from=web-ui-builder /src/rust/web-ui/dist ./rust/web-ui/dist

RUN set -eu; \
    if [ "$TARGETARCH" = "arm64" ]; then \
        RUST_TARGET="aarch64-unknown-linux-gnu"; \
        if [ "$BUILDARCH" != "arm64" ]; then \
            export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER="aarch64-linux-gnu-gcc"; \
            export CC_aarch64_unknown_linux_gnu="aarch64-linux-gnu-gcc"; \
            export AR_aarch64_unknown_linux_gnu="aarch64-linux-gnu-ar"; \
        fi; \
    else \
        RUST_TARGET="x86_64-unknown-linux-gnu"; \
        if [ "$BUILDARCH" != "amd64" ]; then \
            export CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER="x86_64-linux-gnu-gcc"; \
            export CC_x86_64_unknown_linux_gnu="x86_64-linux-gnu-gcc"; \
            export AR_x86_64_unknown_linux_gnu="x86_64-linux-gnu-ar"; \
        fi; \
    fi; \
    cargo build --release --target "$RUST_TARGET" --manifest-path rust/app/Cargo.toml; \
    cargo build --release --target "$RUST_TARGET" --manifest-path rust/mcp/Cargo.toml; \
    mkdir -p /out; \
    cp "rust/app/target/${RUST_TARGET}/release/kv-synology" /out/kv-synology; \
    cp "rust/mcp/target/${RUST_TARGET}/release/kv-synology-mcp" /out/kv-synology-mcp

FROM debian:bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 kvgroup \
 && groupadd --system --gid 1001 --non-unique nodejs \
 && useradd --system --uid 1001 --gid kvgroup kvuser \
 && useradd --system --uid 1001 --non-unique --gid kvgroup nextjs \
 && printf '#!/bin/sh\nif [ "${1:-}" = "node" ] && [ "${2:-}" = "server.js" ]; then\n  exec /app/kv-synology\nfi\nexec "$@"\n' > /usr/local/bin/docker-entrypoint.sh \
 && chmod +x /usr/local/bin/docker-entrypoint.sh

COPY --from=rust-builder /out/kv-synology /app/kv-synology
COPY --from=rust-builder /out/kv-synology-mcp /app/kv-synology-mcp
COPY LICENSE /app/LICENSE

ENV PORT=8088
USER kvuser
EXPOSE 8088

CMD ["/app/kv-synology"]
