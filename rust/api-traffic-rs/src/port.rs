//! Linux `/proc/net/*` socket telemetry and DSM `SYNO.Core.CurrentConnection` aggregator.

#![forbid(unsafe_code)]

use std::collections::{BTreeSet, HashMap, HashSet};
use std::fs;
use std::path::Path;
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde_json::{Map, Value, json};

#[derive(Debug, Clone)]
pub struct HttpReply {
    pub status: u16,
    pub body: Value,
}

#[derive(Debug, Clone, Default)]
pub struct DsmTrafficHeaders {
    pub host: Option<String>,
    pub port: Option<u16>,
    pub https: bool,
    pub sid: Option<String>,
    pub syno_token: Option<String>,
}

#[derive(Debug, Clone)]
pub struct InterfaceStats {
    pub total_rx_bytes: u64,
    pub total_tx_bytes: u64,
    pub current_rx_speed: u64,
    pub current_tx_speed: u64,
}

#[derive(Debug, Clone)]
pub struct RawSocketEntry {
    pub protocol: &'static str,
    pub local_address: String,
    pub local_port: u16,
    pub remote_address: String,
    pub remote_port: u16,
    pub state: &'static str,
    pub process_name: String,
    pub pid: Option<u32>,
    pub proc_read_bytes: u64,
    pub proc_write_bytes: u64,
}

struct NetDevSample {
    rx: u64,
    tx: u64,
    time_ms: u128,
}

#[derive(Clone)]
struct ProcIoInfo {
    pid: u32,
    process_name: String,
    read_bytes: u64,
    write_bytes: u64,
}

static PREV_NET_DEV: LazyLock<Mutex<Option<NetDevSample>>> = LazyLock::new(|| Mutex::new(None));

static INSECURE_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
});

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_millis())
}

pub fn parse_hex_ipv4(hex: &str) -> String {
    if hex.len() != 8 {
        return "0.0.0.0".to_string();
    }
    let mut parts = [0u8; 4];
    for (idx, chunk_start) in [6usize, 4, 2, 0].into_iter().enumerate() {
        let Ok(val) = u8::from_str_radix(&hex[chunk_start..chunk_start + 2], 16) else {
            return "0.0.0.0".to_string();
        };
        parts[idx] = val;
    }
    format!("{}.{}.{}.{}", parts[0], parts[1], parts[2], parts[3])
}

pub fn parse_hex_ipv6(hex: &str) -> String {
    if hex.len() != 32 {
        return "::".to_string();
    }
    let lower = hex.to_ascii_lowercase();
    if lower.starts_with("0000000000000000ffff0000")
        || lower.starts_with("00000000000000000000ffff")
    {
        return parse_hex_ipv4(&hex[24..]);
    }
    let mut groups = Vec::with_capacity(8);
    for i in (0..32).step_by(4) {
        let chunk = &hex[i..i + 4];
        let rev = format!("{}{}", &chunk[2..4], &chunk[0..2]);
        let val = u16::from_str_radix(&rev, 16).unwrap_or(0);
        groups.push(format!("{val:x}"));
    }
    let uncompressed = groups.join(":");
    compress_first_zero_run(&uncompressed)
}

fn compress_first_zero_run(uncompressed: &str) -> String {
    let parts: Vec<&str> = uncompressed.split(':').collect();
    let mut i = 0;
    while i < parts.len() {
        if parts[i] == "0" {
            let mut j = i + 1;
            while j < parts.len() && parts[j] == "0" {
                j += 1;
            }
            if j - i >= 2 {
                let prefix = parts[..i].join(":");
                let suffix = parts[j..].join(":");
                return format!("{prefix}::{suffix}");
            }
            i = j;
        } else {
            i += 1;
        }
    }
    uncompressed.to_string()
}

fn parse_hex_port(hex: &str) -> u16 {
    u16::from_str_radix(hex, 16).unwrap_or(0)
}

