//! Pure-Rust async SSH command execution using `russh` (`ssh2` replacement).

#![forbid(unsafe_code)]

use std::sync::Arc;
use std::time::Duration;

use russh::ChannelMsg;
use russh::client::{self, Handler};
use russh::keys::{PrivateKeyWithHashAlg, PublicKeyOrCertificate, decode_secret_key};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::net::TcpStream;

#[derive(Debug, Clone)]
pub struct HttpReply {
    pub status: u16,
    pub body: Value,
}

#[derive(Debug, Clone)]
pub struct SshExecOutput {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SshExecBody {
    host: Option<String>,
    port: Option<Value>,
    username: Option<String>,
    password: Option<String>,
    private_key: Option<String>,
    command: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
struct Candidate {
    h: String,
    p: u16,
}

struct AcceptAllHandler;

impl Handler for AcceptAllHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &PublicKeyOrCertificate,
    ) -> Result<bool, Self::Error> {
        Ok(true)
    }
}

fn parse_port(val: Option<&Value>) -> u16 {
    let num = match val {
        Some(Value::Number(n)) => n.as_u64(),
        Some(Value::String(s)) => s.trim().parse::<u64>().ok(),
        _ => None,
    };
    match num {
        Some(p) if (1..=65535).contains(&p) => p as u16,
        _ => 22,
    }
}

fn is_quickconnect_host(host: &str) -> bool {
    let lower = host.to_lowercase();
    lower.ends_with(".quickconnect.to")
        || (!host.contains('.') && !host.contains(':') && lower != "localhost")
}

async fn tcp_reachable(host: &str, port: u16, timeout_ms: u64) -> bool {
    matches!(
        tokio::time::timeout(
            Duration::from_millis(timeout_ms),
            TcpStream::connect((host, port)),
        )
        .await,
        Ok(Ok(_))
    )
}

fn enrich_ssh_error(
    msg: &str,
    orig_host: &str,
    target_host: &str,
    target_port: u16,
    user: &str,
) -> String {
    let hint = if msg.contains("Timed out while waiting for handshake") || msg.contains("timed out")
    {
        format!(
            " — TCP to {target_host}:{target_port} timed out during SSH banner/KEX. Verified LAN 192.168.1.10:2212 is open (OpenSSH_8.2). If you used DDNS {orig_host}, try LAN IP 192.168.1.10:2212 when on same network. For remote, forward port {target_port} on router or use VPN."
        )
    } else if msg.contains("All configured authentication methods failed")
        || msg.contains("Permission denied")
    {
        format!(
            " — user={user} auth failed. Check DSM password for {user} and that SSH allows password auth (DSM > Terminal & SNMP > Enable SSH)."
        )
    } else if msg.contains("ECONNREFUSED") || msg.contains("Connection refused") {
        format!(
            " — {target_host}:{target_port} refused. Check DSM Control Panel > Terminal & SNMP > SSH port, and Security > Firewall allow {target_port}."
        )
    } else {
        String::new()
    };
    format!("{msg}{hint}")
}

/// Reusable async SSH single-command runner backed by pure-Rust `russh`.
pub async fn exec_ssh_single(
    host: &str,
    port: u16,
    username: &str,
    password: Option<&str>,
    private_key: Option<&str>,
    command: &str,
    timeout_secs: u64,
) -> Result<SshExecOutput, String> {
    let fut = exec_ssh_inner(host, port, username, password, private_key, command);
    tokio::time::timeout(Duration::from_secs(timeout_secs), fut)
        .await
        .map_err(|_| {
            format!(
                "SSH handshake timeout ({timeout_secs}s) to {host}:{port} — check host/port/firewall. LAN host 192.168.1.10:2212 verified reachable (SSH-2.0-OpenSSH_8.2)."
            )
        })?
}

async fn exec_ssh_inner(
    host: &str,
    port: u16,
    username: &str,
    password: Option<&str>,
    private_key: Option<&str>,
    command: &str,
) -> Result<SshExecOutput, String> {
    let config = Arc::new(client::Config::default());
    let mut session = client::connect(config, (host, port), AcceptAllHandler)
        .await
        .map_err(|e| e.to_string())?;

    let authenticated = if let Some(pk) = private_key.filter(|s| !s.trim().is_empty()) {
        let key = decode_secret_key(pk, None).map_err(|e| format!("Invalid privateKey: {e}"))?;
        let hash_alg = session
            .best_supported_rsa_hash()
            .await
            .ok()
            .flatten()
            .flatten();
        let key_with_alg = PrivateKeyWithHashAlg::new(Arc::new(key), hash_alg);
        session
            .authenticate_publickey(username, key_with_alg)
            .await
            .map_err(|e| e.to_string())?
            .success()
    } else if let Some(pw) = password {
        session
            .authenticate_password(username, pw)
            .await
            .map_err(|e| e.to_string())?
            .success()
    } else {
        session
            .authenticate_none(username)
            .await
            .map_err(|e| e.to_string())?
            .success()
    };

    if !authenticated {
        let _ = session
            .disconnect(russh::Disconnect::ByApplication, "", "en")
            .await;
        return Err("All configured authentication methods failed".to_string());
    }

    let mut channel = session
        .channel_open_session()
        .await
        .map_err(|e| e.to_string())?;
    channel
        .exec(true, command.as_bytes())
        .await
        .map_err(|e| e.to_string())?;

    let mut stdout_buf = Vec::new();
    let mut stderr_buf = Vec::new();
    let mut exit_code: i32 = 0;

    while let Some(msg) = channel.wait().await {
        match msg {
            ChannelMsg::Data { data } => stdout_buf.extend_from_slice(&data),
            ChannelMsg::ExtendedData { data, ext } => {
                if ext == 1 {
                    stderr_buf.extend_from_slice(&data);
                }
            }
            ChannelMsg::ExitStatus { exit_status } => {
                exit_code = exit_status as i32;
            }
            ChannelMsg::Eof | ChannelMsg::Close => break,
            _ => {}
        }
    }

    let _ = session
        .disconnect(russh::Disconnect::ByApplication, "", "en")
        .await;

    Ok(SshExecOutput {
        stdout: String::from_utf8_lossy(&stdout_buf).into_owned(),
        stderr: String::from_utf8_lossy(&stderr_buf).into_owned(),
        code: exit_code,
    })
}

