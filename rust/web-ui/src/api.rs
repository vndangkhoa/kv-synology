use gloo_net::http::{Method, Request, RequestBuilder};
use serde_json::{Value, json};

use crate::models::{
    AiChatMessage, AiModelItem, BtSearchResult, DockerContainer, DownloadTask, DsmConfig,
    DsmSession, FileItem, GeoIpDetail, PackageItem, ProcessItem, RssItem, ServiceItem,
    SnmpInterfaceItem, StorageVolume, SystemInfo, SystemUtilization, TrafficConnection,
    TrafficSummary,
};

pub fn encode_uri_component(input: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";
    let mut out = String::with_capacity(input.len() * 2);
    for b in input.as_bytes() {
        let ok = b.is_ascii_alphanumeric()
            || matches!(
                b,
                b'-' | b'_' | b'.' | b'!' | b'~' | b'*' | b'\'' | b'(' | b')'
            );
        if ok {
            out.push(*b as char);
        } else {
            out.push('%');
            out.push(HEX[(b >> 4) as usize] as char);
            out.push(HEX[(b & 0x0f) as usize] as char);
        }
    }
    out
}

fn with_dsm_headers(
    mut builder: RequestBuilder,
    sess: &DsmSession,
    cfg: &DsmConfig,
) -> RequestBuilder {
    let host = if !sess.host.is_empty() {
        &sess.host
    } else {
        &cfg.host
    };
    let port = if sess.port != 0 { sess.port } else { cfg.port };
    let https = if !sess.host.is_empty() {
        sess.https
    } else {
        cfg.https
    };
    builder = builder
        .header("x-dsm-host", host)
        .header("x-dsm-port", &port.to_string())
        .header("x-dsm-https", if https { "true" } else { "false" });
    if !sess.cookie.is_empty() {
        builder = builder.header("x-dsm-cookie", &sess.cookie);
    }
    if !sess.synotoken.is_empty() {
        builder = builder.header("x-dsm-synotoken", &sess.synotoken);
    }
    builder
}

async fn post_json(url: &str, body: &Value) -> Result<Value, String> {
    let req = Request::post(url)
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(body).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    let res = req.send().await.map_err(|e| e.to_string())?;
    let val: Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(val)
}

async fn get_json(url: &str) -> Result<Value, String> {
    let res = Request::get(url).send().await.map_err(|e| e.to_string())?;
    let val: Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(val)
}

pub async fn dsm_login(
    cfg: &DsmConfig,
    password: &str,
    otp: Option<&str>,
) -> Result<DsmSession, String> {
    let mut url = format!(
        "/api/dsm/auth.cgi?api=SYNO.API.Auth&version=6&method=login&account={}&passwd={}&session=FileStation&format=sid&enable_syno_token=yes",
        encode_uri_component(&cfg.account),
        encode_uri_component(password),
    );
    if let Some(code) = otp.filter(|s| !s.trim().is_empty()) {
        url.push_str("&otp_code=");
        url.push_str(&encode_uri_component(code.trim()));
    }
    let req = with_dsm_headers(
        RequestBuilder::new(&url).method(Method::GET),
        &DsmSession::default(),
        cfg,
    );
    let res = req.send().await.map_err(|e| e.to_string())?;
    let set_cookie = res.headers().get("x-dsm-set-cookie").unwrap_or_default();
    let val: Value = res.json().await.map_err(|e| e.to_string())?;
    if val.get("success").and_then(Value::as_bool) != Some(true) {
        let code = val
            .pointer("/error/code")
            .and_then(Value::as_i64)
            .unwrap_or(-1);
        let msg = val
            .get("error")
            .and_then(Value::as_str)
            .map(ToString::to_string)
            .unwrap_or_else(|| format!("DSM Login failed (error code {code})"));
        return Err(msg);
    }
    let sid = val
        .pointer("/data/sid")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let synotoken = val
        .pointer("/data/synotoken")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    Ok(DsmSession {
        is_connected: true,
        is_demo: false,
        sid: sid.clone(),
        synotoken,
        cookie: if set_cookie.is_empty() {
            format!("id={sid}")
        } else {
            set_cookie
        },
        account: cfg.account.clone(),
        host: cfg.host.clone(),
        port: cfg.port,
        https: cfg.https,
        saved_until: None,
    })
}