fn map_tcp_state(hex: &str) -> &'static str {
    match hex {
        "01" => "ESTABLISHED",
        "02" | "03" => "SYN_SENT",
        "04" | "05" | "06" => "TIME_WAIT",
        "07" | "08" | "09" | "0B" => "CLOSE_WAIT",
        "0A" => "LISTEN",
        _ => "ESTABLISHED",
    }
}

pub fn get_network_interface_stats() -> InterfaceStats {
    let mut total_rx: u64 = 0;
    let mut total_tx: u64 = 0;

    if let Ok(content) = fs::read_to_string("/proc/net/dev") {
        for line in content.lines().skip(2) {
            let parts: Vec<&str> = line
                .trim()
                .split(|c: char| c == ':' || c.is_whitespace())
                .filter(|s| !s.is_empty())
                .collect();
            if parts.len() < 10 {
                continue;
            }
            if parts[0] == "lo" {
                continue;
            }
            let rx = parts[1].parse::<u64>().unwrap_or(0);
            let tx = parts[9].parse::<u64>().unwrap_or(0);
            total_rx = total_rx.saturating_add(rx);
            total_tx = total_tx.saturating_add(tx);
        }
    }

    let now = now_ms();
    let mut current_rx_speed = 0;
    let mut current_tx_speed = 0;

    if let Ok(mut guard) = PREV_NET_DEV.lock() {
        if let Some(prev) = guard.as_ref()
            && now > prev.time_ms
        {
            let dt = (now - prev.time_ms) as f64 / 1000.0;
            if dt > 0.3 {
                let drx = total_rx.saturating_sub(prev.rx) as f64;
                let dtx = total_tx.saturating_sub(prev.tx) as f64;
                current_rx_speed = (drx / dt).round().max(0.0) as u64;
                current_tx_speed = (dtx / dt).round().max(0.0) as u64;
                *guard = Some(NetDevSample {
                    rx: total_rx,
                    tx: total_tx,
                    time_ms: now,
                });
            }
        } else {
            *guard = Some(NetDevSample {
                rx: total_rx,
                tx: total_tx,
                time_ms: now,
            });
        }
    }

    InterfaceStats {
        total_rx_bytes: total_rx,
        total_tx_bytes: total_tx,
        current_rx_speed,
        current_tx_speed,
    }
}

fn get_process_io_counters(pid: u32) -> (u64, u64) {
    let io_path = format!("/proc/{pid}/io");
    let Ok(content) = fs::read_to_string(io_path) else {
        return (0, 0);
    };
    let mut r = 0u64;
    let mut w = 0u64;
    for line in content.lines() {
        if (line.starts_with("read_bytes:") || line.starts_with("rchar:"))
            && let Some(val_str) = line.split(':').nth(1)
            && let Ok(val) = val_str.trim().parse::<u64>()
            && val > r
        {
            r = val;
        }
        if (line.starts_with("write_bytes:") || line.starts_with("wchar:"))
            && let Some(val_str) = line.split(':').nth(1)
            && let Ok(val) = val_str.trim().parse::<u64>()
            && val > w
        {
            w = val;
        }
    }
    (r, w)
}

