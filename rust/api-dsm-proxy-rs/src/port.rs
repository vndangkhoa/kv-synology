//! DSM reverse proxy: QuickConnect discovery, DDNS probe cache, TLS self-signed bypass,
//! Range media streaming, and cookie/SynoToken header forwarding.

#![forbid(unsafe_code)]

use std::collections::{HashMap, HashSet};
use std::error::Error as StdError;
use std::future::Future;
use std::pin::Pin;
use std::sync::{LazyLock, RwLock};
use std::time::{Duration, Instant};

use serde_json::{Value, json};
use tokio::net::TcpStream;

#[derive(Debug, Clone)]
pub struct ProxyRequest {
    pub method: String,
    pub raw_path_segments: Vec<String>,
    pub raw_query: Option<String>,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct ProxyResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

#[derive(Debug, Clone)]
struct DsmCandidate {
    host: String,
    port: u16,
    is_https: bool,
}

#[derive(Debug, Clone)]
struct CachedTarget {
    host: String,
    port: u16,
    is_https: bool,
    expires_at: Instant,
}

#[derive(Debug)]
enum ProxyErrKind {
    ConnectionRefused,
    TimedOut,
    DnsNotFound,
    RetryableHttp404,
    Other,
}

#[derive(Debug)]
struct ProxyErr {
    kind: ProxyErrKind,
    message: String,
}

impl ProxyErr {
    fn is_retryable(&self) -> bool {
        matches!(
            self.kind,
            ProxyErrKind::ConnectionRefused
                | ProxyErrKind::TimedOut
                | ProxyErrKind::DnsNotFound
                | ProxyErrKind::RetryableHttp404
        ) || self.message.contains("reset")
            || self.message.contains("broken pipe")
    }

    fn code_value(&self) -> Value {
        match self.kind {
            ProxyErrKind::ConnectionRefused => json!("ECONNREFUSED"),
            ProxyErrKind::TimedOut => json!("ETIMEDOUT"),
            ProxyErrKind::DnsNotFound => json!("ENOTFOUND"),
            ProxyErrKind::RetryableHttp404 | ProxyErrKind::Other => json!(502),
        }
    }
}

static CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
});

static QUICK_CONNECT_CACHE: LazyLock<RwLock<HashMap<String, CachedTarget>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));
static QUICK_CONNECT_CANDIDATES: LazyLock<RwLock<HashMap<String, Vec<DsmCandidate>>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));
static DDNS_CACHE: LazyLock<RwLock<HashMap<String, CachedTarget>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

fn header_get<'a>(headers: &'a [(String, String)], key: &str) -> Option<&'a str> {
    headers
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case(key))
        .map(|(_, v)| v.as_str())
}

fn parse_cookies(headers: &[(String, String)]) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for (k, v) in headers {
        if k.eq_ignore_ascii_case("cookie") {
            for part in v.split(';') {
                if let Some((ck, cv)) = part.split_once('=') {
                    map.insert(ck.trim().to_string(), cv.trim().to_string());
                }
            }
        }
    }
    map
}

fn parse_raw_query_params(raw_query: Option<&str>) -> Vec<(String, String)> {
    let Some(q) = raw_query.filter(|s| !s.is_empty()) else {
        return Vec::new();
    };
    url::form_urlencoded::parse(q.as_bytes())
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect()
}

fn get_query<'a>(params: &'a [(String, String)], key: &str) -> Option<&'a str> {
    params
        .iter()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.as_str())
}

fn is_ipv4_literal(s: &str) -> bool {
    let parts: Vec<&str> = s.split('.').collect();
    parts.len() == 4
        && parts
            .iter()
            .all(|p| !p.is_empty() && p.bytes().all(|b| b.is_ascii_digit()))
}

fn js_decode_uri_component(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%'
            && i + 2 < bytes.len()
            && let (Some(h), Some(l)) = (
                char::from(bytes[i + 1]).to_digit(16),
                char::from(bytes[i + 2]).to_digit(16),
            )
        {
            out.push((h * 16 + l) as u8);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).unwrap_or_else(|_| s.to_string())
}

fn js_encode_uri_component(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for &b in s.as_bytes() {
        let is_unreserved = b.is_ascii_alphanumeric()
            || matches!(
                b,
                b'-' | b'_' | b'.' | b'!' | b'~' | b'*' | b'\'' | b'(' | b')'
            );
        if is_unreserved {
            out.push(b as char);
        } else {
            out.push('%');
            out.push_str(&format!("{b:02X}"));
        }
    }
    out
}

