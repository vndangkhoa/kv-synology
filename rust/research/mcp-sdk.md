# Research: Rust MCP Stdio Server (`rmcp`) vs `mcp/src/` (`@modelcontextprotocol/sdk`)

## Primary Sources Inspected
- `docs.rs/rmcp`: `rmcp::tool`, `rmcp::tool_router`, `rmcp::tool_handler`, `rmcp::transport::stdio`, `ServerHandler`, `ToolRouter`, `CallToolResult`, `ErrorData`
- Existing Node implementation: `mcp/package.json`, `mcp/src/index.ts` (835 lines), `mcp/src/dsm/{client,mockData,quickconnect,types}.ts` (2213 lines)

## Mapping Plan (`rust/mcp`)
- Binary target `kv-synology-mcp` in workspace crate `rust/mcp`.
- Expose all MCP tools from `mcp/src/index.ts` with identical tool names, descriptions, and JSON schemas (derived via `schemars::JsonSchema` + `serde::Deserialize` matching the original `zod` schemas).
- Share DSM HTTP proxy / QuickConnect / `russh` SSH client / mock demo data seamlessly inside the Rust workspace rather than duplicating client code across web API and MCP server.
- Maintain `stdio` newline-delimited JSON-RPC transport and zero stray `println!` writes to stdout (all logging must go to `tracing_subscriber` -> `stderr`).

## Semantic Traps
- **Stdout contamination**: MCP stdio protocol uses `stdout` exclusively for JSON-RPC frames; any `println!` breaks clients. Route all `tracing` logs explicitly to `std::io::stderr`.
- **Zod optional vs nullable defaults**: Check every `z.string().optional()` and default values (`port = 5001`, `https = true`, `action = "list"`) in `mcp/src/index.ts` so `schemars` + `#[serde(default)]` accept omitted fields identically.
