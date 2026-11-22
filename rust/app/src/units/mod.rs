//! Pure-Rust router for `kv-synology` — zero Node.js fallback.

use std::collections::HashMap;

use axum::Router;
use axum::extract::Request;
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{any, get, post};

mod api_ai_chat;
mod api_ai_models;
mod api_download;
mod api_dsm_proxy;
mod api_geoip;
mod api_notifications;
mod api_smart_info;
mod api_snmp;
mod api_ssh;
mod api_traffic;
mod report_engine;

fn path_params(route: &str, path: &str) -> HashMap<String, String> {
    let mut out = HashMap::new();
    let mut segments = path.trim_start_matches('/').split('/');
    for part in route.trim_start_matches('/').split('/') {
        if let Some(name) = part.strip_prefix("{*").and_then(|p| p.strip_suffix('}')) {
            let rest: Vec<&str> = segments.by_ref().collect();
            out.insert(name.to_string(), decode(&rest.join("/")));
            break;
        }
        let segment = segments.next().unwrap_or_default();
        if let Some(name) = part.strip_prefix('{').and_then(|p| p.strip_suffix('}')) {
            out.insert(name.to_string(), decode(segment));
        }
    }
    out
}

fn decode(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        let hex = |at: usize| bytes.get(at).and_then(|b| char::from(*b).to_digit(16));
        if bytes[i] == b'%'
            && let (Some(high), Some(low)) = (hex(i + 1), hex(i + 2))
        {
            out.push((high * 16 + low) as u8);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).unwrap_or_else(|_| text.to_string())
}

async fn health() -> Response {
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/json")],
        r#"{"status":"ok","runtime":"rust","ui":"leptos-csr","version":"0.1.0"}"#,
    )
        .into_response()
}

pub fn router() -> Router {
    Router::new()
        .route("/api/health", get(health))
        .route("/api/ai/chat", post(route_5))
        .route("/api/ai/models", post(route_4))
        .route("/api/download/bt-search", get(route_7))
        .route("/api/download/resolve-link", post(route_8))
        .route("/api/download/rss-fetch", get(route_9))
        .route("/api/dsm/{*path}", any(route_16))
        .route("/api/geoip/lookup", get(route_10))
        .route("/api/notifications/dispatch", post(route_6))
        .route("/api/reports/export", get(route_2).post(route_3))
        .route("/api/reports/summary", get(route_0).post(route_1))
        .route("/api/snmp/discover", post(route_12))
        .route("/api/snmp/query", post(route_13))
        .route("/api/ssh/exec", post(route_14))
        .route("/api/storage/smart-info", post(route_15))
        .route("/api/traffic/connections", get(route_11))
        .fallback(crate::static_ui::serve_static)
}

async fn route_0(req: Request) -> Response {
    report_engine::handle("GET /api/reports/summary", HashMap::new(), req).await
}

async fn route_1(req: Request) -> Response {
    report_engine::handle("POST /api/reports/summary", HashMap::new(), req).await
}

async fn route_2(req: Request) -> Response {
    report_engine::handle("GET /api/reports/export", HashMap::new(), req).await
}

async fn route_3(req: Request) -> Response {
    report_engine::handle("POST /api/reports/export", HashMap::new(), req).await
}

async fn route_4(req: Request) -> Response {
    api_ai_models::handle("POST /api/ai/models", HashMap::new(), req).await
}

async fn route_5(req: Request) -> Response {
    api_ai_chat::handle("POST /api/ai/chat", HashMap::new(), req).await
}

async fn route_6(req: Request) -> Response {
    api_notifications::handle("POST /api/notifications/dispatch", HashMap::new(), req).await
}

async fn route_7(req: Request) -> Response {
    api_download::handle("GET /api/download/bt-search", HashMap::new(), req).await
}

async fn route_8(req: Request) -> Response {
    api_download::handle("POST /api/download/resolve-link", HashMap::new(), req).await
}

async fn route_9(req: Request) -> Response {
    api_download::handle("GET /api/download/rss-fetch", HashMap::new(), req).await
}

async fn route_10(req: Request) -> Response {
    api_geoip::handle("GET /api/geoip/lookup", HashMap::new(), req).await
}

async fn route_11(req: Request) -> Response {
    api_traffic::handle("GET /api/traffic/connections", HashMap::new(), req).await
}

async fn route_12(req: Request) -> Response {
    api_snmp::handle("POST /api/snmp/discover", HashMap::new(), req).await
}

async fn route_13(req: Request) -> Response {
    api_snmp::handle("POST /api/snmp/query", HashMap::new(), req).await
}

async fn route_14(req: Request) -> Response {
    api_ssh::handle("POST /api/ssh/exec", HashMap::new(), req).await
}

async fn route_15(req: Request) -> Response {
    api_smart_info::handle("POST /api/storage/smart-info", HashMap::new(), req).await
}

async fn route_16(req: Request) -> Response {
    api_dsm_proxy::handle(
        "/api/dsm/{*path}",
        path_params("/api/dsm/{*path}", req.uri().path()),
        req,
    )
    .await
}