fn classify_reqwest_err(err: &reqwest::Error) -> ProxyErr {
    let msg = err.to_string();
    if err.is_timeout() {
        return ProxyErr {
            kind: ProxyErrKind::TimedOut,
            message: msg,
        };
    }
    let mut cur: Option<&(dyn StdError + 'static)> = Some(err);
    while let Some(src) = cur {
        if let Some(io_err) = src.downcast_ref::<std::io::Error>() {
            match io_err.kind() {
                std::io::ErrorKind::ConnectionRefused => {
                    return ProxyErr {
                        kind: ProxyErrKind::ConnectionRefused,
                        message: msg,
                    };
                }
                std::io::ErrorKind::TimedOut => {
                    return ProxyErr {
                        kind: ProxyErrKind::TimedOut,
                        message: msg,
                    };
                }
                _ => {}
            }
        }
        let s = src.to_string().to_lowercase();
        if s.contains("connection refused") || s.contains("econnrefused") {
            return ProxyErr {
                kind: ProxyErrKind::ConnectionRefused,
                message: msg,
            };
        }
        if s.contains("dns error")
            || s.contains("failed to lookup address")
            || s.contains("name or service not known")
            || s.contains("no such host")
        {
            return ProxyErr {
                kind: ProxyErrKind::DnsNotFound,
                message: msg,
            };
        }
        cur = src.source();
    }
    ProxyErr {
        kind: ProxyErrKind::Other,
        message: msg,
    }
}

struct UpstreamHttpResult {
    status: u16,
    headers: reqwest::header::HeaderMap,
    body: Vec<u8>,
}

struct UpstreamReq<'a> {
    is_https: bool,
    host: &'a str,
    port: u16,
    full_path: &'a str,
    method: &'a str,
    headers: &'a [(String, String)],
    body: Option<&'a [u8]>,
    timeout_ms: u64,
}

async fn send_dsm_request(req_spec: UpstreamReq<'_>) -> Result<UpstreamHttpResult, ProxyErr> {
    let scheme = if req_spec.is_https { "https" } else { "http" };
    let url = format!(
        "{scheme}://{}:{}{}",
        req_spec.host, req_spec.port, req_spec.full_path
    );
    let req_method =
        reqwest::Method::from_bytes(req_spec.method.as_bytes()).unwrap_or(reqwest::Method::GET);

    let mut req = CLIENT
        .request(req_method, url)
        .timeout(Duration::from_millis(req_spec.timeout_ms));

    for (k, v) in req_spec.headers {
        if !k.eq_ignore_ascii_case("content-length") && !k.eq_ignore_ascii_case("host") {
            req = req.header(k.as_str(), v.as_str());
        }
    }
    if let Some(b) = req_spec.body
        && !b.is_empty()
    {
        req = req.body(b.to_vec());
    }

    let res = req.send().await.map_err(|e| classify_reqwest_err(&e))?;
    let status = res.status().as_u16();
    let resp_headers = res.headers().clone();
    let resp_body = res
        .bytes()
        .await
        .map_err(|e| classify_reqwest_err(&e))?
        .to_vec();

    Ok(UpstreamHttpResult {
        status,
        headers: resp_headers,
        body: resp_body,
    })
}

fn fetch_server_info<'a>(
    clean_id: &'a str,
    control_host: &'a str,
    portal_id: &'a str,
    depth: u8,
) -> Pin<Box<dyn Future<Output = Option<Value>> + Send + 'a>> {
    Box::pin(async move {
        if depth > 3 {
            return None;
        }
        let url = format!("https://{control_host}/Serv.php");

        let tunnel_payload = json!({
            "version": 1,
            "command": "request_tunnel",
            "stop_mirror": true,
            "serverID": clean_id,
            "id": portal_id,
        });
        if let Ok(res) = CLIENT
            .post(&url)
            .header("Content-Type", "application/json")
            .header("User-Agent", "Synology/DSM")
            .timeout(Duration::from_secs(6))
            .json(&tunnel_payload)
            .send()
            .await
            && let Ok(parsed) = res.json::<Value>().await
            && parsed.get("errno").and_then(Value::as_i64) == Some(0)
        {
            if let Some(next_ctrl) = parsed
                .get("env")
                .and_then(|e| e.get("control_host"))
                .and_then(Value::as_str)
                && next_ctrl != control_host
                && let Some(reg) =
                    fetch_server_info(clean_id, next_ctrl, portal_id, depth + 1).await
                && reg.get("errno").and_then(Value::as_i64) == Some(0)
                && (reg.pointer("/service/relay_port").is_some() || reg.get("server").is_some())
            {
                return Some(reg);
            }
            if parsed.get("server").is_some() {
                return Some(parsed);
            }
        }

        let info_payload = json!({
            "version": 1,
            "command": "get_server_info",
            "stop_mirror": true,
            "serverID": clean_id,
            "id": portal_id,
        });
        if let Ok(res) = CLIENT
            .post(&url)
            .header("Content-Type", "application/json")
            .header("User-Agent", "Synology/DSM")
            .timeout(Duration::from_secs(6))
            .json(&info_payload)
            .send()
            .await
            && let Ok(parsed) = res.json::<Value>().await
        {
            if parsed.get("errno").and_then(Value::as_i64) == Some(0)
                && let Some(next_ctrl) = parsed
                    .get("env")
                    .and_then(|e| e.get("control_host"))
                    .and_then(Value::as_str)
                && next_ctrl != control_host
                && let Some(reg) =
                    fetch_server_info(clean_id, next_ctrl, portal_id, depth + 1).await
                && reg.get("errno").and_then(Value::as_i64) == Some(0)
            {
                return Some(reg);
            }
            return Some(parsed);
        }
        None
    })
}

