# Architecture Decision Records — `kv-synology` Pure Rust Migration

Source workflow: [`rust-anything`](https://git.khoavo.myds.me/vndangkhoa/rust-anything) whole-app methodology.

## ADR-001: Target Architecture — Axum Server + Leptos WASM SPA + Standalone MCP Binary
Status: accepted (2026-11-22)
Context: `kv-synology` currently consists of a Next.js 15 App Router SPA (100% client-side `"use client"` UI + 15 Node.js `/api/*` route handlers) and a separate Node stdio MCP server (`mcp/`). Native mobile wrappers (`kv-synology-android`, `kv-synology-ios`) remain separate.
Decision: Migrate the entire webapp and MCP server into a Rust Cargo workspace under `rust/`:
- `rust/app`: Axum 0.8 + Tokio HTTP server owning port `8088` (or `$PORT`), serving all 15 `/api/*` endpoints and embedded WASM frontend assets (`rust-embed`).
- `rust/web-ui`: Leptos 0.8 CSR frontend compiled to `wasm32-unknown-unknown` via Trunk and Tailwind CLI v4.
- `rust/mcp`: Standalone stdio MCP server binary replacing `mcp/` (`kv-synology-mcp`).
- `rust/*-rs`: Extracted pure-logic unit crates proven against the original TypeScript via `rust-anything bridge/record/diff/gate`.
Consequences: Zero Node.js runtime or Docker Node layer in final production image; unified workspace sharing DSM types, parsers, and protocol clients.

## ADR-002: Migration Scope & Reference Preservation
Status: accepted (2026-11-22)
Context: User requested full webapp migration plus `mcp/` while leaving native Android/iOS projects untouched.
Decision: Port all 15 API routes, 5 server utility modules, all 18 UI tabs and modals, and the `mcp/` stdio server. Keep original `src/`, `mcp/`, `package.json`, and mobile apps intact in git as reference until final cutover verification.
Consequences: Both systems can run side-by-side behind the `rust/app` Axum front door until 0% fallback is proven and `app lift` passes.

## ADR-003: Pure Rust/WASM AI Strategy (Drop WebGPU JS Runtime)
Status: accepted (2026-11-22)
Context: `src/components/ai/WebLlmAssistant.tsx` imports `@mlc-ai/web-llm` (browser JS WebGPU bundle).
Decision: Replace `@mlc-ai/web-llm` with pure Rust/WASM diagnostics plus full support for all Cloud AI HTTP providers (`gemini`, `deepseek`, `claude`, `openai`, `openrouter`, `opencode`) and local `heuristic` diagnostics mode.
Consequences: Eliminates npm/JS bundler dependencies from the WASM UI while retaining all server AI orchestration and MCP tool-call extraction (` ```mcp_action ` blocks).

## ADR-004: Pure-Rust Crate Stack (Zero C/OpenSSL Runtime Dependencies)
Status: accepted (2026-11-22)
Context: Original Node runtime depends on `ssh2`, `net-snmp`, `http`/`https`, `dns`, and `/proc` parsing. Static/slim container builds benefit from avoiding C `libssh2` and OpenSSL build coupling.
Decision: Standardize on pure-Rust async crates:
- HTTP server & middleware: `axum = "0.8"`, `tokio = "1"`, `tower-http = "0.6"`, `rust-embed = "8"`
- Outbound HTTP/TLS (with self-signed NAS cert opt-out): `reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "json", "stream", "multipart"] }`
- SSH client: `russh` + `russh-keys` (pure Rust async SSH2)
- SNMP v1/v2c/v3 (USM): `snmp2` (`features = ["tokio", "crypto-rust", "v3"]`) + Linux `/proc` fallback readers
- Official MCP stdio SDK: `rmcp` (`features = ["server", "macros", "transport-io"]`) + `schemars`
- HTML/XML/Regex: `regex`, `fancy-regex` (where JS regex lookaround/backreferences exist), `quick-xml`, `chrono`, `indexmap`, `serde` / `serde_json` (with `preserve_order` where object key order is observable)
Consequences: Clean cross-platform compilation and minimal Alpine/Debian runtime image containing only `ca-certificates` and static Rust binaries.

## ADR-005: Styling & Visual Parity via Standalone Tailwind CLI v4
Status: accepted (2026-11-22)
Context: All UI styling uses Tailwind utility classes (`src/app/globals.css`, `tailwind.config.ts`) across Light and Dark modes plus VI/EN i18n.
Decision: Use the official standalone `tailwindcss` binary (`~/.local/bin/tailwindcss`) invoked cleanly during `trunk build` to compile Tailwind v4 CSS directly from `rust/web-ui` Rust/HTML templates without Node.js.
Consequences: Exact visual theme, responsive layouts, Light/Dark palettes, and bilingual VI/EN fidelity without npm in the Rust build chain.

## ADR-006: Equivalence Bar (Normalized HTTP/JSON & Deterministic Unit Parity)
Status: accepted (2026-11-22)
Context: Routes reading live host `/proc` counters, timestamps, or probing unreachable local sockets differ in timestamps/PIDs/latency across runs.
Decision:
- Deterministic pure-logic units (`synoSmartParser`, `aclEngine`, `reportEngine`, `snmpPresets`, `geoIpHelpers`): strict parity via `rust-anything record` + `diff` + `gate`.
- Live HTTP endpoints (`app record --http` / `app replay`): identical HTTP status codes, JSON key structure, error contracts, and headers; normalized `[..]` wildcards allowed only for dynamic timestamps, live `/proc` readings, latency numbers, and random values.
Consequences: Every wave must pass 100% of `app replay` cases (never weaken or silence a regression; inspect every `order`/`lines` diff).

## ADR-007: External Contract Compatibility
Status: accepted (2026-11-22)
Context: Synology SPK `kvsynology` container runs statelessly on `0.0.0.0:8088` and serves PWA manifests, icons, `/api/dsm/[...path]`, and `/api/*`.
Decision: Preserve:
- Bind address `0.0.0.0` and `$PORT` (default `8088`), `$HOSTNAME` compatible.
- All 15 `/api/*` routes, methods (`GET`/`POST`), query params (`_host`, `_port`, `_https`, `_sid`, `_synotoken`), request headers (`x-dsm-host`, `x-dsm-port`, `x-dsm-https`, `x-dsm-cookie`, `x-dsm-synotoken`, `x-dsm-model`, `x-dsm-version`, `range`), and response headers (`set-cookie`, `accept-ranges`, `content-range`, `content-length`, `content-disposition`, `content-type`).
- All cookies (`dsm_host`, `dsm_port`, `dsm_https`, `dsm_cookie`) and localStorage session keys (`dsm_sessions_v1` etc.).
- Public PWA assets (`manifest.json`, `favicon*`, `logo.svg`, `apple-touch-icon.png`, `icon-*.png`, `icons/*`).
Consequences: Existing mobile webviews, browser bookmarks, Synology reverse proxy rules, and SPK healthchecks continue working seamlessly.

## ADR-008: Wave Checkpoints
Status: accepted (2026-11-22)
Context: User requested stopping for review at the end of each migration wave.
Decision: Pause at the end of every wave (`0..8`), run `rust-anything map --write`, update `rust/MAP.md` and `rust/HANDOFF.md`, report gate/replay/fallback metrics, and await explicit user go-ahead before claiming the next wave.
Consequences: Clean resumable checkpoints with zero unverified scope creep.

## ADR-009: Build Targets & Cutover Strategy
Status: accepted (2026-11-22)
Context: Production targets Linux `x86_64` Docker image (`vndangkhoa/kv-synology`) plus `wasm32-unknown-unknown` embedded SPA and optional ARM/multi-arch Synology SPK packaging.
Decision: Compile final binaries on `x86_64-unknown-linux-gnu` + `wasm32-unknown-unknown`, prove 0% fallback via `rust-anything app lift`, visually QC the Leptos UI on Desktop + Mobile viewports, replace root `Dockerfile` with a pure-Rust multi-stage image exposing port `8088`, and push Docker image + SPK + git forges upon final verification.
Consequences: Clean cutover with Node/Next.js preserved in git history/repo reference until explicitly retired.
