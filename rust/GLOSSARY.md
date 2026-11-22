# Domain Glossary — `kv-synology` TypeScript to Rust

| Domain Term | Meaning in Original (`src/`, `mcp/`) | Canonical Rust Name / Module |
| --- | --- | --- |
| DSM Session Credentials | `host`, `port`, `https`, `sid`, `cookie`, `synoToken` (`x-dsm-*` headers & cookies) | `DsmTarget` / `DsmSessionConfig` (`rust/app`, `rust/mcp`) |
| QuickConnect Resolution | Multi-step HTTP control probe (`global.quickconnect.to` -> `usc`/`tw`/`us`/`eu` + direct LAN/relay) | `resolve_quickconnect` (`dsm_proxy::quickconnect`) |
| DDNS Candidate Probe | Cached 10-minute probe across HTTPS/HTTP ports `443`, `5001`, `5000`, `41533` | `resolve_universal_ddns` (`dsm_proxy::ddns`) |
| `SynoSmartResult` | Result from SynoSmartInfo CGI / SSH + parsed SMART table (`SmartDrive[]`) | `SynoSmartResult`, `SmartDrive`, `SmartAttr` (`syno_smart_parser_rs`) |
| `parseSynoSmartOutput` | ANSI-stripping Synology `smartctl` / NVMe health output parser | `syno_smart_parser_rs::port::parse_syno_smart_output` |
| `PermissionMatrix` / ACL Engine | Synology shared-folder & subfolder ACL evaluator (`Allow`/`Deny` precedence, inheritance) | `acl_engine_rs::port::*` (`AclRule`, `EffectivePermission`) |
| `ReportSummary` | Weekly/monthly NAS health score, power/outage metrics, storage/security daily records & HTML export | `report_engine_rs::port::*` (`ReportSummary`, `ReportPeriod`, `DailyRecord`) |
| `SnmpCredentials` / `SnmpSensor` | SNMP v1/v2c/v3 USM auth/priv credentials + OID/TCP ping/local `/proc` sensor query | `snmp_presets_rs`, `snmp_service::query_sensors` |
| `IF_MIB` | Standard interface MIB OIDs (`ifName`, `ifDescr`, `ifOperStatus`, throughput OIDs) | `snmp_presets_rs::port::IF_MIB` |
| `NetworkConnectionItem` | Merged `/proc/net/{tcp,tcp6,udp,udp6}` + DSM `SYNO.Core.CurrentConnection` + GeoIP + `/proc/[pid]/io` weight | `traffic_service::TrafficSnapshot` |
| `GeoIpInfo` | Offline private/LAN CIDR classification + remote GeoIP / PTR lookup | `geoip_helpers_rs::port::is_private_ip` + `traffic_service::resolve_ip_geo` |
| `AiProvider` | Cloud & local providers (`gemini`, `deepseek`, `claude`, `openai`, `openrouter`, `opencode`, `heuristic`) | `ai_service::AiProvider` |
| `McpToolCallAction` | Extracted ` ```mcp_action ` JSON action directive in AI Copilot replies | `ai_service::McpToolCallAction` |
| `kv-synology-mcp` | Stdio MCP server exposing 15+ Synology DSM & SSH tools | `kv_synology_mcp` binary (`rust/mcp`) |
| `AppStore` (`useAppStore`) | Frontend multi-NAS connection list, active NAS tab, theme (`light`/`dark`), lang (`vi`/`en`), experience mode (`beginner`/`advance`) | `web_ui::state::AppState` (Leptos `RwSignal` context + `localStorage`) |
| `ExperienceMode` | `beginner` (core 7 tabs) vs `advance` (all 18 tabs including ACL, Firewall, SNMP, Traffic, Terminal, Reports, MCP) | `ExperienceMode::Beginner` / `ExperienceMode::Advance` |
