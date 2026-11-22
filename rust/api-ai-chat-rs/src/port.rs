#![forbid(unsafe_code)]

use std::sync::LazyLock;
use std::time::{Duration, Instant};

use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

#[derive(Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Clone, Serialize)]
pub struct McpToolCallAction {
    pub tool: String,
    pub params: Value,
    pub description: String,
}

pub struct HttpReply {
    pub status: u16,
    pub body: Value,
}

fn compile_regex(pat: &str) -> Regex {
    // INFALLIBLE: compile-time constant regex validated in tests.
    Regex::new(pat).expect("valid constant regex")
}

static RE_MCP_ACTION: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"```(?:mcp_action|json:mcp)\s*([\s\S]*?)\s*```"));

struct McpToolSpec {
    name: &'static str,
    description: &'static str,
    params_json: &'static str,
}

const MCP_AVAILABLE_TOOLS: &[McpToolSpec] = &[
    McpToolSpec {
        name: "dsm_control_package",
        description: "Khởi động (start), tạm dừng (stop), hoặc khởi động lại (restart) một gói ứng dụng trên DSM.",
        params_json: r#"{"package_id":"string (VD: AudioStation, ContainerManager, PlexMediaServer)","action":"start | stop | restart"}"#,
    },
    McpToolSpec {
        name: "dsm_update_package",
        description: "Cập nhật / nâng cấp gói ứng dụng DSM lên phiên bản mới nhất.",
        params_json: r#"{"package_id":"string (VD: SynoCliTools, HomeAssistant)"}"#,
    },
    McpToolSpec {
        name: "dsm_install_package",
        description: "Cài đặt gói ứng dụng mới từ kho Synology hoặc Community.",
        params_json: r#"{"name":"string","package_id":"string (tùy chọn)","url":"string (tùy chọn)"}"#,
    },
    McpToolSpec {
        name: "dsm_uninstall_package",
        description: "Gỡ bỏ gói ứng dụng khỏi hệ thống Synology NAS.",
        params_json: r#"{"package_id":"string"}"#,
    },
    McpToolSpec {
        name: "dsm_control_docker_container",
        description: "Khởi động (start), dừng (stop), restart container Docker / Container Manager.",
        params_json: r#"{"name":"string (tên container)","action":"start | stop | restart"}"#,
    },
    McpToolSpec {
        name: "dsm_power_action",
        description: "Khởi động lại (reboot) hoặc tắt nguồn (shutdown) thiết bị Synology NAS.",
        params_json: r#"{"action":"reboot | shutdown"}"#,
    },
    McpToolSpec {
        name: "dsm_unblock_ip",
        description: "Mở khóa địa chỉ IP bị Tường lửa / Auto-block chặn brute-force.",
        params_json: r#"{"ip":"string (VD: 192.168.1.50 hoặc public IP)"}"#,
    },
    McpToolSpec {
        name: "dsm_control_service",
        description: "Bật/Tắt các dịch vụ hệ thống như SMB, SSH, FTP, NFS, WebDAV.",
        params_json: r#"{"service_id":"string (smb | ssh | ftp | nfs | webdav)","action":"start | stop | restart"}"#,
    },
    McpToolSpec {
        name: "dsm_list_files",
        description: "Liệt kê tệp tin và thư mục trong File Station.",
        params_json: r#"{"path":"string (VD: /docker, /video, /downloads)"}"#,
    },
    McpToolSpec {
        name: "dsm_get_system_info",
        description: "Lấy thông tin hệ thống chi tiết (CPU, RAM, Uptime, Nhiệt độ, Serial).",
        params_json: "{}",
    },
    McpToolSpec {
        name: "dsm_get_system_utilization",
        description: "Lấy thông số tải phần cứng thời gian thực (CPU%, RAM%, Băng thông Mạng, Đọc/Ghi đĩa).",
        params_json: "{}",
    },
];

pub fn get_default_model(provider: &str) -> &'static str {
    match provider {
        "gemini" => "gemini-2.0-flash",
        "deepseek" => "deepseek-chat",
        "claude" => "claude-3-7-sonnet-latest",
        "openai" => "gpt-4o-mini",
        "openrouter" => "anthropic/claude-3.7-sonnet",
        "opencode" => "opencode/zen-1",
        _ => "gemini-2.0-flash",
    }
}

