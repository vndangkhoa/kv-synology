#![forbid(unsafe_code)]

use std::sync::LazyLock;
use std::time::Duration;

use chrono::{DateTime, Datelike, Local, Utc};
use regex::Regex;
use serde::Serialize;
use serde_json::{Value, json};

pub struct HttpReply {
    pub status: u16,
    pub body: Value,
}

fn compile_regex(pat: &str) -> Regex {
    // INFALLIBLE: compile-time constant regex validated in tests.
    Regex::new(pat).expect("valid constant regex")
}

static RE_GDRIVE_1: LazyLock<Regex> = LazyLock::new(|| compile_regex(r"/file/d/([a-zA-Z0-9_-]+)"));
static RE_GDRIVE_2: LazyLock<Regex> = LazyLock::new(|| compile_regex(r"id=([a-zA-Z0-9_-]+)"));
static RE_FSHARE: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"fshare\.vn/file/([a-zA-Z0-9]+)"));
static RE_MF_1: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(r#"(?i)href="([^"]+mediafire\.com/[^"]+)"\s+id="downloadButton""#)
});
static RE_MF_2: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r#"(?i)aria-label="Download file"\s+href="([^"]+)""#));

static RE_RSS_TITLE: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?is)<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>"));
static RE_RSS_ITEM: LazyLock<Regex> = LazyLock::new(|| compile_regex(r"(?is)<item[\s\S]*?</item>"));
static RE_ITEM_TITLE: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?is)<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?</title>"));
static RE_ENCLOSURE: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r#"(?is)<enclosure[\s\S]*?url=["']([^"']+)["']"#));
static RE_ITEM_LINK: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?is)<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?</link>"));
static RE_MAGNET: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r#"(?i)(magnet:\?xt=urn:[^"'\s<>]+)"#));
static RE_PUB_DATE: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?is)<pubDate>([\s\S]*?)</pubDate>"));
static RE_DESC: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(r"(?is)<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?</description>")
});
static RE_HTML_TAGS: LazyLock<Regex> = LazyLock::new(|| compile_regex(r"<[^>]*>"));
static RE_SIZE_LEN: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r#"(?i)length=["']([0-9]+)["']"#));
static RE_SIZE_TAG: LazyLock<Regex> = LazyLock::new(|| compile_regex(r"(?i)<size>([0-9]+)</size>"));

/// Exact JS `encodeURIComponent` encoding (UTF-8 bytes, unescaped set: `A-Za-z0-9 - _ . ! ~ * ' ( )`).
pub fn encode_uri_component(input: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";
    let mut out = String::with_capacity(input.len() * 2);
    for b in input.as_bytes() {
        let is_unreserved = b.is_ascii_alphanumeric()
            || matches!(
                b,
                b'-' | b'_' | b'.' | b'!' | b'~' | b'*' | b'\'' | b'(' | b')'
            );
        if is_unreserved {
            out.push(*b as char);
        } else {
            out.push('%');
            out.push(HEX[(b >> 4) as usize] as char);
            out.push(HEX[(b & 0x0f) as usize] as char);
        }
    }
    out
}

fn json_num_or_zero(v: Option<&Value>) -> i64 {
    match v {
        Some(Value::Number(n)) => n
            .as_i64()
            .or_else(|| n.as_f64().map(|f| f as i64))
            .unwrap_or(0),
        Some(Value::String(s)) => s
            .trim()
            .parse::<i64>()
            .or_else(|_| s.trim().parse::<f64>().map(|f| f as i64))
            .unwrap_or(0),
        _ => 0,
    }
}

fn slice_chars(s: &str, max_chars: usize) -> &str {
    match s.char_indices().nth(max_chars) {
        Some((idx, _)) => &s[..idx],
        None => s,
    }
}

#[derive(Clone, Serialize)]
struct BtSearchItem {
    title: String,
    download: String,
    size: i64,
    datetime: String,
    seednum: i64,
    leech: i64,
    category: String,
}

