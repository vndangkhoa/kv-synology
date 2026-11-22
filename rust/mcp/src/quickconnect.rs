//! QuickConnect & host input parser ported from `mcp/src/dsm/quickconnect.ts`.

#![forbid(unsafe_code)]

use std::collections::HashMap;
use std::sync::{LazyLock, RwLock};
use std::time::{Duration, Instant};

use serde_json::{Value, json};
use tokio::net::TcpStream;

#[derive(Debug, Clone)]
pub struct ResolvedTarget {
    pub host: String,
    pub port: u16,
    pub is_https: bool,
}

#[derive(Clone)]
struct CachedQc {
    target: ResolvedTarget,
    expires_at: Instant,
}

static QC_CACHE: LazyLock<RwLock<HashMap<String, CachedQc>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

static QC_HTTP: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_secs(6))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
});

fn is_ipv4(h: &str) -> bool {
    let parts: Vec<&str> = h.split('.').collect();
    parts.len() == 4
        && parts
            .iter()
            .all(|p| !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()))
}

pub fn is_quick_connect_id(host: &str) -> bool {
    let h = host.trim().to_lowercase();
    if h.ends_with(".quickconnect.to") {
        return true;
    }
    if !h.contains('.') && !h.contains(':') && h != "localhost" && !is_ipv4(&h) {
        return true;
    }
    false
}

pub fn parse_host_input(raw_host: &str, raw_port: &str, mut is_https: bool) -> ResolvedTarget {
    let mut host = raw_host.trim().to_string();
    let mut port = raw_port
        .trim()
        .parse::<u16>()
        .ok()
        .filter(|&p| p > 0)
        .unwrap_or(if is_https { 5001 } else { 5000 });

    if host.starts_with("http://") || host.starts_with("https://") {
        if let Ok(parsed) = url::Url::parse(&host) {
            is_https = parsed.scheme() == "https";
            if let Some(h) = parsed.host_str() {
                host = h.to_string();
            }
            if let Some(p) = parsed.port() {
                port = p;
            }
        }
    } else if host.contains(':')
        && !host.to_lowercase().contains(".quickconnect.to")
        && let Some((h, p)) = host.split_once(':')
    {
        if let Ok(parsed_p) = p.trim().parse::<u16>()
            && parsed_p > 0
        {
            port = parsed_p;
        }
        host = h.to_string();
    }

    ResolvedTarget {
        host,
        port,
        is_https,
    }
}

pub async fn test_host_connection(host: &str, port: u16, timeout_ms: u64) -> bool {
    matches!(
        tokio::time::timeout(
            Duration::from_millis(timeout_ms),
            TcpStream::connect((host, port)),
        )
        .await,
        Ok(Ok(_))
    )
}

async fn fetch_server_info(clean_id: &str, control_host: &str) -> Result<Value, String> {
    let payload = json!({
        "version": 1,
        "command": "get_server_info",
        "stop_mirror": true,
        "serverID": clean_id,
        "id": "dsm_portal_https",
    });
    let res = QC_HTTP
        .post(format!("https://{control_host}/Serv.php"))
        .header("Content-Type", "application/json")
        .header("User-Agent", "Synology/DSM")
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.json::<Value>().await.map_err(|e| e.to_string())
}

