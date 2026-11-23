# 🎛️ KV-Synology — 100% Pure Rust Synology DSM Web Manager & AI MCP Server

<div align="center">

**A blazing-fast, 100% Pure Rust, zero-telemetry Synology DSM management dashboard with the Astryx Adaptive UI (Phone, Foldable, Tablet & Desktop) and a 43-tool Model Context Protocol (MCP) Server.**

[![GitHub Stars](https://img.shields.io/github/stars/vndangkhoa/kv-synology?style=flat-square&logo=github&color=gold)](https://github.com/vndangkhoa/kv-synology/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/vndangkhoa/kv-synology?style=flat-square&logo=github&color=blue)](https://github.com/vndangkhoa/kv-synology/network/members)
[![Rust](https://img.shields.io/badge/Rust-2024%20Edition-orange?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Leptos WASM](https://img.shields.io/badge/Leptos-CSR%20WASM-ef3939?style=flat-square&logo=rust)](https://leptos.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.3.5-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Astryx UI](https://img.shields.io/badge/Astryx-Adaptive%204%20Form%20Factors-0064E0?style=flat-square)](https://git.khoavo.myds.me/vndangkhoa/astryx)
[![Docker Image](https://img.shields.io/badge/Docker-181%20MB%20amd64-2496ED?style=flat-square&logo=docker)](https://hub.docker.com/r/vndangkhoa/kv-synology)
[![MCP Server](https://img.shields.io/badge/MCP%20Server-43%20Rust%20Tools-8A2BE2?style=flat-square&logo=anthropic)](rust/mcp/README.md)
[![Android APK](https://img.shields.io/badge/Android-Phone%20%2F%20Foldable%20%2F%20Tablet-3DDC84?style=flat-square&logo=android)](https://syno.vndns.net/package/kvsynology)
[![Counter-REA](https://img.shields.io/badge/Counter--REA-BLA_v3.5_Protected-7c3aed?style=flat-square&logo=shield&logoColor=white)](https://git.khoavo.myds.me/vndangkhoa/bla)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square)](LICENSE)

[Features](#-key-features) • [Comparison](#-why-kv-synology) • [Architecture](#-architecture) • [Quickstart](#-quickstart-30-seconds) • [Container Manager](#-synology-container-manager-setup) • [AI MCP Server](#-model-context-protocol-mcp-server) • [License](#-license)

</div>

---

## ⚡ Why KV-Synology?

Traditional Synology DSM web interfaces are feature-rich but can be heavy, sluggish on older hardware, or difficult to operate on mobile and foldable screens. **KV-Synology 1.6.0** runs on a **100% Pure Rust** stack (**Axum** backend + statically embedded **Leptos CSR WASM** frontend styled with the **Astryx Design System**), shipping as a `~181 MB` Node-free container with zero intermediary cloud servers.

Furthermore, KV-Synology includes a native **Pure Rust Model Context Protocol (MCP) Server (`kv-synology-mcp`)** exposing **43 DSM & SSH tools** so Cursor, Claude Desktop, and autonomous agents can inspect and manage your NAS directly.

### 📊 Competitive Matrix

| Feature | 🎛️ KV-Synology | 🌐 Official Synology DSM | 🐳 Portainer / CasaOS | 🏠 Home Assistant DSM |
| :--- | :---: | :---: | :---: | :---: |
| **Tech Stack** | **Pure Rust (Axum + Leptos WASM)** | ExtJS / Web Components | Vue / React | Python Backend |
| **Adaptive 4-Device UI** | ✅ **Astryx (Phone / Fold / Tablet / Desktop)** | ⚠️ Heavy Desktop UI | ⚠️ Limited Mobile | 🟡 Companion Cards |
| **Direct Browser-to-NAS Proxy** | ✅ **Zero intermediary (`/api/dsm/{*path}`)** | ❌ Direct Port Binding | ❌ Server Agent Needed | ❌ HA Server Proxy |
| **QuickConnect Auto-Resolver** | ✅ **LAN + WAN + Relay** | ✅ Native DSM | ❌ Manual IP only | ❌ Manual IP only |
| **AI Agent MCP Integration** | ✅ **43 Native Rust Tools** | ❌ None | ❌ None | ⚠️ Basic Entity Controls |
| **Counter-REA Binary & WebAssembly Shield ([BLA v3.5](https://git.khoavo.myds.me/vndangkhoa/bla))** | ✅ **Webapp (WASM + SW) · Android · Selfhost/MCP** | ❌ None | ❌ None | ❌ None |
| **Unified Service Toggles** | ✅ **SMB/NFS/SSH/FTP in 1 click**| ⚠️ Scattered in Control Panel| ❌ Not Synology Services | ⚠️ Limited |
| **Real-time Notifications** | ✅ **Grouped + Filterable** | ✅ DSM Notification tray | ❌ Container logs only | ⚠️ HA Events |
| **Container Management** | ✅ **Integrated** | ✅ Container Manager | ✅ Full Docker UI | ⚠️ Addon Manager |
| **Resource Footprint** | ⚡ **Ultra-lightweight (~181 MB container)** | 🐢 Heavyweight desktop OS | 🟡 Moderate | 🟡 Heavy |

---

## ✨ Key Features

- 📱 **Astryx Adaptive UI (Phone / Foldable / Tablet / Desktop)**: Tailored layouts for Phone (`<640px` 5-item BottomNav & 16px touch inputs), Foldable (`640px–1023px` `72px` NavigationRail + dual-pane `.ax-fold-split` across `@media (horizontal-viewport-segments: 2)`), Tablet & Desktop (`>=1024px` collapsible `256px` SideNav across 5 sections), with **Light** (`#F1F4F7`), **OLED Dark** (`#111112`), and **Gemini** (`#131314`) themes.
- 📲 **Native Android App (`v1.5.8`)**: Companion Android APK supporting Phone, Foldable (`Book` & `Tabletop` postures via WindowManager), and Tablet layouts — downloadable from [`syno.vndns.net/package/kvsynology`](https://syno.vndns.net/package/kvsynology).
- 🔐 **Intelligent QuickConnect & Network Resolution**: Supports LAN IP, DDNS (`*.synology.me`), and QuickConnect IDs (`your-id`). Automatically resolves `global.quickconnect.to` with smart TCP candidate checking and seamless NAT relay fallback (`relay_ip:relay_port`).
- 📊 **Real-time Dashboard & Monitoring**: Live telemetry for CPU, RAM, Network I/O, Storage pools, temperatures, uptime, hardware specs, PDF health reports, and Telegram digests.
- 📁 **Enhanced File Station**: Fast tree navigation, in-browser media player (audio/video/images), source code reader with syntax highlighting & line numbers, batch downloads, and public share links.
- 🔌 **Instant Service Toggles**: One-click start/stop for SMB/CIFS (445), AFP (548), NFS (2049), FTP (21), SFTP (22), SSH (22), Telnet (23), rsync (873), and WebDAV (5005).
- 🔔 **Synology Notification Center**: Full `SYNO.Core.DSMNotify` integration with category filters (`system`, `storage`, `package`, `network`, `security`, `backup`), severity levels (`info`, `warning`, `error`), badge counts, and Telegram/Webhook dispatch.
- 🐳 **Container Manager Control**: View, start, stop, and inspect running Docker containers directly.
- 🤖 **Native Model Context Protocol (MCP)**: 43 Pure-Rust tools (`kv-synology-mcp`) via stdio + `russh` for AI assistants (Claude, Cursor, Ollama) to inspect, manage, and automate your NAS.
- 🛡️ **BLA v3.5 Counter-REA Defense Shield**: Integrated across the **Web App** (Rust WASM `bla_shield` + surgical shared-state `sw.js` weave + WASM/JS hardening), **Android App** (`BlaShield` Kotlin/DEX attestation decoys & ProGuard rules + DEX hardening), and **Self-Hosted Server / MCP** (`kv-synology` & `kv-synology-mcp` ELF tarpit + `./bin/harden`).

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                Client Browser / AI Agent                   │
│   (Leptos CSR WASM + Astryx UI / MCP Stdio Interface)      │
└─────────────────────────────┬──────────────────────────────┘
                              │
                Direct HTTPS / QuickConnect API
                              │
┌─────────────────────────────▼──────────────────────────────┐
│        KV-Synology Pure Rust Engine (debian:bookworm-slim) │
│                                                            │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │  Axum Smart Proxy    │    │  kv-synology-mcp Binary  │  │
│  │  (/api/dsm/{*path})  │    │  (43 Rust + Russh Tools) │  │
│  └──────────┬───────────┘    └─────────────┬────────────┘  │
└─────────────┼──────────────────────────────┼───────────────┘
              │ Direct TCP Candidates        │
              │ (LAN / DDNS / Relay)         │
┌─────────────▼──────────────────────────────▼───────────────┐
│                    Synology DiskStation                    │
│       DSM 7.x REST API (SYNO.Core.* & SYNO.Docker.*)       │
└────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart (30 Seconds)

### Run with Docker Compose

```yaml
services:
  kv-synology:
    image: docker.io/vndangkhoa/kv-synology:latest
    container_name: kv-synology
    ports:
      - "8088:8088"
    restart: unless-stopped
    environment:
      - PORT=8088
      - HOSTNAME=0.0.0.0
      - RUST_LOG=info
```

Run:
```bash
docker compose up -d
```
Visit `http://localhost:8088` and log in with your Synology IP or QuickConnect ID!

---

## 🐳 Synology Container Manager Setup

### Method 1: Container Manager GUI (Recommended)

1. Open **File Station** on DSM and create folder `/volume1/docker/kv-synology`.
2. Open **Container Manager** > **Project** > **Create**:
   - **Project Name:** `kv-synology`
   - **Path:** `/volume1/docker/kv-synology`
   - **Source:** Select *Create docker-compose.yml* and paste the snippet above.
3. Click **Next** > **Done**.
4. Access `http://<NAS-IP>:8088` (or install directly from `https://syno.vndns.net` as a 1-click Synology SPK).

> 💡 **Mirror Registries:** If Docker Hub is throttled, switch image to:
> - `ghcr.io/vndangkhoa/kv-synology:latest`
> - `git.khoavo.myds.me/vndangkhoa/kv-synology:latest`
> - `git.khoavo.vndns.net/vndangkhoa/kv-synology:latest`

### Method 2: SSH CLI

```bash
# SSH into your Synology NAS
ssh admin@<NAS-IP>

# Create folder & pull compose
sudo mkdir -p /volume1/docker/kv-synology
cd /volume1/docker/kv-synology
curl -fsSL https://raw.githubusercontent.com/vndangkhoa/kv-synology/master/docker-compose.yml -o docker-compose.yml

# Launch container
sudo docker compose up -d
```

---

## 🤖 Model Context Protocol (MCP) Server

Connect your Synology NAS directly to AI Coding Assistants (Cursor, Claude Desktop, Windsurf) using the bundled Pure-Rust binary (`kv-synology-mcp` inside the image at `/app/kv-synology-mcp` or built locally from `rust/mcp`):

```json
{
  "mcpServers": {
    "synology": {
      "command": "/path/to/kv-synology-mcp",
      "env": {
        "DSM_HOST": "https://192.168.1.10:5001",
        "DSM_USER": "admin",
        "DSM_PASS": "your_strong_password"
      }
    }
  }
}
```

*Supports 43 Pure-Rust automation tools including `dsm_list_services`, `dsm_toggle_service`, `dsm_list_notifications`, `dsm_docker_ps`, `dsm_storage_info`, SSH/SFTP diagnostics, and more.*

---

## 💻 Local Development (Rust)

```bash
# Clone the repository
git clone https://github.com/vndangkhoa/kv-synology.git
cd kv-synology

# Ensure Rust wasm32 target, trunk, and tailwindcss CLI v4 are installed
rustup target add wasm32-unknown-unknown

# Build the Leptos CSR WASM + Astryx CSS bundle
(cd rust/web-ui && trunk build --release)

# Run tests & start the Pure Rust server on port 8088
cargo test --manifest-path rust/app/Cargo.toml
cargo run --release --manifest-path rust/app/Cargo.toml
```

---

## 📂 Project Structure

```
kv-synology/
├── rust/
│   ├── app/                 # Pure Rust Axum web server, QuickConnect/DSM proxy & embedded WASM assets
│   ├── web-ui/              # Leptos CSR WASM frontend + Astryx adaptive CSS (Phone/Foldable/Tablet/Desktop)
│   └── mcp/                 # Pure Rust Model Context Protocol (MCP) Server (43 tools + russh)
├── kv-synology-android/     # Native Android app (Kotlin/Compose) with Phone, Foldable & Tablet layouts
├── docker-compose.yml       # Production deployment
└── Dockerfile               # Multi-stage Pure Rust build -> debian:bookworm-slim (~181 MB)
```

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=vndangkhoa/kv-synology&type=Date)](https://star-history.com/#vndangkhoa/kv-synology&Date)

---

## 📜 License & GPL-3.0 Compliance

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0-only)** — see the [LICENSE](LICENSE) file.

When redistributing or modifying this software (including binary, Docker, or SPK packages):
1. Include the full [LICENSE](LICENSE) text.
2. Prominently state all changes made in [CHANGELOG.md](CHANGELOG.md).
3. Provide the corresponding source code as defined in GPL v3 §6.
4. Retain original copyright notices.
5. If installed in a consumer hardware product, fulfill GPL v3 §6 User Product Installation Information obligations.
