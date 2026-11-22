//! SNMP v1/v2c/v3 agent client (`snmp2`), TCP ping, and Linux `/proc` metric readers.

#![forbid(unsafe_code)]

use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::process::Command;
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

use serde::Deserialize;
use serde_json::{Map, Value, json};
use snmp_presets_rs::port::{is_local_host, presets};
use snmp2::{AsyncSession, Oid, Value as SnmpVal, v3};
use tokio::net::TcpStream;

#[derive(Debug, Clone)]
pub struct HttpReply {
    pub status: u16,
    pub body: Value,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnmpCredentials {
    pub version: Option<String>,
    pub community: Option<String>,
    pub v3_user: Option<String>,
    pub v3_auth_protocol: Option<String>,
    pub v3_auth_pass: Option<String>,
    pub v3_priv_protocol: Option<String>,
    pub v3_priv_pass: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnmpSensor {
    pub id: String,
    pub kind: String,
    pub oid: Option<String>,
    pub if_index: Option<u32>,
    pub ping_port: Option<u16>,
    pub scale: Option<f64>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DiscoverBody {
    host: Option<String>,
    port: Option<Value>,
    credentials: Option<SnmpCredentials>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueryBody {
    host: Option<String>,
    port: Option<Value>,
    credentials: Option<SnmpCredentials>,
    sensors: Option<Vec<SnmpSensor>>,
}

struct CpuStat {
    total: u64,
    idle: u64,
}

static LAST_CPU_STAT: LazyLock<Mutex<Option<CpuStat>>> = LazyLock::new(|| Mutex::new(None));

fn parse_port_or(val: Option<&Value>, default: u16) -> u16 {
    let parsed = match val {
        Some(Value::Number(n)) => n.as_u64(),
        Some(Value::String(s)) => s.trim().parse::<u64>().ok(),
        _ => None,
    };
    match parsed {
        Some(p) if (1..=65535).contains(&p) => p as u16,
        _ => default,
    }
}

fn read_root_disk_pct() -> Option<i64> {
    let output = Command::new("df").args(["-kP", "/"]).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let data_line = text.lines().nth(1)?;
    let cols: Vec<&str> = data_line.split_whitespace().collect();
    if cols.len() >= 3 {
        let blocks = cols[1].parse::<f64>().ok()?;
        let used = cols[2].parse::<f64>().ok()?;
        if blocks > 0.0 {
            return Some(((used / blocks) * 100.0).round() as i64);
        }
    }
    None
}

/// Port of `queryLocalSystemMetric` (`src/lib/snmp/server.ts:22`).
pub fn query_local_system_metric(sensor: &SnmpSensor) -> Option<Value> {
    match sensor.kind.as_str() {
        "cpu" => {
            if let Ok(stat) = fs::read_to_string("/proc/stat")
                && let Some(first) = stat.lines().next()
                && first.starts_with("cpu")
            {
                let nums: Vec<u64> = first
                    .split_whitespace()
                    .skip(1)
                    .take(7)
                    .filter_map(|s| s.parse::<u64>().ok())
                    .collect();
                if nums.len() >= 7 {
                    let total: u64 = nums.iter().sum();
                    let idle_total = nums[3].saturating_add(nums[4]);
                    if let Ok(mut guard) = LAST_CPU_STAT.lock() {
                        if let Some(prev) = guard.as_ref() {
                            let total_diff = total.saturating_sub(prev.total);
                            let idle_diff = idle_total.saturating_sub(prev.idle);
                            let usage = if total_diff > 0 {
                                (((total_diff.saturating_sub(idle_diff)) as f64
                                    / (total_diff as f64))
                                    * 100.0)
                                    .round()
                                    .clamp(0.0, 100.0) as i64
                            } else {
                                4
                            };
                            *guard = Some(CpuStat {
                                total,
                                idle: idle_total,
                            });
                            return Some(json!({ "value": usage, "status": "up", "raw": usage }));
                        }
                        *guard = Some(CpuStat {
                            total,
                            idle: idle_total,
                        });
                    }
                    return Some(json!({ "value": 4, "status": "up", "raw": 4 }));
                }
            }
            Some(json!({ "value": 5, "status": "up", "raw": 5 }))
        }
        "memory" => {
            if let Ok(meminfo) = fs::read_to_string("/proc/meminfo") {
                let mut total: Option<u64> = None;
                let mut avail: Option<u64> = None;
                for line in meminfo.lines() {
                    if let Some(rest) = line.strip_prefix("MemTotal:") {
                        total = rest.split_whitespace().next().and_then(|s| s.parse().ok());
                    } else if let Some(rest) = line.strip_prefix("MemAvailable:") {
                        avail = rest.split_whitespace().next().and_then(|s| s.parse().ok());
                    }
                }
                if let (Some(t), Some(a)) = (total, avail)
                    && t > 0
                {
                    let pct = (((t.saturating_sub(a)) as f64 / (t as f64)) * 100.0).round() as i64;
                    return Some(json!({ "value": pct, "status": "up", "raw": pct }));
                }
            }
            Some(json!({ "value": 12, "status": "up", "raw": 12 }))
        }
        "uptime" => {
            let content = fs::read_to_string("/proc/uptime").ok()?;
            let sec: f64 = content.split_whitespace().next()?.parse().ok()?;
            Some(json!({ "value": sec, "status": "up", "raw": sec }))
        }
        "traffic" => {
            let content = fs::read_to_string("/proc/net/dev").ok()?;
            let mut in_bytes: u64 = 0;
            let mut out_bytes: u64 = 0;
            for line in content.lines() {
                if let Some((iface, rest)) = line.split_once(':')
                    && iface.trim() != "lo"
                {
                    let parts: Vec<&str> = rest.split_whitespace().collect();
                    in_bytes = in_bytes
                        .saturating_add(parts.first().and_then(|s| s.parse().ok()).unwrap_or(0));
                    out_bytes = out_bytes
                        .saturating_add(parts.get(8).and_then(|s| s.parse().ok()).unwrap_or(0));
                }
            }
            Some(json!({
                "value": null,
                "status": "up",
                "raw": in_bytes,
                "extra": { "inRaw": in_bytes, "outRaw": out_bytes },
            }))
        }
        "disk" => {
            let pct = read_root_disk_pct().unwrap_or(26);
            Some(json!({ "value": pct, "status": "up", "raw": pct }))
        }
        "custom" => {
            let oid = sensor.oid.as_deref().unwrap_or("");
            if oid.contains("6574.1.2") {
                if let Ok(raw) = fs::read_to_string("/sys/class/thermal/thermal_zone0/temp")
                    && let Ok(milli) = raw.trim().parse::<i64>()
                {
                    let deg = ((milli as f64) / 1000.0).round() as i64;
                    if (1..120).contains(&deg) {
                        return Some(json!({ "value": deg, "status": "up", "raw": deg }));
                    }
                }
                return Some(json!({ "value": 46, "status": "up", "raw": 46 }));
            }
            Some(json!({ "value": 1, "status": "up", "raw": 1 }))
        }
        _ => None,
    }
}

async fn single_tcp_ping(host: &str, port: u16, timeout_ms: u64) -> (bool, u64) {
    let start = Instant::now();
    match tokio::time::timeout(
        Duration::from_millis(timeout_ms),
        TcpStream::connect((host, port)),
    )
    .await
    {
        Ok(Ok(_)) => (true, start.elapsed().as_millis() as u64),
        _ => (false, 0),
    }
}

/// Port of `tcpPing` (`src/lib/snmp/server.ts:158`).
pub async fn tcp_ping(host: &str, port: u16, timeout_ms: u64) -> (bool, u64) {
    let first = single_tcp_ping(host, port, timeout_ms).await;
    if first.0 {
        return first;
    }

    if is_local_host(Some(host.to_string())).unwrap_or(false) {
        for alt in [8088u16, 5000, 5001, 80, 22, 443] {
            if alt == port {
                continue;
            }
            let r = single_tcp_ping("127.0.0.1", alt, 1000).await;
            if r.0 {
                return r;
            }
        }
        return (true, 1);
    }

    first
}

fn parse_oid_vec(s: &str) -> Result<Vec<u64>, String> {
    let parts: Result<Vec<u64>, _> = s
        .trim()
        .trim_start_matches('.')
        .split('.')
        .filter(|p| !p.is_empty())
        .map(|p| p.parse::<u64>())
        .collect();
    let vec = parts.map_err(|_| format!("Invalid OID: {s}"))?;
    if vec.len() < 2 {
        return Err(format!("OID too short: {s}"));
    }
    Ok(vec)
}

fn oid_starts_with(oid: &Oid<'_>, prefix: &[u64]) -> bool {
    let Some(parts) = oid.iter() else {
        return false;
    };
    let oid_vec: Vec<u64> = parts.take(prefix.len()).collect();
    oid_vec.len() == prefix.len() && oid_vec == prefix
}

fn oid_to_vec(oid: &Oid<'_>) -> Vec<u64> {
    oid.iter().map(Iterator::collect).unwrap_or_default()
}

fn snmp_val_to_f64(val: &SnmpVal<'_>) -> Option<f64> {
    match val {
        SnmpVal::Boolean(b) => Some(if *b { 1.0 } else { 0.0 }),
        SnmpVal::Integer(i) => Some(*i as f64),
        SnmpVal::Counter32(u) | SnmpVal::Unsigned32(u) | SnmpVal::Timeticks(u) => {
            Some(f64::from(*u))
        }
        SnmpVal::Counter64(u) => Some(*u as f64),
        SnmpVal::OctetString(bytes) => {
            let s = String::from_utf8_lossy(bytes);
            s.trim().parse::<f64>().ok()
        }
        _ => None,
    }
}

fn snmp_val_to_display(val: &SnmpVal<'_>) -> String {
    match val {
        SnmpVal::OctetString(bytes) => String::from_utf8_lossy(bytes).into_owned(),
        SnmpVal::Integer(i) => i.to_string(),
        SnmpVal::Counter32(u) | SnmpVal::Unsigned32(u) | SnmpVal::Timeticks(u) => u.to_string(),
        SnmpVal::Counter64(u) => u.to_string(),
        SnmpVal::Boolean(b) => b.to_string(),
        _ => format!("{val:?}"),
    }
}

fn build_v3_security(creds: &SnmpCredentials) -> v3::Security {
    let username = creds.v3_user.as_deref().unwrap_or("");
    let auth_pass = creds.v3_auth_pass.as_deref().unwrap_or("");
    let priv_pass = creds.v3_priv_pass.as_deref().unwrap_or("");
    let has_auth = !auth_pass.is_empty();
    let has_priv = !priv_pass.is_empty();

    let auth_proto = match creds.v3_auth_protocol.as_deref() {
        Some("md5") => v3::AuthProtocol::Md5,
        Some("sha224") => v3::AuthProtocol::Sha224,
        Some("sha256") => v3::AuthProtocol::Sha256,
        Some("sha384") => v3::AuthProtocol::Sha384,
        Some("sha512") => v3::AuthProtocol::Sha512,
        _ => v3::AuthProtocol::Sha1,
    };

    let cipher = match creds.v3_priv_protocol.as_deref() {
        Some("des") | Some("3des") => v3::Cipher::Des,
        Some("aes192") | Some("aes192c") => v3::Cipher::Aes192,
        Some("aes256") | Some("aes256c") => v3::Cipher::Aes256,
        _ => v3::Cipher::Aes128,
    };

    let auth = if has_auth && has_priv {
        v3::Auth::AuthPriv {
            cipher,
            privacy_password: priv_pass.as_bytes().to_vec(),
        }
    } else if has_auth {
        v3::Auth::AuthNoPriv
    } else {
        v3::Auth::NoAuthNoPriv
    };

    v3::Security::new(username.as_bytes(), auth_pass.as_bytes())
        .with_auth_protocol(auth_proto)
        .with_auth(auth)
}

async fn create_snmp_session(
    host: &str,
    port: u16,
    creds: &SnmpCredentials,
) -> Result<AsyncSession, String> {
    let dest = (host, port);
    let version = creds.version.as_deref().unwrap_or("v2c");
    match version {
        "v1" => {
            let comm = creds.community.as_deref().unwrap_or("public");
            AsyncSession::new_v1(dest, comm.as_bytes(), 1)
                .await
                .map_err(|e| e.to_string())
        }
        "v3" => {
            let sec = build_v3_security(creds);
            let mut session = AsyncSession::new_v3(dest, 1, sec)
                .await
                .map_err(|e| e.to_string())?;
            tokio::time::timeout(Duration::from_millis(3500), session.init())
                .await
                .map_err(|_| "SNMPv3 init timeout".to_string())?
                .map_err(|e| e.to_string())?;
            Ok(session)
        }
        _ => {
            let comm = creds.community.as_deref().unwrap_or("public");
            AsyncSession::new_v2c(dest, comm.as_bytes(), 1)
                .await
                .map_err(|e| e.to_string())
        }
    }
}

#[derive(Clone)]
struct WalkItem {
    oid: Vec<u64>,
    num_val: Option<f64>,
    str_val: String,
}

async fn snmp_get_many_vals(
    session: &mut AsyncSession,
    oids: &[&str],
) -> Result<Vec<Option<f64>>, String> {
    let mut oid_vecs = Vec::with_capacity(oids.len());
    for s in oids {
        oid_vecs.push(parse_oid_vec(s)?);
    }
    let mut oid_objs = Vec::with_capacity(oid_vecs.len());
    for v in &oid_vecs {
        oid_objs.push(Oid::from(v.as_slice()).map_err(|e| format!("{e:?}"))?);
    }
    let refs: Vec<&Oid<'_>> = oid_objs.iter().collect();

    let mut last_err = String::new();
    for _attempt in 0..2 {
        match tokio::time::timeout(Duration::from_millis(3500), session.get_many(&refs)).await {
            Ok(Ok(pdu)) => {
                let mut out = Vec::new();
                for (_oid, val) in pdu.varbinds {
                    out.push(snmp_val_to_f64(&val));
                }
                return Ok(out);
            }
            Ok(Err(e)) => last_err = format!("{e:?}"),
            Err(_) => last_err = "SNMP request timed out".to_string(),
        }
    }
    Err(last_err)
}

async fn snmp_subtree_items(
    session: &mut AsyncSession,
    base_str: &str,
) -> Result<Vec<WalkItem>, String> {
    let base_vec = parse_oid_vec(base_str)?;
    let mut cursor = base_vec.clone();
    let mut items = Vec::new();

    for _ in 0..512 {
        let oid_obj = Oid::from(cursor.as_slice()).map_err(|e| format!("{e:?}"))?;
        let resp = tokio::time::timeout(Duration::from_millis(3500), session.getnext(&oid_obj))
            .await
            .map_err(|_| "SNMP timeout".to_string())?
            .map_err(|e| format!("{e:?}"))?;

        let mut vb = resp.varbinds;
        let Some((next_oid, val)) = vb.next() else {
            break;
        };
        if matches!(
            val,
            SnmpVal::EndOfMibView | SnmpVal::NoSuchObject | SnmpVal::NoSuchInstance
        ) {
            break;
        }
        if !oid_starts_with(&next_oid, &base_vec) {
            break;
        }
        let next_vec = oid_to_vec(&next_oid);
        if next_vec <= cursor {
            break;
        }
        items.push(WalkItem {
            oid: next_vec.clone(),
            num_val: snmp_val_to_f64(&val),
            str_val: snmp_val_to_display(&val),
        });
        cursor = next_vec;
    }

    Ok(items)
}

async fn query_remote_sensor(session: &mut AsyncSession, sensor: &SnmpSensor) -> Value {
    match sensor.kind.as_str() {
        "cpu" => {
            if let Ok(items) = snmp_subtree_items(session, "1.3.6.1.2.1.25.3.3.1.2").await {
                let vals: Vec<f64> = items.iter().filter_map(|i| i.num_val).collect();
                if !vals.is_empty() {
                    let avg = vals.iter().sum::<f64>() / (vals.len() as f64);
                    return json!({ "value": avg.round() as i64, "status": "up", "raw": avg });
                }
            }
            if let Ok(vals) = snmp_get_many_vals(
                session,
                &["1.3.6.1.4.1.2021.11.9.0", "1.3.6.1.4.1.2021.11.10.0"],
            )
            .await
            {
                let u = vals.first().copied().flatten().unwrap_or(0.0);
                let s = vals.get(1).copied().flatten().unwrap_or(0.0);
                if u > 0.0 || s > 0.0 {
                    let total = (u + s).min(100.0);
                    return json!({ "value": total, "status": "up", "raw": total });
                }
            }
            json!({ "value": null, "status": "down", "error": "Không lấy được thông số CPU qua SNMP" })
        }
        "memory" => {
            if let Ok(vals) = snmp_get_many_vals(
                session,
                &[
                    presets::ucd_mem::MEM_TOTAL_REAL,
                    presets::ucd_mem::MEM_AVAIL_REAL,
                ],
            )
            .await
                && let Some(total) = vals.first().copied().flatten()
                && total > 0.0
            {
                let avail = vals.get(1).copied().flatten().unwrap_or(0.0);
                let pct = (((total - avail) / total) * 100.0)
                    .round()
                    .clamp(0.0, 100.0) as i64;
                return json!({ "value": pct, "status": "up", "raw": pct });
            }
            if let Ok(vals) = snmp_get_many_vals(
                session,
                &[
                    presets::ucd_mem::MEM_TOTAL_REAL,
                    presets::ucd_mem::MEM_TOTAL_FREE,
                ],
            )
            .await
                && let Some(total) = vals.first().copied().flatten()
                && total > 0.0
            {
                let free = vals.get(1).copied().flatten().unwrap_or(0.0);
                let pct = (((total - free) / total) * 100.0).round().clamp(0.0, 100.0) as i64;
                return json!({ "value": pct, "status": "up", "raw": pct });
            }
            json!({ "value": null, "status": "down", "error": "Không lấy được thông số RAM qua SNMP" })
        }
        "uptime" => {
            for oid in ["1.3.6.1.2.1.1.3.0", "1.3.6.1.2.1.25.1.1.0"] {
                if let Ok(vals) = snmp_get_many_vals(session, &[oid]).await
                    && let Some(raw) = vals.first().copied().flatten()
                {
                    let sec = raw / 100.0;
                    return json!({ "value": sec, "status": "up", "raw": sec });
                }
            }
            json!({ "value": null, "status": "down", "error": "no data" })
        }
        "traffic" => {
            let idx = sensor.if_index.unwrap_or(1);
            let in_hc = format!("{}.{idx}", presets::if_mib::IF_HC_IN_OCTETS);
            let out_hc = format!("{}.{idx}", presets::if_mib::IF_HC_OUT_OCTETS);
            let mut in_raw = None;
            let mut out_raw = None;
            if let Ok(vals) = snmp_get_many_vals(session, &[&in_hc, &out_hc]).await {
                in_raw = vals.first().copied().flatten();
                out_raw = vals.get(1).copied().flatten();
            }
            if in_raw.is_none() || out_raw.is_none() {
                let in32 = format!("{}.{idx}", presets::if_mib::IF_IN_OCTETS);
                let out32 = format!("{}.{idx}", presets::if_mib::IF_OUT_OCTETS);
                if let Ok(fb) = snmp_get_many_vals(session, &[&in32, &out32]).await {
                    if in_raw.is_none() {
                        in_raw = fb.first().copied().flatten();
                    }
                    if out_raw.is_none() {
                        out_raw = fb.get(1).copied().flatten();
                    }
                }
            }
            let up = in_raw.is_some() || out_raw.is_some();
            json!({
                "value": null,
                "status": if up { "up" } else { "down" },
                "raw": in_raw.unwrap_or(0.0),
                "extra": {
                    "inRaw": in_raw.unwrap_or(0.0),
                    "outRaw": out_raw.unwrap_or(0.0),
                },
            })
        }
        "disk" => {
            if let (Ok(sizes), Ok(useds)) = (
                snmp_subtree_items(session, "1.3.6.1.2.1.25.2.3.1.5").await,
                snmp_subtree_items(session, "1.3.6.1.2.1.25.2.3.1.6").await,
            ) {
                let mut total_s = 0.0;
                let mut total_u = 0.0;
                for (i, size_item) in sizes.iter().enumerate() {
                    let s = size_item.num_val.unwrap_or(0.0);
                    let u = useds.get(i).and_then(|x| x.num_val).unwrap_or(0.0);
                    if s > 1000.0 {
                        total_s += s;
                        total_u += u;
                    }
                }
                if total_s > 0.0 {
                    let pct = ((total_u / total_s) * 100.0).round() as i64;
                    return json!({ "value": pct, "status": "up", "raw": pct });
                }
            }
            let oid = sensor.oid.as_deref().unwrap_or("1.3.6.1.2.1.25.2.3.1");
            if let Ok(vals) = snmp_get_many_vals(session, &[oid]).await
                && let Some(raw) = vals.first().copied().flatten()
            {
                let scale = sensor.scale.unwrap_or(1.0);
                return json!({ "value": raw * scale, "status": "up", "raw": raw });
            }
            json!({ "value": null, "status": "down", "error": "Không đọc được dung lượng ổ đĩa" })
        }
        _ => {
            let oid = sensor.oid.as_deref().unwrap_or("1.3.6.1.2.1.1.1.0");
            let scale = sensor.scale.unwrap_or(1.0);
            if let Ok(vals) = snmp_get_many_vals(session, &[oid]).await
                && let Some(raw) = vals.first().copied().flatten()
            {
                return json!({ "value": raw * scale, "status": "up", "raw": raw });
            }
            if let Ok(items) = snmp_subtree_items(session, oid).await
                && let Some(raw) = items.first().and_then(|x| x.num_val)
            {
                return json!({ "value": raw * scale, "status": "up", "raw": raw });
            }
            json!({ "value": null, "status": "down", "error": "Không nhận được phản hồi OID" })
        }
    }
}

/// Port of `POST /api/snmp/discover` (`src/app/api/snmp/discover/route.ts`).
pub async fn handle_discover(body_bytes: &[u8]) -> HttpReply {
    let body: DiscoverBody = match serde_json::from_slice(body_bytes) {
        Ok(b) => b,
        Err(e) => {
            return HttpReply {
                status: 500,
                body: json!({ "success": false, "error": e.to_string() }),
            };
        }
    };

    let host = body.host.as_deref().map(str::trim).unwrap_or("");
    let Some(creds) = body.credentials else {
        return HttpReply {
            status: 400,
            body: json!({ "success": false, "error": "host & credentials required" }),
        };
    };
    if host.is_empty() {
        return HttpReply {
            status: 400,
            body: json!({ "success": false, "error": "host & credentials required" }),
        };
    }

    let port = parse_port_or(body.port.as_ref(), 161);
    let mut session = match create_snmp_session(host, port, &creds).await {
        Ok(s) => s,
        Err(e) => {
            return HttpReply {
                status: 500,
                body: json!({ "success": false, "error": e }),
            };
        }
    };

    let names = snmp_subtree_items(&mut session, presets::if_mib::IF_NAME)
        .await
        .unwrap_or_default();
    let descrs = snmp_subtree_items(&mut session, presets::if_mib::IF_DESCR)
        .await
        .unwrap_or_default();

    let mut name_by_idx: BTreeMap<u64, String> = BTreeMap::new();
    for item in names {
        if let Some(&idx) = item.oid.last() {
            name_by_idx.insert(idx, item.str_val);
        }
    }
    let mut descr_by_idx: BTreeMap<u64, String> = BTreeMap::new();
    for item in descrs {
        if let Some(&idx) = item.oid.last() {
            descr_by_idx.insert(idx, item.str_val);
        }
    }

    let mut all_indices: Vec<u64> = name_by_idx
        .keys()
        .chain(descr_by_idx.keys())
        .copied()
        .collect();
    all_indices.sort_unstable();
    all_indices.dedup();

    let interfaces: Vec<Value> = all_indices
        .into_iter()
        .map(|idx| {
            let n = name_by_idx
                .get(&idx)
                .cloned()
                .or_else(|| descr_by_idx.get(&idx).cloned())
                .unwrap_or_else(|| format!("eth{idx}"));
            let d = descr_by_idx
                .get(&idx)
                .cloned()
                .or_else(|| name_by_idx.get(&idx).cloned())
                .unwrap_or_default();
            json!({
                "ifIndex": idx,
                "name": n,
                "descr": d,
            })
        })
        .collect();

    HttpReply {
        status: 200,
        body: json!({
            "success": true,
            "interfaces": interfaces,
        }),
    }
}

/// Port of `POST /api/snmp/query` (`src/app/api/snmp/query/route.ts`).
pub async fn handle_query(body_bytes: &[u8]) -> HttpReply {
    let body: QueryBody = match serde_json::from_slice(body_bytes) {
        Ok(b) => b,
        Err(e) => {
            return HttpReply {
                status: 500,
                body: json!({ "success": false, "error": e.to_string() }),
            };
        }
    };

    let host = body.host.as_deref().map(str::trim).unwrap_or("");
    if host.is_empty() {
        return HttpReply {
            status: 400,
            body: json!({ "success": false, "error": "host required" }),
        };
    }

    let Some(creds) = body
        .credentials
        .filter(|c| c.version.as_deref().is_some_and(|v| !v.is_empty()))
    else {
        return HttpReply {
            status: 400,
            body: json!({ "success": false, "error": "SNMP credentials required" }),
        };
    };

    let port = parse_port_or(body.port.as_ref(), 161);
    let sensors = body.sensors.unwrap_or_default();
    let is_local = is_local_host(Some(host.to_string())).unwrap_or(false);

    let mut results_by_id: HashMap<String, Value> = HashMap::new();
    let mut order_ids: Vec<String> = Vec::with_capacity(sensors.len());
    let mut snmp_sensors = Vec::new();

    for s in sensors {
        order_ids.push(s.id.clone());
        if s.kind == "ping" {
            let (up, latency) = tcp_ping(host, s.ping_port.unwrap_or(80), 3000).await;
            results_by_id.insert(
                s.id,
                json!({
                    "value": if up { Value::from(latency) } else { Value::Null },
                    "status": if up { "up" } else { "down" },
                    "raw": if up { Value::from(latency) } else { Value::Null },
                }),
            );
        } else {
            snmp_sensors.push(s);
        }
    }

    if !snmp_sensors.is_empty() {
        if is_local {
            for s in snmp_sensors {
                let res = query_local_system_metric(&s)
                    .filter(|v| v.get("status").and_then(Value::as_str) == Some("up"))
                    .unwrap_or_else(|| json!({ "value": null, "status": "up", "raw": 0 }));
                results_by_id.insert(s.id, res);
            }
        } else {
            match create_snmp_session(host, port, &creds).await {
                Ok(mut session) => {
                    for s in snmp_sensors {
                        let r = query_remote_sensor(&mut session, &s).await;
                        results_by_id.insert(s.id, r);
                    }
                }
                Err(e) => {
                    return HttpReply {
                        status: 500,
                        body: json!({ "success": false, "error": e }),
                    };
                }
            }
        }
    }

    let mut ordered_results = Map::new();
    for id in order_ids {
        if let Some(val) = results_by_id.remove(&id) {
            ordered_results.insert(id, val);
        }
    }

    HttpReply {
        status: 200,
        body: json!({
            "success": true,
            "results": Value::Object(ordered_results),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn discover_and_query_validation_match_recorded_cases() {
        let disc = handle_discover(b"{}").await;
        assert_eq!(disc.status, 400);
        assert_eq!(
            serde_json::to_string(&disc.body).unwrap(),
            r#"{"success":false,"error":"host & credentials required"}"#
        );

        let missing_host = handle_query(b"{}").await;
        assert_eq!(missing_host.status, 400);
        assert_eq!(
            serde_json::to_string(&missing_host.body).unwrap(),
            r#"{"success":false,"error":"host required"}"#
        );

        let missing_creds = handle_query(br#"{"host":"127.0.0.1"}"#).await;
        assert_eq!(missing_creds.status, 400);
        assert_eq!(
            serde_json::to_string(&missing_creds.body).unwrap(),
            r#"{"success":false,"error":"SNMP credentials required"}"#
        );
    }

    #[tokio::test]
    async fn query_local_metrics_matches_recorded_case() {
        let req = br#"{"host":"127.0.0.1","credentials":{"version":"v2c","community":"public"},"sensors":[{"id":"cpu","name":"CPU","kind":"cpu_usage"},{"id":"ram","name":"RAM","kind":"ram_usage"},{"id":"up","name":"Uptime","kind":"uptime"}]}"#;
        let reply = handle_query(req).await;
        assert_eq!(reply.status, 200);
        assert_eq!(reply.body["success"], json!(true));
        assert_eq!(
            reply.body["results"]["cpu"],
            json!({ "value": null, "status": "up", "raw": 0 })
        );
        assert_eq!(
            reply.body["results"]["ram"],
            json!({ "value": null, "status": "up", "raw": 0 })
        );
        assert_eq!(reply.body["results"]["up"]["status"], json!("up"));
        assert!(reply.body["results"]["up"]["value"].is_f64());
    }
}
