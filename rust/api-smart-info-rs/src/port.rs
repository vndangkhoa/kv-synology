//! Storage S.M.A.R.T. info runner (Synosmartinfo DSM CGI + `russh` SSH fallback).

#![forbid(unsafe_code)]

use std::sync::LazyLock;
use std::time::Duration;

use reqwest::header::{CONTENT_TYPE, COOKIE, USER_AGENT};
use serde::Deserialize;
use serde_json::{Value, json};

static INSECURE_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_secs(45))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
});

#[derive(Debug, Clone)]
pub struct HttpReply {
    pub status: u16,
    pub body: Value,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DsmConfig {
    host: Option<String>,
    port: Option<u16>,
    https: Option<bool>,
    sid: Option<String>,
    syno_token: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SshConfig {
    host: Option<String>,
    port: Option<u16>,
    username: Option<String>,
    password: Option<String>,
    private_key: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SmartInfoRequest {
    action: Option<String>,
    option: Option<String>,
    mode: Option<String>,
    dsm_config: Option<DsmConfig>,
    ssh_config: Option<SshConfig>,
}

struct CgiResult {
    success: bool,
    data: Option<Value>,
    text: Option<String>,
    status: u16,
    sudoers_missing: Option<bool>,
}

fn is_undefined_marker(v: &Value) -> bool {
    matches!(v, Value::Object(map) if map.len() == 1 && map.get("$undefined") == Some(&Value::Bool(true)))
}

/// Removes `{"$undefined": true}` bridge markers emitted by `syno-smart-parser-rs` so HTTP JSON
/// matches Node `JSON.stringify` semantics where `undefined` properties are omitted.
pub fn strip_undefined_markers(val: &mut Value) {
    match val {
        Value::Object(map) => {
            map.retain(|_, v| !is_undefined_marker(v));
            for v in map.values_mut() {
                strip_undefined_markers(v);
            }
        }
        Value::Array(arr) => {
            for item in arr.iter_mut() {
                strip_undefined_markers(item);
            }
        }
        _ => {}
    }
}

async fn call_dsm_cgi(dsm: &DsmConfig, action: &str, option: &str) -> CgiResult {
    let is_https = dsm.https.unwrap_or(false);
    let host = dsm.host.as_deref().unwrap_or("");
    let port = dsm
        .port
        .filter(|&p| p > 0)
        .unwrap_or(if is_https { 5001 } else { 5000 });
    let scheme = if is_https { "https" } else { "http" };
    let url = format!("{scheme}://{host}:{port}/webman/3rdparty/Synosmartinfo/api.cgi");

    let post_body = {
        let mut form = url::form_urlencoded::Serializer::new(String::new());
        form.append_pair("action", action);
        if !option.is_empty() {
            form.append_pair("option", option);
        }
        form.finish()
    };

    let mut req = INSECURE_CLIENT
        .post(url)
        .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
        .header(USER_AGENT, "DSMHelper/1.3.0 (SynoSmartInfo)");

    if let Some(sid) = dsm.sid.as_deref().filter(|s| !s.is_empty()) {
        req = req.header(COOKIE, format!("id={sid}"));
    }
    if let Some(token) = dsm.syno_token.as_deref().filter(|s| !s.is_empty()) {
        req = req.header("X-SYNO-TOKEN", token);
    }

    let res = match req.body(post_body).send().await {
        Ok(r) => r,
        Err(e) => {
            let status = if e.is_timeout() { 504 } else { 500 };
            let text = if e.is_timeout() {
                "DSM CGI request timed out".to_string()
            } else {
                e.to_string()
            };
            return CgiResult {
                success: false,
                data: None,
                text: Some(text),
                status,
                sudoers_missing: None,
            };
        }
    };

    let status = res.status().as_u16();
    let raw = match res.text().await {
        Ok(t) => t,
        Err(e) => {
            return CgiResult {
                success: false,
                data: None,
                text: Some(e.to_string()),
                status: 500,
                sudoers_missing: None,
            };
        }
    };

    if let Ok(parsed) = serde_json::from_str::<Value>(&raw) {
        let success = parsed.get("success").and_then(Value::as_bool) == Some(true);
        let text = parsed
            .get("result")
            .and_then(Value::as_str)
            .map(ToString::to_string)
            .or(Some(raw));
        let sudoers_missing = parsed.get("sudoers_missing").and_then(Value::as_bool);
        return CgiResult {
            success,
            data: Some(parsed),
            text,
            status,
            sudoers_missing,
        };
    }

    CgiResult {
        success: status < 400 && raw.contains("success"),
        data: None,
        text: Some(raw),
        status,
        sudoers_missing: None,
    }
}

async fn call_via_ssh(ssh: &SshConfig, option: &str) -> Result<(bool, String), String> {
    let trimmed_opt = option.trim();
    let safe_opt = match trimmed_opt {
        "-a" | "-i" | "-v" | "-h" | "" => trimmed_opt,
        _ => "",
    };

    let cmd = format!(
        r#"if [ -x /var/packages/Synosmartinfo/target/bin/helper/smartinfo-helper.$(uname -m) ]; then
  /var/packages/Synosmartinfo/target/bin/helper/smartinfo-helper.$(uname -m) {safe_opt}
elif [ -f /var/packages/Synosmartinfo/target/bin/syno_smart_info.sh ]; then
  sudo /var/packages/Synosmartinfo/target/bin/syno_smart_info.sh {safe_opt}
elif command -v syno_smart_info.sh >/dev/null 2>&1; then
  sudo syno_smart_info.sh {safe_opt}
else
  curl -fsSL https://raw.githubusercontent.com/PeterSuh-Q3/SynoSmartInfo/main/src/bin/syno_smart_info.sh | sudo bash -s -- {safe_opt}
fi"#
    );

    let host = ssh.host.as_deref().unwrap_or("");
    let port = ssh.port.filter(|&p| p > 0).unwrap_or(22);
    let username = ssh.username.as_deref().unwrap_or("");
    let out = api_ssh_rs::port::exec_ssh_single(
        host,
        port,
        username,
        ssh.password.as_deref(),
        ssh.private_key.as_deref(),
        &cmd,
        30,
    )
    .await?;

    let ok = out.code == 0 || out.stdout.contains("Drive ") || out.stdout.contains("Finished");
    let combined = if out.stdout.is_empty() {
        out.stderr
    } else {
        out.stdout
    };
    Ok((ok, combined))
}

fn parse_sys_info(data: &Value) -> Value {
    let Some(res) = data.get("result") else {
        return Value::Null;
    };
    match res {
        Value::String(s) => serde_json::from_str(s).unwrap_or(Value::Null),
        other => other.clone(),
    }
}

/// Port of `POST /api/storage/smart-info` (`src/app/api/storage/smart-info/route.ts`).
pub async fn handle_smart_info(body_bytes: &[u8]) -> HttpReply {
    let body: SmartInfoRequest = serde_json::from_slice(body_bytes).unwrap_or_default();
    let action = body.action.as_deref().unwrap_or("run");
    let option = body.option.as_deref().unwrap_or("");
    let mode = body.mode.as_deref().unwrap_or("auto");

    let has_dsm = body
        .dsm_config
        .as_ref()
        .and_then(|d| d.host.as_deref())
        .is_some_and(|h| !h.is_empty());
    let has_ssh = body
        .ssh_config
        .as_ref()
        .and_then(|s| s.host.as_deref())
        .is_some_and(|h| !h.is_empty());

    if !has_dsm && !has_ssh {
        return HttpReply {
            status: 401,
            body: json!({
                "success": false,
                "error": "Chưa cấu hình kết nối tới Synology DSM hoặc SSH. Vui lòng đăng nhập thiết bị.",
            }),
        };
    }

    if action == "check" {
        if has_dsm && let Some(dsm) = body.dsm_config.as_ref() {
            let check = call_dsm_cgi(dsm, "info", "").await;
            if check.status == 200
                && let Some(data) = check.data.as_ref()
                && data.get("success").and_then(Value::as_bool) == Some(true)
            {
                let sys_info = parse_sys_info(data);
                return HttpReply {
                    status: 200,
                    body: json!({
                        "success": true,
                        "source": "cgi",
                        "message": "Package SynoSmartInfo đã được cài đặt và sẵn sàng.",
                        "result": null,
                        "systemInfo": sys_info,
                    }),
                };
            }
        }
        return HttpReply {
            status: 200,
            body: json!({
                "success": false,
                "source": "cgi",
                "message": "Chưa cài đặt package SynoSmartInfo trên DSM (hoặc dịch vụ chưa bật).",
                "result": null,
            }),
        };
    }

    if action == "info"
        && has_dsm
        && let Some(dsm) = body.dsm_config.as_ref()
    {
        let info = call_dsm_cgi(dsm, "info", "").await;
        if info.success
            && let Some(data) = info.data.as_ref()
            && data.get("result").is_some_and(|v| !v.is_null())
        {
            let sys_info = parse_sys_info(data);
            return HttpReply {
                status: 200,
                body: json!({
                    "success": true,
                    "source": "cgi",
                    "message": "Lấy thông tin hệ thống thành công.",
                    "result": null,
                    "systemInfo": sys_info,
                }),
            };
        }
    }

    if (mode == "auto" || mode == "cgi")
        && has_dsm
        && let Some(dsm) = body.dsm_config.as_ref()
    {
        let cgi = call_dsm_cgi(dsm, "run", option).await;
        if cgi.status == 200
            && cgi.success
            && let Some(text) = cgi.text.as_deref()
            && !text.is_empty()
        {
            let mut parsed = syno_smart_parser_rs::port::parse_syno_smart_output(text.to_string())
                .unwrap_or_else(|_| json!({ "drives": [], "overallHealth": "UNKNOWN" }));
            strip_undefined_markers(&mut parsed);
            let mut resp = json!({
                "success": true,
                "source": "cgi",
                "message": "Quét S.M.A.R.T. hoàn tất qua DSM Package CGI.",
                "result": text,
                "parsed": parsed,
            });
            if let (Some(obj), Some(sm)) = (resp.as_object_mut(), cgi.sudoers_missing) {
                obj.insert("sudoers_missing".to_string(), Value::Bool(sm));
            }
            return HttpReply {
                status: 200,
                body: resp,
            };
        }

        if mode == "cgi" {
            let mut resp = json!({
                "success": false,
                "source": "cgi",
                "message": cgi.text.unwrap_or_else(|| "Không thể kết nối đến CGI SynoSmartInfo trên NAS.".to_string()),
                "result": null,
            });
            if let (Some(obj), Some(sm)) = (resp.as_object_mut(), cgi.sudoers_missing) {
                obj.insert("sudoers_missing".to_string(), Value::Bool(sm));
            }
            return HttpReply {
                status: if cgi.status >= 400 { cgi.status } else { 500 },
                body: resp,
            };
        }
    }

    if (mode == "auto" || mode == "ssh")
        && has_ssh
        && let Some(ssh) = body.ssh_config.as_ref()
        && ssh.username.as_deref().is_some_and(|u| !u.is_empty())
    {
        match call_via_ssh(ssh, option).await {
            Ok((success, output)) => {
                let mut parsed =
                    syno_smart_parser_rs::port::parse_syno_smart_output(output.clone())
                        .unwrap_or_else(|_| json!({ "drives": [], "overallHealth": "UNKNOWN" }));
                strip_undefined_markers(&mut parsed);
                return HttpReply {
                    status: 200,
                    body: json!({
                        "success": success,
                        "source": "ssh",
                        "message": "Quét S.M.A.R.T. thành công qua SSH Direct Runner.",
                        "result": output,
                        "parsed": parsed,
                    }),
                };
            }
            Err(err) => {
                if mode == "ssh" {
                    return HttpReply {
                        status: 500,
                        body: json!({
                            "success": false,
                            "source": "ssh",
                            "message": format!("Lỗi kết nối SSH: {err}"),
                            "result": null,
                        }),
                    };
                }
            }
        }
    }

    HttpReply {
        status: 400,
        body: json!({
            "success": false,
            "source": "cgi",
            "message": "Không thể thực hiện quét S.M.A.R.T. Vui lòng cài đặt package SynoSmartInfo trên DSM hoặc cung cấp thông tin SSH.",
            "result": null,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn unauth_returns_401() {
        let reply = handle_smart_info(br#"{"action":"run"}"#).await;
        assert_eq!(reply.status, 401);
        assert_eq!(
            serde_json::to_string(&reply.body).unwrap(),
            r#"{"success":false,"error":"Chưa cấu hình kết nối tới Synology DSM hoặc SSH. Vui lòng đăng nhập thiết bị."}"#
        );
    }

    #[tokio::test]
    async fn missing_ssh_mode_returns_400() {
        let reply = handle_smart_info(
            br#"{"action":"run","mode":"ssh","dsmConfig":{"host":"127.0.0.1","port":19999}}"#,
        )
        .await;
        assert_eq!(reply.status, 400);
        assert_eq!(
            serde_json::to_string(&reply.body).unwrap(),
            r#"{"success":false,"source":"cgi","message":"Không thể thực hiện quét S.M.A.R.T. Vui lòng cài đặt package SynoSmartInfo trên DSM hoặc cung cấp thông tin SSH.","result":null}"#
        );
    }

    #[test]
    fn strip_undefined_removes_markers() {
        let mut val = json!({
            "a": 1,
            "b": { "$undefined": true },
            "nested": [{ "x": "ok", "y": { "$undefined": true } }]
        });
        strip_undefined_markers(&mut val);
        assert_eq!(val, json!({ "a": 1, "nested": [{ "x": "ok" }] }));
    }
}
