use axum::body::Body;
use axum::extract::Request;
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "../web-ui/dist"]
#[exclude = ".trunk-lock"]
struct WebAssets;

fn content_type_for(path: &str) -> String {
    if path.ends_with(".wasm") {
        "application/wasm".to_string()
    } else if path.ends_with(".js") || path.ends_with(".mjs") {
        "text/javascript; charset=utf-8".to_string()
    } else if path.ends_with(".css") {
        "text/css; charset=utf-8".to_string()
    } else if path.ends_with(".html") {
        "text/html; charset=utf-8".to_string()
    } else if path.ends_with(".svg") {
        "image/svg+xml".to_string()
    } else if path.ends_with(".json") {
        "application/json; charset=utf-8".to_string()
    } else if path.ends_with(".png") {
        "image/png".to_string()
    } else if path.ends_with(".ico") {
        "image/x-icon".to_string()
    } else {
        mime_guess::from_path(path)
            .first_or_octet_stream()
            .as_ref()
            .to_string()
    }
}

fn cache_control_for(path: &str) -> &'static str {
    if matches!(
        path,
        "index.html" | "sw.js" | "manifest.json" | "offline.html"
    ) {
        "no-cache"
    } else if path.ends_with(".wasm") || path.ends_with(".js") || path.ends_with(".css") {
        "public, max-age=31536000, immutable"
    } else {
        "public, max-age=86400"
    }
}

pub async fn serve_static(req: Request) -> Response {
    let raw_path = req.uri().path();
    if raw_path.starts_with("/api/") || raw_path == "/api" {
        return (
            StatusCode::NOT_FOUND,
            [(header::CONTENT_TYPE, "application/json")],
            r#"{"success":false,"error":"API endpoint not found"}"#,
        )
            .into_response();
    }

    let key = if raw_path == "/" || raw_path.is_empty() {
        "index.html"
    } else {
        raw_path.trim_start_matches('/')
    };

    match WebAssets::get(key) {
        Some(asset) => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, content_type_for(key))
            .header(header::CACHE_CONTROL, cache_control_for(key))
            .body(Body::from(asset.data.into_owned()))
            .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response()),
        None => (
            StatusCode::NOT_FOUND,
            [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
            "404 Not Found",
        )
            .into_response(),
    }
}
