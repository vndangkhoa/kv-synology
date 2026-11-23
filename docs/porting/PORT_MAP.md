# Port map: kv-synology

5 of 51 units have a Rust port; no original changed since it was recorded.

## Ports

| Unit | Crate | In Rust | Kept in the original | Cases | Last diff | Original |
| --- | --- | --- | --- | ---: | ---: | --- |
| `src/lib/permissions/` | `rust/acl-engine-rs` | `cleanPath`, `extractPathParts`, `parseAclLevel`, `calculateEffectivePermission`, `scanSecurityAudit`, `splitCsvLine`, `parseAclCsv` | `buildDatasetFromLiveNas` | 1473 | 1473/1473 | unchanged |
| `src/lib/reports/` | `rust/report-engine-rs` | `buildLiveReportSummary`, `computeHealthScore`, `generateDailyRecords`, `generateMockReport`, `generateTelegramDigest` | - | 822 | 822/822 | unchanged |
| `src/lib/snmp/` | `rust/snmp-presets-rs` | `isLocalHost` | `querySnmp`, `discoverInterfaces`, `queryLocalSystemMetric`, `tcpPing`, `createSession`, `querySensor`, `createDefaultSynologyDevice`, `getSnmpDevices`, `saveSnmpDevices`, `addSnmpDevice`, `updateSnmpDevice`, `removeSnmpDevice`, `genId` | 217 | 217/217 | unchanged |
| `src/lib/storage/` | `rust/syno-smart-parser-rs` | `formatLifetimeSpan`, `stripAnsi`, `parseSynoSmartOutput` | - | 482 | 482/482 | unchanged |
| `src/lib/traffic/` | `rust/geoip-helpers-rs` | `getCountryFlag`, `getCountryName`, `isPrivateIp`, `resolveKnownIp` | `resolveIpGeo`, `getNetworkInterfaceStats`, `getProcessIoCounters`, `getLiveLinuxSockets`, `getLiveDsmConnections` | 945 | 945/945 | unchanged |

## Whole app

| Glue | Runs |
| --- | --- |
| `rust/app/src/units/api_ai_chat.rs` | Rust only |
| `rust/app/src/units/api_ai_models.rs` | Rust only |
| `rust/app/src/units/api_download.rs` | Rust only |
| `rust/app/src/units/api_dsm_proxy.rs` | Rust only |
| `rust/app/src/units/api_geoip.rs` | Rust only |
| `rust/app/src/units/api_notifications.rs` | Rust only |
| `rust/app/src/units/api_smart_info.rs` | Rust only |
| `rust/app/src/units/api_snmp.rs` | Rust only |
| `rust/app/src/units/api_ssh.rs` | Rust only |
| `rust/app/src/units/api_traffic.rs` | Rust only |
| `rust/app/src/units/report_engine.rs` | Rust only |

## Not ported yet

In the order `analyze` suggests.

| Unit | Lines | Exports | Readiness |
| --- | ---: | ---: | ---: |
| `src/app/api/snmp/query/` | 73 | 1 | 85 |
| `src/app/api/download/bt-search/` | 123 | 1 | 81 |
| `src/app/api/snmp/discover/` | 76 | 1 | 76 |
| `src/app/api/download/rss-fetch/` | 74 | 1 | 71 |
| `src/app/api/download/resolve-link/` | 68 | 1 | 86 |
| `src/app/api/notifications/dispatch/` | 67 | 1 | 85 |
| `src/app/api/reports/summary/` | 60 | 2 | 86 |
| `src/app/api/reports/export/` | 304 | 2 | 79 |
| `src/app/api/ssh/exec/` | 160 | 1 | 70 |
| `src/app/api/geoip/lookup/` | 35 | 1 | 88 |
| `kv-synology-ios/simulator/` | 105 | 0 | 97 |
| `scripts/` | 34 | 0 | 92 |
| `public/` | 61 | 0 | 94 |
| `src/app/api/traffic/connections/` | 207 | 1 | 67 |
| `src/components/terminal/` | 279 | 0 | 66 |
| `src/app/` | 365 | 0 | 68 |
| `src/components/common/` | 401 | 0 | 67 |
| `src/app/api/ai/chat/` | 454 | 1 | 59 |
| `src/app/api/storage/smart-info/` | 462 | 1 | 60 |
| `src/app/api/ai/models/` | 435 | 1 | 50 |
| `src/lib/` | 373 | 18 | 59 |
| `src/lib/i18n/` | 1239 | 0 | 68 |
| `src/lib/store/` | 287 | 0 | 49 |
| `src/components/mcp/` | 1083 | 0 | 57 |
| `src/components/dashboard/` | 887 | 0 | 53 |
| `src/lib/native/` | 236 | 10 | 44 |
| `src/components/monitor/` | 1267 | 0 | 43 |
| `src/components/ai/` | 1167 | 0 | 40 |
| `src/app/api/dsm/[...path]/` | 686 | 2 | 30 |
| `src/components/notifications/` | 1186 | 0 | 38 |
| `mcp/src/index.ts` | 835 | 0 | 32 |
| `src/components/layout/` | 1551 | 0 | 31 |
| `src/components/security/` | 1444 | 0 | 26 |
| `src/components/packages/` | 1804 | 0 | 26 |
| `src/components/settings/` | 1502 | 0 | 22 |
| `src/components/snmp/` | 1572 | 0 | 16 |
| `src/components/traffic/` | 1721 | 0 | 16 |
| `src/components/files/` | 1977 | 0 | 13 |
| `src/components/reports/` | 2694 | 0 | 11 |
| `src/lib/dsm/` | 11415 | 1 | 0 |
| `mcp/src/dsm/` | 2213 | 6 | 0 |
| `src/components/download/` | 2372 | 0 | 0 |
| `src/components/permissions/` | 2841 | 0 | 0 |
| `src/components/storage/` | 3669 | 0 | 0 |
| `src/components/docker/` | 3214 | 0 | 0 |
| `src/components/services/` | 2346 | 0 | 0 |

Regenerate with `rust-anything map --write`. Commit this file: when the original changes upstream, the next map marks every port whose recording it outdated.
