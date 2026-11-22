//! Glue from the front door to `api-dsm-proxy-rs` (`/api/dsm/{*path}`).

use std::collections::HashMap;

use axum::body::Body;
use axum::extract::Request;
use axum::http::{HeaderName, HeaderValue, StatusCode, header};
use axum::response::Response;
use serde_json::json;

use api_dsm_proxy_rs::port::ProxyRequest;

const VARY_RSC: &str =
    "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch";

pub async fn handle(_route: &str, _params: HashMap<String, String>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    let rest = parts.uri.path().strip_prefix("/api/dsm/").unwrap_or("");
    let raw_path_segments: Vec<String> = rest
        .split('/')
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
        .collect();
    let raw_query = parts.uri.query().map(ToString::to_string);

    let mut headers = Vec::new();
    for (k, v) in &parts.headers {
        if let Ok(val_str) = v.to_str() {
            headers.push((k.as_str().to_string(), val_str.to_string()));
        }
    }

    let Ok(bytes) = axum::body::to_bytes(body, 64 * 1024 * 1024).await else {
        let err = serde_json::to_vec(
            &json!({ "success": false, "error": { "code": 500, "message": "Unreadable request body" } }),
        )
        .unwrap_or_default();
        return Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::VARY, VARY_RSC)
            .body(Body::from(err))
            .unwrap_or_else(|_| Response::new(Body::empty()));
    };

    let resp = api_dsm_proxy_rs::port::handle_proxy(ProxyRequest {
        method: parts.method.as_str().to_string(),
        raw_path_segments,
        raw_query,
        headers,
        body: bytes.to_vec(),
    })
    .await;

    let mut builder = Response::builder()
        .status(StatusCode::from_u16(resp.status).unwrap_or(StatusCode::BAD_GATEWAY))
        .header(header::VARY, VARY_RSC);
    for (k, v) in &resp.headers {
        if let (Ok(hn), Ok(hv)) = (
            HeaderName::from_bytes(k.as_bytes()),
            HeaderValue::from_str(v),
        ) {
            builder = builder.header(hn, hv);
        }
    }
    builder
        .body(Body::from(resp.body))
        .unwrap_or_else(|_| Response::new(Body::empty()))
}