fn build_inode_process_map() -> HashMap<String, ProcIoInfo> {
    let mut map = HashMap::new();
    let Ok(entries) = fs::read_dir("/proc") else {
        return map;
    };

    for entry in entries.flatten() {
        let name_os = entry.file_name();
        let name = name_os.to_string_lossy();
        if name.is_empty() || !name.bytes().all(|b| b.is_ascii_digit()) {
            continue;
        }
        let Ok(pid) = name.parse::<u32>() else {
            continue;
        };
        let proc_dir = entry.path();
        let fd_dir = proc_dir.join("fd");
        let Ok(fds) = fs::read_dir(&fd_dir) else {
            continue;
        };

        let mut comm = fs::read_to_string(proc_dir.join("comm"))
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        if (comm.is_empty() || comm == "node" || comm == "python" || comm == "python3")
            && let Ok(cmd_bytes) = fs::read(proc_dir.join("cmdline"))
        {
            let first = cmd_bytes
                .split(|&b| b == 0)
                .next()
                .map(|s| String::from_utf8_lossy(s).into_owned())
                .unwrap_or_default();
            if let Some(base) = Path::new(&first).file_name().and_then(|s| s.to_str())
                && !base.is_empty()
            {
                comm = base.to_string();
            }
        }
        let process_name = if comm.is_empty() {
            "system".to_string()
        } else {
            comm
        };
        let (read_bytes, write_bytes) = get_process_io_counters(pid);

        for fd in fds.flatten() {
            if let Ok(target) = fs::read_link(fd.path()) {
                let s = target.to_string_lossy();
                if let Some(inner) = s
                    .strip_prefix("socket:[")
                    .and_then(|rest| rest.strip_suffix(']'))
                    && !inner.is_empty()
                    && inner.bytes().all(|b| b.is_ascii_digit())
                {
                    map.insert(
                        inner.to_string(),
                        ProcIoInfo {
                            pid,
                            process_name: process_name.clone(),
                            read_bytes,
                            write_bytes,
                        },
                    );
                }
            }
        }
    }

    map
}

pub fn get_live_linux_sockets() -> Vec<RawSocketEntry> {
    let mut list = Vec::new();
    let inode_map = build_inode_process_map();

    let specs = [
        ("/proc/net/tcp", "TCP", false),
        ("/proc/net/tcp6", "TCP", true),
        ("/proc/net/udp", "UDP", false),
        ("/proc/net/udp6", "UDP", true),
    ];

    for (file, proto, is_v6) in specs {
        let Ok(content) = fs::read_to_string(file) else {
            continue;
        };
        for line in content.lines().skip(1) {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 10 {
                continue;
            }
            let Some((local_hex_ip, local_hex_port)) = parts[1].split_once(':') else {
                continue;
            };
            let Some((rem_hex_ip, rem_hex_port)) = parts[2].split_once(':') else {
                continue;
            };
            let state_hex = parts[3];
            let inode = parts[9];

            let local_address = if is_v6 {
                parse_hex_ipv6(local_hex_ip)
            } else {
                parse_hex_ipv4(local_hex_ip)
            };
            let local_port = parse_hex_port(local_hex_port);
            let remote_address = if is_v6 {
                parse_hex_ipv6(rem_hex_ip)
            } else {
                parse_hex_ipv4(rem_hex_ip)
            };
            let remote_port = parse_hex_port(rem_hex_port);

            if remote_address == "0.0.0.0" || remote_address == "::" || remote_port == 0 {
                continue;
            }

            let state = if proto == "UDP" {
                "UDP"
            } else {
                map_tcp_state(state_hex)
            };

            if let Some(proc_info) = inode_map.get(inode) {
                list.push(RawSocketEntry {
                    protocol: proto,
                    local_address,
                    local_port,
                    remote_address,
                    remote_port,
                    state,
                    process_name: proc_info.process_name.clone(),
                    pid: Some(proc_info.pid),
                    proc_read_bytes: proc_info.read_bytes,
                    proc_write_bytes: proc_info.write_bytes,
                });
            } else {
                list.push(RawSocketEntry {
                    protocol: proto,
                    local_address,
                    local_port,
                    remote_address,
                    remote_port,
                    state,
                    process_name: "system".to_string(),
                    pid: None,
                    proc_read_bytes: 0,
                    proc_write_bytes: 0,
                });
            }
        }
    }

    list
}

