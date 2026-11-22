# Research: DSM Reverse Proxy & QuickConnect Relay (`src/app/api/dsm/[...path]/route.ts`)

## Primary Sources Inspected
- Existing Next.js implementation: `src/app/api/dsm/[...path]/route.ts` (758 lines)
- `reqwest` docs (`docs.rs/reqwest`): `Client::builder().danger_accept_invalid_certs(true)`, `redirect::Policy::none()`, `bytes_stream()` / `Body::from_stream`

## Architecture & Control Flow
1. **Target resolution**: Read `x-dsm-host` -> `_host` query param -> `dsm_host` cookie; `x-dsm-port` -> `_port` -> `dsm_port` (`5000`); `x-dsm-https` -> `_https` -> `dsm_https`; `x-dsm-cookie` -> `dsm_cookie` (or `id=<_sid>`). Missing host -> HTTP `400` `{ success: false, error: { code: 400, message: "Thiếu thông tin địa chỉ NAS (x-dsm-host hoặc _host)" } }`.
2. **Host classification**:
   - Full URL (`http://`/`https://`): extract scheme, host, port.
   - QuickConnect ID: ends with `.quickconnect.to` OR has no `.` / `:` and `!= localhost`. Query control servers (`global.quickconnect.to`, `usc.quickconnect.to`, `tw.quickconnect.to`, `us.quickconnect.to`, `eu.quickconnect.to`) via `/Serv.php`, follow regional redirect hosts, probe LAN/WAN/direct.quickconnect.to/relay candidates against `/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=SYNO.API.Auth`.
   - DDNS / Reverse Proxy domains: 10-minute in-memory TTL cache probing candidate ports/protocols so media tags don't trigger probe storms.
3. **Header & Streaming Parity**:
   - Must strip internal params (`_host`, `_port`, `_https`, `_synotoken`) from forwarded query string while preserving `%2F` and raw encodings (`urlencoding`/path reconstruction carefully!).
   - Forward `Range`, `Cookie`, `X-SYNO-TOKEN`, `Content-Type`, `Content-Length`, `Origin`, `Referer`, `Host`.
   - Mirror upstream `set-cookie`, `accept-ranges`, `content-range`, `content-length`, `content-disposition`, `content-type`.

## Semantic Traps
- **URL percent-encoding**: Node preserves existing `%XX` in `searchParams` vs raw path segments (`map(s => encodeURIComponent(decodeURIComponent(s)))`). Verify encoded paths like `/AudioStation/cover.cgi` and File Station downloads containing UTF-8 / spaces.
- **Self-signed NAS certificates**: Local Synology NAS almost always uses self-signed certs on `:5001`. Must use `reqwest` built with `rustls-tls` and maintain two reusable clients (strict CA vs `danger_accept_invalid_certs(true)` for DSM targets) for keep-alive pooling.
- **Error mapping**: Preserve `ENOTFOUND`, `ECONNREFUSED`, `ETIMEDOUT` Vietnamese error messages and HTTP `502` status for proxy failures.
