#![forbid(unsafe_code)]

use std::time::Duration;

use serde_json::{Value, json};

pub struct HttpReply {
    pub status: u16,
    pub body: Value,
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

    let channel = body
        .get("channel")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty());
    let Some(channel) = channel else {
        return HttpReply {
            status: 400,
            body: json!({ "success": false, "error": "Missing notification channel" }),
        };
    };

    let message = body
        .get("message")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty());

    let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
    else {
        return HttpReply {
            status: 500,
            body: json!({ "success": false, "error": "Lỗi khởi tạo HTTP client" }),
        };
    };

    if channel == "telegram" {
        let token = body
            .get("botToken")
            .and_then(Value::as_str)
            .map(str::trim)
            .unwrap_or("");
        let chat = body
            .get("chatId")
            .and_then(Value::as_str)
            .map(str::trim)
            .unwrap_or("");
        if token.is_empty() || chat.is_empty() {
            return HttpReply {
                status: 400,
                body: json!({
                    "success": false,
                    "error": "Vui lòng cung cấp Telegram Bot Token và Chat ID",
                }),
            };
        }

        let url = format!("https://api.telegram.org/bot{token}/sendMessage");
        let payload = json!({
            "chat_id": chat,
            "text": message.unwrap_or("Thông báo thử nghiệm từ KV-Synology"),
            "parse_mode": "Markdown",
        });
        match client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
        {
            Ok(res) => match res.json::<Value>().await {
                Ok(res_data) => {
                    if !res_data.get("ok").and_then(Value::as_bool).unwrap_or(false) {
                        let desc = res_data
                            .get("description")
                            .and_then(Value::as_str)
                            .filter(|s| !s.is_empty())
                            .unwrap_or("Lỗi gửi tin nhắn Telegram");
                        return HttpReply {
                            status: 400,
                            body: json!({ "success": false, "error": desc }),
                        };
                    }
                    return HttpReply {
                        status: 200,
                        body: json!({
                            "success": true,
                            "message": "Đã gửi thông báo Telegram thành công!",
                        }),
                    };
                }
                Err(err) => {
                    return HttpReply {
                        status: 500,
                        body: json!({ "success": false, "error": err.to_string() }),
                    };
                }
            },
            Err(err) => {
                return HttpReply {
                    status: 500,
                    body: json!({ "success": false, "error": err.to_string() }),
                };
            }
        }
    }

    if channel == "webhook" {
        let url = body
            .get("webhookUrl")
            .and_then(Value::as_str)
            .map(str::trim)
            .unwrap_or("");
        if url.is_empty() {
            return HttpReply {
                status: 400,
                body: json!({ "success": false, "error": "Vui lòng cung cấp Webhook URL" }),
            };
        }

        let msg_val = body.get("message").cloned().unwrap_or(Value::Null);
        let payload = json!({
            "text": msg_val,
            "content": msg_val,
            "username": "KV-Synology Monitor",
        });
        match client
            .post(url)
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
        {
            Ok(res) => {
                if !res.status().is_success() {
                    return HttpReply {
                        status: 400,
                        body: json!({
                            "success": false,
                            "error": format!("Webhook trả về mã lỗi HTTP {}", res.status().as_u16()),
                        }),
                    };
                }
                return HttpReply {
                    status: 200,
                    body: json!({
                        "success": true,
                        "message": "Đã gửi thông báo Webhook thành công!",
                    }),
                };
            }
            Err(err) => {
                return HttpReply {
                    status: 500,
                    body: json!({ "success": false, "error": err.to_string() }),
                };
            }
        }
    }

    HttpReply {
        status: 400,
        body: json!({ "success": false, "error": "Kênh thông báo không hỗ trợ" }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn validation_paths_match_nextjs() {
        let missing = handle_post(b"{}").await;
        assert_eq!(missing.status, 400);
        assert_eq!(missing.body["error"], "Missing notification channel");

        let tg = handle_post(br#"{"channel":"telegram"}"#).await;
        assert_eq!(tg.status, 400);
        assert_eq!(
            tg.body["error"],
            "Vui lòng cung cấp Telegram Bot Token và Chat ID"
        );

        let wh = handle_post(br#"{"channel":"webhook"}"#).await;
        assert_eq!(wh.status, 400);
        assert_eq!(wh.body["error"], "Vui lòng cung cấp Webhook URL");

        let sms = handle_post(br#"{"channel":"sms"}"#).await;
        assert_eq!(sms.status, 400);
        assert_eq!(sms.body["error"], "Kênh thông báo không hỗ trợ");
    }
}
