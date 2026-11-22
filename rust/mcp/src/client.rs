//! Async DSM HTTP/HTTPS & SSH client ported from `mcp/src/dsm/client.ts`.

#![forbid(unsafe_code)]

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use regex::Regex;
use reqwest::header::{COOKIE, ORIGIN, REFERER, USER_AGENT};
use reqwest::multipart;
use serde_json::{Map, Value, json};
use tokio::sync::RwLock;

use crate::mock_data;
use crate::quickconnect::{
    ResolvedTarget, is_quick_connect_id, parse_host_input, resolve_quick_connect,
};
use crate::types::{
    AppNotifyItem, DockerContainer, DownloadTask, DriveInfo, DsmConnectionConfig, DsmProcess,
    DsmSession, FileItem, NotificationItem, PackageItem, ServiceItem, ShareLink, StorageVolume,
    SystemInfo, SystemUtilization, TerminalInfo,
};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as u64)
}

fn now_secs() -> u64 {
    now_ms() / 1000
}

#[derive(Default)]
struct ClientInner {
    config: Option<DsmConnectionConfig>,
    raw_host: String,
    raw_port: String,
    raw_https: bool,
    session: DsmSession,
    resolved_target: Option<ResolvedTarget>,
    notify_strings_cache: Option<Map<String, Value>>,
    notify_strings_expiry: Option<Instant>,
    demo_services: Option<Vec<ServiceItem>>,
    demo_notifications: Option<Vec<NotificationItem>>,
    demo_app_notifications: Option<Vec<AppNotifyItem>>,
}

#[derive(Clone)]
pub struct DsmClient {
    http: reqwest::Client,
    inner: Arc<RwLock<ClientInner>>,
}

impl Default for DsmClient {
    fn default() -> Self {
        Self::new()
    }
}

pub fn sanitize_dsm_uri(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.contains('[')
        && trimmed.contains("](")
        && let Ok(re_md) = Regex::new(r"\((https?://[^\)]+)\)")
        && let Some(cap) = re_md.captures(trimmed)
        && let Some(m) = cap.get(1)
    {
        return m
            .as_str()
            .trim()
            .trim_end_matches([')', ']', '"', ','])
            .to_string();
    }
    if let Ok(re_url) = Regex::new(r#"https?://[^\s\)\]\"]+"#)
        && let Some(m) = re_url.find(trimmed)
    {
        return m
            .as_str()
            .trim_end_matches([')', ']', '"', ','])
            .trim()
            .to_string();
    }
    trimmed
        .trim_matches(['[', ']', '"', '\'', '`'])
        .trim()
        .to_string()
}

fn value_as_f64(v: &Value) -> Option<f64> {
    v.as_f64()
        .or_else(|| v.as_str().and_then(|s| s.trim().parse::<f64>().ok()))
}

fn value_as_u64(v: &Value) -> u64 {
    v.as_u64()
        .or_else(|| v.as_i64().map(|x| x.max(0) as u64))
        .or_else(|| v.as_f64().map(|x| x.max(0.0) as u64))
        .or_else(|| v.as_str().and_then(|s| s.trim().parse::<u64>().ok()))
        .unwrap_or(0)
}

fn value_as_str(v: &Value) -> Option<String> {
    v.as_str().map(ToString::to_string)
}

fn strip_html_tags(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut in_tag = false;
    for ch in input.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                out.push(' ');
            }
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    out
}

fn parse_notification_message(template: &str, msg_json: &str) -> String {
    let Ok(Value::Object(map)) = serde_json::from_str::<Value>(msg_json) else {
        return msg_json.to_string();
    };
    let mut out = template
        .replace("%LINK_BEGIN%", "")
        .replace("%LINK_END%", "")
        .replace("%PRE_APP_LINK%", "")
        .replace("%POST_APP_LINK%", "");
    out = strip_html_tags(&out);
    for (k, v) in map {
        let rep = match &v {
            Value::String(s) => s.clone(),
            other => other.to_string(),
        };
        out = out.replace(&k, &rep);
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn infer_category(class_name: &str, title: &str) -> &'static str {
    let s = format!("{class_name} {title}").to_lowercase();
    if s.contains("storage") {
        "storage"
    } else if s.contains("package") || s.contains("pkgman") {
        "package"
    } else if s.contains("security") || s.contains("scan") {
        "security"
    } else if s.contains("network") {
        "network"
    } else if s.contains("backup") || s.contains("hyper") {
        "backup"
    } else if s.contains("file") || s.contains("download") {
        "file"
    } else if s.contains("app") || s.contains("foto") || s.contains("photo") {
        "app"
    } else {
        "system"
    }
}

fn infer_level(title: &str, msg: &str) -> &'static str {
    let s = format!("{title} {msg}").to_lowercase();
    if s.contains("error")
        || s.contains("fail")
        || s.contains("degraded")
        || s.contains("warning")
        || s.contains("cảnh báo")
        || s.contains("mất kết")
    {
        "warning"
    } else if s.contains("success")
        || s.contains("complete")
        || s.contains("hoàn tất")
        || s.contains("thành công")
    {
        "success"
    } else {
        "info"
    }
}