async fn verify_dsm_candidate(cand: &DsmCandidate, timeout_ms: u64) -> bool {
    let headers = vec![
        ("User-Agent".to_string(), "DSMHelper/1.0".to_string()),
        ("Accept".to_string(), "*/*".to_string()),
    ];
    let probe_path =
        "/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=SYNO.API.Auth";
    let Ok(res) = send_dsm_request(UpstreamReq {
        is_https: cand.is_https,
        host: &cand.host,
        port: cand.port,
        full_path: probe_path,
        method: "GET",
        headers: &headers,
        body: None,
        timeout_ms,
    })
    .await
    else {
        return false;
    };
    let ctype = res
        .headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let preview = String::from_utf8_lossy(&res.body[..res.body.len().min(1000)]);
    let is_html =
        preview.contains("<html") || preview.contains("<!DOCTYPE") || ctype.contains("text/html");
    !is_html
        && (preview.contains("\"success\"")
            || preview.contains("SYNO.API.Auth")
            || ctype.contains("json"))
}

async fn test_host_connection(host: &str, port: u16, timeout_ms: u64) -> bool {
    matches!(
        tokio::time::timeout(
            Duration::from_millis(timeout_ms),
            TcpStream::connect((host, port)),
        )
        .await,
        Ok(Ok(_))
    )
}

