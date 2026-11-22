#![forbid(unsafe_code)]

use std::collections::HashSet;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

#[derive(Clone, Serialize, Deserialize)]
pub struct ModelItem {
    pub id: String,
    pub label: String,
    pub desc: String,
}

fn item(id: &str, label: &str, desc: &str) -> ModelItem {
    ModelItem {
        id: id.to_string(),
        label: label.to_string(),
        desc: desc.to_string(),
    }
}

pub fn fallback_models(provider: &str) -> Vec<ModelItem> {
    match provider {
        "openrouter" => vec![
            item(
                "anthropic/claude-3.7-sonnet",
                "Claude 3.7 Sonnet (anthropic/claude-3.7-sonnet)",
                "Mô hình lập luận Hybrid hàng đầu thế giới của Anthropic",
            ),
            item(
                "anthropic/claude-3.5-sonnet",
                "Claude 3.5 Sonnet (anthropic/claude-3.5-sonnet)",
                "Khả năng phân tích hệ thống và lập luận kỹ thuật chuẩn xác",
            ),
            item(
                "anthropic/claude-3.5-haiku",
                "Claude 3.5 Haiku (anthropic/claude-3.5-haiku)",
                "Mô hình siêu tốc độ, chi phí thấp",
            ),
            item(
                "deepseek/deepseek-chat",
                "DeepSeek V3 (deepseek/deepseek-chat)",
                "Mô hình tổng quát 671B tham số hiệu năng cao",
            ),
            item(
                "deepseek/deepseek-r1",
                "DeepSeek R1 (deepseek/deepseek-r1)",
                "Mô hình chuỗi suy luận sâu giải quyết lỗi khó",
            ),
            item(
                "openai/gpt-4o",
                "GPT-4o (openai/gpt-4o)",
                "Mô hình đa phương thức hàng đầu OpenAI",
            ),
            item(
                "openai/gpt-4o-mini",
                "GPT-4o Mini (openai/gpt-4o-mini)",
                "Mô hình nhỏ gọn, phản hồi tức thì",
            ),
            item(
                "openai/o3-mini",
                "o3-mini (openai/o3-mini)",
                "Mô hình lý luận nhanh mới nhất của OpenAI",
            ),
            item(
                "meta-llama/llama-3.3-70b-instruct",
                "Llama 3.3 70B (meta-llama/llama-3.3-70b-instruct)",
                "Mã nguồn mở thế hệ mới của Meta",
            ),
            item(
                "qwen/qwen-2.5-72b-instruct",
                "Qwen 2.5 72B (qwen/qwen-2.5-72b-instruct)",
                "Mô hình tiếng Việt và đa ngữ xuất sắc từ Alibaba",
            ),
            item(
                "google/gemini-2.0-flash-001",
                "Gemini 2.0 Flash (google/gemini-2.0-flash-001)",
                "Mô hình Google Flash qua OpenRouter",
            ),
        ],
        "deepseek" => vec![
            item(
                "deepseek-chat",
                "DeepSeek-V3 (deepseek-chat - Khuyên dùng)",
                "Mô hình tổng quát đa nhiệm mạnh mẽ, tốc độ cao",
            ),
            item(
                "deepseek-reasoner",
                "DeepSeek-R1 (deepseek-reasoner - Suy luận sâu)",
                "Mô hình chuỗi suy luận Chain of Thought chuyên sâu",
            ),
        ],
        "claude" => vec![
            item(
                "claude-3-7-sonnet-latest",
                "Claude 3.7 Sonnet (Mới nhất - Khuyên dùng)",
                "Mô hình thế hệ mới nhất với năng lực lập luận hybrid vượt trội",
            ),
            item(
                "claude-3-5-sonnet-latest",
                "Claude 3.5 Sonnet (Tiêu chuẩn kỹ thuật)",
                "Chuẩn xác cao trong chẩn đoán và khắc phục sự cố DSM",
            ),
            item(
                "claude-3-5-haiku-latest",
                "Claude 3.5 Haiku (Siêu tốc)",
                "Phản hồi cực nhanh, tiết kiệm token",
            ),
            item(
                "claude-3-opus-latest",
                "Claude 3 Opus (Phân tích chuyên sâu)",
                "Khả năng xử lý tác vụ tư duy phức tạp",
            ),
        ],
        "openai" => vec![
            item(
                "gpt-4o-mini",
                "GPT-4o Mini (Nhanh & Nhẹ - Khuyên dùng)",
                "Tối ưu chi phí và độ trễ cho quản trị DSM",
            ),
            item(
                "gpt-4o",
                "GPT-4o (Toàn năng Flagship)",
                "Mô hình mạnh mẽ hàng đầu của OpenAI",
            ),
            item(
                "o3-mini",
                "o3-mini (Lý luận nhanh)",
                "Mô hình reasoning thế hệ mới hiệu năng cao",
            ),
            item(
                "o1",
                "o1 (Lý luận chuyên sâu)",
                "Mô hình suy luận sâu cho bài toán phức tạp",
            ),
            item(
                "gpt-4-turbo",
                "GPT-4 Turbo",
                "Mô hình GPT-4 kinh điển ổn định",
            ),
        ],
        "opencode" => vec![
            item(
                "anthropic/claude-sonnet-4-5",
                "Claude Sonnet 4.5 (anthropic/claude-sonnet-4-5 - Cấu hình OpenCode)",
                "Mô hình cấu hình chính thức trong opencode.json",
            ),
            item(
                "opencode/zen-1",
                "OpenCode Zen-1 (Code & Script - Khuyên dùng)",
                "Mô hình lý luận và code chính thức của OpenCode",
            ),
            item(
                "opencode-interpreter",
                "OpenCode Interpreter (Tự động hóa DSM)",
                "Tối ưu cho việc thực thi lệnh quản trị và điều khiển NAS",
            ),
            item(
                "anthropic/claude-3.7-sonnet",
                "Claude 3.7 Sonnet (qua OpenCode)",
                "Mô hình lập luận Hybrid hàng đầu thế giới",
            ),
            item(
                "deepseek/deepseek-r1",
                "DeepSeek R1 (qua OpenCode)",
                "Mô hình chuỗi suy luận sâu giải quyết lỗi phức tạp",
            ),
            item(
                "deepseek/deepseek-chat",
                "DeepSeek V3 (qua OpenCode)",
                "Mô hình tổng quát đa nhiệm mạnh mẽ",
            ),
            item(
                "openai/gpt-4o",
                "GPT-4o (qua OpenCode)",
                "Mô hình đa phương thức flagship của OpenAI",
            ),
            item(
                "openai/o3-mini",
                "o3-mini (qua OpenCode)",
                "Mô hình lý luận nhanh thế hệ mới",
            ),
            item(
                "atomic/Qwen3.5-9B-Q4_K_M",
                "Qwen 3.5 9B (Local Atomic Chat)",
                "Mô hình chạy cục bộ cấu hình qua opencode.json",
            ),
            item(
                "lmstudio/local-model",
                "LM Studio Active Model",
                "Mô hình cục bộ qua LM Studio",
            ),
            item(
                "meta-llama/llama-3.3-70b-instruct",
                "Llama 3.3 70B (qua OpenCode)",
                "Mô hình mã nguồn mở thế hệ mới của Meta",
            ),
        ],
        "webllm" => vec![
            item(
                "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
                "Qwen 2.5 (0.5B Micro - 380MB)",
                "Siêu nhẹ, tải trong 5-10s, chạy mượt trên mọi máy tính",
            ),
            item(
                "Llama-3.2-1B-Instruct-q4f32_1-MLC",
                "Llama 3.2 (1B Universal - 880MB)",
                "Mô hình Meta AI thế hệ mới, hỗ trợ WebGPU",
            ),
            item(
                "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",
                "Qwen 2.5 (1.5B Tiếng Việt - 1.1GB)",
                "Hiểu sâu ngữ cảnh Tiếng Việt và thuật ngữ Synology",
            ),
            item(
                "SmolLM2-360M-Instruct-q0f32-MLC",
                "SmolLM2 (360M Gọn nhẹ - 260MB)",
                "Mô hình tiêu thụ ít RAM nhất",
            ),
        ],
        _ => vec![
            item(
                "gemini-2.5-flash",
                "Gemini 2.5 Flash (Thế hệ mới nhất - Siêu tốc)",
                "Mô hình mới nhất, độ trễ cực thấp, tối ưu cho DSM",
            ),
            item(
                "gemini-2.5-pro",
                "Gemini 2.5 Pro (Suy luận sâu nâng cao)",
                "Mô hình suy luận mạnh mẽ giải quyết tác vụ phức tạp",
            ),
            item(
                "gemini-2.0-flash",
                "Gemini 2.0 Flash (Nhanh & Thông minh - Khuyên dùng)",
                "Cân bằng hoàn hảo giữa tốc độ, trí tuệ và độ chính xác",
            ),
            item(
                "gemini-2.0-flash-lite",
                "Gemini 2.0 Flash Lite (Tiết kiệm tài nguyên)",
                "Độ trễ thấp nhất, tối ưu cho phản hồi nhanh",
            ),
            item(
                "gemini-1.5-flash",
                "Gemini 1.5 Flash (Tiêu chuẩn)",
                "Tốc độ ổn định cho các tác vụ hàng ngày",
            ),
            item(
                "gemini-1.5-pro",
                "Gemini 1.5 Pro (Ngữ cảnh 2M Tokens)",
                "Khả năng phân tích hệ thống và tài liệu kỹ thuật dài",
            ),
        ],
    }
}