pub async fn dsm_call(
    sess: &DsmSession,
    cfg: &DsmConfig,
    cgi: &str,
    params: &[(&str, &str)],
) -> Result<Value, String> {
    let mut query = params
        .iter()
        .map(|(k, v)| format!("{}={}", encode_uri_component(k), encode_uri_component(v)))
        .collect::<Vec<_>>()
        .join("&");
    if !sess.sid.is_empty() {
        query.push_str("&_sid=");
        query.push_str(&encode_uri_component(&sess.sid));
    }
    let url = format!("/api/dsm/{cgi}?{query}");
    let req = with_dsm_headers(RequestBuilder::new(&url).method(Method::GET), sess, cfg);
    let res = req.send().await.map_err(|e| e.to_string())?;
    let val: Value = res.json().await.map_err(|e| e.to_string())?;
    if val.get("success").and_then(Value::as_bool) != Some(true) {
        let code = val
            .pointer("/error/code")
            .and_then(Value::as_i64)
            .unwrap_or(0);
        let msg = val
            .get("error")
            .and_then(Value::as_str)
            .map(ToString::to_string)
            .unwrap_or_else(|| format!("DSM API error ({code})"));
        return Err(msg);
    }
    Ok(val.get("data").cloned().unwrap_or(Value::Null))
}

pub async fn fetch_live_system_info(
    sess: &DsmSession,
    cfg: &DsmConfig,
) -> Result<SystemInfo, String> {
    let d = dsm_call(
        sess,
        cfg,
        "entry.cgi",
        &[
            ("api", "SYNO.DSM.Info"),
            ("version", "2"),
            ("method", "getinfo"),
        ],
    )
    .await?;
    Ok(SystemInfo {
        model: d["model"].as_str().unwrap_or("Synology NAS").to_string(),
        serial: d["serial"].as_str().unwrap_or("—").to_string(),
        dsm_version: d["version_string"]
            .as_str()
            .unwrap_or("DSM 7.x")
            .to_string(),
        ram_mb: d["ram"].as_u64().unwrap_or(4096),
        uptime_sec: d["uptime"].as_u64().unwrap_or(0),
        temperature_c: d["temperature"].as_i64().unwrap_or(40) as i32,
        cpu_cores: 4,
        cpu_model: "Synology NAS CPU".to_string(),
        hostname: sess.host.clone(),
    })
}

pub async fn fetch_live_utilization(
    sess: &DsmSession,
    cfg: &DsmConfig,
) -> Result<SystemUtilization, String> {
    let d = dsm_call(
        sess,
        cfg,
        "entry.cgi",
        &[
            ("api", "SYNO.Core.System.Utilization"),
            ("version", "1"),
            ("method", "get"),
        ],
    )
    .await?;
    let cpu_user = d["cpu"]["user_load"].as_f64().unwrap_or(0.0);
    let cpu_sys = d["cpu"]["system_load"].as_f64().unwrap_or(0.0);
    let ram_pct = d["memory"]["real_usage"].as_f64().unwrap_or(0.0);
    let total_kb = d["memory"]["memory_size"].as_u64().unwrap_or(8_388_608);
    let total_mb = total_kb / 1024;
    let used_mb = ((total_mb as f64) * (ram_pct / 100.0)) as u64;
    let rx = d["network"]
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|n| n["rx"].as_u64())
        .unwrap_or(0);
    let tx = d["network"]
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|n| n["tx"].as_u64())
        .unwrap_or(0);
    Ok(SystemUtilization {
        cpu_total: (cpu_user + cpu_sys).clamp(0.0, 100.0),
        cpu_user,
        cpu_system: cpu_sys,
        ram_percent: ram_pct,
        ram_used_mb: used_mb,
        ram_cached_mb: 0,
        ram_total_mb: total_mb,
        net_rx_bps: rx,
        net_tx_bps: tx,
        disk_read_bps: 0,
        disk_write_bps: 0,
    })
}