fn slice_chars(s: &str, max_chars: usize) -> &str {
    match s.char_indices().nth(max_chars) {
        Some((idx, _)) => &s[..idx],
        None => s,
    }
}

pub fn extract_mcp_actions(reply: &str) -> Vec<McpToolCallAction> {
    let mut actions = Vec::new();
    for cap in RE_MCP_ACTION.captures_iter(reply) {
        let Some(m) = cap.get(1) else {
            continue;
        };
        if let Ok(parsed) = serde_json::from_str::<Value>(m.as_str())
            && let Some(tool) = parsed
                .get("tool")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
        {
            let params = parsed
                .get("params")
                .filter(|v| !v.is_null())
                .cloned()
                .unwrap_or_else(|| json!({}));
            let description = parsed
                .get("description")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
                .map_or_else(|| format!("Thực thi {tool}"), ToString::to_string);
            actions.push(McpToolCallAction {
                tool: tool.to_string(),
                params,
                description,
            });
        }
    }
    actions
}

async fn call_provider(
    provider: &str,
    api_key: &str,
    model_name: Option<&str>,
    custom_base_url: Option<&str>,
    messages: &[ChatMessage],
    system_context: &str,
) -> Result<String, String> {
    let model = model_name
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| get_default_model(provider));

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    match provider {
        "gemini" => {
            let endpoint = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            );
            let contents: Vec<Value> = messages
                .iter()
                .filter(|m| m.role == "user" || m.role == "assistant")
                .map(|m| {
                    json!({
                        "role": if m.role == "assistant" { "model" } else { "user" },
                        "parts": [{ "text": m.content }],
                    })
                })
                .collect();
            let payload = json!({
                "contents": contents,
                "systemInstruction": { "parts": [{ "text": system_context }] },
                "generationConfig": { "temperature": 0.7, "maxOutputTokens": 2048 },
            });
            let res = client
                .post(&endpoint)
                .header("Content-Type", "application/json")
                .json(&payload)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let status = res.status().as_u16();
            let ok = res.status().is_success();
            let data: Value = res.json().await.map_err(|e| e.to_string())?;
            if !ok || data.get("error").is_some_and(|e| !e.is_null()) {
                let msg = data["error"]["message"].as_str().map_or_else(
                    || format!("Google Gemini API Error ({status})"),
                    ToString::to_string,
                );
                return Err(msg);
            }
            data["candidates"][0]["content"]["parts"][0]["text"]
                .as_str()
                .map(ToString::to_string)
                .ok_or_else(|| "Không nhận được phản hồi từ Google Gemini.".to_string())
        }
        "openrouter" => {
            let base = custom_base_url
                .filter(|s| !s.is_empty())
                .unwrap_or("https://openrouter.ai/api/v1")
                .trim_end_matches('/');
            let endpoint = format!("{base}/chat/completions");
            let mut open_msgs = vec![json!({ "role": "system", "content": system_context })];
            for m in messages {
                open_msgs.push(json!({ "role": m.role, "content": m.content }));
            }
            let payload = json!({
                "model": if model.is_empty() { "anthropic/claude-3.5-sonnet" } else { model },
                "messages": open_msgs,
                "temperature": 0.7,
                "max_tokens": 2048,
            });
            let res = client
                .post(&endpoint)
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {api_key}"))
                .header("HTTP-Referer", "http://localhost:3000")
                .header("X-Title", "KV Synology DSM Copilot")
                .json(&payload)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let status = res.status().as_u16();
            let ok = res.status().is_success();
            let data: Value = res.json().await.map_err(|e| e.to_string())?;
            if !ok || data.get("error").is_some_and(|e| !e.is_null()) {
                let msg = data["error"]["message"].as_str().map_or_else(
                    || format!("OpenRouter API Error ({status})"),
                    ToString::to_string,
                );
                return Err(msg);
            }
            data["choices"][0]["message"]["content"]
                .as_str()
                .map(ToString::to_string)
                .ok_or_else(|| "Không nhận được phản hồi từ OpenRouter.".to_string())
        }
        "opencode" => {
            let base = custom_base_url
                .filter(|s| !s.is_empty())
                .unwrap_or("http://localhost:4096/v1")
                .trim_end_matches('/');
            let endpoint = format!("{base}/chat/completions");
            let mut open_msgs = vec![json!({ "role": "system", "content": system_context })];
            for m in messages {
                open_msgs.push(json!({ "role": m.role, "content": m.content }));
            }
            let payload = json!({
                "model": if model.is_empty() { "opencode-interpreter" } else { model },
                "messages": open_msgs,
                "temperature": 0.7,
                "max_tokens": 2048,
            });
            let mut req = client
                .post(&endpoint)
                .header("Content-Type", "application/json")
                .json(&payload);
            if !api_key.is_empty() {
                req = req.header("Authorization", format!("Bearer {api_key}"));
            }
            let res = req.send().await.map_err(|e| e.to_string())?;
            let status = res.status().as_u16();
            let ok = res.status().is_success();
            let data: Value = res.json().await.map_err(|e| e.to_string())?;
            if !ok || data.get("error").is_some_and(|e| !e.is_null()) {
                let msg = data["error"]["message"].as_str().map_or_else(
                    || format!("OpenCode API Error ({status})"),
                    ToString::to_string,
                );
                return Err(msg);
            }
            data["choices"][0]["message"]["content"]
                .as_str()
                .map(ToString::to_string)
                .ok_or_else(|| "Không nhận được phản hồi từ OpenCode.".to_string())
        }
        "deepseek" => {
            let base = custom_base_url
                .filter(|s| !s.is_empty())
                .unwrap_or("https://api.deepseek.com")
                .trim_end_matches('/');
            let endpoint = format!("{base}/chat/completions");
            let mut open_msgs = vec![json!({ "role": "system", "content": system_context })];
            for m in messages {
                open_msgs.push(json!({ "role": m.role, "content": m.content }));
            }
            let payload = json!({
                "model": if model.is_empty() { "deepseek-chat" } else { model },
                "messages": open_msgs,
                "temperature": 0.7,
                "max_tokens": 2048,
            });
            let res = client
                .post(&endpoint)
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {api_key}"))
                .json(&payload)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let status = res.status().as_u16();
            let ok = res.status().is_success();
            let data: Value = res.json().await.map_err(|e| e.to_string())?;
            if !ok || data.get("error").is_some_and(|e| !e.is_null()) {
                let msg = data["error"]["message"].as_str().map_or_else(
                    || format!("DeepSeek API Error ({status})"),
                    ToString::to_string,
                );
                return Err(msg);
            }
            data["choices"][0]["message"]["content"]
                .as_str()
                .map(ToString::to_string)
                .ok_or_else(|| "Không nhận được phản hồi từ DeepSeek.".to_string())
        }
        "claude" => {
            let endpoint = "https://api.anthropic.com/v1/messages";
            let claude_msgs: Vec<Value> = messages
                .iter()
                .filter(|m| m.role == "user" || m.role == "assistant")
                .map(|m| json!({ "role": m.role, "content": m.content }))
                .collect();
            let payload = json!({
                "model": if model.is_empty() { "claude-3-5-sonnet-latest" } else { model },
                "max_tokens": 2048,
                "system": system_context,
                "messages": claude_msgs,
                "temperature": 0.7,
            });
            let res = client
                .post(endpoint)
                .header("Content-Type", "application/json")
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .json(&payload)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let status = res.status().as_u16();
            let ok = res.status().is_success();
            let data: Value = res.json().await.map_err(|e| e.to_string())?;
            if !ok || data.get("error").is_some_and(|e| !e.is_null()) {
                let msg = data["error"]["message"].as_str().map_or_else(
                    || format!("Anthropic Claude API Error ({status})"),
                    ToString::to_string,
                );
                return Err(msg);
            }
            data["content"][0]["text"]
                .as_str()
                .map(ToString::to_string)
                .ok_or_else(|| "Không nhận được phản hồi từ Anthropic Claude.".to_string())
        }
        "openai" => {
            let base = custom_base_url
                .filter(|s| !s.is_empty())
                .unwrap_or("https://api.openai.com/v1")
                .trim_end_matches('/');
            let endpoint = format!("{base}/chat/completions");
            let mut open_msgs = vec![json!({ "role": "system", "content": system_context })];
            for m in messages {
                open_msgs.push(json!({ "role": m.role, "content": m.content }));
            }
            let payload = json!({
                "model": if model.is_empty() { "gpt-4o-mini" } else { model },
                "messages": open_msgs,
                "temperature": 0.7,
                "max_tokens": 2048,
            });
            let res = client
                .post(&endpoint)
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {api_key}"))
                .json(&payload)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let status = res.status().as_u16();
            let ok = res.status().is_success();
            let data: Value = res.json().await.map_err(|e| e.to_string())?;
            if !ok || data.get("error").is_some_and(|e| !e.is_null()) {
                let msg = data["error"]["message"].as_str().map_or_else(
                    || format!("OpenAI API Error ({status})"),
                    ToString::to_string,
                );
                return Err(msg);
            }
            data["choices"][0]["message"]["content"]
                .as_str()
                .map(ToString::to_string)
                .ok_or_else(|| "Không nhận được phản hồi từ OpenAI.".to_string())
        }
        other => Err(format!("Nhà cung cấp AI \"{other}\" không được hỗ trợ.")),
    }
}

