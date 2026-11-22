# syntax=docker/dockerfile:1.6
# KV Synology — 100% Pure Rust multi-stage Docker image (GPL-3.0)

FROM rust:1-bookworm AS web-ui-builder
ARG TARGETARCH
WORKDIR /src

RUN rustup target add wasm32-unknown-unknown \
 && cargo install trunk --locked --version 0.22.2 \
 && TW_ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "arm64" || echo "x64") \
 && curl -sSL "https://github.com/tailwindlabs/tailwindcss/releases/download/v4.3.5/tailwindcss-linux-${TW_ARCH}" \
      -o /usr/local/bin/tailwindcss \
 && chmod +x /usr/local/bin/tailwindcss

COPY public ./public
COPY rust/web-ui ./rust/web-ui
RUN cd rust/web-ui && trunk build --release

FROM rust:1-bookworm AS rust-builder
WORKDIR /src

COPY rust ./rust
COPY --from=web-ui-builder /src/rust/web-ui/dist ./rust/web-ui/dist

RUN cargo build --release --manifest-path rust/app/Cargo.toml \
 && cargo build --release --manifest-path rust/mcp/Cargo.toml

FROM debian:bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 kvgroup \
 && useradd --system --uid 1001 --gid kvgroup kvuser

COPY --from=rust-builder /src/rust/app/target/release/kv-synology /app/kv-synology
COPY --from=rust-builder /src/rust/mcp/target/release/kv-synology-mcp /app/kv-synology-mcp
COPY LICENSE /app/LICENSE

ENV PORT=8088
USER kvuser
EXPOSE 8088

CMD ["/app/kv-synology"]
