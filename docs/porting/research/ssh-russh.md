# Research: Pure-Rust Async SSH Client (`russh`) vs Node `ssh2`

## Primary Sources Inspected
- `docs.rs/russh`: `russh::client::{connect, Handler, Config}`, `session.authenticate_password`, `session.authenticate_publickey`, `session.channel_open_session`, `channel.exec(true, cmd)`
- Existing Next.js callers: `src/app/api/ssh/exec/route.ts` (172 lines), `src/app/api/storage/smart-info/route.ts` (499 lines), `mcp/src/index.ts`

## Protocol & API Mapping
- **Connection & Timeout**: Wrap `russh::client::connect(config, (host, port), ClientHandler)` inside `tokio::time::timeout(Duration::from_secs(15), ...)` to mirror Node `ssh2` 15s handshake timeout.
- **Server Host Key**: Implement `client::Handler::check_server_key` returning `Ok(true)` matching Node `ssh2`'s default behavior for dynamically configured user NAS targets.
- **Authentication**:
  - Support password (`authenticate_password(user, pass)`), plus private key (`russh_keys::decode_secret_key` + `authenticate_publickey`) when `privateKey` is provided.
- **Channel Execution**:
  - Open channel via `channel_open_session().await?`, invoke `channel.exec(true, command.as_bytes()).await?`, loop `channel.wait().await` accumulating `ChannelMsg::Data` into `stdout`, `ChannelMsg::ExtendedData { ext: 1, .. }` into `stderr`, and capture `ChannelMsg::ExitStatus { exit_status }`.
- **QuickConnect Validation Parity**:
  - Keep pre-flight rejection of QuickConnect hosts (`*.quickconnect.to` or single-label host != `localhost`) returning HTTP `400` with hint `"Thử dùng IP LAN hoặc DDNS thay vì QuickConnect ID."`.

## Semantic Traps
- **`AuthResult::Success`**: Note `russh` v0.49+ returns an `AuthResult` enum (check `.success()` on recent versions rather than a bare `bool`).
- **`MaxStartups` / Synology OpenSSH 8.2 quirks**: Keep timeouts at 15s and surface clear auth vs connection refused vs timeout errors matching `/api/ssh/exec` response JSON `{ success, stdout, stderr, code, error }`.