impl DsmClient {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .danger_accept_invalid_certs(true)
            .timeout(Duration::from_secs(30))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self {
            http,
            inner: Arc::new(RwLock::new(ClientInner::default())),
        }
    }

    pub async fn get_session(&self) -> DsmSession {
        self.inner.read().await.session.clone()
    }

    pub async fn get_config(&self) -> Option<DsmConnectionConfig> {
        self.inner.read().await.config.clone()
    }

    pub async fn ensure_connected(&self) -> Result<DsmSession, String> {
        let session = self.inner.read().await.session.clone();
        if !session.is_connected {
            return Err(
                "Not authenticated. Call dsm_login first (or set DSM_HOST/DSM_USER env)."
                    .to_string(),
            );
        }
        Ok(session)
    }

    async fn ensure_resolved_target(&self) -> Result<ResolvedTarget, String> {
        let (cached, cfg, raw_host, raw_port, raw_https) = {
            let guard = self.inner.read().await;
            if let Some(t) = guard.resolved_target.clone() {
                return Ok(t);
            }
            if guard.config.is_none() && guard.raw_host.is_empty() {
                return Err("No DSM host configured".to_string());
            }
            (
                guard.resolved_target.clone(),
                guard.config.clone(),
                guard.raw_host.clone(),
                guard.raw_port.clone(),
                guard.raw_https,
            )
        };
        if let Some(t) = cached {
            return Ok(t);
        }

        let host = if !raw_host.is_empty() {
            raw_host
        } else {
            cfg.as_ref().map(|c| c.host.clone()).unwrap_or_default()
        };
        let port_str = if !raw_port.is_empty() {
            raw_port
        } else {
            cfg.as_ref()
                .map(|c| c.port.to_string())
                .unwrap_or_else(|| "5000".to_string())
        };
        let is_https = raw_https;
        let parsed = parse_host_input(&host, &port_str, is_https);
        if is_quick_connect_id(&parsed.host)
            && let Some(qc) = resolve_quick_connect(&parsed.host).await
        {
            self.inner.write().await.resolved_target = Some(qc.clone());
            return Ok(qc);
        }
        Ok(parsed)
    }

    async fn dsm_request(
        &self,
        path: &str,
        method: &str,
        params: &[(String, String)],
    ) -> Result<Value, String> {
        let target = self.ensure_resolved_target().await?;
        let scheme = if target.is_https { "https" } else { "http" };
        let origin = format!("{scheme}://{}:{}", target.host, target.port);

        let (sid, did, cookie_extra, syno_token) = {
            let guard = self.inner.read().await;
            (
                guard.session.sid.clone(),
                guard.session.did.clone(),
                guard.session.cookie.clone(),
                guard.session.syno_token.clone(),
            )
        };

        let (url, body_opt) = if method == "GET" {
            let qs = {
                let mut ser = url::form_urlencoded::Serializer::new(String::new());
                for (k, v) in params {
                    ser.append_pair(k, v);
                }
                ser.finish()
            };
            let full = if qs.is_empty() {
                format!("{origin}/webapi/{path}")
            } else {
                format!("{origin}/webapi/{path}?{qs}")
            };
            (full, None)
        } else {
            let body_str = {
                let mut ser = url::form_urlencoded::Serializer::new(String::new());
                for (k, v) in params {
                    ser.append_pair(k, v);
                }
                ser.finish()
            };
            (format!("{origin}/webapi/{path}"), Some(body_str))
        };

        let req_method = if method == "GET" {
            reqwest::Method::GET
        } else {
            reqwest::Method::POST
        };
        let mut req = self
            .http
            .request(req_method, url)
            .header(USER_AGENT, "DSMHelper/MCP 1.0 (Synology DSM)")
            .header("Accept", "*/*")
            .header("Accept-Language", "en-US,en;q=0.8,vi;q=0.6")
            .header(ORIGIN, &origin)
            .header(REFERER, format!("{origin}/"));

        if !sid.is_empty() {
            let mut cookie = format!("id={sid}");
            if let Some(d) = did.as_deref().filter(|s| !s.is_empty()) {
                cookie.push_str(&format!("; did={d}"));
            }
            if let Some(c) = cookie_extra.as_deref().filter(|s| !s.is_empty()) {
                cookie.push_str(&format!("; {c}"));
            }
            req = req.header(COOKIE, cookie);
        }
        if let Some(tok) = syno_token.as_deref().filter(|s| !s.is_empty()) {
            req = req.header("X-SYNO-TOKEN", tok);
        }
        if let Some(b) = body_opt {
            req = req
                .header(
                    reqwest::header::CONTENT_TYPE,
                    "application/x-www-form-urlencoded; charset=UTF-8",
                )
                .body(b);
        }

        let res = req.send().await.map_err(|e| e.to_string())?;
        let mut captured_sid: Option<String> = None;
        let mut captured_did: Option<String> = None;
        let mut captured_token: Option<String> = None;

        for val in res.headers().get_all("set-cookie") {
            if let Ok(sc) = val.to_str() {
                for part in sc.split(';') {
                    let trimmed = part.trim();
                    if let Some(v) = trimmed.strip_prefix("id=") {
                        captured_sid = Some(v.to_string());
                    } else if let Some(v) = trimmed.strip_prefix("did=") {
                        captured_did = Some(v.to_string());
                    } else if let Some(v) = trimmed.strip_prefix("SynoToken=") {
                        captured_token = Some(v.to_string());
                    }
                }
            }
        }
        if let Some(tok) = res
            .headers()
            .get("x-syno-token")
            .or_else(|| res.headers().get("x-syno-token2"))
            .and_then(|v| v.to_str().ok())
        {
            captured_token = Some(tok.to_string());
        }

        let bytes = res.bytes().await.map_err(|e| e.to_string())?;
        let parsed: Value = serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| Value::String(String::from_utf8_lossy(&bytes).into_owned()));

        if let Some(t) = parsed
            .pointer("/data/synotoken")
            .and_then(Value::as_str)
            .map(ToString::to_string)
        {
            captured_token = Some(t);
        }
        if let Some(d) = parsed
            .pointer("/data/did")
            .and_then(Value::as_str)
            .map(ToString::to_string)
        {
            captured_did = Some(d);
        }

        if captured_sid.is_some() || captured_did.is_some() || captured_token.is_some() {
            let mut guard = self.inner.write().await;
            if let Some(s) = captured_sid {
                guard.session.sid = s;
            }
            if let Some(d) = captured_did {
                guard.session.did = Some(d);
            }
            if let Some(t) = captured_token {
                guard.session.syno_token = Some(t);
            }
        }

        Ok(parsed)
    }

    pub async fn login(
        &self,
        config: DsmConnectionConfig,
        is_demo: bool,
    ) -> Result<DsmSession, String> {
        if is_demo {
            let session = DsmSession {
                sid: "demo-session-token-12345".to_string(),
                syno_token: None,
                did: None,
                cookie: None,
                is_connected: true,
                is_demo: true,
                dsm_version: 7,
                version_string: "DSM 7.2.1-69057 (Demo)".to_string(),
                model: "DS920+".to_string(),
                hostname: "Synology-Demo".to_string(),
                account: if config.account.is_empty() {
                    "admin".to_string()
                } else {
                    config.account.clone()
                },
            };
            let mut guard = self.inner.write().await;
            guard.session = session.clone();
            guard.raw_host = config.host.clone();
            guard.raw_port = config.port.to_string();
            guard.raw_https = config.https;
            guard.config = Some(config);
            guard.resolved_target = None;
            guard.demo_services = Some(mock_data::mock_services());
            guard.demo_notifications = Some(mock_data::mock_notifications());
            guard.demo_app_notifications = Some(mock_data::mock_app_notifications());
            return Ok(session);
        }

        {
            let mut guard = self.inner.write().await;
            guard.raw_host = config.host.clone();
            guard.raw_port = config.port.to_string();
            guard.raw_https = config.https;
            guard.config = Some(config.clone());
            guard.resolved_target = None;
        }

        if is_quick_connect_id(&config.host)
            && let Some(qc) = resolve_quick_connect(&config.host).await
        {
            self.inner.write().await.resolved_target = Some(qc);
        }

        let mut auth_versions = vec![6u8, 4, 3, 2];
        if let Ok(api_info) = self
            .dsm_request(
                "query.cgi",
                "GET",
                &[
                    ("api".into(), "SYNO.API.Info".into()),
                    ("method".into(), "query".into()),
                    ("version".into(), "1".into()),
                    ("query".into(), "all".into()),
                ],
            )
            .await
            && let Some(max) = api_info
                .pointer("/data/SYNO.API.Auth/maxVersion")
                .and_then(Value::as_u64)
                .map(|v| v as u8)
        {
            auth_versions = vec![max, 6, 4, 3, 2];
            auth_versions.sort_unstable_by(|a, b| b.cmp(a));
            auth_versions.dedup();
        }

        let mut last_error = "Không thể xác thực với Synology DSM".to_string();
        for ver in auth_versions {
            let mut params = vec![
                ("account".into(), config.account.clone()),
                ("passwd".into(), config.password.clone().unwrap_or_default()),
                ("version".into(), ver.to_string()),
                ("api".into(), "SYNO.API.Auth".into()),
                ("method".into(), "login".into()),
                ("session".into(), "Core".into()),
                ("enable_device_token".into(), "yes".into()),
                ("enable_sync_token".into(), "yes".into()),
                ("isIframeLogin".into(), "yes".into()),
            ];
            if let Some(otp) = config
                .otp
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                params.push(("otp_code".into(), otp.to_string()));
            }
            match self.dsm_request("auth.cgi", "GET", &params).await {
                Ok(data) if data.get("success").and_then(Value::as_bool) == Some(true) => {
                    let sid = data
                        .pointer("/data/sid")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string();
                    let syno_token = data
                        .pointer("/data/synotoken")
                        .and_then(Value::as_str)
                        .filter(|s| !s.is_empty())
                        .map(ToString::to_string);
                    let did = data
                        .pointer("/data/did")
                        .and_then(Value::as_str)
                        .filter(|s| !s.is_empty())
                        .map(ToString::to_string);

                    let mut session = DsmSession {
                        sid,
                        syno_token,
                        did,
                        cookie: None,
                        is_connected: true,
                        is_demo: false,
                        dsm_version: if ver >= 6 { 7 } else { 6 },
                        version_string: if ver >= 6 {
                            "DSM 7.x".to_string()
                        } else {
                            "DSM 6.x".to_string()
                        },
                        model: "Synology NAS".to_string(),
                        hostname: config.host.clone(),
                        account: config.account.clone(),
                    };
                    self.inner.write().await.session = session.clone();
                    if let Ok(info) = self.get_system_info().await {
                        session.model = info.model;
                        session.version_string = info.version;
                        let mut guard = self.inner.write().await;
                        guard.session.model = session.model.clone();
                        guard.session.version_string = session.version_string.clone();
                    }
                    return Ok(session);
                }
                Ok(data) if data.pointer("/error/code").is_some() => {
                    let code = data
                        .pointer("/error/code")
                        .and_then(Value::as_i64)
                        .unwrap_or(0);
                    let has_otp = config
                        .otp
                        .as_deref()
                        .map(str::trim)
                        .is_some_and(|s| !s.is_empty());
                    match code {
                        400 => return Err("Tài khoản hoặc mật khẩu không chính xác (400).".into()),
                        401 => return Err("Tài khoản đã bị khóa hoặc vô hiệu hóa (401).".into()),
                        402 => return Err("Quyền truy cập bị từ chối (402).".into()),
                        403 | 406 => {
                            if has_otp {
                                return Err(
                                    "Mã OTP không chính xác hoặc đã hết hạn (403/406).".into()
                                );
                            }
                            return Err(
                                "Tài khoản yêu cầu mã OTP 6 chữ số (403). Vui lòng nhập otp_code."
                                    .into(),
                            );
                        }
                        404 => {
                            if has_otp {
                                return Err("Mã OTP không đúng hoặc đã hết hạn (404).".into());
                            }
                            continue;
                        }
                        101 => continue,
                        _ => {
                            if let Some(m) = data.pointer("/error/message").and_then(Value::as_str)
                            {
                                last_error = m.to_string();
                            }
                        }
                    }
                }
                Ok(_) => {}
                Err(e) => last_error = e,
            }
        }
        Err(last_error)
    }

    pub async fn logout(&self) {
        let mut guard = self.inner.write().await;
        guard.session = DsmSession::default();
        guard.resolved_target = None;
    }

    pub async fn post_entry(
        &self,
        api: &str,
        method: &str,
        version: u32,
        extra: &[(String, String)],
    ) -> Result<Value, String> {
        let session = self.ensure_connected().await?;
        if session.is_demo {
            return Err("Demo mode: not connected to real DSM".to_string());
        }
        let mut params = vec![
            ("api".to_string(), api.to_string()),
            ("method".to_string(), method.to_string()),
            ("version".to_string(), version.to_string()),
            ("_sid".to_string(), session.sid),
        ];
        params.extend(extra.iter().cloned());
        self.dsm_request("entry.cgi", "POST", &params).await
    }

    pub async fn get_system_info(&self) -> Result<SystemInfo, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(mock_data::mock_system_info());
        }
        if let Ok(data) = self.post_entry("SYNO.Core.System", "info", 1, &[]).await
            && data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(d) = data.get("data")
        {
            let parts: Vec<&str> = ["cpu_vendor", "cpu_family", "cpu_series"]
                .iter()
                .filter_map(|k| d.get(*k).and_then(Value::as_str))
                .filter(|st| !st.is_empty())
                .collect();
            let mut cpu_str = if parts.is_empty() {
                "Intel Celeron J4125".to_string()
            } else {
                parts.join(" ")
            };
            if let Some(spd) = d.get("cpu_clock_speed").and_then(value_as_f64) {
                cpu_str.push_str(&format!(" @ {:.1} GHz", spd / 1000.0));
            }
            let total_ram = d
                .get("ram_size")
                .or_else(|| d.get("ram"))
                .map(value_as_u64)
                .filter(|&r| r > 0)
                .unwrap_or(65_536);
            let uptime = d
                .get("uptime")
                .and_then(Value::as_u64)
                .or_else(|| {
                    d.get("up_time").and_then(Value::as_str).and_then(|st| {
                        let p: Vec<u64> = st.split(':').filter_map(|x| x.parse().ok()).collect();
                        (p.len() == 3).then(|| p[0] * 3600 + p[1] * 60 + p[2])
                    })
                })
                .unwrap_or(846_200);
            let model = d
                .get("model")
                .and_then(Value::as_str)
                .unwrap_or(&s.model)
                .to_string();
            let version = d
                .get("firmware_ver")
                .and_then(Value::as_str)
                .unwrap_or("DSM 7.2.2")
                .to_string();
            return Ok(SystemInfo {
                model,
                serial: d
                    .get("serial")
                    .and_then(Value::as_str)
                    .unwrap_or("N/A")
                    .to_string(),
                version,
                uptime,
                temperature: d
                    .get("sys_temp")
                    .or_else(|| d.get("temperature"))
                    .and_then(Value::as_i64)
                    .unwrap_or(45),
                time: d
                    .get("time")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string(),
                ram_total: total_ram,
                ram_used: total_ram / 9,
                cpu_model: cpu_str,
                cpu_cores: d.get("cpu_cores").map(value_as_u64).unwrap_or(4) as u32,
            });
        }
        Ok(mock_data::mock_system_info())
    }

    pub async fn get_utilization(&self) -> Result<SystemUtilization, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(mock_data::get_mock_utilization());
        }
        if let Ok(data) = self
            .post_entry(
                "SYNO.Core.System.Utilization",
                "get",
                1,
                &[("type".into(), "\"current\"".into())],
            )
            .await
            && data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(d) = data.get("data")
        {
            let rx: u64 = d
                .get("network")
                .and_then(Value::as_array)
                .map(|a| a.iter().filter_map(|n| n.get("rx")).map(value_as_u64).sum())
                .unwrap_or(0);
            let tx: u64 = d
                .get("network")
                .and_then(Value::as_array)
                .map(|a| a.iter().filter_map(|n| n.get("tx")).map(value_as_u64).sum())
                .unwrap_or(0);
            let disk_r: u64 = d
                .pointer("/disk/disk")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter_map(|n| n.get("read_byte"))
                        .map(value_as_u64)
                        .sum()
                })
                .unwrap_or(0);
            let disk_w: u64 = d
                .pointer("/disk/disk")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter_map(|n| n.get("write_byte"))
                        .map(value_as_u64)
                        .sum()
                })
                .unwrap_or(0);
            let mem_pct = d
                .pointer("/memory/real_usage")
                .map(value_as_u64)
                .unwrap_or(0);
            let total_mb = d
                .pointer("/memory/memory_size")
                .or_else(|| d.pointer("/memory/total_real"))
                .map(|v| value_as_u64(v) / 1024)
                .filter(|&x| x > 0)
                .unwrap_or(65_536);
            let used_mb = match (
                d.pointer("/memory/total_real").map(value_as_u64),
                d.pointer("/memory/avail_real").map(value_as_u64),
            ) {
                (Some(t), Some(a)) if t > a => (t - a) / 1024,
                _ => ((mem_pct as f64 / 100.0) * total_mb as f64).round() as u64,
            };
            let cpu_pct = d.pointer("/cpu/user_load").map(value_as_u64).unwrap_or(0)
                + d.pointer("/cpu/system_load").map(value_as_u64).unwrap_or(0);
            return Ok(SystemUtilization {
                cpu_percent: cpu_pct,
                memory_percent: mem_pct,
                memory_used_mb: used_mb,
                memory_total_mb: total_mb,
                network_rx_bytes: rx,
                network_tx_bytes: tx,
                disk_read_bytes: disk_r,
                disk_write_bytes: disk_w,
                timestamp: now_ms(),
            });
        }
        Ok(mock_data::get_mock_utilization())
    }

    pub async fn get_processes(&self) -> Result<Vec<DsmProcess>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(mock_data::mock_processes());
        }
        if let Ok(data) = self
            .post_entry(
                "SYNO.Core.System.Process",
                "list",
                1,
                &[
                    ("limit".into(), "100".into()),
                    ("offset".into(), "0".into()),
                    ("sort_by".into(), "\"cpu\"".into()),
                    ("sort_direction".into(), "\"DESC\"".into()),
                ],
            )
            .await
            && data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(procs) = data.pointer("/data/process").and_then(Value::as_array)
        {
            return Ok(procs
                .iter()
                .map(|p| {
                    let ram = p
                        .get("mem_kb")
                        .or_else(|| p.get("res"))
                        .or_else(|| p.get("mem"))
                        .map(|v| value_as_u64(v) * 1024)
                        .or_else(|| p.get("memory").map(value_as_u64))
                        .unwrap_or(0);
                    let raw_cpu = p.get("cpu").and_then(value_as_f64).unwrap_or(0.0);
                    DsmProcess {
                        pid: p.get("pid").map(value_as_u64).unwrap_or(0),
                        name: p
                            .get("command")
                            .or_else(|| p.get("name"))
                            .and_then(Value::as_str)
                            .unwrap_or("process")
                            .to_string(),
                        cpu: if raw_cpu > 100.0 {
                            raw_cpu / 10.0
                        } else {
                            raw_cpu
                        },
                        memory: ram,
                        user: p
                            .get("user")
                            .and_then(Value::as_str)
                            .unwrap_or("root")
                            .to_string(),
                        status: p
                            .get("status")
                            .and_then(Value::as_str)
                            .unwrap_or("R")
                            .to_string(),
                    }
                })
                .collect());
        }
        Ok(mock_data::mock_processes())
    }

    pub async fn power_action(&self, method: &str, force: bool) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(true);
        }
        let data = self
            .post_entry(
                "SYNO.Core.System",
                method,
                1,
                &[
                    ("force".into(), force.to_string()),
                    ("local".into(), "true".into()),
                ],
            )
            .await?;
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    pub async fn list_shares(&self) -> Result<Vec<FileItem>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(mock_data::mock_files_map().remove("/").unwrap_or_default());
        }
        if let Ok(data) = self
            .post_entry(
                "SYNO.FileStation.List",
                "list_share",
                2,
                &[
                    (
                        "additional".into(),
                        json!(["perm", "time", "size", "owner", "real_path"]).to_string(),
                    ),
                    ("limit".into(), "1000".into()),
                    ("offset".into(), "0".into()),
                    ("sort_by".into(), "\"name\"".into()),
                    ("sort_direction".into(), "\"asc\"".into()),
                ],
            )
            .await
            && data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(shares) = data.pointer("/data/shares").and_then(Value::as_array)
        {
            return Ok(shares
                .iter()
                .map(|sh| FileItem {
                    path: sh
                        .get("path")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    name: sh
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    isdir: true,
                    size: sh
                        .pointer("/additional/size")
                        .map(value_as_u64)
                        .unwrap_or(0),
                    mtime: sh
                        .pointer("/additional/time/mtime")
                        .map(value_as_u64)
                        .unwrap_or(0)
                        * 1000,
                    owner: Some(
                        sh.pointer("/additional/owner/user")
                            .and_then(Value::as_str)
                            .unwrap_or("admin")
                            .to_string(),
                    ),
                    filetype: None,
                    perm: Some(
                        sh.pointer("/additional/perm/posix")
                            .and_then(value_as_str)
                            .unwrap_or_else(|| "0755".to_string()),
                    ),
                    real_path: sh
                        .pointer("/additional/real_path")
                        .and_then(Value::as_str)
                        .map(ToString::to_string),
                    item_count: None,
                    mime_type: None,
                    content: None,
                })
                .collect());
        }
        Ok(mock_data::mock_files_map().remove("/").unwrap_or_default())
    }

    pub async fn list_files(&self, folder_path: &str) -> Result<Vec<FileItem>, String> {
        let s = self.ensure_connected().await?;
        if folder_path == "/" || folder_path.is_empty() {
            return self.list_shares().await;
        }
        if s.is_demo {
            return Ok(mock_data::mock_files_map()
                .remove(folder_path)
                .unwrap_or_default());
        }
        if let Ok(data) = self
            .post_entry(
                "SYNO.FileStation.List",
                "list",
                2,
                &[
                    ("folder_path".into(), json!(folder_path).to_string()),
                    (
                        "additional".into(),
                        json!(["perm", "time", "size", "owner", "real_path", "type"]).to_string(),
                    ),
                    ("limit".into(), "5000".into()),
                    ("offset".into(), "0".into()),
                    ("sort_by".into(), "\"name\"".into()),
                    ("sort_direction".into(), "\"asc\"".into()),
                ],
            )
            .await
            && data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(files) = data.pointer("/data/files").and_then(Value::as_array)
        {
            return Ok(files
                .iter()
                .map(|f| FileItem {
                    path: f
                        .get("path")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    name: f
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    isdir: f.get("isdir").and_then(Value::as_bool).unwrap_or(false),
                    size: f.pointer("/additional/size").map(value_as_u64).unwrap_or(0),
                    mtime: f
                        .pointer("/additional/time/mtime")
                        .map(value_as_u64)
                        .unwrap_or(0)
                        * 1000,
                    owner: Some(
                        f.pointer("/additional/owner/user")
                            .and_then(Value::as_str)
                            .unwrap_or("admin")
                            .to_string(),
                    ),
                    filetype: None,
                    perm: Some(
                        f.pointer("/additional/perm/posix")
                            .and_then(value_as_str)
                            .unwrap_or_else(|| "0644".to_string()),
                    ),
                    real_path: f
                        .pointer("/additional/real_path")
                        .and_then(Value::as_str)
                        .map(ToString::to_string),
                    item_count: None,
                    mime_type: None,
                    content: None,
                })
                .collect());
        }
        Ok(mock_data::mock_files_map()
            .remove(folder_path)
            .unwrap_or_default())
    }

    pub async fn create_folder(&self, folder_path: &str, name: &str) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(true);
        }
        let data = self
            .post_entry(
                "SYNO.FileStation.CreateFolder",
                "create",
                2,
                &[
                    ("folder_path".into(), json!(folder_path).to_string()),
                    ("name".into(), json!(name).to_string()),
                    ("force_parent".into(), "false".into()),
                ],
            )
            .await?;
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    pub async fn delete_file(&self, file_path: &str) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(true);
        }
        let data = self
            .post_entry(
                "SYNO.FileStation.Delete",
                "start",
                2,
                &[
                    ("path".into(), json!([file_path]).to_string()),
                    ("accurate_progress".into(), "true".into()),
                ],
            )
            .await?;
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    pub async fn rename_file(&self, file_path: &str, new_name: &str) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(true);
        }
        let data = self
            .post_entry(
                "SYNO.FileStation.Rename",
                "rename",
                2,
                &[
                    ("path".into(), json!(file_path).to_string()),
                    ("name".into(), json!(new_name).to_string()),
                ],
            )
            .await?;
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    pub async fn get_file_content(&self, file_path: &str) -> Result<Vec<u8>, String> {
        let session = self.ensure_connected().await?;
        if session.is_demo {
            return Ok(b"# Demo file content\nname: dsm-service\n".to_vec());
        }
        let target = self.ensure_resolved_target().await?;
        let scheme = if target.is_https { "https" } else { "http" };
        let qs = {
            let mut ser = url::form_urlencoded::Serializer::new(String::new());
            ser.append_pair("api", "SYNO.FileStation.Download");
            ser.append_pair("version", "2");
            ser.append_pair("method", "download");
            ser.append_pair("path", file_path);
            ser.append_pair("mode", "open");
            ser.append_pair("_sid", &session.sid);
            ser.finish()
        };
        let url = format!(
            "{scheme}://{}:{}/webapi/entry.cgi?{qs}",
            target.host, target.port
        );
        let mut req = self
            .http
            .get(url)
            .header(COOKIE, format!("id={}", session.sid));
        if let Some(tok) = session.syno_token.as_deref().filter(|s| !s.is_empty()) {
            req = req.header("X-SYNO-TOKEN", tok);
        }
        let res = req.send().await.map_err(|e| e.to_string())?;
        Ok(res.bytes().await.map_err(|e| e.to_string())?.to_vec())
    }

    pub async fn upload_file(
        &self,
        folder_path: &str,
        file_name: &str,
        content: Vec<u8>,
    ) -> Result<bool, String> {
        let session = self.ensure_connected().await?;
        if session.is_demo {
            return Ok(true);
        }
        let target = self.ensure_resolved_target().await?;
        let scheme = if target.is_https { "https" } else { "http" };
        let url = format!(
            "{scheme}://{}:{}/webapi/entry.cgi?_sid={}",
            target.host, target.port, session.sid
        );
        let part = multipart::Part::bytes(content)
            .file_name(file_name.to_string())
            .mime_str("application/octet-stream")
            .map_err(|e| e.to_string())?;
        let form = multipart::Form::new()
            .text("api", "SYNO.FileStation.Upload")
            .text("version", "2")
            .text("method", "upload")
            .text("path", folder_path.to_string())
            .text("create_parents", "true")
            .text("overwrite", "true")
            .part("file", part);

        let mut req = self
            .http
            .post(url)
            .header(COOKIE, format!("id={}", session.sid))
            .multipart(form);
        if let Some(tok) = session.syno_token.as_deref().filter(|s| !s.is_empty()) {
            req = req.header("X-SYNO-TOKEN", tok);
        }
        let res = req.send().await.map_err(|e| e.to_string())?;
        let data: Value = res
            .json()
            .await
            .unwrap_or_else(|_| json!({ "success": false }));
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    pub async fn search_files(
        &self,
        folder_path: &str,
        pattern: &str,
        recursive: bool,
    ) -> Result<Value, String> {
        let session = self.ensure_connected().await?;
        if session.is_demo {
            return Ok(json!({ "success": true, "data": { "files": [] } }));
        }
        let start = self
            .post_entry(
                "SYNO.FileStation.Search",
                "start",
                2,
                &[
                    ("folder_path".into(), json!(folder_path).to_string()),
                    ("pattern".into(), json!(pattern).to_string()),
                    ("recursive".into(), recursive.to_string()),
                    ("search_content".into(), "false".into()),
                    ("search_type".into(), json!("simple").to_string()),
                ],
            )
            .await?;
        let Some(task_id) = start.pointer("/data/taskid").and_then(Value::as_str) else {
            return Ok(start);
        };
        tokio::time::sleep(Duration::from_millis(600)).await;
        self.post_entry(
            "SYNO.FileStation.Search",
            "list",
            2,
            &[
                ("taskid".into(), task_id.to_string()),
                ("offset".into(), "0".into()),
                ("limit".into(), "100".into()),
                ("sort_by".into(), json!("name").to_string()),
                ("sort_direction".into(), json!("asc").to_string()),
                (
                    "additional".into(),
                    json!(["real_path", "size", "owner", "time", "perm", "type"]).to_string(),
                ),
            ],
        )
        .await
    }

    pub async fn create_share_link(
        &self,
        path: &str,
        password: Option<&str>,
        expire_date: Option<&str>,
    ) -> Result<ShareLink, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(ShareLink {
                id: "demo123".into(),
                url: "https://demo.quickconnect.to/sharing/demo123".into(),
                path: path.into(),
                name: path.rsplit('/').next().unwrap_or("Shared").to_string(),
                date_expired: Some(expire_date.unwrap_or("2026-12-31").to_string()),
                has_password: Some(password.is_some()),
            });
        }
        let mut extra = vec![("path".into(), json!([path]).to_string())];
        if let Some(p) = password.filter(|x| !x.is_empty()) {
            extra.push(("password".into(), json!(p).to_string()));
        }
        if let Some(e) = expire_date.filter(|x| !x.is_empty()) {
            extra.push(("date_expired".into(), json!(e).to_string()));
        }
        let data = self
            .post_entry("SYNO.FileStation.Sharing", "create", 3, &extra)
            .await?;
        if data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(item) = data
                .pointer("/data/links")
                .and_then(Value::as_array)
                .and_then(|a| a.first())
        {
            let target = self.ensure_resolved_target().await?;
            let base_url = format!(
                "{}://{}:{}",
                if target.is_https { "https" } else { "http" },
                target.host,
                target.port
            );
            let id = item
                .get("id")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let raw_url = item.get("url").and_then(Value::as_str).unwrap_or("");
            let url = if raw_url.starts_with('/') {
                format!("{base_url}{raw_url}")
            } else if raw_url.starts_with("http") {
                raw_url.to_string()
            } else {
                format!("{base_url}/sharing/{id}")
            };
            return Ok(ShareLink {
                id,
                url,
                path: path.into(),
                name: path.rsplit('/').next().unwrap_or("Shared").to_string(),
                date_expired: Some(
                    item.get("date_expired")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                ),
                has_password: Some(password.is_some()),
            });
        }
        Err(data
            .pointer("/error/message")
            .and_then(Value::as_str)
            .unwrap_or("Không thể tạo liên kết chia sẻ")
            .to_string())
    }

    pub async fn list_share_links(&self) -> Result<Vec<ShareLink>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(vec![ShareLink {
                id: "demo123".into(),
                url: "https://demo.quickconnect.to/sharing/demo123".into(),
                path: "/docker/docker-compose.yml".into(),
                name: "docker-compose.yml".into(),
                date_expired: Some("2026-12-31".into()),
                has_password: Some(false),
            }]);
        }
        if let Ok(data) = self
            .post_entry(
                "SYNO.FileStation.Sharing",
                "list",
                3,
                &[
                    ("offset".into(), "0".into()),
                    ("limit".into(), "100".into()),
                ],
            )
            .await
            && data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(links) = data.pointer("/data/links").and_then(Value::as_array)
        {
            let target = self.ensure_resolved_target().await?;
            let base_url = format!(
                "{}://{}:{}",
                if target.is_https { "https" } else { "http" },
                target.host,
                target.port
            );
            return Ok(links
                .iter()
                .map(|l| {
                    let id = l
                        .get("id")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string();
                    let path = l
                        .get("path")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string();
                    let raw_url = l.get("url").and_then(Value::as_str).unwrap_or("");
                    let url = if raw_url.starts_with("http") {
                        raw_url.to_string()
                    } else if !raw_url.is_empty() {
                        format!("{base_url}{raw_url}")
                    } else {
                        format!("{base_url}/sharing/{id}")
                    };
                    ShareLink {
                        name: path.rsplit('/').next().unwrap_or(&id).to_string(),
                        id,
                        url,
                        path,
                        date_expired: Some(
                            l.get("date_expired")
                                .and_then(Value::as_str)
                                .unwrap_or("")
                                .to_string(),
                        ),
                        has_password: Some(
                            l.get("has_password")
                                .and_then(Value::as_bool)
                                .unwrap_or(false),
                        ),
                    }
                })
                .collect());
        }
        Ok(Vec::new())
    }

    pub async fn delete_share_link(&self, id: &str) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(true);
        }
        let data = self
            .post_entry(
                "SYNO.FileStation.Sharing",
                "delete",
                3,
                &[("id".into(), json!([id]).to_string())],
            )
            .await?;
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    pub async fn get_docker_containers(&self) -> Result<Vec<DockerContainer>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(mock_data::mock_docker_containers());
        }
        if let Ok(data) = self
            .post_entry(
                "SYNO.Docker.Container",
                "list",
                1,
                &[
                    ("limit".into(), "-1".into()),
                    ("offset".into(), "0".into()),
                    ("type".into(), "\"all\"".into()),
                ],
            )
            .await
            && data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(containers) = data.pointer("/data/containers").and_then(Value::as_array)
        {
            let mut res_map: HashMap<String, (f64, String)> = HashMap::new();
            if let Ok(rdata) = self
                .post_entry("SYNO.Docker.Container.Resource", "get", 1, &[])
                .await
                && rdata.get("success").and_then(Value::as_bool) == Some(true)
                && let Some(resources) = rdata.pointer("/data/resources").and_then(Value::as_array)
            {
                for r in resources {
                    if let Some(name) = r.get("name").and_then(Value::as_str) {
                        let cpu = r.get("cpu").and_then(value_as_f64).unwrap_or(0.0);
                        let cpu_val = (cpu * 10.0).round() / 10.0;
                        let mem_mb = r.get("memory").map(value_as_u64).unwrap_or(0) / 1024 / 1024;
                        res_map.insert(name.to_string(), (cpu_val, format!("{mem_mb} MB")));
                    }
                }
            }
            return Ok(containers
                .iter()
                .map(|c| {
                    let name = c
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string();
                    let (cpu_usage, memory_usage) =
                        res_map.get(&name).cloned().unwrap_or_else(|| {
                            let cpu = (c.get("cpu").and_then(value_as_f64).unwrap_or(0.0) * 10.0)
                                .round()
                                / 10.0;
                            let mem_mb =
                                c.get("memory").map(value_as_u64).unwrap_or(0) / 1024 / 1024;
                            (cpu, format!("{mem_mb} MB"))
                        });
                    let ports = c
                        .get("port_bindings")
                        .and_then(Value::as_object)
                        .map(|o| o.keys().cloned().collect())
                        .unwrap_or_default();
                    DockerContainer {
                        id: c
                            .get("id")
                            .and_then(Value::as_str)
                            .unwrap_or(&name)
                            .to_string(),
                        name,
                        image: c
                            .get("image")
                            .and_then(Value::as_str)
                            .unwrap_or("")
                            .to_string(),
                        status: if c.get("status").and_then(Value::as_str) == Some("running") {
                            "running".into()
                        } else {
                            "stopped".into()
                        },
                        created: c
                            .get("created")
                            .and_then(Value::as_str)
                            .unwrap_or("")
                            .to_string(),
                        ports,
                        cpu_usage,
                        memory_usage,
                    }
                })
                .collect());
        }
        Ok(mock_data::mock_docker_containers())
    }

    pub async fn toggle_docker_container(&self, name: &str, action: &str) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(true);
        }
        let method = match action {
            "start" => "start",
            "stop" => "stop",
            _ => "restart",
        };
        let data = self
            .post_entry(
                "SYNO.Docker.Container",
                method,
                1,
                &[("name".into(), json!(name).to_string())],
            )
            .await?;
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    pub async fn get_download_tasks(&self) -> Result<Vec<DownloadTask>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(mock_data::mock_download_tasks());
        }
        let mut data = self
            .post_entry(
                "SYNO.DownloadStation2.Task",
                "list",
                2,
                &[
                    (
                        "additional".into(),
                        json!(["detail", "transfer"]).to_string(),
                    ),
                    ("limit".into(), "500".into()),
                    ("offset".into(), "0".into()),
                ],
            )
            .await
            .unwrap_or(Value::Null);
        if data.get("success").and_then(Value::as_bool) != Some(true) {
            data = self
                .post_entry(
                    "SYNO.DownloadStation.Task",
                    "list",
                    1,
                    &[(
                        "additional".into(),
                        json!(["detail", "transfer"]).to_string(),
                    )],
                )
                .await
                .unwrap_or(Value::Null);
        }
        if let Some(tasks) = data
            .pointer("/data/tasks")
            .or_else(|| data.pointer("/data/task"))
            .and_then(Value::as_array)
        {
            return Ok(tasks
                .iter()
                .map(|t| {
                    let dl = t
                        .pointer("/additional/transfer/size_downloaded")
                        .or_else(|| t.pointer("/additional/transfer/downloaded"))
                        .map(value_as_u64)
                        .unwrap_or(0);
                    let total = t.get("size").map(value_as_u64).unwrap_or(0);
                    let raw_st = t.get("status").and_then(Value::as_str).unwrap_or("");
                    let status = match raw_st {
                        "downloading" | "waiting" => "downloading",
                        "finished" | "complete" => "finished",
                        _ => "paused",
                    };
                    let progress = (dl.saturating_mul(100))
                        .checked_div(total)
                        .unwrap_or(if raw_st == "finished" { 100 } else { 0 });
                    DownloadTask {
                        id: t
                            .get("id")
                            .and_then(Value::as_str)
                            .unwrap_or("")
                            .to_string(),
                        title: t
                            .get("title")
                            .or_else(|| t.get("filename"))
                            .and_then(Value::as_str)
                            .unwrap_or("Download Task")
                            .to_string(),
                        size: total,
                        status: status.into(),
                        progress,
                        download_speed: t
                            .pointer("/additional/transfer/speed_download")
                            .or_else(|| t.pointer("/additional/transfer/download_rate"))
                            .map(value_as_u64)
                            .unwrap_or(0),
                        upload_speed: t
                            .pointer("/additional/transfer/speed_upload")
                            .or_else(|| t.pointer("/additional/transfer/upload_rate"))
                            .map(value_as_u64)
                            .unwrap_or(0),
                        task_type: t
                            .get("type")
                            .and_then(Value::as_str)
                            .unwrap_or("HTTP")
                            .to_string(),
                    }
                })
                .collect());
        }
        Ok(mock_data::mock_download_tasks())
    }

    pub async fn add_download_task(
        &self,
        raw_uri: &str,
        destination: Option<&str>,
    ) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(true);
        }
        let uri = sanitize_dsm_uri(raw_uri);
        let clean_dest = destination.map(str::trim).unwrap_or("");
        let mut params = vec![
            ("type".into(), "url".into()),
            ("create_list".into(), "true".into()),
            ("url".into(), json!([uri]).to_string()),
        ];
        if !clean_dest.is_empty() {
            params.push(("destination".into(), clean_dest.to_string()));
        }
        let mut data = self
            .post_entry("SYNO.DownloadStation2.Task", "create", 2, &params)
            .await
            .unwrap_or(Value::Null);
        if data.get("success").and_then(Value::as_bool) != Some(true) && clean_dest.starts_with('/')
        {
            data = self
                .post_entry(
                    "SYNO.DownloadStation2.Task",
                    "create",
                    2,
                    &[
                        ("type".into(), "url".into()),
                        ("create_list".into(), "true".into()),
                        ("url".into(), json!([uri]).to_string()),
                        (
                            "destination".into(),
                            clean_dest.trim_start_matches('/').to_string(),
                        ),
                    ],
                )
                .await
                .unwrap_or(Value::Null);
        }
        if data.get("success").and_then(Value::as_bool) != Some(true) {
            data = self
                .post_entry(
                    "SYNO.DownloadStation.Task",
                    "create",
                    1,
                    &[
                        ("uri".into(), uri),
                        ("destination".into(), clean_dest.to_string()),
                    ],
                )
                .await
                .unwrap_or(Value::Null);
        }
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    pub async fn toggle_download_task(&self, id: &str, action: &str) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(true);
        }
        let method = match action {
            "pause" => "pause",
            "resume" => "resume",
            _ => "delete",
        };
        let mut data = self
            .post_entry(
                "SYNO.DownloadStation2.Task",
                method,
                2,
                &[("id".into(), json!([id]).to_string())],
            )
            .await
            .unwrap_or(Value::Null);
        if data.get("success").and_then(Value::as_bool) != Some(true) {
            data = self
                .post_entry(
                    "SYNO.DownloadStation.Task",
                    method,
                    1,
                    &[("id".into(), id.to_string())],
                )
                .await
                .unwrap_or(Value::Null);
        }
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    pub async fn get_storage_volumes(&self) -> Result<Vec<StorageVolume>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(mock_data::mock_storage_volumes());
        }
        if let Ok(res) = self
            .post_entry("SYNO.Storage.CGI.Storage", "load_info", 1, &[])
            .await
            && res.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(vols) = res.pointer("/data/volumes").and_then(Value::as_array)
        {
            let mut disk_map: HashMap<String, Value> = HashMap::new();
            if let Some(disks) = res.pointer("/data/disks").and_then(Value::as_array) {
                for d in disks {
                    if let Some(key) = d
                        .get("id")
                        .or_else(|| d.get("name"))
                        .and_then(Value::as_str)
                    {
                        disk_map.insert(key.to_string(), d.clone());
                    }
                }
            }
            return Ok(vols
                .iter()
                .map(|v| {
                    let total = v
                        .pointer("/size/total")
                        .or_else(|| v.get("total_size"))
                        .map(value_as_u64)
                        .unwrap_or(0);
                    let used = v
                        .pointer("/size/used")
                        .or_else(|| v.get("used_size"))
                        .map(value_as_u64)
                        .unwrap_or(0);
                    let free = total.saturating_sub(used);
                    let num_id = v.get("num_id").map(value_as_u64).unwrap_or(1);
                    let drives = v
                        .get("disks")
                        .and_then(Value::as_array)
                        .map(|arr| {
                            arr.iter()
                                .enumerate()
                                .map(|(idx, dn)| {
                                    let d_obj = dn
                                        .as_str()
                                        .and_then(|k| disk_map.get(k))
                                        .cloned()
                                        .unwrap_or(Value::Null);
                                    DriveInfo {
                                        slot: (idx + 1) as u32,
                                        model: d_obj
                                            .get("model")
                                            .or_else(|| d_obj.get("vendor"))
                                            .and_then(Value::as_str)
                                            .map(ToString::to_string)
                                            .unwrap_or_else(|| format!("Ổ đĩa {}", idx + 1)),
                                        serial: d_obj
                                            .get("serial")
                                            .and_then(Value::as_str)
                                            .unwrap_or("N/A")
                                            .to_string(),
                                        status: if d_obj.get("status").and_then(Value::as_str)
                                            == Some("normal")
                                        {
                                            "normal".into()
                                        } else {
                                            "warning".into()
                                        },
                                        temp: d_obj
                                            .get("temp")
                                            .and_then(Value::as_i64)
                                            .unwrap_or(38),
                                        size: d_obj
                                            .get("size_total_byte")
                                            .map(value_as_u64)
                                            .filter(|&sz| sz > 0)
                                            .unwrap_or(4_000_000_000_000),
                                        health: if d_obj.get("smart_status").and_then(Value::as_str)
                                            == Some("normal")
                                        {
                                            "Bình thường".into()
                                        } else {
                                            "Cần kiểm tra".into()
                                        },
                                    }
                                })
                                .collect()
                        })
                        .unwrap_or_default();
                    StorageVolume {
                        id: v
                            .get("id")
                            .and_then(Value::as_str)
                            .map(ToString::to_string)
                            .unwrap_or_else(|| format!("volume_{num_id}")),
                        name: v
                            .get("display_name")
                            .or_else(|| v.get("name"))
                            .and_then(Value::as_str)
                            .map(ToString::to_string)
                            .unwrap_or_else(|| format!("Volume {num_id}")),
                        path: v
                            .get("volume_path")
                            .and_then(Value::as_str)
                            .map(ToString::to_string)
                            .unwrap_or_else(|| format!("/volume{num_id}")),
                        fs_type: v
                            .get("fs_type")
                            .and_then(Value::as_str)
                            .unwrap_or("btrfs")
                            .to_uppercase(),
                        total_bytes: total,
                        used_bytes: used,
                        free_bytes: free,
                        status: if v.get("status").and_then(Value::as_str) == Some("normal") {
                            "normal".into()
                        } else {
                            "warning".into()
                        },
                        drives,
                    }
                })
                .collect());
        }
        Ok(mock_data::mock_storage_volumes())
    }

    pub async fn get_packages(&self) -> Result<Vec<PackageItem>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(mock_data::mock_packages());
        }
        if let Ok(data) = self
            .post_entry(
                "SYNO.Core.Package",
                "list",
                1,
                &[(
                    "additional".into(),
                    json!([
                        "description",
                        "status",
                        "maintainer",
                        "version",
                        "display_name"
                    ])
                    .to_string(),
                )],
            )
            .await
            && data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(pkgs) = data.pointer("/data/packages").and_then(Value::as_array)
        {
            return Ok(pkgs
                .iter()
                .map(|p| PackageItem {
                    id: p
                        .get("id")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    name: p
                        .pointer("/additional/display_name")
                        .or_else(|| p.get("name"))
                        .or_else(|| p.get("id"))
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    version: p
                        .pointer("/additional/version")
                        .or_else(|| p.get("version"))
                        .and_then(Value::as_str)
                        .unwrap_or("1.0")
                        .to_string(),
                    status: if p.pointer("/additional/status").and_then(Value::as_str)
                        == Some("running")
                    {
                        "running".into()
                    } else {
                        "stopped".into()
                    },
                    description: p
                        .pointer("/additional/description")
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string(),
                    maintainer: p
                        .pointer("/additional/maintainer")
                        .and_then(Value::as_str)
                        .unwrap_or("Synology Inc.")
                        .to_string(),
                    category: None,
                    is_community: None,
                })
                .collect());
        }
        Ok(mock_data::mock_packages())
    }

    pub async fn toggle_package(&self, id: &str, action: &str) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(true);
        }
        let method = if action == "start" { "start" } else { "stop" };
        let data = self
            .post_entry(
                "SYNO.Core.Package.Control",
                method,
                1,
                &[("id".into(), json!(id).to_string())],
            )
            .await?;
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    fn build_services_from_parts(
        smb: Option<&Value>,
        afp: Option<&Value>,
        nfs: Option<&Value>,
        ftp: Option<&Value>,
        sftp: Option<&Value>,
        term: Option<&Value>,
    ) -> Vec<ServiceItem> {
        let mut services = Vec::new();
        if let Some(d) = smb {
            let en = d
                .get("enable_samba")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            services.push(ServiceItem {
                id: "smb".into(),
                name: "smb".into(),
                display_name: "SMB / CIFS (Windows File Service)".into(),
                description: "Chia sẻ tệp cho Windows/macOS qua SMB. Cổng 445.".into(),
                category: "file".into(),
                enabled: en,
                running: Some(en),
                status: if en { "running" } else { "stopped" }.into(),
                port: Some(445),
                api: Some("SYNO.Core.FileServ.SMB".into()),
                details: Some(d.clone()),
                can_toggle: true,
            });
        }
        if let Some(d) = afp {
            let en = d
                .get("enable_afp")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            services.push(ServiceItem {
                id: "afp".into(),
                name: "afp".into(),
                display_name: "AFP (Apple Filing)".into(),
                description: "Dịch vụ AFP cho macOS.".into(),
                category: "file".into(),
                enabled: en,
                running: Some(en),
                status: if en { "running" } else { "stopped" }.into(),
                port: Some(548),
                api: Some("SYNO.Core.FileServ.AFP".into()),
                details: Some(d.clone()),
                can_toggle: true,
            });
        }
        if let Some(d) = nfs {
            let en = d
                .get("enable_nfs")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            services.push(ServiceItem {
                id: "nfs".into(),
                name: "nfs".into(),
                display_name: "NFS".into(),
                description: "Chia sẻ tệp cho Linux/Unix qua NFS.".into(),
                category: "file".into(),
                enabled: en,
                running: Some(en),
                status: if en { "running" } else { "stopped" }.into(),
                port: Some(2049),
                api: Some("SYNO.Core.FileServ.NFS".into()),
                details: Some(d.clone()),
                can_toggle: true,
            });
        }
        if let Some(d) = ftp {
            let en = d
                .get("enable_ftp")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            let port = d.get("portnum").and_then(Value::as_u64).unwrap_or(21) as u16;
            services.push(ServiceItem {
                id: "ftp".into(),
                name: "ftp".into(),
                display_name: "FTP".into(),
                description: "Giao thức FTP/FTPS. Cổng 21.".into(),
                category: "file".into(),
                enabled: en,
                running: Some(en),
                status: if en { "running" } else { "stopped" }.into(),
                port: Some(port),
                api: Some("SYNO.Core.FileServ.FTP".into()),
                details: Some(d.clone()),
                can_toggle: true,
            });
        }
        if let Some(d) = sftp {
            let en = d.get("enable").and_then(Value::as_bool).unwrap_or(false);
            let port = d
                .get("portnum")
                .or_else(|| d.get("sftp_portnum"))
                .and_then(Value::as_u64)
                .unwrap_or(22) as u16;
            services.push(ServiceItem {
                id: "sftp".into(),
                name: "sftp".into(),
                display_name: "SFTP".into(),
                description: "FTP an toàn qua SSH.".into(),
                category: "file".into(),
                enabled: en,
                running: Some(en),
                status: if en { "running" } else { "stopped" }.into(),
                port: Some(port),
                api: Some("SYNO.Core.FileServ.FTP.SFTP".into()),
                details: Some(d.clone()),
                can_toggle: true,
            });
        }
        if let Some(d) = term {
            let ssh_en = d
                .get("enable_ssh")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            let telnet_en = d
                .get("enable_telnet")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            let ssh_port = d.get("ssh_port").and_then(Value::as_u64).unwrap_or(22) as u16;
            services.push(ServiceItem {
                id: "ssh".into(),
                name: "ssh".into(),
                display_name: "SSH (Terminal)".into(),
                description: format!("Truy cập dòng lệnh qua SSH. Cổng {ssh_port}"),
                category: "system".into(),
                enabled: ssh_en,
                running: Some(ssh_en),
                status: if ssh_en { "running" } else { "stopped" }.into(),
                port: Some(ssh_port),
                api: Some("SYNO.Core.Terminal".into()),
                details: Some(d.clone()),
                can_toggle: true,
            });
            services.push(ServiceItem {
                id: "telnet".into(),
                name: "telnet".into(),
                display_name: "Telnet".into(),
                description: "Telnet không mã hóa.".into(),
                category: "system".into(),
                enabled: telnet_en,
                running: Some(telnet_en),
                status: if telnet_en { "running" } else { "stopped" }.into(),
                port: Some(23),
                api: Some("SYNO.Core.Terminal".into()),
                details: Some(d.clone()),
                can_toggle: true,
            });
        }
        if !services.is_empty() && !services.iter().any(|s| s.id == "rsync") {
            services.push(ServiceItem {
                id: "rsync".into(),
                name: "rsync".into(),
                display_name: "rsync / Network Backup".into(),
                description: "Dịch vụ rsync cho sao lưu.".into(),
                category: "network".into(),
                enabled: false,
                running: Some(false),
                status: "stopped".into(),
                port: Some(873),
                api: Some("SYNO.Backup.Service.NetworkBackup".into()),
                details: Some(json!({})),
                can_toggle: true,
            });
        }
        services
    }

    pub async fn get_services(&self) -> Result<Vec<ServiceItem>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            let mut guard = self.inner.write().await;
            let list = guard
                .demo_services
                .get_or_insert_with(mock_data::mock_services);
            return Ok(list.clone());
        }
        let compound = json!([
            { "api": "SYNO.Core.FileServ.SMB", "method": "get", "version": 3 },
            { "api": "SYNO.Core.FileServ.AFP", "method": "get", "version": 1 },
            { "api": "SYNO.Core.FileServ.NFS", "method": "get", "version": 2 },
            { "api": "SYNO.Core.FileServ.FTP", "method": "get", "version": 3 },
            { "api": "SYNO.Core.FileServ.FTP.SFTP", "method": "get", "version": 1 },
            { "api": "SYNO.Core.Terminal", "method": "get", "version": 3 },
        ]);
        if let Ok(data) = self
            .post_entry(
                "SYNO.Entry.Request",
                "request",
                1,
                &[
                    ("mode".into(), "\"sequential\"".into()),
                    ("compound".into(), compound.to_string()),
                    ("stop_when_error".into(), "false".into()),
                ],
            )
            .await
            && let Some(results) = data
                .pointer("/data/result")
                .or_else(|| data.get("data"))
                .and_then(Value::as_array)
        {
            let get_res = |idx: usize| -> Option<&Value> {
                let r = results.get(idx)?;
                r.get("data").or(Some(r))
            };
            let built = Self::build_services_from_parts(
                get_res(0),
                get_res(1),
                get_res(2),
                get_res(3),
                get_res(4),
                get_res(5),
            );
            if !built.is_empty() {
                return Ok(built);
            }
        }
        Ok(mock_data::mock_services())
    }

    pub async fn get_service(&self, id: &str) -> Result<Option<ServiceItem>, String> {
        let all = self.get_services().await?;
        Ok(all.into_iter().find(|s| s.id == id))
    }

    pub async fn get_terminal_info(&self) -> Result<TerminalInfo, String> {
        let s = self.get_session().await;
        if s.is_demo || !s.is_connected {
            let list = self
                .inner
                .read()
                .await
                .demo_services
                .clone()
                .unwrap_or_else(mock_data::mock_services);
            let ssh = list.iter().find(|i| i.id == "ssh");
            let telnet = list.iter().find(|i| i.id == "telnet");
            return Ok(TerminalInfo {
                enable_ssh: ssh.is_some_and(|i| i.enabled),
                enable_telnet: telnet.is_some_and(|i| i.enabled),
                ssh_port: ssh.and_then(|i| i.port).unwrap_or(22),
                hostname: None,
            });
        }
        let data = self.post_entry("SYNO.Core.Terminal", "get", 3, &[]).await?;
        if data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(d) = data.get("data")
        {
            return Ok(TerminalInfo {
                enable_ssh: d
                    .get("enable_ssh")
                    .and_then(Value::as_bool)
                    .unwrap_or(false),
                enable_telnet: d
                    .get("enable_telnet")
                    .and_then(Value::as_bool)
                    .unwrap_or(false),
                ssh_port: d.get("ssh_port").and_then(Value::as_u64).unwrap_or(22) as u16,
                hostname: d
                    .get("hostname")
                    .and_then(Value::as_str)
                    .map(ToString::to_string),
            });
        }
        Err(data
            .pointer("/error/message")
            .and_then(Value::as_str)
            .unwrap_or("Không thể lấy thông tin Terminal")
            .to_string())
    }

    pub async fn set_terminal(
        &self,
        enable_ssh: bool,
        enable_telnet: Option<bool>,
        ssh_port: Option<u16>,
    ) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            let mut guard = self.inner.write().await;
            let list = guard
                .demo_services
                .get_or_insert_with(mock_data::mock_services);
            for item in list.iter_mut() {
                if item.id == "ssh" {
                    item.enabled = enable_ssh;
                    item.running = Some(enable_ssh);
                    item.status = if enable_ssh { "running" } else { "stopped" }.into();
                    if let Some(p) = ssh_port {
                        item.port = Some(p);
                    }
                } else if item.id == "telnet"
                    && let Some(et) = enable_telnet
                {
                    item.enabled = et;
                    item.running = Some(et);
                    item.status = if et { "running" } else { "stopped" }.into();
                }
            }
            return Ok(true);
        }
        let cur = self
            .post_entry("SYNO.Core.Terminal", "get", 3, &[])
            .await
            .ok()
            .and_then(|v| v.get("data").cloned())
            .unwrap_or(Value::Null);
        let telnet_val = enable_telnet.unwrap_or_else(|| {
            cur.get("enable_telnet")
                .and_then(Value::as_bool)
                .unwrap_or(false)
        });
        let port_val = ssh_port
            .unwrap_or_else(|| cur.get("ssh_port").and_then(Value::as_u64).unwrap_or(22) as u16);
        let data = self
            .post_entry(
                "SYNO.Core.Terminal",
                "set",
                3,
                &[
                    ("enable_ssh".into(), enable_ssh.to_string()),
                    ("enable_telnet".into(), telnet_val.to_string()),
                    ("ssh_port".into(), port_val.to_string()),
                ],
            )
            .await?;
        Ok(data.get("success").and_then(Value::as_bool) == Some(true))
    }

    pub async fn toggle_service(&self, id: &str, enabled: bool) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            let mut guard = self.inner.write().await;
            let list = guard
                .demo_services
                .get_or_insert_with(mock_data::mock_services);
            let Some(svc) = list.iter_mut().find(|i| i.id == id) else {
                return Ok(false);
            };
            svc.enabled = enabled;
            svc.running = Some(enabled);
            svc.status = if enabled { "running" } else { "stopped" }.into();
            return Ok(true);
        }

        match id {
            "smb" => {
                let cur = self
                    .post_entry("SYNO.Core.FileServ.SMB", "get", 3, &[])
                    .await?;
                let d = cur.get("data").cloned().unwrap_or(Value::Null);
                let wg = d
                    .get("workgroup")
                    .and_then(Value::as_str)
                    .unwrap_or("WORKGROUP");
                let res = self
                    .post_entry(
                        "SYNO.Core.FileServ.SMB",
                        "set",
                        3,
                        &[
                            ("enable_samba".into(), enabled.to_string()),
                            ("workgroup".into(), json!(wg).to_string()),
                            (
                                "disable_shadow_copy".into(),
                                d.get("disable_shadow_copy")
                                    .and_then(Value::as_bool)
                                    .unwrap_or(false)
                                    .to_string(),
                            ),
                            (
                                "smb_transfer_log_enable".into(),
                                d.get("smb_transfer_log_enable")
                                    .and_then(Value::as_bool)
                                    .unwrap_or(false)
                                    .to_string(),
                            ),
                        ],
                    )
                    .await?;
                Ok(res.get("success").and_then(Value::as_bool) == Some(true))
            }
            "afp" => {
                let cur = self
                    .post_entry("SYNO.Core.FileServ.AFP", "get", 1, &[])
                    .await?;
                let d = cur.get("data").cloned().unwrap_or(Value::Null);
                let res = self
                    .post_entry(
                        "SYNO.Core.FileServ.AFP",
                        "set",
                        1,
                        &[
                            ("enable_afp".into(), enabled.to_string()),
                            (
                                "afp_transfer_log_enable".into(),
                                d.get("afp_transfer_log_enable")
                                    .and_then(Value::as_bool)
                                    .unwrap_or(false)
                                    .to_string(),
                            ),
                        ],
                    )
                    .await?;
                Ok(res.get("success").and_then(Value::as_bool) == Some(true))
            }
            "nfs" => {
                let cur = self
                    .post_entry("SYNO.Core.FileServ.NFS", "get", 2, &[])
                    .await?;
                let d = cur.get("data").cloned().unwrap_or(Value::Null);
                let v4 = d
                    .get("enable_nfs_v4")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                let v4_1 = d
                    .get("enable_nfs_v4_1")
                    .and_then(Value::as_bool)
                    .unwrap_or(v4);
                let dom = d.get("nfs_v4_domain").and_then(Value::as_str).unwrap_or("");
                let res = self
                    .post_entry(
                        "SYNO.Core.FileServ.NFS",
                        "set",
                        2,
                        &[
                            ("enable_nfs".into(), enabled.to_string()),
                            ("enable_nfs_v4".into(), v4.to_string()),
                            ("enable_nfs_v4_1".into(), v4_1.to_string()),
                            ("nfs_v4_domain".into(), json!(dom).to_string()),
                        ],
                    )
                    .await?;
                Ok(res.get("success").and_then(Value::as_bool) == Some(true))
            }
            "ftp" => {
                let cur = self
                    .post_entry("SYNO.Core.FileServ.FTP", "get", 3, &[])
                    .await?;
                let d = cur.get("data").cloned().unwrap_or(Value::Null);
                let res = self
                    .post_entry(
                        "SYNO.Core.FileServ.FTP",
                        "set",
                        3,
                        &[
                            ("enable_ftp".into(), enabled.to_string()),
                            (
                                "enable_ftps".into(),
                                d.get("enable_ftps")
                                    .and_then(Value::as_bool)
                                    .unwrap_or(false)
                                    .to_string(),
                            ),
                            (
                                "timeout".into(),
                                d.get("timeout")
                                    .map(value_as_u64)
                                    .unwrap_or(300)
                                    .to_string(),
                            ),
                            (
                                "portnum".into(),
                                d.get("portnum").map(value_as_u64).unwrap_or(21).to_string(),
                            ),
                        ],
                    )
                    .await?;
                Ok(res.get("success").and_then(Value::as_bool) == Some(true))
            }
            "sftp" => {
                let cur = self
                    .post_entry("SYNO.Core.FileServ.FTP.SFTP", "get", 1, &[])
                    .await?;
                let d = cur.get("data").cloned().unwrap_or(Value::Null);
                let p = d
                    .get("sftp_portnum")
                    .or_else(|| d.get("portnum"))
                    .map(value_as_u64)
                    .unwrap_or(22);
                let res = self
                    .post_entry(
                        "SYNO.Core.FileServ.FTP.SFTP",
                        "set",
                        1,
                        &[
                            ("enable".into(), enabled.to_string()),
                            ("sftp_portnum".into(), p.to_string()),
                            ("portnum".into(), p.to_string()),
                        ],
                    )
                    .await?;
                Ok(res.get("success").and_then(Value::as_bool) == Some(true))
            }
            "ssh" | "telnet" => {
                let cur = self.get_terminal_info().await?;
                let en_ssh = if id == "ssh" { enabled } else { cur.enable_ssh };
                let en_tel = if id == "telnet" {
                    enabled
                } else {
                    cur.enable_telnet
                };
                self.set_terminal(en_ssh, Some(en_tel), Some(cur.ssh_port))
                    .await
            }
            other => {
                if self
                    .toggle_package(other, if enabled { "start" } else { "stop" })
                    .await
                    .unwrap_or(false)
                {
                    Ok(true)
                } else {
                    Err(format!("Dịch vụ '{other}' không được hỗ trợ"))
                }
            }
        }
    }

    pub async fn get_file_service_status(&self) -> Result<Value, String> {
        let services = self.get_services().await?;
        let find = |id: &str| services.iter().find(|s| s.id == id);
        Ok(json!({
            "smb": {
                "enabled": find("smb").is_some_and(|s| s.enabled),
                "details": find("smb").and_then(|s| s.details.clone()),
            },
            "afp": {
                "enabled": find("afp").is_some_and(|s| s.enabled),
                "details": find("afp").and_then(|s| s.details.clone()),
            },
            "nfs": {
                "enabled": find("nfs").is_some_and(|s| s.enabled),
                "enable_nfs_v4": find("nfs").and_then(|s| s.details.as_ref()).and_then(|d| d.get("enable_nfs_v4")).and_then(Value::as_bool).unwrap_or(false),
                "details": find("nfs").and_then(|s| s.details.clone()),
            },
            "ftp": {
                "enabled": find("ftp").is_some_and(|s| s.enabled),
                "enable_ftps": find("ftp").and_then(|s| s.details.as_ref()).and_then(|d| d.get("enable_ftps")).and_then(Value::as_bool).unwrap_or(false),
                "port": find("ftp").and_then(|s| s.port).unwrap_or(21),
                "details": find("ftp").and_then(|s| s.details.clone()),
            },
            "sftp": {
                "enabled": find("sftp").is_some_and(|s| s.enabled),
                "port": find("sftp").and_then(|s| s.port).unwrap_or(22),
                "details": find("sftp").and_then(|s| s.details.clone()),
            }
        }))
    }

    pub async fn get_notification_strings(&self) -> Result<Map<String, Value>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            return Ok(Map::new());
        }
        {
            let guard = self.inner.read().await;
            if let (Some(cache), Some(exp)) =
                (&guard.notify_strings_cache, guard.notify_strings_expiry)
                && Instant::now() < exp
            {
                return Ok(cache.clone());
            }
        }
        for (pkg, lang) in [("\"\"", "\"enu\""), ("", "enu")] {
            if let Ok(data) = self
                .post_entry(
                    "SYNO.Core.DSMNotify.Strings",
                    "get",
                    1,
                    &[("pkgName".into(), pkg.into()), ("lang".into(), lang.into())],
                )
                .await
                && data.get("success").and_then(Value::as_bool) == Some(true)
                && let Some(Value::Object(map)) = data.get("data")
            {
                let mut guard = self.inner.write().await;
                guard.notify_strings_cache = Some(map.clone());
                guard.notify_strings_expiry = Some(Instant::now() + Duration::from_secs(1800));
                return Ok(map.clone());
            }
        }
        Ok(Map::new())
    }

    pub async fn get_notifications(&self) -> Result<Vec<NotificationItem>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            let mut guard = self.inner.write().await;
            let list = guard
                .demo_notifications
                .get_or_insert_with(mock_data::mock_notifications);
            return Ok(list.clone());
        }
        let now = now_secs();
        let strings = self.get_notification_strings().await.unwrap_or_default();
        let mut raw_items = Vec::new();
        for action_val in ["\"load\"", "load"] {
            if let Ok(data) = self
                .post_entry(
                    "SYNO.Core.DSMNotify",
                    "notify",
                    1,
                    &[
                        ("action".into(), action_val.into()),
                        ("lastRead".into(), "0".into()),
                        ("lastSeen".into(), "0".into()),
                    ],
                )
                .await
                && data.get("success").and_then(Value::as_bool) == Some(true)
            {
                if let Some(arr) = data.pointer("/data/items").and_then(Value::as_array) {
                    raw_items = arr.clone();
                    break;
                }
                if let Some(arr) = data.get("data").and_then(Value::as_array) {
                    raw_items = arr.clone();
                    break;
                }
            }
        }
        Ok(raw_items
            .into_iter()
            .enumerate()
            .map(|(idx, item)| {
                let title_key = item
                    .get("title")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                let class_name = item
                    .get("className")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                let raw_msgs: Vec<String> = item
                    .get("msg")
                    .and_then(Value::as_array)
                    .map(|a| {
                        a.iter()
                            .filter_map(|v| v.as_str().map(ToString::to_string))
                            .collect()
                    })
                    .unwrap_or_default();
                let time = item
                    .get("time")
                    .map(value_as_u64)
                    .filter(|&t| t > 0)
                    .unwrap_or(now);

                let (display_title, template) = if let Some(entry) = strings.get(&title_key) {
                    (
                        entry
                            .get("title")
                            .and_then(Value::as_str)
                            .unwrap_or(&title_key)
                            .to_string(),
                        entry
                            .get("msg")
                            .and_then(Value::as_str)
                            .unwrap_or("")
                            .to_string(),
                    )
                } else if !class_name.is_empty() {
                    (
                        class_name
                            .rsplit('.')
                            .next()
                            .unwrap_or(&class_name)
                            .to_string(),
                        String::new(),
                    )
                } else {
                    (
                        title_key
                            .rsplit(':')
                            .next()
                            .unwrap_or(&title_key)
                            .to_string(),
                        String::new(),
                    )
                };

                let mut messages: Vec<String> = raw_msgs
                    .iter()
                    .map(|m| {
                        let templated = if template.is_empty() {
                            m.clone()
                        } else {
                            parse_notification_message(&template, m)
                        };
                        if templated.starts_with('{')
                            && templated.ends_with('}')
                            && let Ok(Value::Object(map)) =
                                serde_json::from_str::<Value>(&templated)
                        {
                            return map
                                .into_values()
                                .map(|v| match v {
                                    Value::String(st) => st,
                                    other => other.to_string(),
                                })
                                .collect::<Vec<_>>()
                                .join(" ");
                        }
                        templated
                    })
                    .collect();
                if messages.is_empty() {
                    messages.push(display_title.clone());
                }

                NotificationItem {
                    id: item
                        .get("id")
                        .and_then(Value::as_str)
                        .map(ToString::to_string)
                        .unwrap_or_else(|| format!("n_{idx}_{time}")),
                    category: infer_category(&class_name, &title_key).into(),
                    level: infer_level(&display_title, &messages.join(" ")).into(),
                    title: title_key,
                    display_title,
                    class_name,
                    messages,
                    raw_messages: raw_msgs,
                    time,
                    read: false,
                }
            })
            .collect())
    }

    pub async fn get_app_notifications(&self) -> Result<Vec<AppNotifyItem>, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            let mut guard = self.inner.write().await;
            let list = guard
                .demo_app_notifications
                .get_or_insert_with(mock_data::mock_app_notifications);
            return Ok(list.clone());
        }
        if let Ok(data) = self.post_entry("SYNO.Core.AppNotify", "get", 1, &[]).await
            && data.get("success").and_then(Value::as_bool) == Some(true)
            && let Some(items) = data
                .pointer("/data/items")
                .or_else(|| data.pointer("/data/list"))
                .or_else(|| data.pointer("/data/appNotify"))
                .and_then(Value::as_array)
            && !items.is_empty()
        {
            let now = now_secs();
            return Ok(items
                .iter()
                .enumerate()
                .map(|(i, it)| AppNotifyItem {
                    id: it
                        .get("id")
                        .and_then(Value::as_str)
                        .map(ToString::to_string)
                        .unwrap_or_else(|| format!("a_{i}")),
                    title: it
                        .get("title")
                        .or_else(|| it.get("pkgName"))
                        .and_then(Value::as_str)
                        .unwrap_or("App")
                        .to_string(),
                    content: it
                        .get("content")
                        .or_else(|| it.get("msg"))
                        .and_then(Value::as_str)
                        .map(ToString::to_string)
                        .unwrap_or_else(|| it.to_string()),
                    level: "info".into(),
                    time: it
                        .get("time")
                        .map(value_as_u64)
                        .filter(|&t| t > 0)
                        .unwrap_or(now),
                    unread: it.get("unread").and_then(Value::as_bool).unwrap_or(false),
                    pkg_id: it
                        .get("pkgId")
                        .and_then(Value::as_str)
                        .map(ToString::to_string),
                })
                .collect());
        }
        Ok(mock_data::mock_app_notifications())
    }

    pub async fn clear_notifications(&self) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            let mut guard = self.inner.write().await;
            guard.demo_notifications = Some(Vec::new());
            guard.demo_app_notifications = Some(Vec::new());
            return Ok(true);
        }
        for (a, c) in [("\"apply\"", "\"all\""), ("apply", "all")] {
            if let Ok(data) = self
                .post_entry(
                    "SYNO.Core.DSMNotify",
                    "notify",
                    1,
                    &[("action".into(), a.into()), ("clean".into(), c.into())],
                )
                .await
                && data.get("success").and_then(Value::as_bool) == Some(true)
            {
                return Ok(true);
            }
        }
        Ok(false)
    }

    pub async fn mark_notifications_read(&self) -> Result<bool, String> {
        let s = self.ensure_connected().await?;
        if s.is_demo {
            let mut guard = self.inner.write().await;
            let list = guard
                .demo_notifications
                .get_or_insert_with(mock_data::mock_notifications);
            for n in list.iter_mut() {
                n.read = true;
            }
            return Ok(true);
        }
        let now = now_secs().to_string();
        Ok(self
            .post_entry(
                "SYNO.Core.DSMNotify",
                "notify",
                1,
                &[
                    ("action".into(), "\"load\"".into()),
                    ("lastRead".into(), now.clone()),
                    ("lastSeen".into(), now),
                ],
            )
            .await
            .is_ok())
    }

    pub async fn get_api_info(&self) -> Result<Value, String> {
        self.ensure_connected().await?;
        self.dsm_request(
            "query.cgi",
            "GET",
            &[
                ("api".into(), "SYNO.API.Info".into()),
                ("method".into(), "query".into()),
                ("version".into(), "1".into()),
                ("query".into(), "all".into()),
            ],
        )
        .await
    }

    pub async fn raw_entry_call(
        &self,
        api: &str,
        method: &str,
        version: u32,
        extra: &[(String, String)],
    ) -> Result<Value, String> {
        self.post_entry(api, method, version, extra).await
    }

    pub async fn get_logs(&self, limit: u32) -> Result<Value, String> {
        self.ensure_connected().await?;
        match self
            .post_entry(
                "SYNO.Core.SyslogClient.Log",
                "list",
                1,
                &[
                    ("start".into(), "0".into()),
                    ("limit".into(), limit.to_string()),
                    ("target".into(), "LOCAL".into()),
                    ("logtype".into(), "system,netbackup".into()),
                ],
            )
            .await
        {
            Ok(v) => Ok(v),
            Err(e) => Ok(json!({ "success": false, "error": e })),
        }
    }

    pub async fn exec_ssh_command(
        &self,
        host: &str,
        port: Option<u16>,
        username: &str,
        password: Option<&str>,
        private_key: Option<&str>,
        command: &str,
    ) -> Value {
        if host.is_empty() || username.is_empty() || command.is_empty() {
            return json!({ "success": false, "error": "host, username, command required" });
        }
        let ssh_port = match port {
            Some(p) if p >= 1 => p,
            _ => self
                .get_terminal_info()
                .await
                .map(|i| i.ssh_port)
                .unwrap_or(22),
        };

        if host == "demo.synology.lan" || host.contains("demo") || username == "demo_admin" {
            let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
            let out = format!(
                "[demo] $ {command}\nLinux Synology-NAS 4.4.302+ #69057 SMP\n{now} — demo output for: {command}\nuid=1026(admin) gid=100(users)\n"
            );
            return json!({
                "success": true,
                "stdout": out,
                "stderr": "",
                "code": 0,
            });
        }

        let lower = host.to_lowercase();
        let is_qc = lower.ends_with(".quickconnect.to")
            || (!host.contains('.') && !host.contains(':') && lower != "localhost");
        if is_qc {
            return json!({
                "success": false,
                "error": "SSH via QuickConnect ID not supported. Use LAN IP or DDNS and ensure SSH port is forwarded."
            });
        }

        match api_ssh_rs::port::exec_ssh_single(
            host,
            ssh_port,
            username,
            password,
            private_key,
            command,
            10,
        )
        .await
        {
            Ok(out) => json!({
                "success": true,
                "stdout": out.stdout,
                "stderr": out.stderr,
                "code": out.code,
            }),
            Err(e) => json!({ "success": false, "error": e }),
        }
    }
}