pub async fn handle_post(body_bytes: &[u8]) -> HttpReply {
    let body: Value = match serde_json::from_slice(body_bytes) {
        Ok(v) => v,
        Err(err) => {
            return HttpReply {
                status: 500,
                body: json!({ "success": false, "error": err.to_string() }),
            };
        }
    };

    let action = body
        .get("action")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .unwrap_or("chat");
    let provider = body
        .get("provider")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .unwrap_or("gemini");
    let api_key = body
        .get("apiKey")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("");
    let custom_base_url = body
        .get("customBaseUrl")
        .and_then(Value::as_str)
        .map(str::trim);
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty());

    // 1. TEST CONNECTION
    if action == "test" {
        if api_key.is_empty()
            && provider != "webllm"
            && provider != "heuristic"
            && provider != "opencode"
        {
            return HttpReply {
                status: 400,
                body: json!({
                    "success": false,
                    "error": "Vui lòng nhập API Key trước khi kiểm tra kết nối.",
                }),
            };
        }

        let start = Instant::now();
        let test_prompt = [ChatMessage {
            role: "user".to_string(),
            content: "Ping test. Reply with 'OK'.".to_string(),
        }];
        match call_provider(
            provider,
            api_key,
            model,
            custom_base_url,
            &test_prompt,
            "You are an assistant. Reply concisely with 'OK'.",
        )
        .await
        {
            Ok(reply) => {
                let latency_ms = start.elapsed().as_millis() as u64;
                let prov_up = provider.to_uppercase();
                HttpReply {
                    status: 200,
                    body: json!({
                        "success": true,
                        "latencyMs": latency_ms,
                        "message": format!("Kết nối thành công tới {prov_up} ({latency_ms}ms)!"),
                        "preview": slice_chars(&reply, 100),
                    }),
                }
            }
            Err(err) => HttpReply {
                status: 400,
                body: json!({
                    "success": false,
                    "error": if err.is_empty() {
                        "Không thể kết nối đến nhà cung cấp AI. Vui lòng kiểm tra lại API Key, Endpoint hoặc tên mô hình.".to_string()
                    } else {
                        err
                    },
                }),
            },
        }
    } else {
        // 2. CHAT
        let raw_msgs = match body.get("messages") {
            Some(Value::Array(arr)) => arr.clone(),
            None | Some(Value::Null) => Vec::new(),
            Some(_) => {
                return HttpReply {
                    status: 500,
                    body: json!({
                        "success": false,
                        "error": "messages must be an array",
                    }),
                };
            }
        };

        if raw_msgs.is_empty() {
            return HttpReply {
                status: 400,
                body: json!({
                    "success": false,
                    "error": "Danh sách tin nhắn trống.",
                }),
            };
        }

        let messages: Vec<ChatMessage> = raw_msgs
            .into_iter()
            .filter_map(|v| serde_json::from_value(v).ok())
            .collect();

        let tools_lines: Vec<String> = MCP_AVAILABLE_TOOLS
            .iter()
            .map(|t| {
                format!(
                    "- `{}`: {} -> Tham số: {}",
                    t.name, t.description, t.params_json
                )
            })
            .collect();
        let mcp_instructions = format!(
            "\nBẠN ĐƯỢC TÍCH HỢP TRỰC TIẾP VỚI MCP SERVER (MODEL CONTEXT PROTOCOL) ĐỂ ĐIỀU KHIỂN THIẾT BỊ SYNOLOGY NAS.\n\
Các công cụ MCP sẵn có bạn có thể gọi khi người dùng yêu cầu thực hiện hành động trên NAS:\n\
{}\n\n\
KHI NGƯỜI DÙNG YÊU CẦU THỰC HIỆN MỘT THAO TÁC (như khởi động lại gói, dừng container, mở khóa IP, cập nhật gói, kiểm tra tài nguyên):\n\
Hãy trả lời rõ ràng giải thích hành động, đồng thời thêm thẻ lệnh JSON MCP ở cuối câu trả lời theo cú pháp:\n\
```mcp_action\n\
{{\n\
  \"tool\": \"tên_công_cụ\",\n\
  \"params\": {{ ...các tham số... }},\n\
  \"description\": \"Mô tả ngắn hành động vừa thực hiện\"\n\
}}\n\
```\n\
Hệ thống sẽ tự động bắt thẻ này và thực thi trực tiếp trên Synology NAS qua MCP Server!\n",
            tools_lines.join("\n")
        );

        let telemetry_prefix = body
            .get("telemetryContext")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty())
            .unwrap_or("Bạn là \"DSM AI Copilot\" - Trợ lý Trí tuệ Nhân tạo thông minh, hỗ trợ quản trị và chẩn đoán toàn diện thiết bị Synology NAS.\nHãy trả lời ngắn gọn, chuẩn xác, thân thiện và hữu ích bằng Tiếng Việt.");
        let system_context = format!("{telemetry_prefix}\n\n{mcp_instructions}");

        if api_key.is_empty()
            && provider != "opencode"
            && provider != "webllm"
            && provider != "heuristic"
        {
            return HttpReply {
                status: 400,
                body: json!({
                    "success": false,
                    "error": format!(
                        "Chưa cấu hình API Key cho {}. Vui lòng vào Cài đặt -> AI Copilot để nhập API Key.",
                        provider.to_uppercase()
                    ),
                }),
            };
        }

        match call_provider(
            provider,
            api_key,
            model,
            custom_base_url,
            &messages,
            &system_context,
        )
        .await
        {
            Ok(reply) => {
                let actions = extract_mcp_actions(&reply);
                let mut out = Map::new();
                out.insert("success".to_string(), Value::Bool(true));
                out.insert("provider".to_string(), Value::String(provider.to_string()));
                out.insert(
                    "model".to_string(),
                    Value::String(
                        model
                            .unwrap_or_else(|| get_default_model(provider))
                            .to_string(),
                    ),
                );
                out.insert("reply".to_string(), Value::String(reply));
                if !actions.is_empty() {
                    out.insert(
                        "mcpActions".to_string(),
                        serde_json::to_value(actions).unwrap_or(Value::Array(Vec::new())),
                    );
                }
                HttpReply {
                    status: 200,
                    body: Value::Object(out),
                }
            }
            Err(err) => HttpReply {
                status: 500,
                body: json!({
                    "success": false,
                    "error": if err.is_empty() {
                        "Lỗi trong quá trình xử lý yêu cầu AI.".to_string()
                    } else {
                        err
                    },
                }),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn validation_and_mcp_extraction() {
        let _ = &*RE_MCP_ACTION;

        let empty_msgs =
            handle_post(br#"{"provider":"gemini","apiKey":"test","messages":[]}"#).await;
        assert_eq!(empty_msgs.status, 400);
        assert_eq!(empty_msgs.body["error"], "Danh sách tin nhắn trống.");

        let missing_key = handle_post(
            r#"{"provider":"gemini","messages":[{"role":"user","content":"Kiểm tra NAS"}]}"#
                .as_bytes(),
        )
        .await;
        assert_eq!(missing_key.status, 400);
        assert_eq!(
            missing_key.body["error"],
            "Chưa cấu hình API Key cho GEMINI. Vui lòng vào Cài đặt -> AI Copilot để nhập API Key."
        );

        let test_missing = handle_post(br#"{"action":"test","provider":"openai"}"#).await;
        assert_eq!(test_missing.status, 400);
        assert_eq!(
            test_missing.body["error"],
            "Vui lòng nhập API Key trước khi kiểm tra kết nối."
        );

        let sample = "Đang khởi động lại.\n```mcp_action\n{\"tool\":\"dsm_control_package\",\"params\":{\"package_id\":\"PlexMediaServer\",\"action\":\"restart\"},\"description\":\"Restart Plex\"}\n```";
        let extracted = extract_mcp_actions(sample);
        assert_eq!(extracted.len(), 1);
        assert_eq!(extracted[0].tool, "dsm_control_package");
    }
}
