# legacy/

Archived code from before the 100% Pure Rust migration (v1.6.0). **Nothing here is used by the
Docker image, the Synology SPK, the Android app or CI.** It is kept for reference only.

| Path | What it was |
| :--- | :--- |
| `nextjs/` | Original Next.js web app (`src/`), configs, `manage.sh`, `draft-backup/` |
| `mcp-ts/` | TypeScript MCP server, replaced by `rust/mcp` (`kv-synology-mcp`) |
| `capacitor-ios/` | Capacitor iOS wrapper of the Next.js build (native app lives in `kv-synology-ios/`) |
| `rust/acl-engine-rs/` | Unused napi-rs porting crate (no crate depends on it) |

Porting notes live in [`docs/porting/`](../docs/porting/).
