# 🎛️ KV-Synology — Next-Gen Synology DSM Web Manager & AI MCP Server

<div align="center">

**A blazing-fast, modern, zero-telemetry Synology DSM management dashboard with native Model Context Protocol (MCP) AI agent integration.**

[![GitHub Stars](https://img.shields.io/github/stars/vndangkhoa/kv-synology?style=flat-square&logo=github&color=gold)](https://github.com/vndangkhoa/kv-synology/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/vndangkhoa/kv-synology?style=flat-square&logo=github&color=blue)](https://github.com/vndangkhoa/kv-synology/network/members)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Docker Image](https://img.shields.io/badge/Docker-Multi--arch%20amd64%2Farm64-2496ED?style=flat-square&logo=docker)](https://hub.docker.com/r/vndangkhoa/kv-synology)
[![MCP Server](https://img.shields.io/badge/MCP%20Server-42%20Tools-8A2BE2?style=flat-square&logo=anthropic)](mcp/README.md)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square)](LICENSE)

[Features](#-key-features) • [Comparison](#-why-kv-synology) • [Architecture](#-architecture) • [Quickstart](#-quickstart-30-seconds) • [Container Manager](#-synology-container-manager-setup) • [AI MCP Server](#-model-context-protocol-mcp-server) • [License](#-license)

</div>

---

## ⚡ Why KV-Synology?

Traditional Synology DSM web interfaces are feature-rich but can be heavy, sluggish on older hardware, or require opening sensitive ports over WAN. **KV-Synology** decouples the control plane into a high-performance, single-page application built on **Next.js 15 & React 19**, proxying requests directly from your browser to your NAS with zero intermediary servers.

Furthermore, KV-Synology introduces a built-in **Model Context Protocol (MCP) Server**, turning your Synology NAS into an AI-controllable powerhouse for Cursor, Claude Desktop, and autonomous agents.

### 📊 Competitive Matrix

| Feature | 🎛️ KV-Synology | 🌐 Official Synology DSM | 🐳 Portainer / CasaOS | 🏠 Home Assistant DSM |
| :--- | :---: | :---: | :---: | :---: |
| **Tech Stack** | **Next.js 15 + React 19** | ExtJS / Web Components | Vue / React | Python Backend |
| **Direct Browser-to-NAS Proxy** | ✅ **Zero intermediary** | ❌ Direct Port Binding | ❌ Server Agent Needed | ❌ HA Server Proxy |
| **QuickConnect Auto-Resolver** | ✅ **LAN + WAN + Relay** | ✅ Native DSM | ❌ Manual IP only | ❌ Manual IP only |
| **AI Agent MCP Integration** | ✅ **42 Native Tools** | ❌ None | ❌ None | ⚠️ Basic Entity Controls |
| **Unified Service Toggles** | ✅ **SMB/NFS/SSH/FTP in 1 click**| ⚠️ Scattered in Control Panel| ❌ Not Synology Services | ⚠️ Limited |
| **Real-time Notifications** | ✅ **Grouped + Filterable** | ✅ DSM Notification tray | ❌ Container logs only | ⚠️ HA Events |
| **Container Management** | ✅ **Integrated** | ✅ Container Manager | ✅ Full Docker UI | ⚠️ Addon Manager |
| **Resource Footprint** | ⚡ **Ultra-lightweight** | 🐢 Heavyweight desktop OS | 🟡 Moderate | 🟡 Heavy |

---

## ✨ Key Features

- 🔐 **Intelligent QuickConnect & Network Resolution**: Supports LAN IP, DDNS (`*.synology.me`), and QuickConnect IDs (`your-id`). Automatically resolves `global.quickconnect.to` with smart TCP candidate checking and seamless NAT relay fallback (`relay_ip:relay_port`).
- 📊 **Real-time Dashboard & Monitoring**: Live telemetry for CPU, RAM, Network I/O, Storage pools, temperatures, uptime, and hardware specs.
- 📁 **Enhanced File Station**: Fast tree navigation, in-browser media player (audio/video/images), source code reader with syntax highlighting & line numbers, batch downloads, and public share links.
- 🔌 **Instant Service Toggles**: One-click start/stop for SMB/CIFS (445), AFP (548), NFS (2049), FTP (21), SFTP (22), SSH (22), Telnet (23), rsync (873), and WebDAV (5005).
- 🔔 **Synology Notification Center**: Full `SYNO.Core.DSMNotify` integration with category filters (`system`, `storage`, `package`, `network`, `security`, `backup`), severity levels (`info`, `warning`, `error`), badge counts, and 30s polling.
- 🐳 **Container Manager Control**: View, start, stop, and inspect running Docker containers directly.
- 🤖 **Native Model Context Protocol (MCP)**: 42 production-ready tools for AI assistants (Claude, Cursor, Ollama) to inspect, manage, and automate your NAS.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│               Client Browser / AI Agent                │
│    (Next.js 15 + React 19 UI / MCP Stdio Interface)    │
└───────────────────────────┬────────────────────────────┘
                            │
              Direct HTTPS / QuickConnect API
                            │
┌───────────────────────────▼────────────────────────────┐
│         KV-Synology Engine (Docker / Node.js)          │
│                                                        │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │  Smart Proxy Engine  │    │ 42-Tool MCP Server   │  │
│  │  (/api/dsm/[...path])│    │ (AI Agent Protocols) │  │
│  └──────────┬───────────┘    └──────────┬───────────┘  │
└─────────────┼───────────────────────────┼──────────────┘
              │ Direct TCP Candidates     │
              │ (LAN / DDNS / Relay)      │
┌─────────────▼───────────────────────────▼──────────────┐
│                  Synology DiskStation                  │
│       DSM 7.x REST API (SYNO.Core.* & SYNO.Docker.*)   │
└────────────────────────────────────────────────────────┘
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
      - NODE_ENV=production
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
4. Access `http://<NAS-IP>:8088`.

> 💡 **Mirror Registries:** If Docker Hub is throttled, switch image to:
> - `ghcr.io/vndangkhoa/kv-synology:latest`
> - `git.khoavo.myds.me/vndangkhoa/kv-synology:latest`

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

Connect your Synology NAS directly to AI Coding Assistants (Cursor, Claude Desktop, Windsurf):

```json
{
  "mcpServers": {
    "synology": {
      "command": "node",
      "args": ["/path/to/kv-synology/mcp/dist/index.js"],
      "env": {
        "DSM_HOST": "https://192.168.1.10:5001",
        "DSM_USER": "admin",
        "DSM_PASS": "your_strong_password"
      }
    }
  }
}
```

*Supports 42 automation tools including `dsm_list_services`, `dsm_toggle_service`, `dsm_list_notifications`, `dsm_docker_ps`, `dsm_storage_info`, and more. See [mcp/README.md](mcp/README.md) for complete docs.*

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/vndangkhoa/kv-synology.git
cd kv-synology

# Install dependencies
npm install

# Start development server on port 8088
npm run dev

# Build for production
npm run build
npm run start
```

---

## 📂 Project Structure

```
kv-synology/
├── src/
│   ├── app/
│   │   ├── api/dsm/[...path]/route.ts  # DSM Smart Proxy + QuickConnect resolver
│   │   ├── globals.css, layout.tsx, page.tsx
│   ├── components/          # Dashboard, Files, Docker, Download, Storage, Services, Notifications
│   │   ├── services/ServicesTab.tsx           # SMB, AFP, NFS, FTP, SFTP, SSH toggles
│   │   └── notifications/NotificationsTab.tsx # Real-time notification center
│   └── lib/
│       ├── dsm/             # DSM client, types, TCP candidate test, mockData
│       ├── i18n/            # Vi / En localization
│       └── store/           # Zustand app state & auto-polling
├── mcp/                     # Model Context Protocol (MCP) Server for AI Agents
│   ├── src/index.ts         # 42 tools implementation
│   └── README.md            # MCP configuration documentation
├── docker-compose.yml       # Production deployment
└── Dockerfile               # Multi-arch production build
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