async fn get_live_dsm_connections(cfg: &DsmTrafficHeaders) -> Vec<RawSocketEntry> {
    let (Some(host), Some(sid)) = (cfg.host.as_deref(), cfg.sid.as_deref()) else {
        return Vec::new();
    };
    if host.is_empty() || sid.is_empty() {
        return Vec::new();
    }

    let port = cfg.port.filter(|&p| p > 0).unwrap_or(5001);
    let scheme = if cfg.https { "https" } else { "http" };
    let url = format!("{scheme}://{host}:{port}/webapi/entry.cgi");

    let body_str = {
        let mut form = url::form_urlencoded::Serializer::new(String::new());
        form.append_pair("api", "SYNO.Core.CurrentConnection");
        form.append_pair("version", "1");
        form.append_pair("method", "list");
        form.append_pair("offset", "0");
        form.append_pair("limit", "200");
        form.append_pair("sort_by", "\"time\"");
        form.append_pair("sort_direction", "\"DESC\"");
        form.append_pair("_sid", sid);
        if let Some(tok) = cfg.syno_token.as_deref().filter(|s| !s.is_empty()) {
            form.append_pair("SynoToken", tok);
        }
        form.finish()
    };

    let mut req = INSECURE_CLIENT
        .post(url)
        .header(
            reqwest::header::CONTENT_TYPE,
            "application/x-www-form-urlencoded; charset=UTF-8",
        )
        .header(reqwest::header::COOKIE, format!("id={sid}"));
    if let Some(tok) = cfg.syno_token.as_deref().filter(|s| !s.is_empty()) {
        req = req.header("X-SYNO-TOKEN", tok);
    }

    let Ok(res) = req.body(body_str).send().await else {
        return Vec::new();
    };
    let Ok(data) = res.json::<Value>().await else {
        return Vec::new();
    };
    if data.get("success").and_then(Value::as_bool) != Some(true) {
        return Vec::new();
    }

    let items_opt = data
        .get("data")
        .and_then(|d| d.get("items").or_else(|| d.get("connections")))
        .and_then(Value::as_array);
    let Some(items) = items_opt else {
        return Vec::new();
    };

    items
        .iter()
        .map(|item| {
            let client_ip = item
                .get("who")
                .or_else(|| item.get("ip"))
                .or_else(|| item.get("client_ip"))
                .and_then(Value::as_str)
                .unwrap_or("127.0.0.1")
                .to_string();
            let service = item
                .get("type")
                .or_else(|| item.get("service"))
                .or_else(|| item.get("descr"))
                .and_then(Value::as_str)
                .unwrap_or("DSM Service");
            let user_suffix = item
                .get("user")
                .and_then(Value::as_str)
                .filter(|u| !u.is_empty())
                .map_or_else(String::new, |u| format!(" ({u})"));
            RawSocketEntry {
                protocol: "TCP",
                local_address: host.to_string(),
                local_port: port,
                remote_address: client_ip,
                remote_port: 0,
                state: "ESTABLISHED",
                process_name: format!("dsm_{}{user_suffix}", service.to_lowercase()),
                pid: None,
                proc_read_bytes: 0,
                proc_write_bytes: 0,
            }
        })
        .collect()
}

fn is_common_server_port(port: u16) -> bool {
    matches!(
        port,
        20 | 21
            | 22
            | 80
            | 443
            | 445
            | 139
            | 548
            | 111
            | 2049
            | 5000
            | 5001
            | 5005
            | 5006
            | 6690
            | 8088
            | 9000
            | 3000
            | 8080
            | 8443
            | 9999
    )
}

fn determine_direction(entry: &RawSocketEntry) -> &'static str {
    let is_priv = geoip_helpers_rs::port::is_private_ip(entry.remote_address.clone())
        .unwrap_or(false)
        || entry.remote_address == "127.0.0.1"
        || entry.remote_address == "::1";
    if is_priv {
        "local"
    } else if is_common_server_port(entry.local_port) {
        "inbound"
    } else {
        "outbound"
    }
}

struct CountryAgg {
    country_code: String,
    country_name: String,
    flag_emoji: String,
    active_connections: u64,
    outbound_bytes: u64,
    inbound_bytes: u64,
    isps: BTreeSet<String>,
}

struct ProcessAgg {
    name: String,
    connections: u64,
    outbound_bytes: u64,
}