/// Port of `GET /api/download/bt-search`.
pub async fn handle_bt_search(q: &str) -> HttpReply {
    if q.trim().is_empty() {
        return HttpReply {
            status: 200,
            body: json!({ "items": [], "total": 0 }),
        };
    }

    let query_enc = encode_uri_component(q.trim());
    let mut results: Vec<BtSearchItem> = Vec::new();
    let today_iso = Utc::now().format("%Y-%m-%d").to_string();

    // 1. Apibay
    if let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(4))
        .build()
    {
        let url = format!("https://apibay.org/q.php?q={query_enc}&cat=");
        if let Ok(res) = client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (compatible; SynologyNAS/7.2)")
            .send()
            .await
            && res.status().is_success()
            && let Ok(Value::Array(data)) = res.json::<Value>().await
            && !data.is_empty()
            && data[0].get("name").and_then(Value::as_str) != Some("No results returned")
        {
            for item in data.iter().take(30) {
                let info_hash = item
                    .get("info_hash")
                    .and_then(Value::as_str)
                    .unwrap_or("undefined");
                let name = item
                    .get("name")
                    .and_then(Value::as_str)
                    .unwrap_or("undefined");
                let dn = encode_uri_component(name);
                let magnet = format!(
                    "magnet:?xt=urn:btih:{info_hash}&dn={dn}&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce"
                );
                let added_secs = json_num_or_zero(item.get("added"));
                let datetime = if added_secs != 0 {
                    DateTime::from_timestamp(added_secs, 0)
                        .map_or_else(|| today_iso.clone(), |dt| dt.format("%Y-%m-%d").to_string())
                } else {
                    today_iso.clone()
                };
                results.push(BtSearchItem {
                    title: name.to_string(),
                    download: magnet,
                    size: json_num_or_zero(item.get("size")),
                    datetime,
                    seednum: json_num_or_zero(item.get("seeders")),
                    leech: json_num_or_zero(item.get("leechers")),
                    category: "General".to_string(),
                });
            }
        }
    }

    // 2. YTS fallback if < 5 results
    if results.len() < 5
        && let Ok(client) = reqwest::Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
    {
        let url = format!("https://yts.mx/api/v2/list_movies.json?query_term={query_enc}&limit=10");
        if let Ok(res) = client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (compatible; SynologyNAS/7.2)")
            .send()
            .await
            && res.status().is_success()
            && let Ok(data) = res.json::<Value>().await
            && let Some(movies) = data.pointer("/data/movies").and_then(Value::as_array)
        {
            for m in movies {
                let title = m
                    .get("title_long")
                    .and_then(Value::as_str)
                    .or_else(|| m.get("title").and_then(Value::as_str))
                    .unwrap_or("");
                let dn = encode_uri_component(title);
                if let Some(tors) = m.get("torrents").and_then(Value::as_array) {
                    for tor in tors {
                        let hash = tor.get("hash").and_then(Value::as_str).unwrap_or("");
                        let quality = tor.get("quality").and_then(Value::as_str).unwrap_or("");
                        let ttype = tor.get("type").and_then(Value::as_str).unwrap_or("");
                        let magnet = format!(
                            "magnet:?xt=urn:btih:{hash}&dn={dn}&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80"
                        );
                        let datetime = tor
                            .get("date_uploaded")
                            .and_then(Value::as_str)
                            .and_then(|s| s.split(' ').next())
                            .map_or_else(|| today_iso.clone(), ToString::to_string);
                        results.push(BtSearchItem {
                            title: format!("{title} [{quality}] [{ttype}]"),
                            download: magnet,
                            size: json_num_or_zero(tor.get("size_bytes")),
                            datetime,
                            seednum: json_num_or_zero(tor.get("seeds")),
                            leech: json_num_or_zero(tor.get("peers")),
                            category: "Video".to_string(),
                        });
                    }
                }
            }
        }
    }

    // 3. Fallback Linux / Distro ISO tracker
    let q_lower = q.to_lowercase();
    if results.is_empty()
        && (q_lower.contains("ubuntu")
            || q_lower.contains("debian")
            || q_lower.contains("fedora")
            || q_lower.contains("arch")
            || q_lower.contains("mint"))
    {
        if q_lower.contains("ubuntu") {
            results.extend([
                BtSearchItem {
                    title: "ubuntu-24.04.1-desktop-amd64.iso".to_string(),
                    download: "https://releases.ubuntu.com/24.04.1/ubuntu-24.04.1-desktop-amd64.iso.torrent".to_string(),
                    size: 6_114_562_048,
                    datetime: "2024-08-29".to_string(),
                    seednum: 2450,
                    leech: 112,
                    category: "OS / Linux".to_string(),
                },
                BtSearchItem {
                    title: "ubuntu-24.04.1-live-server-amd64.iso".to_string(),
                    download: "https://releases.ubuntu.com/24.04.1/ubuntu-24.04.1-live-server-amd64.iso.torrent".to_string(),
                    size: 2_831_155_200,
                    datetime: "2024-08-29".to_string(),
                    seednum: 1820,
                    leech: 64,
                    category: "OS / Linux".to_string(),
                },
                BtSearchItem {
                    title: "ubuntu-22.04.5-desktop-amd64.iso".to_string(),
                    download: "https://releases.ubuntu.com/22.04.5/ubuntu-22.04.5-desktop-amd64.iso.torrent".to_string(),
                    size: 5_046_583_296,
                    datetime: "2024-09-12".to_string(),
                    seednum: 1205,
                    leech: 45,
                    category: "OS / Linux".to_string(),
                },
            ]);
        } else if q_lower.contains("debian") {
            results.push(BtSearchItem {
                title: "debian-12.7.0-amd64-netinst.iso".to_string(),
                download: "https://cdimage.debian.org/debian-cd/current/amd64/bt-cd/debian-12.7.0-amd64-netinst.iso.torrent".to_string(),
                size: 659_554_304,
                datetime: "2024-08-31".to_string(),
                seednum: 890,
                leech: 30,
                category: "OS / Linux".to_string(),
            });
        }
    }

    results.sort_by_key(|b| std::cmp::Reverse(b.seednum));
    let total = results.len();
    HttpReply {
        status: 200,
        body: json!({
            "items": results,
            "total": total,
            "query": q,
        }),
    }
}

