# Migration Map — `kv-synology` Pure Rust Port

See [DECISIONS.md](DECISIONS.md) for ADRs (`ADR-001`..`ADR-009`), [GLOSSARY.md](GLOSSARY.md) for canonical Rust names, and [PORT_MAP.md](PORT_MAP.md) for live measured crate status from `rust-anything map --write`.

## Scope
- **Included**: Full Next.js Webapp (`src/app/api/**`, `src/lib/**`, `src/components/**`, `public/`), plus `mcp/` (`kv-synology-mcp`).
- **Out of Scope (untouched)**: `kv-synology-android/`, `kv-synology-ios/`, `ios/`, Capacitor plugins (original JS/TS kept as reference until cutover).

## Waves & Units

| Wave | Unit ID | Source Paths | Target Crate / Module | State | Proof / Notes |
| ---: | --- | --- | --- | --- | --- |
| 0 | `tooling-analyze` | repo root, `mcp/` | Tooling + `rust/analyze-*.txt` | done | `rust-anything 3.0.0`, `trunk 0.22.2`, `tailwindcss v4.3.5` |
| 0 | `research` | `src/`, `mcp/` | `rust/research/*.md` | done | Primary-source research (DSM proxy, russh, snmp2/proc, Leptos, rmcp) |
| 0 | `app-record` | `.next/standalone/server.js` | `rust/app-cases/http/` | done | Baseline HTTP recording (`100%` original replay) |
| 0 | `app-front-door` | `rust/app` | `rust/app` (Axum proxy) | done | Axum front door builds & passes `100%` at `100%` fallback |
| 1 | `syno-smart-parser` | `src/lib/storage/synoSmartParser.ts` | `rust/syno-smart-parser-rs` | done | `482/482` cases match; `gate` PASS |
| 1 | `acl-engine` | `src/lib/permissions/aclEngine.ts` | `rust/acl-engine-rs` | done | `1473/1473` cases match (`indexmap`, `AclDatasetOut`); `gate` PASS |
| 1 | `report-engine` | `src/lib/reports/reportEngine.ts` | `rust/report-engine-rs` | done | `822/822` cases match (pinned clock UTC, `vi-VN` formats); `gate` PASS |
| 1 | `snmp-presets` | `src/lib/snmp/presets.ts` | `rust/snmp-presets-rs` | done | `217/217` cases match + typed `pub mod presets`; `gate` PASS |
| 1 | `geoip-helpers` | `src/lib/traffic/geoIpService.ts` | `rust/geoip-helpers-rs` | done | `945/945` cases match; `gate` PASS |
| 2 | `api-ai-models` | `src/app/api/ai/models/route.ts` | `rust/api-ai-models-rs` + `rust/app/src/units/api_ai_models.rs` | done | Curated + live provider catalogs; `app wire` + `325/325` replay PASS |
| 2 | `api-ai-chat` | `src/app/api/ai/chat/route.ts` | `rust/api-ai-chat-rs` + `rust/app/src/units/api_ai_chat.rs` | done | 6 cloud providers + MCP action parser; `app wire` + `325/325` replay PASS |
| 2 | `api-notifications` | `src/app/api/notifications/dispatch/route.ts` | `rust/api-notifications-rs` + `rust/app/src/units/api_notifications.rs` | done | Telegram Bot API + Webhook dispatch; `app wire` + `325/325` replay PASS |
| 2 | `api-download` | `src/app/api/download/{bt-search,resolve-link,rss-fetch}/` | `rust/api-download-rs` + `rust/app/src/units/api_download.rs` | done | Apibay/YTS/ISO BT search, GDrive/Fshare/MediaFire resolvers, RSS XML parser; `app wire` + `325/325` replay PASS |
| 2 | `api-reports` | `src/app/api/reports/{summary,export}/` | `rust/report-engine-rs` + `rust/app/src/units/report_engine.rs` | done | JSON summary + HTML report export; `app wire` + `325/325` replay PASS |
| 3 | `api-geoip` | `src/app/api/geoip/lookup/route.ts` | `rust/api-geoip-rs` + `rust/app/src/units/api_geoip.rs` | done | PTR DNS lookup + GeoIP cache (`2/2` tests, wired) |
| 3 | `api-traffic` | `src/app/api/traffic/connections/route.ts` | `rust/api-traffic-rs` + `rust/app/src/units/api_traffic.rs` | done | `/proc/net/*` + `/proc/net/dev` + DSM API (`2/2` tests, wired) |
| 3 | `api-snmp` | `src/app/api/snmp/{discover,query}/route.ts` | `rust/api-snmp-rs` + `rust/app/src/units/api_snmp.rs` | done | `snmp2` (v1/v2c/v3 USM) + TCP ping + `/proc` local (`2/2` tests, wired) |
| 3 | `api-ssh` | `src/app/api/ssh/exec/route.ts` | `rust/api-ssh-rs` + `rust/app/src/units/api_ssh.rs` | done | Pure Rust async SSH2 (`russh`, `2/2` tests, wired) |
| 3 | `api-smart-info` | `src/app/api/storage/smart-info/route.ts` | `rust/api-smart-info-rs` + `rust/app/src/units/api_smart_info.rs` | done | DSM CGI + `russh` + `syno_smart_parser_rs` (`3/3` tests, wired) |
| 3 | `api-dsm-proxy` | `src/app/api/dsm/[...path]/route.ts` | `rust/api-dsm-proxy-rs` + `rust/app/src/units/api_dsm_proxy.rs` | done | QuickConnect + DDNS probe cache + TLS bypass + Range stream (`2/2` tests, wired) |
| 4 | `backend-lift` | `rust/app` | `rust/app` | done | `325/325` replay PASS, 100% of `/api/*` answered in Rust |
| 5 | `mcp-server` | `mcp/src/index.ts`, `mcp/src/dsm/**` | `rust/mcp` (`kv-synology-mcp`) | done | `rmcp 3.11` stdio server + 43 tools + live JSON-RPC parity PASS |
| 6 | `web-ui-core` | `src/lib/{i18n,store,dsm}`, core components | `rust/web-ui` | done | Leptos 0.8 + Trunk 0.22.2 + Tailwind v4 CLI (`45.8 KB` CSS, 7 core tabs, clippy/fmt PASS) |
| 7 | `web-ui-admin` | admin tabs, ACL/Traffic/SNMP/AI components | `rust/web-ui` | done | All 11 admin tabs + Login/Power/AI Copilot modals (`kv-synology-web-ui` release WASM PASS) |
| 8 | `lift-qc-ship` | `rust/app`, `Dockerfile`, SPK | pure Rust image & release | done | `rust-embed` WASM UI, pure-Rust cutover (`kv-synology`), `Dockerfile`, functional & browser visual QC PASS |