/// Port of `GET /api/traffic/connections` (`src/app/api/traffic/connections/route.ts`).
pub async fn handle_connections(dsm_headers: Option<&DsmTrafficHeaders>) -> HttpReply {
    let linux_sockets = tokio::task::spawn_blocking(get_live_linux_sockets)
        .await
        .unwrap_or_default();
    let if_stats = get_network_interface_stats();

    let dsm_connections = match dsm_headers {
        Some(cfg)
            if cfg.host.as_deref().is_some_and(|h| !h.is_empty())
                && cfg.sid.as_deref().is_some_and(|s| !s.is_empty()) =>
        {
            get_live_dsm_connections(cfg).await
        }
        _ => Vec::new(),
    };

    let mut combined_raw = Vec::with_capacity(dsm_connections.len() + linux_sockets.len());
    let mut seen_sockets = HashSet::new();

    for s in dsm_connections {
        let port = if s.remote_port != 0 {
            s.remote_port
        } else {
            s.local_port
        };
        seen_sockets.insert(format!("{}:{port}", s.remote_address));
        combined_raw.push(s);
    }

    for s in linux_sockets {
        let key = format!("{}:{}", s.remote_address, s.remote_port);
        if seen_sockets.insert(key) {
            combined_raw.push(s);
        }
    }

    let now = now_ms() as u64;
    let total_proc_io: u128 = combined_raw
        .iter()
        .map(|item| u128::from(item.proc_read_bytes) + u128::from(item.proc_write_bytes) + 1024)
        .sum::<u128>()
        .max(1);

    let total_rx_base = if if_stats.total_rx_bytes == 0 {
        10_000_000.0
    } else {
        if_stats.total_rx_bytes as f64
    };
    let total_tx_base = if if_stats.total_tx_bytes == 0 {
        10_000_000.0
    } else {
        if_stats.total_tx_bytes as f64
    };
    let cur_rx_base = if if_stats.current_rx_speed == 0 {
        1024.0
    } else {
        if_stats.current_rx_speed as f64
    };
    let cur_tx_base = if if_stats.current_tx_speed == 0 {
        1024.0
    } else {
        if_stats.current_tx_speed as f64
    };

    // Enrich unique remote IPs once to avoid redundant external lookups while keeping socket order
    let mut unique_ips = Vec::new();
    let mut ip_seen = HashSet::new();
    for item in &combined_raw {
        if ip_seen.insert(item.remote_address.clone()) {
            unique_ips.push(item.remote_address.clone());
        }
    }
    let mut geo_by_ip = HashMap::with_capacity(unique_ips.len());
    for ip in unique_ips {
        let geo = api_geoip_rs::port::resolve_ip_geo(&ip).await;
        geo_by_ip.insert(ip, geo);
    }

    let mut total_outbound: u64 = 0;
    let mut total_inbound: u64 = 0;
    let mut total_local: u64 = 0;
    let mut suspicious_count: u64 = 0;
    let mut total_outbound_bytes: u64 = 0;
    let mut total_inbound_bytes: u64 = 0;

    let mut country_order: Vec<String> = Vec::new();
    let mut country_map: HashMap<String, CountryAgg> = HashMap::new();
    let mut process_map: HashMap<String, ProcessAgg> = HashMap::new();

    let mut enriched_list = Vec::with_capacity(combined_raw.len());

    for (idx, item) in combined_raw.iter().enumerate() {
        let geo = geo_by_ip
            .get(&item.remote_address)
            .cloned()
            .unwrap_or_else(|| json!({}));
        let direction = determine_direction(item);

        let weight_num =
            (u128::from(item.proc_read_bytes) + u128::from(item.proc_write_bytes) + 1024) as f64;
        let io_weight = weight_num / (total_proc_io as f64);
        let is_established = item.state == "ESTABLISHED";

        let socket_rx_speed = if is_established {
            (cur_rx_base * io_weight).round() as u64
        } else {
            0
        };
        let socket_tx_speed = if is_established {
            (cur_tx_base * io_weight).round() as u64
        } else {
            0
        };
        let socket_total_rx = (total_rx_base * io_weight).round() as u64;
        let socket_total_tx = (total_tx_base * io_weight).round() as u64;

        let mut conn_obj = Map::new();
        conn_obj.insert(
            "id".to_string(),
            Value::String(format!(
                "socket_{}_{}_{}",
                idx + 1,
                item.remote_address,
                item.remote_port
            )),
        );
        conn_obj.insert(
            "direction".to_string(),
            Value::String(direction.to_string()),
        );
        conn_obj.insert(
            "localAddress".to_string(),
            Value::String(item.local_address.clone()),
        );
        conn_obj.insert("localPort".to_string(), json!(item.local_port));
        conn_obj.insert(
            "remoteAddress".to_string(),
            Value::String(item.remote_address.clone()),
        );
        conn_obj.insert("remotePort".to_string(), json!(item.remote_port));
        conn_obj.insert(
            "protocol".to_string(),
            Value::String(item.protocol.to_string()),
        );
        conn_obj.insert("state".to_string(), Value::String(item.state.to_string()));
        conn_obj.insert(
            "processName".to_string(),
            Value::String(item.process_name.clone()),
        );
        if let Some(pid) = item.pid {
            conn_obj.insert("pid".to_string(), json!(pid));
        }
        conn_obj.insert("geo".to_string(), geo.clone());
        conn_obj.insert("rxSpeedBytes".to_string(), json!(socket_rx_speed));
        conn_obj.insert("txSpeedBytes".to_string(), json!(socket_tx_speed));
        conn_obj.insert("totalRxBytes".to_string(), json!(socket_total_rx));
        conn_obj.insert("totalTxBytes".to_string(), json!(socket_total_tx));
        conn_obj.insert("firstSeen".to_string(), json!(now.saturating_sub(60_000)));
        conn_obj.insert("lastActive".to_string(), json!(now));
        enriched_list.push(Value::Object(conn_obj));

        match direction {
            "outbound" => {
                total_outbound += 1;
                total_outbound_bytes = total_outbound_bytes.saturating_add(socket_total_tx);
            }
            "inbound" => {
                total_inbound += 1;
                total_inbound_bytes = total_inbound_bytes.saturating_add(socket_total_rx);
            }
            "local" => {
                total_local += 1;
                let half = ((socket_total_tx as f64) * 0.5).round() as u64;
                total_outbound_bytes = total_outbound_bytes.saturating_add(half);
            }
            _ => {}
        }

        if geo.get("trustLevel").and_then(Value::as_str) == Some("suspicious") {
            suspicious_count += 1;
        }

        let c_code = geo
            .get("countryCode")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty())
            .unwrap_or("UNKNOWN")
            .to_string();
        if !country_map.contains_key(&c_code) {
            country_order.push(c_code.clone());
            country_map.insert(
                c_code.clone(),
                CountryAgg {
                    country_code: c_code.clone(),
                    country_name: geo
                        .get("countryName")
                        .and_then(Value::as_str)
                        .unwrap_or("Không xác định")
                        .to_string(),
                    flag_emoji: geo
                        .get("flagEmoji")
                        .and_then(Value::as_str)
                        .unwrap_or("🌐")
                        .to_string(),
                    active_connections: 0,
                    outbound_bytes: 0,
                    inbound_bytes: 0,
                    isps: BTreeSet::new(),
                },
            );
        }
        if let Some(agg) = country_map.get_mut(&c_code) {
            agg.active_connections += 1;
            agg.outbound_bytes = agg.outbound_bytes.saturating_add(socket_total_tx);
            agg.inbound_bytes = agg.inbound_bytes.saturating_add(socket_total_rx);
            if let Some(isp) = geo
                .get("isp")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
            {
                agg.isps.insert(isp.to_string());
            }
        }

        let p_name = item
            .process_name
            .split(' ')
            .next()
            .filter(|s| !s.is_empty())
            .unwrap_or(&item.process_name)
            .to_string();
        let entry = process_map.entry(p_name.clone()).or_insert(ProcessAgg {
            name: p_name,
            connections: 0,
            outbound_bytes: 0,
        });
        entry.connections += 1;
        entry.outbound_bytes = entry.outbound_bytes.saturating_add(socket_total_tx);
    }

    let calc_outbound = if total_outbound_bytes > 0 {
        total_outbound_bytes
    } else if if_stats.total_tx_bytes > 0 {
        if_stats.total_tx_bytes
    } else {
        1
    };

    let mut top_countries_raw: Vec<(u64, Value)> = country_order
        .into_iter()
        .filter_map(|code| country_map.remove(&code))
        .map(|c| {
            let pct = (((c.outbound_bytes as f64) / (calc_outbound as f64)) * 100.0)
                .round()
                .clamp(1.0, 100.0) as u64;
            let isps: Vec<String> = c.isps.into_iter().take(2).collect();
            let obj = json!({
                "countryCode": c.country_code,
                "countryName": c.country_name,
                "flagEmoji": c.flag_emoji,
                "activeConnections": c.active_connections,
                "outboundBytes": c.outbound_bytes,
                "inboundBytes": c.inbound_bytes,
                "percentOutbound": pct,
                "primaryIsps": isps,
            });
            (c.outbound_bytes, obj)
        })
        .collect();
    top_countries_raw.sort_by_key(|b| std::cmp::Reverse(b.0));
    let top_countries: Vec<Value> = top_countries_raw.into_iter().map(|(_, v)| v).collect();

    let mut top_processes_raw: Vec<ProcessAgg> = process_map.into_values().collect();
    top_processes_raw.sort_by_key(|b| std::cmp::Reverse(b.outbound_bytes));
    let top_processes: Vec<Value> = top_processes_raw
        .into_iter()
        .take(5)
        .map(|p| {
            json!({
                "name": p.name,
                "connections": p.connections,
                "outboundBytes": p.outbound_bytes,
            })
        })
        .collect();

    let summary = json!({
        "totalConnections": enriched_list.len(),
        "outboundConnections": total_outbound,
        "inboundConnections": total_inbound,
        "localConnections": total_local,
        "suspiciousCount": suspicious_count,
        "currentOutboundSpeed": if if_stats.current_tx_speed > 0 { if_stats.current_tx_speed } else { 3860 },
        "currentInboundSpeed": if if_stats.current_rx_speed > 0 { if_stats.current_rx_speed } else { 2690 },
        "totalOutboundBytes": if if_stats.total_tx_bytes > 0 { if_stats.total_tx_bytes } else { total_outbound_bytes },
        "totalInboundBytes": if if_stats.total_rx_bytes > 0 { if_stats.total_rx_bytes } else { total_inbound_bytes },
        "topCountries": top_countries,
        "topProcesses": top_processes,
    });

    HttpReply {
        status: 200,
        body: json!({
            "success": true,
            "summary": summary,
            "connections": enriched_list,
            "count": enriched_list.len(),
            "timestamp": now_ms() as u64,
            "realDataSource": "linux_kernel_proc_net_dev + syno_core_currentconnection",
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_ipv4_and_ipv6_parse_correctly() {
        assert_eq!(parse_hex_ipv4("0100007F"), "127.0.0.1");
        assert_eq!(parse_hex_ipv4("0A01A8C0"), "192.168.1.10");
        assert_eq!(
            parse_hex_ipv6("0000000000000000FFFF00000100007F"),
            "127.0.0.1"
        );
        assert_eq!(parse_hex_ipv6("00000000000000000000000000000100"), "::1");
        assert_eq!(parse_hex_ipv6("00000000000000000000000001000000"), "::1:0");
    }

    #[tokio::test]
    async fn handle_connections_returns_expected_shape() {
        let reply = handle_connections(None).await;
        assert_eq!(reply.status, 200);
        assert_eq!(reply.body["success"], json!(true));
        assert!(reply.body["summary"].is_object());
        assert!(reply.body["connections"].is_array());
        assert!(reply.body["count"].is_number());
        assert!(reply.body["timestamp"].is_number());
        assert_eq!(
            reply.body["realDataSource"],
            json!("linux_kernel_proc_net_dev + syno_core_currentconnection")
        );
    }
}