async fn resolve_quick_connect(
    server_id: &str,
    user_port: Option<u16>,
    user_https: Option<bool>,
) -> Option<DsmCandidate> {
    let clean_id = server_id
        .trim_end_matches(".quickconnect.to")
        .trim()
        .to_lowercase();
    let cache_key = format!(
        "{clean_id}_{}_{}",
        user_port.map_or_else(|| "auto".to_string(), |p| p.to_string()),
        user_https.map_or_else(|| "auto".to_string(), |b| b.to_string())
    );

    if let Ok(cache) = QUICK_CONNECT_CACHE.read() {
        let hit = cache.get(&cache_key).or_else(|| cache.get(&clean_id));
        if let Some(c) = hit
            && c.expires_at > Instant::now()
        {
            return Some(DsmCandidate {
                host: c.host.clone(),
                port: c.port,
                is_https: c.is_https,
            });
        }
    }

    let control_hosts = [
        "global.quickconnect.to",
        "usc.quickconnect.to",
        "tw.quickconnect.to",
        "us.quickconnect.to",
        "eu.quickconnect.to",
    ];

    for control_host in control_hosts {
        let mut parsed = fetch_server_info(&clean_id, control_host, "dsm_portal_https", 0).await;
        let ok_server = parsed.as_ref().is_some_and(|p| {
            p.get("errno").and_then(Value::as_i64) == Some(0) && p.get("server").is_some()
        });
        if !ok_server {
            parsed = fetch_server_info(&clean_id, control_host, "dsm_portal", 0).await;
        }
        if let Some(p) = parsed.as_ref()
            && p.get("errno").and_then(Value::as_i64) == Some(4)
            && let Some(site) = p
                .get("sites")
                .and_then(Value::as_array)
                .and_then(|arr| arr.first())
                .and_then(Value::as_str)
                .map(ToString::to_string)
        {
            let reg = fetch_server_info(&clean_id, &site, "dsm_portal_https", 0).await;
            if reg
                .as_ref()
                .is_some_and(|r| r.get("errno").and_then(Value::as_i64) == Some(0))
            {
                parsed = reg;
            } else {
                parsed = fetch_server_info(&clean_id, &site, "dsm_portal", 0).await;
            }
        }

        let Some(p) = parsed.as_ref() else {
            continue;
        };
        if p.get("errno").and_then(Value::as_i64) != Some(0) || p.get("server").is_none() {
            continue;
        }

        let lan_ips: Vec<String> = p
            .pointer("/server/interface")
            .and_then(Value::as_array)
            .map(|arr| {
                arr.iter()
                    .filter_map(|item| {
                        item.get("ip")
                            .and_then(Value::as_str)
                            .map(ToString::to_string)
                    })
                    .collect()
            })
            .unwrap_or_default();
        let ddns = p
            .pointer("/server/ddns")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty() && *s != "NULL")
            .map(ToString::to_string);
        let smart_dns = p
            .pointer("/smartdns/host")
            .and_then(Value::as_str)
            .map(ToString::to_string);
        let smart_dns_lan = p
            .pointer("/smartdns/lan/0")
            .and_then(Value::as_str)
            .map(ToString::to_string);
        let smart_dns_ext = p
            .pointer("/smartdns/external")
            .and_then(Value::as_str)
            .map(ToString::to_string);
        let wan_ip = p
            .pointer("/server/external/ip")
            .and_then(Value::as_str)
            .map(ToString::to_string);

        let dsm_https_port = p
            .pointer("/server/https_port")
            .or_else(|| p.pointer("/service/port"))
            .and_then(Value::as_u64)
            .unwrap_or(5001) as u16;
        let dsm_http_port = p
            .pointer("/server/port")
            .and_then(Value::as_u64)
            .unwrap_or(5000) as u16;
        let dsm_ext_port = p
            .pointer("/server/external/port")
            .or_else(|| p.pointer("/service/ext_port"))
            .and_then(Value::as_u64)
            .map(|v| v as u16);

        let relay_ip = p
            .pointer("/service/relay_ip")
            .and_then(Value::as_str)
            .map(ToString::to_string);
        let relay_port = p
            .pointer("/service/relay_port")
            .and_then(Value::as_u64)
            .map(|v| v as u16);
        let relay_dn = p
            .pointer("/service/relay_dn")
            .and_then(Value::as_str)
            .map(ToString::to_string);

        let mut candidates = Vec::new();
        let mut seen = HashSet::new();
        let mut add_cand = |h: Option<&str>, port: Option<u16>, is_https: bool| {
            let (Some(h), Some(port)) = (h, port) else {
                return;
            };
            if h.is_empty() || port == 0 {
                return;
            }
            let key = format!("{h}:{port}:{is_https}");
            if seen.insert(key) {
                candidates.push(DsmCandidate {
                    host: h.to_string(),
                    port,
                    is_https,
                });
            }
        };

        let mut standard_ports = Vec::new();
        for opt_p in [
            user_port,
            Some(dsm_https_port),
            Some(5001),
            Some(dsm_http_port),
            Some(5000),
            dsm_ext_port,
        ]
        .into_iter()
        .flatten()
        {
            if opt_p > 0 && !standard_ports.contains(&opt_p) {
                standard_ports.push(opt_p);
            }
        }

        add_cand(relay_dn.as_deref(), relay_port, true);
        add_cand(relay_ip.as_deref(), relay_port, true);

        let direct_qc = format!("{clean_id}.direct.quickconnect.to");
        for &port in &standard_ports {
            let is_h = port == 5001 || port == dsm_https_port || user_https.unwrap_or(true);
            add_cand(ddns.as_deref(), Some(port), is_h);
            add_cand(smart_dns.as_deref(), Some(port), is_h);
            add_cand(smart_dns_ext.as_deref(), Some(port), is_h);
            add_cand(Some(&direct_qc), Some(port), is_h);
            add_cand(wan_ip.as_deref(), Some(port), is_h);
        }

        for port in [443u16, 80] {
            let is_h = port == 443;
            add_cand(ddns.as_deref(), Some(port), is_h);
            add_cand(smart_dns_ext.as_deref(), Some(port), is_h);
            add_cand(wan_ip.as_deref(), Some(port), is_h);
        }

        for &port in &standard_ports {
            let is_h = port == 5001 || port == dsm_https_port || user_https.unwrap_or(true);
            for ip in &lan_ips {
                add_cand(Some(ip.as_str()), Some(port), is_h);
            }
            add_cand(smart_dns_lan.as_deref(), Some(port), is_h);
            add_cand(Some("172.17.0.1"), Some(port), is_h);
            add_cand(Some("192.168.1.10"), Some(port), is_h);
            add_cand(Some("127.0.0.1"), Some(port), is_h);
        }

        if let Ok(mut cand_map) = QUICK_CONNECT_CANDIDATES.write() {
            cand_map.insert(cache_key.clone(), candidates.clone());
            cand_map.insert(clean_id.clone(), candidates.clone());
        }

        let mut verified: Option<DsmCandidate> = None;
        for cand in &candidates {
            if verify_dsm_candidate(cand, 3500).await {
                verified = Some(cand.clone());
                break;
            }
        }
        if verified.is_none() {
            for cand in candidates.iter().take(10) {
                if test_host_connection(&cand.host, cand.port, 1500).await {
                    verified = Some(cand.clone());
                    break;
                }
            }
        }
        let target = verified.unwrap_or_else(|| {
            if let (Some(dn), Some(rp)) = (relay_dn, relay_port) {
                DsmCandidate {
                    host: dn,
                    port: rp,
                    is_https: true,
                }
            } else if let (Some(ip), Some(rp)) = (relay_ip, relay_port) {
                DsmCandidate {
                    host: ip,
                    port: rp,
                    is_https: true,
                }
            } else if let Some(d) = ddns {
                DsmCandidate {
                    host: d,
                    port: dsm_https_port,
                    is_https: true,
                }
            } else {
                DsmCandidate {
                    host: "172.17.0.1".to_string(),
                    port: dsm_https_port,
                    is_https: true,
                }
            }
        });

        let cached_entry = CachedTarget {
            host: target.host.clone(),
            port: target.port,
            is_https: target.is_https,
            expires_at: Instant::now() + Duration::from_secs(600),
        };
        if let Ok(mut cache) = QUICK_CONNECT_CACHE.write() {
            cache.insert(cache_key, cached_entry.clone());
            cache.insert(clean_id, cached_entry);
        }
        return Some(target);
    }

    None
}