/// Port of `POST /api/ssh/exec` (`src/app/api/ssh/exec/route.ts`).
pub async fn handle_exec(body_bytes: &[u8]) -> HttpReply {
    const FAIL_HINT: &str = "Thử Host=192.168.1.10 Port=2212 (đã kiểm tra mở, OpenSSH_8.2) khi ở cùng mạng. Kiểm tra DSM > Terminal & SNMP > Bật SSH, tường lửa cho phép 2212, và NAT port forwarding nếu dùng DDNS từ xa.";

    let body: SshExecBody = match serde_json::from_slice(body_bytes) {
        Ok(b) => b,
        Err(e) => {
            return HttpReply {
                status: 500,
                body: json!({
                    "success": false,
                    "error": e.to_string(),
                    "hint": FAIL_HINT,
                }),
            };
        }
    };

    let (Some(host), Some(username), Some(command)) = (
        body.host.filter(|s| !s.is_empty()),
        body.username.filter(|s| !s.is_empty()),
        body.command.filter(|s| !s.is_empty()),
    ) else {
        return HttpReply {
            status: 400,
            body: json!({
                "success": false,
                "error": "host, username, command required",
            }),
        };
    };

    if is_quickconnect_host(&host) {
        return HttpReply {
            status: 400,
            body: json!({
                "success": false,
                "error": "SSH via QuickConnect ID not supported. Use LAN IP or DDNS (e.g., 192.168.1.10 or nas.synology.me) and ensure SSH port is forwarded/open.",
                "hint": "Thử dùng IP LAN hoặc DDNS thay vì QuickConnect ID.",
            }),
        };
    }

    let ssh_port = parse_port(body.port.as_ref());
    let mut candidates = vec![Candidate {
        h: host.clone(),
        p: ssh_port,
    }];
    let lower = host.to_lowercase();
    let is_ddns = lower.ends_with(".myds.me")
        || lower.ends_with(".synology.me")
        || lower.ends_with(".quickconnect.to");
    let lan_ip = "192.168.1.10";
    let lan_port = 2212;
    if is_ddns && host != lan_ip && !candidates.iter().any(|c| c.h == lan_ip && c.p == lan_port) {
        candidates.push(Candidate {
            h: lan_ip.to_string(),
            p: lan_port,
        });
    }

    let mut reachable = Vec::new();
    let mut last_err: Option<String> = None;
    for c in &candidates {
        if tcp_reachable(&c.h, c.p, 3000).await {
            reachable.push(c.clone());
        } else {
            last_err = Some(format!(
                "TCP {}:{} not reachable (timeout 3s) — will try fallback if available",
                c.h, c.p
            ));
        }
    }

    let to_try = if reachable.is_empty() {
        candidates.clone()
    } else {
        reachable
    };

    for (idx, cand) in to_try.iter().enumerate() {
        match exec_ssh_single(
            &cand.h,
            cand.p,
            &username,
            body.password.as_deref(),
            body.private_key.as_deref(),
            &command,
            15,
        )
        .await
        {
            Ok(out) => {
                return HttpReply {
                    status: 200,
                    body: json!({
                        "success": true,
                        "stdout": out.stdout,
                        "stderr": out.stderr,
                        "code": out.code,
                        "host": cand.h,
                        "port": cand.p,
                        "tried": candidates,
                    }),
                };
            }
            Err(err_msg) => {
                last_err = Some(enrich_ssh_error(
                    &err_msg, &host, &cand.h, cand.p, &username,
                ));
                if idx + 1 < to_try.len() {
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
            }
        }
    }

    let err_msg = last_err.unwrap_or_else(|| "SSH exec failed".to_string());
    HttpReply {
        status: 500,
        body: json!({
            "success": false,
            "error": err_msg,
            "hint": FAIL_HINT,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn missing_required_fields_returns_400() {
        let reply = handle_exec(b"{}").await;
        assert_eq!(reply.status, 400);
        assert_eq!(
            serde_json::to_string(&reply.body).unwrap(),
            r#"{"success":false,"error":"host, username, command required"}"#
        );
    }

    #[tokio::test]
    async fn quickconnect_hosts_are_rejected_with_400() {
        let reply = handle_exec(
            br#"{"host":"mynas.quickconnect.to","username":"admin","command":"uname -a"}"#,
        )
        .await;
        assert_eq!(reply.status, 400);
        assert_eq!(
            serde_json::to_string(&reply.body).unwrap(),
            r#"{"success":false,"error":"SSH via QuickConnect ID not supported. Use LAN IP or DDNS (e.g., 192.168.1.10 or nas.synology.me) and ensure SSH port is forwarded/open.","hint":"Thử dùng IP LAN hoặc DDNS thay vì QuickConnect ID."}"#
        );

        let single_label =
            handle_exec(br#"{"host":"mynas","username":"admin","command":"id"}"#).await;
        assert_eq!(single_label.status, 400);
    }
}
