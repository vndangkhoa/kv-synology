# Research: SNMP v1/v2c/v3 (`snmp2`) & Linux `/proc` Readers

## Primary Sources Inspected
- `docs.rs/snmp2`: `snmp2::AsyncSession` (`new_v1` / `new_v2c` / `new_v3`, `init()`, `get()`, `getnext()`/`subtree()` walk), `v3::Security`, `v3::AuthProtocol` (`Md5`, `Sha1`, `Sha256`, etc.), `v3::Auth::AuthPriv`, `v3::Cipher` (`Des`, `Aes128`)
- Existing Node implementation: `src/lib/snmp/server.ts`, `src/app/api/snmp/{discover,query}/route.ts`, `src/lib/traffic/realSocketService.ts`

## Mapping & Crate Strategy
- **SNMP Crate**: Use `snmp2 = { version = "0.5", features = ["tokio", "crypto-rust", "v3"] }` (pure Rust cryptography, zero OpenSSL dependency).
- **Local Host Optimization (`isLocalHost(host)`)**:
  - Maintain parity with `isLocalHost`: match `127.0.0.1`, `::1`, `localhost`, and host private interface check -> read `/proc/stat`, `/proc/meminfo`, `/proc/uptime`, `/proc/net/dev` directly when local sensors (`cpu_usage`, `ram_usage`, `uptime`, NIC RX/TX) are requested.
- **TCP Ping Sensors (`kind == "ping"`)**:
  - Use `tokio::time::timeout(Duration::from_millis(3000), TcpStream::connect((host, port)))` and measure elapsed milliseconds matching `{ value, status: "up"|"down", raw }`.
- **Linux Socket Telemetry (`/api/traffic/connections`)**:
  - Parse `/proc/net/tcp`, `/proc/net/tcp6`, `/proc/net/udp`, `/proc/net/udp6` (little-endian hex IPv4 words & 32-bit-word IPv6 hex words + hex ports + TCP state codes `01`=`ESTABLISHED`..`0B`), filtering `0.0.0.0` / `::` / port `0`.

## Semantic Traps
- **Hex IPv4/IPv6 byte order in `/proc/net/tcp`**: Linux `/proc/net/tcp` prints IPv4 addresses in host-endian hex (`0100007F` = `127.0.0.1` on x86_64 little-endian); `/proc/net/tcp6` prints four 32-bit little-endian words. Verify byte reversal matches `parseHexIpv4` / `parseHexIpv6` in `realSocketService.ts`!
- **`snmp2` subtree walk termination**: Ensure `getnext` loop stops cleanly when OID leaves target prefix or `EndOfMibView` is returned (avoid infinite loops on lexicographically non-increasing OIDs!).
- **CPU delta sampling**: Ensure `/proc/stat` idle/total calculations match `queryLocalSystemMetric` snapshot logic (including handling single-shot call gracefully).
