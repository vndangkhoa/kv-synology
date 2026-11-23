//! Entrypoint for the pure-Rust `kv-synology-mcp` stdio MCP server.

#![forbid(unsafe_code)]

use rmcp::ServiceExt;

use kv_synology_mcp::client::DsmClient;
use kv_synology_mcp::server::KvSynologyMcpServer;
use kv_synology_mcp::types::DsmConnectionConfig;

async fn auto_login_from_env(client: &DsmClient) {
    let host = std::env::var("DSM_HOST")
        .or_else(|_| std::env::var("SYNOLOGY_HOST"))
        .unwrap_or_default();
    let user = std::env::var("DSM_USER")
        .or_else(|_| std::env::var("SYNOLOGY_USER"))
        .or_else(|_| std::env::var("DSM_ACCOUNT"))
        .unwrap_or_default();
    let pass = std::env::var("DSM_PASS")
        .or_else(|_| std::env::var("SYNOLOGY_PASS"))
        .or_else(|_| std::env::var("DSM_PASSWORD"))
        .unwrap_or_default();

    if !host.is_empty() && !user.is_empty() && !pass.is_empty() {
        let port = std::env::var("DSM_PORT")
            .or_else(|_| std::env::var("SYNOLOGY_PORT"))
            .ok()
            .and_then(|s| s.parse::<u16>().ok())
            .filter(|&p| p > 0)
            .unwrap_or(5001);
        let https_flag = std::env::var("DSM_HTTPS")
            .or_else(|_| std::env::var("SYNOLOGY_HTTPS"))
            .map(|v| v != "false")
            .unwrap_or(true);
        let otp = std::env::var("DSM_OTP").ok().filter(|s| !s.is_empty());

        eprintln!("[MCP] Auto-login to {host}:{port} as {user} ...");
        let cfg = DsmConnectionConfig {
            host,
            port,
            https: https_flag,
            account: user,
            password: Some(pass),
            otp,
            ignore_cert: true,
        };
        match client.login(cfg, false).await {
            Ok(sess) => eprintln!(
                "[MCP] Auto-login success: {} {}",
                sess.model, sess.version_string
            ),
            Err(e) => eprintln!("[MCP] Auto-login failed: {e}"),
        }
    }
}

#[tokio::main]
async fn main() {
    let _shield_tag = kv_synology_mcp::bla_shield::initialize_shield();
    let client = DsmClient::new();
    auto_login_from_env(&client).await;

    let server = KvSynologyMcpServer::new(client);
    eprintln!("[MCP] kv-synology-mcp pure-Rust server running on stdio");

    let service = match server.serve(rmcp::transport::io::stdio()).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[MCP] Fatal startup error: {e}");
            std::process::exit(1);
        }
    };
    if let Err(e) = service.waiting().await {
        eprintln!("[MCP] Fatal runtime error: {e}");
        std::process::exit(1);
    }
}