fn build_universal_candidates(host: &str, port: u16, is_https: bool) -> Vec<DsmCandidate> {
    let mut list = Vec::new();
    let mut seen = HashSet::new();
    let mut push = |p: u16, https: bool| {
        let key = format!("{host}:{p}:{https}");
        if seen.insert(key) {
            list.push(DsmCandidate {
                host: host.to_string(),
                port: p,
                is_https: https,
            });
        }
    };
    push(port, is_https);
    push(5001, true);
    push(5000, false);
    push(443, true);
    push(80, false);
    push(port, !is_https);
    list
}

async fn find_working_candidate(candidates: &[DsmCandidate]) -> Option<DsmCandidate> {
    for cand in candidates {
        if verify_dsm_candidate(cand, 2000).await {
            return Some(cand.clone());
        }
    }
    candidates.first().cloned()
}

fn format_error_response(
    err: &ProxyErr,
    x_dsm_host: Option<&str>,
    x_dsm_port: Option<&str>,
) -> ProxyResponse {
    let msg = match err.kind {
        ProxyErrKind::DnsNotFound => format!(
            "Không tìm thấy địa chỉ máy chủ \"{}\". Hãy kiểm tra lại QuickConnect ID hoặc IP nội bộ của NAS.",
            x_dsm_host.unwrap_or("null")
        ),
        ProxyErrKind::ConnectionRefused => format!(
            "Kết nối bị từ chối tại cổng {}. Hãy kiểm tra lại cổng HTTPS (5001) hoặc HTTP (5000).",
            x_dsm_port.unwrap_or("5001")
        ),
        ProxyErrKind::TimedOut => {
            "Hết thời gian chờ kết nối (Timeout). Vui lòng kiểm tra lại địa chỉ IP NAS và kết nối mạng.".to_string()
        }
        _ => err.message.clone(),
    };

    let body = serde_json::to_vec(&json!({
        "success": false,
        "error": {
            "code": err.code_value(),
            "message": msg,
        },
    }))
    .unwrap_or_default();

    ProxyResponse {
        status: 502,
        headers: vec![("content-type".to_string(), "application/json".to_string())],
        body,
    }
}