pub async fn fetch_live_processes(
    sess: &DsmSession,
    cfg: &DsmConfig,
) -> Result<Vec<ProcessItem>, String> {
    let d = dsm_call(
        sess,
        cfg,
        "entry.cgi",
        &[
            ("api", "SYNO.Core.System.Process"),
            ("version", "1"),
            ("method", "list"),
        ],
    )
    .await?;
    let arr = d["process"].as_array().cloned().unwrap_or_default();
    Ok(arr
        .into_iter()
        .take(50)
        .map(|p| ProcessItem {
            pid: p["pid"].as_u64().unwrap_or(0) as u32,
            name: p["command"].as_str().unwrap_or("proc").to_string(),
            user: p["user"].as_str().unwrap_or("system").to_string(),
            cpu_percent: p["cpu"].as_f64().unwrap_or(0.0),
            ram_mb: p["mem"].as_u64().unwrap_or(0) / 1024,
            status: p["status"].as_str().unwrap_or("Running").to_string(),
        })
        .collect())
}

pub async fn fetch_live_files(
    sess: &DsmSession,
    cfg: &DsmConfig,
    path: &str,
) -> Result<Vec<FileItem>, String> {
    if path == "/" || path.is_empty() {
        let d = dsm_call(
            sess,
            cfg,
            "entry.cgi",
            &[
                ("api", "SYNO.FileStation.List"),
                ("version", "2"),
                ("method", "list_share"),
            ],
        )
        .await?;
        let arr = d["shares"].as_array().cloned().unwrap_or_default();
        return Ok(arr
            .into_iter()
            .map(|f| FileItem {
                name: f["name"].as_str().unwrap_or("").to_string(),
                path: f["path"].as_str().unwrap_or("/").to_string(),
                is_dir: true,
                size: 0,
                modified: "—".to_string(),
                owner: "admin".to_string(),
                perm: "rwxr-xr-x".to_string(),
            })
            .collect());
    }
    let d = dsm_call(
        sess,
        cfg,
        "entry.cgi",
        &[
            ("api", "SYNO.FileStation.List"),
            ("version", "2"),
            ("method", "list"),
            ("folder_path", path),
            ("additional", r#"["size","time","owner","perm"]"#),
        ],
    )
    .await?;
    let arr = d["files"].as_array().cloned().unwrap_or_default();
    Ok(arr
        .into_iter()
        .map(|f| FileItem {
            name: f["name"].as_str().unwrap_or("").to_string(),
            path: f["path"].as_str().unwrap_or("").to_string(),
            is_dir: f["isdir"].as_bool().unwrap_or(false),
            size: f["additional"]["size"].as_u64().unwrap_or(0),
            modified: f["additional"]["time"]["mtime"]
                .as_i64()
                .map(|t| t.to_string())
                .unwrap_or_else(|| "—".to_string()),
            owner: f["additional"]["owner"]["user"]
                .as_str()
                .unwrap_or("admin")
                .to_string(),
            perm: "rw-r--r--".to_string(),
        })
        .collect())
}

pub async fn fetch_live_volumes(
    sess: &DsmSession,
    cfg: &DsmConfig,
) -> Result<Vec<StorageVolume>, String> {
    let d = dsm_call(
        sess,
        cfg,
        "entry.cgi",
        &[
            ("api", "SYNO.Storage.CGI.Storage"),
            ("version", "1"),
            ("method", "load_info"),
        ],
    )
    .await?;
    let arr = d["volumes"].as_array().cloned().unwrap_or_default();
    Ok(arr
        .into_iter()
        .map(|v| {
            let total_b = v["size"]["total"]
                .as_str()
                .and_then(|s| s.parse::<f64>().ok())
                .unwrap_or(0.0);
            let used_b = v["size"]["used"]
                .as_str()
                .and_then(|s| s.parse::<f64>().ok())
                .unwrap_or(0.0);
            StorageVolume {
                id: v["id"].as_str().unwrap_or("volume_1").to_string(),
                name: v["display_name"]
                    .as_str()
                    .or_else(|| v["id"].as_str())
                    .unwrap_or("Volume")
                    .to_string(),
                raid_type: v["raid_type"].as_str().unwrap_or("SHR").to_string(),
                fs_type: v["fs_type"].as_str().unwrap_or("btrfs").to_string(),
                status: v["status"].as_str().unwrap_or("normal").to_string(),
                used_gb: used_b / (1024.0 * 1024.0 * 1024.0),
                total_gb: total_b / (1024.0 * 1024.0 * 1024.0),
                pool_name: v["pool_path"].as_str().unwrap_or("Pool").to_string(),
            }
        })
        .collect())
}

pub async fn fetch_live_containers(
    sess: &DsmSession,
    cfg: &DsmConfig,
) -> Result<Vec<DockerContainer>, String> {
    let d = dsm_call(
        sess,
        cfg,
        "entry.cgi",
        &[
            ("api", "SYNO.Docker.Container"),
            ("version", "1"),
            ("method", "list"),
            ("limit", "100"),
            ("offset", "0"),
        ],
    )
    .await?;
    let arr = d["containers"].as_array().cloned().unwrap_or_default();
    Ok(arr
        .into_iter()
        .map(|c| {
            let up = c["status"].as_str() == Some("running") || c["up"].as_bool() == Some(true);
            DockerContainer {
                id: c["id"].as_str().unwrap_or("").to_string(),
                name: c["name"].as_str().unwrap_or("").to_string(),
                image: c["image"].as_str().unwrap_or("").to_string(),
                status: c["status"].as_str().unwrap_or("unknown").to_string(),
                up,
                cpu_percent: c["cpu"].as_f64().unwrap_or(0.0),
                memory_mb: c["memory"].as_f64().unwrap_or(0.0) / (1024.0 * 1024.0),
                ports: "—".to_string(),
                created: "—".to_string(),
            }
        })
        .collect())
}

pub async fn fetch_live_downloads(
    sess: &DsmSession,
    cfg: &DsmConfig,
) -> Result<Vec<DownloadTask>, String> {
    let d = dsm_call(
        sess,
        cfg,
        "DownloadStation/task.cgi",
        &[
            ("api", "SYNO.DownloadStation.Task"),
            ("version", "1"),
            ("method", "list"),
            ("additional", "detail,transfer"),
        ],
    )
    .await?;
    let arr = d["tasks"].as_array().cloned().unwrap_or_default();
    Ok(arr
        .into_iter()
        .map(|t| DownloadTask {
            id: t["id"].as_str().unwrap_or("").to_string(),
            title: t["title"].as_str().unwrap_or("Task").to_string(),
            uri: t["additional"]["detail"]["uri"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            status: t["status"].as_str().unwrap_or("waiting").to_string(),
            size_bytes: t["size"].as_u64().unwrap_or(0),
            downloaded_bytes: t["additional"]["transfer"]["size_downloaded"]
                .as_u64()
                .unwrap_or(0),
            speed_down: t["additional"]["transfer"]["speed_download"]
                .as_u64()
                .unwrap_or(0),
            speed_up: t["additional"]["transfer"]["speed_upload"]
                .as_u64()
                .unwrap_or(0),
            eta: "—".to_string(),
            task_type: t["type"].as_str().unwrap_or("http").to_string(),
        })
        .collect())
}

pub async fn fetch_live_packages(
    sess: &DsmSession,
    cfg: &DsmConfig,
) -> Result<Vec<PackageItem>, String> {
    let d = dsm_call(
        sess,
        cfg,
        "entry.cgi",
        &[
            ("api", "SYNO.Core.Package"),
            ("version", "1"),
            ("method", "list"),
            ("additional", r#"["status","description"]"#),
        ],
    )
    .await?;
    let arr = d["packages"].as_array().cloned().unwrap_or_default();
    Ok(arr
        .into_iter()
        .map(|p| PackageItem {
            id: p["id"].as_str().unwrap_or("").to_string(),
            name: p["name"].as_str().unwrap_or("").to_string(),
            version: p["version"].as_str().unwrap_or("").to_string(),
            publisher: "Synology".to_string(),
            category: "Package".to_string(),
            running: p["additional"]["status"].as_str() == Some("running"),
            description: p["additional"]["description"]
                .as_str()
                .unwrap_or("")
                .to_string(),
        })
        .collect())
}

pub async fn fetch_live_services(
    sess: &DsmSession,
    cfg: &DsmConfig,
) -> Result<Vec<ServiceItem>, String> {
    let d = dsm_call(
        sess,
        cfg,
        "entry.cgi",
        &[
            ("api", "SYNO.Core.Service"),
            ("version", "1"),
            ("method", "get"),
        ],
    )
    .await?;
    let arr = d["service"].as_array().cloned().unwrap_or_default();
    Ok(arr
        .into_iter()
        .map(|s| ServiceItem {
            id: s["service_id"].as_str().unwrap_or("").to_string(),
            name: s["display_name"]
                .as_str()
                .or_else(|| s["service_id"].as_str())
                .unwrap_or("")
                .to_string(),
            category: "DSM Service".to_string(),
            enabled: s["enable"].as_bool().unwrap_or(false),
            port: "—".to_string(),
            description: String::new(),
        })
        .collect())
}

// ---------- Direct Pure-Rust Backend Endpoints ----------

pub async fn fetch_traffic(
    sess: Option<&DsmSession>,
    cfg: Option<&DsmConfig>,
) -> Result<(TrafficSummary, Vec<TrafficConnection>), String> {
    let mut builder = RequestBuilder::new("/api/traffic/connections").method(Method::GET);
    if let (Some(s), Some(c)) = (sess, cfg)
        && s.is_connected
        && !s.is_demo
    {
        builder = with_dsm_headers(builder, s, c);
    }
    let res = builder.send().await.map_err(|e| e.to_string())?;
    let val: Value = res.json().await.map_err(|e| e.to_string())?;
    let summary: TrafficSummary =
        serde_json::from_value(val["summary"].clone()).unwrap_or_default();
    let conns: Vec<TrafficConnection> =
        serde_json::from_value(val["connections"].clone()).unwrap_or_default();
    Ok((summary, conns))
}

pub async fn fetch_geoip(ip: &str) -> Result<GeoIpDetail, String> {
    let url = format!("/api/geoip/lookup?ip={}", encode_uri_component(ip));
    let val = get_json(&url).await?;
    if val.get("success").and_then(Value::as_bool) != Some(true) {
        return Err(val["error"]
            .as_str()
            .unwrap_or("GeoIP lookup failed")
            .to_string());
    }
    serde_json::from_value(val["data"].clone()).map_err(|e| e.to_string())
}

pub async fn exec_ssh(
    host: &str,
    port: u16,
    username: &str,
    password: &str,
    private_key: &str,
    command: &str,
) -> Result<Value, String> {
    let payload = json!({
        "host": host,
        "port": port,
        "username": username,
        "password": if password.is_empty() { Value::Null } else { json!(password) },
        "privateKey": if private_key.is_empty() { Value::Null } else { json!(private_key) },
        "command": command,
    });
    post_json("/api/ssh/exec", &payload).await
}

pub async fn run_smart_info(
    mode: &str,
    option: &str,
    host: &str,
    port: u16,
    username: &str,
    password: &str,
    sess: &DsmSession,
) -> Result<Value, String> {
    let payload = json!({
        "action": "run",
        "mode": mode,
        "option": option,
        "dsmConfig": if sess.is_connected && !sess.is_demo {
            json!({
                "host": sess.host,
                "port": sess.port,
                "https": sess.https,
                "sid": sess.sid,
                "cookie": sess.cookie,
                "synotoken": sess.synotoken,
            })
        } else {
            Value::Null
        },
        "sshConfig": if !host.is_empty() && !username.is_empty() {
            json!({
                "host": host,
                "port": port,
                "username": username,
                "password": password,
            })
        } else {
            Value::Null
        }
    });
    post_json("/api/storage/smart-info", &payload).await
}

pub async fn snmp_discover(
    host: &str,
    port: u16,
    community: &str,
) -> Result<Vec<SnmpInterfaceItem>, String> {
    let payload = json!({
        "host": host,
        "port": port,
        "credentials": { "version": "v2c", "community": community },
    });
    let val = post_json("/api/snmp/discover", &payload).await?;
    if val.get("success").and_then(Value::as_bool) != Some(true) {
        return Err(val["error"]
            .as_str()
            .unwrap_or("SNMP discover failed")
            .to_string());
    }
    let arr = val["interfaces"].as_array().cloned().unwrap_or_default();
    Ok(arr
        .into_iter()
        .map(|i| SnmpInterfaceItem {
            if_index: i["ifIndex"].as_u64().unwrap_or(0),
            name: i["name"].as_str().unwrap_or("eth0").to_string(),
            descr: i["descr"].as_str().unwrap_or("").to_string(),
        })
        .collect())
}

pub async fn snmp_query_basic(host: &str, port: u16, community: &str) -> Result<Value, String> {
    let payload = json!({
        "host": host,
        "port": port,
        "credentials": { "version": "v2c", "community": community },
        "sensors": [
            { "id": "ping", "name": "Ping", "kind": "ping", "pingPort": 80 },
            { "id": "cpu", "name": "CPU", "kind": "cpu_usage" },
            { "id": "ram", "name": "RAM", "kind": "ram_usage" },
            { "id": "up", "name": "Uptime", "kind": "uptime" }
        ]
    });
    post_json("/api/snmp/query", &payload).await
}

pub async fn bt_search(q: &str) -> Result<Vec<BtSearchResult>, String> {
    let url = format!("/api/download/bt-search?q={}", encode_uri_component(q));
    let val = get_json(&url).await?;
    serde_json::from_value(val["items"].clone()).map_err(|e| e.to_string())
}

pub async fn resolve_download_link(raw_url: &str) -> Result<Value, String> {
    post_json("/api/download/resolve-link", &json!({ "url": raw_url })).await
}

pub async fn fetch_rss_feed(feed_url: &str) -> Result<Vec<RssItem>, String> {
    let url = format!(
        "/api/download/rss-fetch?url={}",
        encode_uri_component(feed_url)
    );
    let val = get_json(&url).await?;
    let arr = val["items"].as_array().cloned().unwrap_or_default();
    Ok(arr
        .into_iter()
        .map(|x| RssItem {
            title: x["title"].as_str().unwrap_or("").to_string(),
            download: x["download"]
                .as_str()
                .or_else(|| x["link"].as_str())
                .unwrap_or("")
                .to_string(),
            pub_date: x["pubDate"].as_str().unwrap_or("").to_string(),
            size: x["size"].as_u64().unwrap_or(0),
            description: x["description"].as_str().unwrap_or("").to_string(),
        })
        .collect())
}

pub async fn generate_report_summary(
    period: &str,
    host_name: &str,
    model: &str,
    dsm_version: &str,
) -> Result<Value, String> {
    let payload = json!({
        "period": period,
        "hostName": host_name,
        "model": model,
        "dsmVersion": dsm_version,
    });
    post_json("/api/reports/summary", &payload).await
}

pub async fn export_report_html(report: &Value) -> Result<String, String> {
    let req = Request::post("/api/reports/export")
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(&json!({ "report": report })).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    let res = req.send().await.map_err(|e| e.to_string())?;
    res.text().await.map_err(|e| e.to_string())
}

pub async fn dispatch_notification(
    channel: &str,
    bot_token: &str,
    chat_id: &str,
    webhook_url: &str,
    message: &str,
) -> Result<Value, String> {
    let payload = json!({
        "channel": channel,
        "botToken": bot_token,
        "chatId": chat_id,
        "webhookUrl": webhook_url,
        "message": message,
    });
    post_json("/api/notifications/dispatch", &payload).await
}

pub async fn fetch_ai_models(
    provider: &str,
    api_key: &str,
    custom_base_url: &str,
) -> Result<Vec<AiModelItem>, String> {
    let payload = json!({
        "provider": provider,
        "apiKey": api_key,
        "customBaseUrl": custom_base_url,
    });
    let val = post_json("/api/ai/models", &payload).await?;
    serde_json::from_value(val["models"].clone()).map_err(|e| e.to_string())
}

pub async fn send_ai_chat(
    provider: &str,
    api_key: &str,
    model: &str,
    custom_base_url: &str,
    messages: &[AiChatMessage],
    telemetry_context: &str,
) -> Result<Value, String> {
    let payload = json!({
        "provider": provider,
        "apiKey": api_key,
        "model": model,
        "customBaseUrl": custom_base_url,
        "messages": messages,
        "telemetryContext": telemetry_context,
    });
    post_json("/api/ai/chat", &payload).await
}