pub async fn resolve_quick_connect(server_id: &str) -> Option<ResolvedTarget> {
    let clean_id = server_id
        .trim()
        .trim_end_matches(".quickconnect.to")
        .trim()
        .to_lowercase();
    if let Ok(cache) = QC_CACHE.read()
        && let Some(hit) = cache.get(&clean_id)
        && hit.expires_at > Instant::now()
    {
        return Some(hit.target.clone());
    }

    let mut parsed = fetch_server_info(&clean_id, "global.quickconnect.to")
        .await
        .ok()?;
    if parsed.get("errno").and_then(Value::as_i64) == Some(4)
        && let Some(site) = parsed
            .get("sites")
            .and_then(Value::as_array)
            .and_then(|arr| arr.first())
            .and_then(Value::as_str)
            .map(ToString::to_string)
        && let Ok(reg) = fetch_server_info(&clean_id, &site).await
    {
        parsed = reg;
    }

    if parsed.get("errno").and_then(Value::as_i64) != Some(0) || parsed.get("server").is_none() {
        eprintln!("[QuickConnect] lookup failed: {parsed}");
        return None;
    }

    let lan_ip = parsed
        .pointer("/server/interface/0/ip")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let ddns = parsed
        .pointer("/server/ddns")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty() && *s != "NULL")
        .map(ToString::to_string);
    let smart_dns = parsed
        .pointer("/smartdns/host")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let smart_dns_lan = parsed
        .pointer("/smartdns/lan/0")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let smart_dns_ext = parsed
        .pointer("/smartdns/external")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let wan_ip = parsed
        .pointer("/server/external/ip")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let port = parsed
        .pointer("/service/port")
        .and_then(Value::as_u64)
        .filter(|&p| p > 0 && p <= 65535)
        .unwrap_or(5001) as u16;
    let relay_ip = parsed
        .pointer("/service/relay_ip")
        .and_then(Value::as_str)
        .map(ToString::to_string);
    let relay_port = parsed
        .pointer("/service/relay_port")
        .and_then(Value::as_u64)
        .map(|p| p as u16);
    let relay_dn = parsed
        .pointer("/service/relay_dn")
        .and_then(Value::as_str)
        .map(ToString::to_string);

    let mut candidates = Vec::new();
    if let Some(d) = &ddns {
        candidates.push(ResolvedTarget {
            host: d.clone(),
            port,
            is_https: true,
        });
    }
    if let Some(s) = &smart_dns {
        candidates.push(ResolvedTarget {
            host: s.clone(),
            port: 443,
            is_https: true,
        });
    }
    if let Some(s) = &smart_dns_ext {
        candidates.push(ResolvedTarget {
            host: s.clone(),
            port: 443,
            is_https: true,
        });
    }
    candidates.push(ResolvedTarget {
        host: format!("{clean_id}.direct.quickconnect.to"),
        port,
        is_https: true,
    });
    if let Some(ip) = &lan_ip {
        candidates.push(ResolvedTarget {
            host: ip.clone(),
            port,
            is_https: true,
        });
    }
    if let Some(s) = &smart_dns_lan {
        candidates.push(ResolvedTarget {
            host: s.clone(),
            port,
            is_https: true,
        });
    }
    if let Some(ip) = &wan_ip {
        candidates.push(ResolvedTarget {
            host: ip.clone(),
            port,
            is_https: true,
        });
    }
    if let (Some(dn), Some(rp)) = (&relay_dn, relay_port) {
        candidates.push(ResolvedTarget {
            host: dn.clone(),
            port: rp,
            is_https: true,
        });
    }
    if let (Some(ip), Some(rp)) = (&relay_ip, relay_port) {
        candidates.push(ResolvedTarget {
            host: ip.clone(),
            port: rp,
            is_https: true,
        });
    }

    let mut first_reachable = None;
    for cand in &candidates {
        if test_host_connection(&cand.host, cand.port, 1500).await {
            first_reachable = Some(cand.clone());
            break;
        }
    }

    let target = first_reachable.or_else(|| {
        if let (Some(dn), Some(rp)) = (relay_dn, relay_port) {
            Some(ResolvedTarget {
                host: dn,
                port: rp,
                is_https: true,
            })
        } else if let (Some(ip), Some(rp)) = (relay_ip, relay_port) {
            Some(ResolvedTarget {
                host: ip,
                port: rp,
                is_https: true,
            })
        } else if let Some(d) = ddns {
            Some(ResolvedTarget {
                host: d,
                port,
                is_https: true,
            })
        } else {
            candidates.into_iter().next()
        }
    })?;

    if let Ok(mut cache) = QC_CACHE.write() {
        cache.insert(
            clean_id.clone(),
            CachedQc {
                target: target.clone(),
                expires_at: Instant::now() + Duration::from_secs(600),
            },
        );
    }
    eprintln!(
        "[QuickConnect] {clean_id} -> {}:{} https={}",
        target.host, target.port, target.is_https
    );
    Some(target)
}