/// Port of `/api/dsm/[...path]` (`src/app/api/dsm/[...path]/route.ts`).
pub async fn handle_proxy(req: ProxyRequest) -> ProxyResponse {
    let cookies = parse_cookies(&req.headers);
    let query_params = parse_raw_query_params(req.raw_query.as_deref());

    let x_dsm_host = header_get(&req.headers, "x-dsm-host");
    let x_dsm_port = header_get(&req.headers, "x-dsm-port");

    let mut raw_host = x_dsm_host
        .or_else(|| get_query(&query_params, "_host"))
        .or_else(|| cookies.get("dsm_host").map(String::as_str))
        .unwrap_or("")
        .trim()
        .to_string();
    let mut raw_port = x_dsm_port
        .or_else(|| get_query(&query_params, "_port"))
        .or_else(|| cookies.get("dsm_port").map(String::as_str))
        .unwrap_or("5000")
        .to_string();
    let mut is_https = header_get(&req.headers, "x-dsm-https") == Some("true")
        || get_query(&query_params, "_https") == Some("true")
        || cookies.get("dsm_https").map(String::as_str) == Some("true");

    let mut target_cookie = header_get(&req.headers, "x-dsm-cookie")
        .or_else(|| cookies.get("dsm_cookie").map(String::as_str))
        .unwrap_or("")
        .to_string();
    let target_syno_token = header_get(&req.headers, "x-dsm-synotoken")
        .or_else(|| get_query(&query_params, "_synotoken"))
        .unwrap_or("")
        .to_string();
    if target_cookie.is_empty()
        && let Some(sid) = get_query(&query_params, "_sid")
        && !sid.is_empty()
    {
        target_cookie = format!("id={sid}");
    }

    if raw_host.is_empty() {
        let body = serde_json::to_vec(&json!({
            "success": false,
            "error": {
                "code": 400,
                "message": "Thiếu thông tin địa chỉ NAS (x-dsm-host hoặc _host)",
            }
        }))
        .unwrap_or_default();
        return ProxyResponse {
            status: 400,
            headers: vec![("content-type".to_string(), "application/json".to_string())],
            body,
        };
    }

    if raw_host.starts_with("http://") || raw_host.starts_with("https://") {
        if let Ok(parsed) = url::Url::parse(&raw_host) {
            is_https = parsed.scheme() == "https";
            if let Some(h) = parsed.host_str() {
                raw_host = h.to_string();
            }
            if let Some(p) = parsed.port() {
                raw_port = p.to_string();
            }
        }
    } else if let Some(last_colon) = raw_host.rfind(':') {
        let possible_port = &raw_host[last_colon + 1..];
        if !possible_port.is_empty() && possible_port.bytes().all(|b| b.is_ascii_digit()) {
            raw_port = possible_port.to_string();
            raw_host = raw_host[..last_colon].to_string();
        }
    }

    let mut target_host = raw_host.clone();
    let mut target_port = raw_port
        .parse::<u16>()
        .ok()
        .filter(|&p| p > 0)
        .unwrap_or(if is_https { 5001 } else { 5000 });
    let mut target_https = is_https;

    let lower_raw_host = raw_host.to_lowercase();
    let is_quick_connect = lower_raw_host.ends_with(".quickconnect.to")
        || (!raw_host.contains('.') && !raw_host.contains(':') && lower_raw_host != "localhost");
    let is_direct_ip =
        is_ipv4_literal(&raw_host) || raw_host == "localhost" || raw_host == "127.0.0.1";
    let is_ddns = !is_quick_connect && raw_host.contains('.') && !is_direct_ip;

    if is_quick_connect {
        if let Some(resolved) =
            resolve_quick_connect(&raw_host, Some(target_port), Some(target_https)).await
        {
            target_host = resolved.host;
            target_port = resolved.port;
            target_https = resolved.is_https;
        }
    } else if !is_direct_ip && (is_ddns || target_port == 41533) {
        let ddns_key = format!("{raw_host}:{target_port}:{target_https}");
        let cached = DDNS_CACHE
            .read()
            .ok()
            .and_then(|c| c.get(&ddns_key).cloned())
            .filter(|c| c.expires_at > Instant::now());
        if let Some(c) = cached {
            target_host = c.host;
            target_port = c.port;
            target_https = c.is_https;
        } else {
            let candidates = build_universal_candidates(&raw_host, target_port, target_https);
            if let Some(working) = find_working_candidate(&candidates).await {
                target_host = working.host.clone();
                target_port = working.port;
                target_https = working.is_https;
                if let Ok(mut cache) = DDNS_CACHE.write() {
                    cache.insert(
                        ddns_key,
                        CachedTarget {
                            host: working.host,
                            port: working.port,
                            is_https: working.is_https,
                            expires_at: Instant::now() + Duration::from_secs(600),
                        },
                    );
                }
            }
        }
    }

    is_https = target_https;

    let encoded_segments: Vec<String> = req
        .raw_path_segments
        .iter()
        .map(|s| js_encode_uri_component(&js_decode_uri_component(s)))
        .collect();
    let target_path = format!("/{}", encoded_segments.join("/"));
    let api_prefix = if target_path.starts_with("/fbdownload") || target_path.starts_with("/webman")
    {
        ""
    } else {
        "/webapi"
    };

    let query_string = {
        let mut clean_serializer = url::form_urlencoded::Serializer::new(String::new());
        let mut has_clean_params = false;
        for (k, v) in &query_params {
            if !matches!(k.as_str(), "_host" | "_port" | "_https" | "_synotoken") {
                clean_serializer.append_pair(k, v);
                has_clean_params = true;
            }
        }
        if has_clean_params {
            format!("?{}", clean_serializer.finish())
        } else {
            String::new()
        }
    };
    let full_path = format!("{api_prefix}{target_path}{query_string}");

    let mut all_candidates = vec![DsmCandidate {
        host: target_host.clone(),
        port: target_port,
        is_https,
    }];
    if is_quick_connect {
        let clean_id = raw_host
            .trim_end_matches(".quickconnect.to")
            .trim()
            .to_lowercase();
        if let Ok(map) = QUICK_CONNECT_CANDIDATES.read()
            && let Some(list) = map.get(&clean_id)
        {
            for c in list {
                if !all_candidates
                    .iter()
                    .any(|e| e.host == c.host && e.port == c.port && e.is_https == c.is_https)
                {
                    all_candidates.push(c.clone());
                }
            }
        }
    } else if !is_direct_ip && (is_ddns || target_port == 41533 || raw_port == "41533") {
        let p = raw_port
            .parse::<u16>()
            .ok()
            .filter(|&v| v > 0)
            .unwrap_or(if is_https { 5001 } else { 5000 });
        for u in build_universal_candidates(&raw_host, p, is_https) {
            if !all_candidates
                .iter()
                .any(|e| e.host == u.host && e.port == u.port && e.is_https == u.is_https)
            {
                all_candidates.push(u);
            }
        }
    }

    let req_body_opt = if req.method != "GET" && req.method != "HEAD" && !req.body.is_empty() {
        Some(req.body.as_slice())
    } else {
        None
    };

    let mut last_err: Option<ProxyErr> = None;
    let mut last_status_404 = false;
    let mut final_result: Option<UpstreamHttpResult> = None;
    let mut tried = HashSet::new();

    for cand in &all_candidates {
        let key = format!("{}:{}:{}", cand.host, cand.port, cand.is_https);
        if !tried.insert(key) {
            continue;
        }
        let host_with_port =
            if (cand.port == 443 && cand.is_https) || (cand.port == 80 && !cand.is_https) {
                cand.host.clone()
            } else {
                format!("{}:{}", cand.host, cand.port)
            };
        let scheme = if cand.is_https { "https" } else { "http" };
        let mut cand_headers = vec![
            (
                "User-Agent".to_string(),
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DSMHelper/1.0".to_string(),
            ),
            ("Accept".to_string(), "*/*".to_string()),
            (
                "Accept-Language".to_string(),
                "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7".to_string(),
            ),
            ("Origin".to_string(), format!("{scheme}://{host_with_port}")),
            (
                "Referer".to_string(),
                format!("{scheme}://{host_with_port}/"),
            ),
            ("Host".to_string(), host_with_port),
        ];
        if let Some(range) = header_get(&req.headers, "range") {
            cand_headers.push(("Range".to_string(), range.to_string()));
        }
        if !target_cookie.is_empty() {
            cand_headers.push(("Cookie".to_string(), target_cookie.clone()));
        }
        if !target_syno_token.is_empty() {
            cand_headers.push(("X-SYNO-TOKEN".to_string(), target_syno_token.clone()));
        }
        if let Some(ctype) = header_get(&req.headers, "content-type") {
            cand_headers.push(("Content-Type".to_string(), ctype.to_string()));
        }

        let timeout_ms = if cand.host.contains("quickconnect") || cand.host.contains("synr") {
            9000
        } else {
            6000
        };

        match send_dsm_request(UpstreamReq {
            is_https: cand.is_https,
            host: &cand.host,
            port: cand.port,
            full_path: &full_path,
            method: &req.method,
            headers: &cand_headers,
            body: req_body_opt,
            timeout_ms,
        })
        .await
        {
            Ok(cand_res) => {
                if cand_res.status == 404 {
                    let preview =
                        String::from_utf8_lossy(&cand_res.body[..cand_res.body.len().min(500)]);
                    if !preview.contains("\"success\"")
                        && (preview.contains("<html") || preview.contains("404"))
                    {
                        last_status_404 = true;
                        last_err = Some(ProxyErr {
                            kind: ProxyErrKind::RetryableHttp404,
                            message: format!("DSM 404 on {}:{}{full_path}", cand.host, cand.port),
                        });
                        continue;
                    }
                }
                if is_quick_connect {
                    let clean_id = raw_host
                        .trim_end_matches(".quickconnect.to")
                        .trim()
                        .to_lowercase();
                    if let Ok(mut cache) = QUICK_CONNECT_CACHE.write() {
                        cache.insert(
                            clean_id,
                            CachedTarget {
                                host: cand.host.clone(),
                                port: cand.port,
                                is_https: cand.is_https,
                                expires_at: Instant::now() + Duration::from_secs(600),
                            },
                        );
                    }
                }
                final_result = Some(cand_res);
                break;
            }
            Err(err) => {
                let retry = err.is_retryable();
                if !retry {
                    return format_error_response(&err, x_dsm_host, x_dsm_port);
                }
                last_err = Some(err);
            }
        }
    }

    let Some(res) = final_result else {
        if last_status_404 {
            let tried_str: Vec<String> = all_candidates
                .iter()
                .map(|c| {
                    format!(
                        "{}:{} {}",
                        c.host,
                        c.port,
                        if c.is_https { "https" } else { "http" }
                    )
                })
                .collect();
            let err = ProxyErr {
                kind: ProxyErrKind::Other,
                message: format!(
                    "DSM API not found (404) on {raw_host}:{raw_port}. Tried {}. Check if DSM is on 5000/5001 or reverse proxy forwards /webapi.",
                    tried_str.join(", ")
                ),
            };
            return format_error_response(&err, x_dsm_host, x_dsm_port);
        }
        let err = last_err.unwrap_or_else(|| ProxyErr {
            kind: ProxyErrKind::Other,
            message: "All DSM candidates failed".to_string(),
        });
        return format_error_response(&err, x_dsm_host, x_dsm_port);
    };

    let mut out_headers = Vec::new();
    let set_cookies: Vec<&str> = res
        .headers
        .get_all("set-cookie")
        .iter()
        .filter_map(|v| v.to_str().ok())
        .collect();
    if !set_cookies.is_empty() {
        out_headers.push(("set-cookie".to_string(), set_cookies.join("; ")));
    }
    for name in [
        "accept-ranges",
        "content-range",
        "content-length",
        "content-disposition",
    ] {
        if let Some(val) = res.headers.get(name).and_then(|v| v.to_str().ok()) {
            out_headers.push((name.to_string(), val.to_string()));
        }
    }
    let ctype = res
        .headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/json");
    out_headers.push(("content-type".to_string(), ctype.to_string()));

    ProxyResponse {
        status: res.status,
        headers: out_headers,
        body: res.body,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn missing_host_returns_400_exact() {
        let resp = handle_proxy(ProxyRequest {
            method: "GET".to_string(),
            raw_path_segments: vec!["entry.cgi".to_string()],
            raw_query: Some("api=SYNO.API.Info&version=1&method=query".to_string()),
            headers: Vec::new(),
            body: Vec::new(),
        })
        .await;
        assert_eq!(resp.status, 400);
        assert_eq!(
            String::from_utf8_lossy(&resp.body),
            r#"{"success":false,"error":{"code":400,"message":"Thiếu thông tin địa chỉ NAS (x-dsm-host hoặc _host)"}}"#
        );
    }

    #[tokio::test]
    async fn conn_refused_returns_502_exact() {
        let resp = handle_proxy(ProxyRequest {
            method: "GET".to_string(),
            raw_path_segments: vec!["entry.cgi".to_string()],
            raw_query: Some("api=SYNO.API.Info&version=1&method=query".to_string()),
            headers: vec![
                ("x-dsm-host".to_string(), "127.0.0.1".to_string()),
                ("x-dsm-https".to_string(), "false".to_string()),
                ("x-dsm-port".to_string(), "19999".to_string()),
            ],
            body: Vec::new(),
        })
        .await;
        assert_eq!(resp.status, 502);
        assert_eq!(
            String::from_utf8_lossy(&resp.body),
            r#"{"success":false,"error":{"code":"ECONNREFUSED","message":"Kết nối bị từ chối tại cổng 19999. Hãy kiểm tra lại cổng HTTPS (5001) hoặc HTTP (5000)."}}"#
        );
    }
}
