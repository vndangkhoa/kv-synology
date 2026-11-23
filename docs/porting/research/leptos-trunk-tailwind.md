# Research: Leptos 0.8 CSR + Trunk + Standalone Tailwind v4 + `rust-embed` in Axum 0.8

## Primary Sources Inspected
- `docs.rs/leptos` (0.8.x): `leptos::prelude::*`, `mount_to_body`, `RwSignal`, `Effect`, `Action`, `Resource::new_local`, `provide_context` / `use_context`
- `trunkrs.dev` (`trunk 0.22.2`): `Trunk.toml`, `[[hooks]]` (`stage = "pre_build"`) invoking standalone `tailwindcss`, `[build] target = "index.html", dist = "dist"`
- `docs.rs/rust-embed` + `docs.rs/axum` (0.8): `#[derive(RustEmbed)] #[folder = "../web-ui/dist"]`, MIME detection via `mime_guess`, `.fallback(static_handler)` returning `index.html` for SPA routes and `404` for unmatched `.api` or missing dotted asset files.

## Architecture Notes
1. **Frontend Crate (`rust/web-ui`)**:
   - Compiled independently to `wasm32-unknown-unknown` via `trunk build --release` into `rust/web-ui/dist/`.
   - **Pre-build Tailwind hook in `Trunk.toml`**:
     Invoke `tailwindcss -i styles/input.css -o styles/output.css --minify` (via `~/.local/bin/tailwindcss` or PATH) and reference `<link data-trunk rel="css" href="styles/output.css" />` in `index.html`.
   - **PWA & Public Assets**:
     Copy static icons (`manifest.json`, `favicon*`, `logo.svg`, `apple-touch-icon.png`, `icon-*.png`, `icons/`) via Trunk `<link data-trunk rel="copy-file" / "copy-dir">` so they are bundled cleanly into `rust/web-ui/dist/` and embedded into the `rust/app` binary!
   - **HTTP Calls from WASM**:
     Use `gloo-net` (`Request::get/post`) or `web-sys` `fetch` + `serde_json` calling `/api/*` relative paths with the exact `x-dsm-*` headers and `credentials: Include` for cookies (`dsm_cookie`, `dsm_host`, `dsm_port`, `dsm_https`).
   - **Charts & Graphs**:
     Lightweight reactive inline `<svg>` components for Sparklines, CPU/RAM meters, and Network DataFlowGraph (zero JS Chart library dependencies!).

## Semantic Traps
- **`404` vs SPA fallback**: Note `app_record` expects unmatched `/api/...` or unknown paths in original Next.js behavior — ensure Axum handles `not-found` status codes cleanly when matching recorded HTTP baseline! Specifically, during front-door / backend API phases, `app` proxies `/api/*` routes one by one while static UI fallback only replaces `/` + SPA routes once Wave 6–8 lands.
- **Bilingual VI/EN reactivity**: Store `Lang` (`Vi` | `En`) and `ThemeMode` (`Light` | `Dark`) in `RwSignal` synced with `web_sys::Storage` (`localStorage`) + `document.documentElement.classList.toggle("dark")`.