/// Port of `POST /api/download/resolve-link`.
pub async fn handle_resolve_link(body_bytes: &[u8]) -> HttpReply {
    let body: Value = match serde_json::from_slice(body_bytes) {
        Ok(v) => v,
        Err(err) => {
            return HttpReply {
                status: 500,
                body: json!({ "error": err.to_string() }),
            };
        }
    };

    let url = body
        .get("url")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or("");
    if url.is_empty() {
        return HttpReply {
            status: 400,
            body: json!({ "error": "Missing url" }),
        };
    }

    if url.contains("drive.google.com") {
        let file_id = RE_GDRIVE_1
            .captures(url)
            .or_else(|| RE_GDRIVE_2.captures(url))
            .and_then(|c| c.get(1))
            .map(|m| m.as_str())
            .unwrap_or("");
        if !file_id.is_empty() {
            let direct_url = format!(
                "https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t"
            );
            return HttpReply {
                status: 200,
                body: json!({
                    "success": true,
                    "originalUrl": url,
                    "directUrl": direct_url,
                    "host": "Google Drive",
                    "filename": format!("gdrive_file_{file_id}.bin"),
                    "message": "Đã chuyển đổi Google Drive sang link tải trực tiếp!",
                }),
            };
        }
    }

    if url.contains("fshare.vn") {
        let file_code = RE_FSHARE
            .captures(url)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str())
            .unwrap_or("");
        return HttpReply {
            status: 200,
            body: json!({
                "success": true,
                "originalUrl": url,
                "directUrl": url,
                "host": "Fshare.vn",
                "fileCode": file_code,
                "note": "Đã gửi link tới Synology Fshare Host Plugin để tải với tài khoản VIP/Free.",
            }),
        };
    }

    if url.contains("mediafire.com")
        && let Ok(client) = reqwest::Client::builder()
            .timeout(Duration::from_secs(4))
            .build()
        && let Ok(res) = client
            .get(url)
            .header("User-Agent", "Mozilla/5.0")
            .send()
            .await
        && res.status().is_success()
        && let Ok(html) = res.text().await
        && let Some(m) = RE_MF_1
            .captures(&html)
            .or_else(|| RE_MF_2.captures(&html))
            .and_then(|c| c.get(1))
    {
        return HttpReply {
            status: 200,
            body: json!({
                "success": true,
                "originalUrl": url,
                "directUrl": m.as_str(),
                "host": "MediaFire",
            }),
        };
    }

    HttpReply {
        status: 200,
        body: json!({
            "success": true,
            "originalUrl": url,
            "directUrl": url,
            "host": "Generic",
        }),
    }
}