pub struct HttpReply {
    pub status: u16,
    pub body: Value,
}

fn gemini_rank(id: &str) -> i32 {
    if id.contains("2.5-flash") {
        1
    } else if id.contains("2.5-pro") {
        2
    } else if id.contains("2.0-flash") && !id.contains("lite") {
        3
    } else if id.contains("2.0-flash-lite") {
        4
    } else if id.contains("1.5-flash") {
        5
    } else if id.contains("1.5-pro") {
        6
    } else {
        10
    }
}

fn slice_chars(s: &str, max_chars: usize) -> &str {
    match s.char_indices().nth(max_chars) {
        Some((idx, _)) => &s[..idx],
        None => s,
    }
}

fn http_client() -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
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
        .map(str::trim)
        .unwrap_or("");

    let fallback = fallback_models(provider);

    if api_key.is_empty() && provider != "webllm" && provider != "opencode" {
        return HttpReply {
            status: 200,
            body: json!({
                "success": true,
                "source": "curated",
                "models": fallback,
                "message": "Danh sách mô hình chuẩn (nhập API Key để lấy danh sách thời gian thực từ tài khoản của bạn).",
            }),
        };
    }

    let Ok(client) = http_client() else {
        return fallback_reply(fallback);
    };

    match provider {
        "gemini" => {
            let url =
                format!("https://generativelanguage.googleapis.com/v1beta/models?key={api_key}");
            if let Ok(res) = client
                .get(&url)
                .header("Content-Type", "application/json")
                .send()
                .await
                && res.status().is_success()
                && let Ok(data) = res.json::<Value>().await
                && let Some(models_arr) = data.get("models").and_then(Value::as_array)
            {
                let mut live_models: Vec<ModelItem> = models_arr
                    .iter()
                    .filter(|m| {
                        let name = m
                            .get("name")
                            .and_then(Value::as_str)
                            .unwrap_or("")
                            .strip_prefix("models/")
                            .unwrap_or_else(|| m.get("name").and_then(Value::as_str).unwrap_or(""));
                        let methods = m
                            .get("supportedGenerationMethods")
                            .and_then(Value::as_array);
                        let is_gen = methods.is_some_and(|arr| {
                            arr.iter().any(|x| x.as_str() == Some("generateContent"))
                        });
                        let not_excluded = !name.contains("embedding")
                            && !name.contains("aqa")
                            && !name.contains("imagen")
                            && !name.contains("text-embedding");
                        is_gen && not_excluded
                    })
                    .map(|m| {
                        let raw_name = m.get("name").and_then(Value::as_str).unwrap_or("");
                        let id = raw_name
                            .strip_prefix("models/")
                            .unwrap_or(raw_name)
                            .to_string();
                        let display_name = m
                            .get("displayName")
                            .and_then(Value::as_str)
                            .filter(|s| !s.is_empty())
                            .unwrap_or(&id);
                        let desc = m
                            .get("description")
                            .and_then(Value::as_str)
                            .filter(|s| !s.is_empty())
                            .map_or_else(
                                || "Google Gemini Model".to_string(),
                                |d| format!("{}...", slice_chars(d, 100)),
                            );
                        ModelItem {
                            label: format!("{display_name} ({id})"),
                            id,
                            desc,
                        }
                    })
                    .collect();

                if !live_models.is_empty() {
                    live_models.sort_by_key(|m| gemini_rank(&m.id));
                    let count = live_models.len();
                    return HttpReply {
                        status: 200,
                        body: json!({
                            "success": true,
                            "source": "live",
                            "models": live_models,
                            "message": format!("Đã tìm thấy {count} mô hình Google Gemini khả dụng từ tài khoản của bạn!"),
                        }),
                    };
                }
            }
        }
        "openrouter" => {
            let base = if custom_base_url.is_empty() {
                "https://openrouter.ai/api/v1"
            } else {
                custom_base_url
            };
            let url = format!("{}/models", base.trim_end_matches('/'));
            let mut req = client.get(&url).header("Content-Type", "application/json");
            if !api_key.is_empty() {
                req = req.header("Authorization", format!("Bearer {api_key}"));
            }
            if let Ok(res) = req.send().await
                && res.status().is_success()
                && let Ok(data) = res.json::<Value>().await
                && let Some(arr) = data.get("data").and_then(Value::as_array)
            {
                let top_ids = [
                    "anthropic/claude-3.7-sonnet",
                    "anthropic/claude-3.5-sonnet",
                    "anthropic/claude-3.5-haiku",
                    "deepseek/deepseek-chat",
                    "deepseek/deepseek-r1",
                    "openai/gpt-4o",
                    "openai/gpt-4o-mini",
                    "openai/o3-mini",
                    "meta-llama/llama-3.3-70b-instruct",
                    "qwen/qwen-2.5-72b-instruct",
                    "google/gemini-2.0-flash-001",
                ];
                let mut found_top = Vec::new();
                let mut others = Vec::new();
                for m in arr {
                    let Some(id) = m.get("id").and_then(Value::as_str) else {
                        continue;
                    };
                    let name = m
                        .get("name")
                        .and_then(Value::as_str)
                        .filter(|s| !s.is_empty())
                        .unwrap_or(id);
                    let desc = m
                        .get("description")
                        .and_then(Value::as_str)
                        .filter(|s| !s.is_empty())
                        .map_or_else(
                            || {
                                let ctx = m
                                    .get("context_length")
                                    .and_then(Value::as_i64)
                                    .unwrap_or(128000);
                                format!("Context: {ctx} tokens")
                            },
                            |d| format!("{}...", slice_chars(d, 100)),
                        );
                    let entry = ModelItem {
                        id: id.to_string(),
                        label: format!("{name} ({id})"),
                        desc,
                    };
                    if top_ids.contains(&id) {
                        found_top.push(entry);
                    } else if (id.contains("claude")
                        || id.contains("gpt")
                        || id.contains("deepseek")
                        || id.contains("gemini")
                        || id.contains("qwen")
                        || id.contains("llama"))
                        && others.len() < 25
                    {
                        others.push(entry);
                    }
                }
                found_top.extend(others);
                if !found_top.is_empty() {
                    let count = found_top.len();
                    return HttpReply {
                        status: 200,
                        body: json!({
                            "success": true,
                            "source": "live",
                            "models": found_top,
                            "message": format!("Đã kết nối thành công tới OpenRouter ({count} mô hình được gợi ý)!"),
                        }),
                    };
                }
            }
        }
        "deepseek" => {
            let base = if custom_base_url.is_empty() {
                "https://api.deepseek.com"
            } else {
                custom_base_url
            };
            let url = format!("{}/models", base.trim_end_matches('/'));
            if let Ok(res) = client
                .get(&url)
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {api_key}"))
                .send()
                .await
                && res.status().is_success()
                && let Ok(data) = res.json::<Value>().await
                && let Some(arr) = data.get("data").and_then(Value::as_array)
                && !arr.is_empty()
            {
                let live_models: Vec<ModelItem> = arr
                    .iter()
                    .filter_map(|m| {
                        let id = m.get("id").and_then(Value::as_str)?;
                        let label = match id {
                            "deepseek-chat" => "DeepSeek-V3 (deepseek-chat)",
                            "deepseek-reasoner" => "DeepSeek-R1 (deepseek-reasoner)",
                            other => other,
                        };
                        let desc = if id == "deepseek-reasoner" {
                            "Mô hình chuỗi suy luận sâu (Reasoning Chain)"
                        } else {
                            "Mô hình tổng quát đa nhiệm tốc độ cao"
                        };
                        Some(item(id, label, desc))
                    })
                    .collect();
                if !live_models.is_empty() {
                    return HttpReply {
                        status: 200,
                        body: json!({
                            "success": true,
                            "source": "live",
                            "models": live_models,
                            "message": "Đã tải danh sách mô hình từ DeepSeek Platform!",
                        }),
                    };
                }
            }
        }
        "claude" => {
            if let Ok(res) = client
                .get("https://api.anthropic.com/v1/models")
                .header("Content-Type", "application/json")
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .send()
                .await
                && res.status().is_success()
                && let Ok(data) = res.json::<Value>().await
                && let Some(arr) = data.get("data").and_then(Value::as_array)
                && !arr.is_empty()
            {
                let live_models: Vec<ModelItem> = arr
                    .iter()
                    .filter_map(|m| {
                        let id = m.get("id").and_then(Value::as_str)?;
                        let disp = m
                            .get("display_name")
                            .and_then(Value::as_str)
                            .filter(|s| !s.is_empty())
                            .unwrap_or(id);
                        let created = m
                            .get("created_at")
                            .and_then(Value::as_str)
                            .filter(|s| !s.is_empty())
                            .unwrap_or("Recent");
                        Some(ModelItem {
                            id: id.to_string(),
                            label: format!("{disp} ({id})"),
                            desc: format!("Anthropic Claude Model - Created: {created}"),
                        })
                    })
                    .collect();
                if !live_models.is_empty() {
                    let count = live_models.len();
                    return HttpReply {
                        status: 200,
                        body: json!({
                            "success": true,
                            "source": "live",
                            "models": live_models,
                            "message": format!("Đã kết nối thành công tới Anthropic Console ({count} mô hình)!"),
                        }),
                    };
                }
            }
        }
        "openai" => {
            let base = if custom_base_url.is_empty() {
                "https://api.openai.com/v1"
            } else {
                custom_base_url
            };
            let url = format!("{}/models", base.trim_end_matches('/'));
            if let Ok(res) = client
                .get(&url)
                .header("Content-Type", "application/json")
                .header("Authorization", format!("Bearer {api_key}"))
                .send()
                .await
                && res.status().is_success()
                && let Ok(data) = res.json::<Value>().await
                && let Some(arr) = data.get("data").and_then(Value::as_array)
            {
                let live_models: Vec<ModelItem> = arr
                    .iter()
                    .filter_map(|m| {
                        let id = m.get("id").and_then(Value::as_str).unwrap_or("");
                        let ok_prefix = id.starts_with("gpt-4")
                            || id.starts_with("o1")
                            || id.starts_with("o3")
                            || id.starts_with("chatgpt");
                        let not_excluded = !id.contains("realtime")
                            && !id.contains("audio")
                            && !id.contains("transcription");
                        if ok_prefix && not_excluded {
                            let owner = m
                                .get("owned_by")
                                .and_then(Value::as_str)
                                .filter(|s| !s.is_empty())
                                .unwrap_or("openai");
                            Some(ModelItem {
                                id: id.to_string(),
                                label: id.to_string(),
                                desc: format!("OpenAI Model (Owner: {owner})"),
                            })
                        } else {
                            None
                        }
                    })
                    .collect();
                if !live_models.is_empty() {
                    let count = live_models.len();
                    return HttpReply {
                        status: 200,
                        body: json!({
                            "success": true,
                            "source": "live",
                            "models": live_models,
                            "message": format!("Đã tải {count} mô hình khả dụng từ OpenAI Platform!"),
                        }),
                    };
                }
            }
        }
        "opencode" => {
            let mut discovered = Vec::new();
            let mut seen = HashSet::new();

            // A. Read user opencode.json
            let home_dir = std::env::var("HOME").unwrap_or_else(|_| "/home/khoavo".to_string());
            let cfg_path = std::path::Path::new(&home_dir).join(".config/opencode/opencode.json");
            if let Ok(raw) = std::fs::read_to_string(cfg_path)
                && let Ok(cfg) = serde_json::from_str::<Value>(&raw)
            {
                if let Some(m) = cfg.get("model").and_then(Value::as_str)
                    && !m.is_empty()
                    && seen.insert(m.to_string())
                {
                    discovered.push(ModelItem {
                        id: m.to_string(),
                        label: format!("{m} (Mô hình mặc định trong opencode.json)"),
                        desc: "OpenCode Config Active Default Model".to_string(),
                    });
                }
                if let Some(providers) = cfg.get("provider").and_then(Value::as_object) {
                    for (p_id, p_val) in providers {
                        let p_name = p_val
                            .get("name")
                            .and_then(Value::as_str)
                            .unwrap_or(p_id.as_str());
                        if let Some(models) = p_val.get("models").and_then(Value::as_object) {
                            for (m_id, m_obj) in models {
                                let full_id = format!("{p_id}/{m_id}");
                                if seen.insert(full_id.clone()) {
                                    let m_name = m_obj
                                        .get("name")
                                        .and_then(Value::as_str)
                                        .unwrap_or(m_id.as_str());
                                    discovered.push(ModelItem {
                                        id: full_id,
                                        label: format!("{m_name} ({p_name})"),
                                        desc: format!(
                                            "Local/Configured OpenCode Provider ({p_id})"
                                        ),
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // B. Run local opencode CLI
            let bin_path = if std::path::Path::new("/home/khoavo/.opencode/bin/opencode").exists() {
                "/home/khoavo/.opencode/bin/opencode"
            } else {
                "opencode"
            };
            if let Ok(Ok(out)) = tokio::time::timeout(
                Duration::from_secs(3),
                tokio::process::Command::new(bin_path)
                    .arg("models")
                    .output(),
            )
            .await
                && out.status.success()
            {
                let text = String::from_utf8_lossy(&out.stdout);
                for line in text.lines().map(str::trim).filter(|l| !l.is_empty()) {
                    if discovered.len() < 50 && seen.insert(line.to_string()) {
                        discovered.push(item(line, line, "OpenCode CLI Available Model"));
                    }
                }
            }

            // C. Localhost or customBaseUrl server
            let target_url = if custom_base_url.is_empty() {
                "http://localhost:4096"
            } else {
                custom_base_url
            };
            let url = format!("{}/api/config", target_url.trim_end_matches('/'));
            let mut req = client.get(&url).header("Content-Type", "application/json");
            if !api_key.is_empty() {
                req = req.header("Authorization", format!("Bearer {api_key}"));
            }
            if let Ok(res) = req.send().await
                && res.status().is_success()
                && let Ok(cfg) = res.json::<Value>().await
                && let Some(m) = cfg.get("model").and_then(Value::as_str)
                && !m.is_empty()
                && seen.insert(m.to_string())
            {
                discovered.insert(
                    0,
                    ModelItem {
                        id: m.to_string(),
                        label: format!("{m} (Server Active Model)"),
                        desc: "Active Model on Running OpenCode Server".to_string(),
                    },
                );
            }

            // D. Live OpenCode Registry
            if let Ok(res) = client
                .get("https://models.opencode.ai/api.json")
                .header("Content-Type", "application/json")
                .send()
                .await
                && res.status().is_success()
                && let Ok(data) = res.json::<Value>().await
                && let Some(obj) = data.as_object()
            {
                let priority = [
                    "claude-sonnet",
                    "claude-3-7",
                    "claude-3-5",
                    "gpt-4o",
                    "o3-mini",
                    "deepseek-v3",
                    "deepseek-r1",
                    "llama-3.3",
                    "qwen-2.5",
                    "gemini-2.0",
                    "zen",
                ];
                for (p_id, p) in obj {
                    let p_name = p
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or(p_id.as_str());
                    if let Some(models) = p.get("models").and_then(Value::as_object) {
                        for (m_id, m) in models {
                            let short_low = m_id.to_lowercase();
                            let is_match = priority.iter().any(|k| short_low.contains(k));
                            let full_id = format!("{p_id}/{m_id}");
                            if is_match && discovered.len() < 50 && seen.insert(full_id.clone()) {
                                let m_name = m
                                    .get("name")
                                    .and_then(Value::as_str)
                                    .unwrap_or(m_id.as_str());
                                let desc = m
                                    .get("description")
                                    .and_then(Value::as_str)
                                    .filter(|s| !s.is_empty())
                                    .map_or_else(
                                        || "OpenCode Registry Model".to_string(),
                                        |d| slice_chars(d, 100).to_string(),
                                    );
                                discovered.push(ModelItem {
                                    id: full_id,
                                    label: format!("{m_name} ({p_name})"),
                                    desc,
                                });
                            }
                        }
                    }
                }
            }

            if !discovered.is_empty() {
                let mut final_models = Vec::new();
                let mut final_seen = HashSet::new();
                for m in discovered.into_iter().chain(fallback) {
                    if final_seen.insert(m.id.clone()) {
                        final_models.push(m);
                    }
                }
                let count = final_models.len();
                return HttpReply {
                    status: 200,
                    body: json!({
                        "success": true,
                        "source": "live",
                        "models": final_models,
                        "message": format!("Đã tìm nạp {count} mô hình từ OpenCode (Hệ thống cục bộ & OpenCode Registry)!"),
                    }),
                };
            }
        }
        _ => {}
    }

    fallback_reply(fallback)
}

fn fallback_reply(models: Vec<ModelItem>) -> HttpReply {
    HttpReply {
        status: 200,
        body: json!({
            "success": true,
            "source": "fallback",
            "models": models,
            "message": "Không thể tải danh sách động từ máy chủ API, đang sử dụng danh sách mô hình chuẩn đã cập nhật mới nhất.",
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn curated_models_for_all_cloud_providers() {
        for (prov, expected_first) in [
            ("gemini", "gemini-2.5-flash"),
            ("openrouter", "anthropic/claude-3.7-sonnet"),
            ("deepseek", "deepseek-chat"),
            ("claude", "claude-3-7-sonnet-latest"),
            ("openai", "gpt-4o-mini"),
        ] {
            let body = format!(r#"{{"provider":"{prov}"}}"#);
            let reply = handle_post(body.as_bytes()).await;
            assert_eq!(reply.status, 200);
            assert_eq!(reply.body["source"], "curated");
            assert_eq!(reply.body["models"][0]["id"], expected_first);
        }
    }

    #[tokio::test]
    async fn invalid_json_returns_500() {
        let reply = handle_post(b"not-json").await;
        assert_eq!(reply.status, 500);
        assert_eq!(reply.body["success"], false);
    }
}