pub fn parse_rss_xml(xml: &str, url: &str) -> Result<Value, String> {
    let site_title = RE_RSS_TITLE
        .captures(xml)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().trim().to_string())
        .ok_or(())
        .or_else(|()| {
            url::Url::parse(url)
                .map(|u| u.host_str().unwrap_or("").to_string())
                .map_err(|e| e.to_string())
        })?;

    let mut items = Vec::new();
    let mut count = 0usize;
    for m in RE_RSS_ITEM.find_iter(xml) {
        if count >= 60 {
            break;
        }
        let item_xml = m.as_str();
        let i_title = RE_ITEM_TITLE
            .captures(item_xml)
            .and_then(|c| c.get(1))
            .map(|x| x.as_str().trim())
            .filter(|s| !s.is_empty())
            .unwrap_or("Untitled")
            .to_string();

        let download_url = if let Some(cap) = RE_MAGNET.captures(item_xml) {
            cap.get(1).map_or("", |x| x.as_str()).to_string()
        } else if let Some(cap) = RE_ENCLOSURE.captures(item_xml) {
            cap.get(1).map_or("", |x| x.as_str()).to_string()
        } else if let Some(cap) = RE_ITEM_LINK.captures(item_xml) {
            cap.get(1).map_or("", |x| x.as_str()).trim().to_string()
        } else {
            String::new()
        };

        if download_url.is_empty() {
            continue;
        }

        let pub_raw = RE_PUB_DATE
            .captures(item_xml)
            .and_then(|c| c.get(1))
            .map_or("", |x| x.as_str().trim());
        let publish_date = if pub_raw.is_empty() {
            String::new()
        } else if let Ok(dt) =
            DateTime::parse_from_rfc2822(pub_raw).or_else(|_| DateTime::parse_from_rfc3339(pub_raw))
        {
            let local = dt.with_timezone(&Local);
            format!("{}/{}/{}", local.month(), local.day(), local.year())
        } else {
            "Invalid Date".to_string()
        };

        let raw_desc = RE_DESC
            .captures(item_xml)
            .and_then(|c| c.get(1))
            .map_or("", |x| x.as_str());
        let stripped = RE_HTML_TAGS.replace_all(raw_desc, "");
        let desc = slice_chars(&stripped, 160).trim().to_string();

        let size: i64 = RE_SIZE_LEN
            .captures(item_xml)
            .or_else(|| RE_SIZE_TAG.captures(item_xml))
            .and_then(|c| c.get(1))
            .and_then(|x| x.as_str().parse().ok())
            .unwrap_or(0);

        items.push(json!({
            "id": format!("rss_item_{count}"),
            "title": i_title,
            "url": download_url,
            "description": desc,
            "publish_date": publish_date,
            "size": size,
        }));
        count += 1;
    }

    let total = items.len();
    Ok(json!({
        "title": site_title,
        "url": url,
        "items": items,
        "total": total,
    }))
}

/// Port of `GET /api/download/rss-fetch`.
pub async fn handle_rss_fetch(url: &str) -> HttpReply {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return HttpReply {
            status: 400,
            body: json!({ "error": "Missing url parameter" }),
        };
    }

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(6))
        .build()
    {
        Ok(c) => c,
        Err(err) => {
            return HttpReply {
                status: 500,
                body: json!({ "error": err.to_string() }),
            };
        }
    };

    let res = match client
        .get(trimmed)
        .header(
            "User-Agent",
            "Mozilla/5.0 (compatible; SynologyDownloadStation/7.2 RSS Reader)",
        )
        .header(
            "Accept",
            "application/rss+xml, application/xml, text/xml, */*",
        )
        .send()
        .await
    {
        Ok(r) => r,
        Err(err) => {
            return HttpReply {
                status: 500,
                body: json!({ "error": err.to_string() }),
            };
        }
    };

    if !res.status().is_success() {
        let code = res.status().as_u16();
        let reason = res.status().canonical_reason().unwrap_or("");
        return HttpReply {
            status: 502,
            body: json!({ "error": format!("HTTP {code}: {reason}") }),
        };
    }

    match res.text().await {
        Ok(xml) => match parse_rss_xml(&xml, url) {
            Ok(parsed) => HttpReply {
                status: 200,
                body: parsed,
            },
            Err(err) => HttpReply {
                status: 500,
                body: json!({ "error": err }),
            },
        },
        Err(err) => HttpReply {
            status: 500,
            body: json!({ "error": err.to_string() }),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn download_handlers_match_nextjs_contracts() {
        let _ = (
            &*RE_GDRIVE_1,
            &*RE_GDRIVE_2,
            &*RE_FSHARE,
            &*RE_MF_1,
            &*RE_MF_2,
        );
        let _ = (
            &*RE_RSS_TITLE,
            &*RE_RSS_ITEM,
            &*RE_ITEM_TITLE,
            &*RE_ENCLOSURE,
        );
        let _ = (
            &*RE_ITEM_LINK,
            &*RE_MAGNET,
            &*RE_PUB_DATE,
            &*RE_DESC,
            &*RE_HTML_TAGS,
        );
        let _ = (&*RE_SIZE_LEN, &*RE_SIZE_TAG);

        assert_eq!(
            encode_uri_component("👍🏽 thumbs"),
            "%F0%9F%91%8D%F0%9F%8F%BD%20thumbs"
        );

        let blank_bt = handle_bt_search("   ").await;
        assert_eq!(blank_bt.status, 200);
        assert_eq!(blank_bt.body, json!({ "items": [], "total": 0 }));

        let gd = handle_resolve_link(
            br#"{"url":"https://drive.google.com/file/d/1AbCdEfGhIjK/view?usp=sharing"}"#,
        )
        .await;
        assert_eq!(gd.status, 200);
        assert_eq!(gd.body["host"], "Google Drive");
        assert_eq!(gd.body["filename"], "gdrive_file_1AbCdEfGhIjK.bin");

        let fs = handle_resolve_link(br#"{"url":"https://www.fshare.vn/file/ABC123XYZ"}"#).await;
        assert_eq!(fs.body["fileCode"], "ABC123XYZ");

        let miss_rss = handle_rss_fetch("").await;
        assert_eq!(miss_rss.status, 400);
        assert_eq!(miss_rss.body["error"], "Missing url parameter");

        let xml = r#"<rss><channel><title>Linux Feed</title><item><title>Ubuntu</title><link>https://ubuntu.com/test.torrent</link><description>&lt;b&gt;ISO&lt;/b&gt;</description><size>1234</size></item></channel></rss>"#;
        let parsed = parse_rss_xml(xml, "https://example.com/rss").unwrap();
        assert_eq!(parsed["title"], "Linux Feed");
        assert_eq!(parsed["total"], 1);
        assert_eq!(parsed["items"][0]["size"], 1234);
    }
}
