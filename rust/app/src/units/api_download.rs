//! Glue from the front door to `api-download-rs` (`/api/download/{bt-search,resolve-link,rss-fetch}`).

use std::collections::HashMap;

use axum::body::Body;
use axum::extract::Request;
use axum::http::{StatusCode, header};
use axum::response::Response;
use serde_json::json;

const VARY_RSC: &str =
    "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch";

fn json_response(status: u16, body: Vec<u8>) -> Response {
    Response::builder()
        .status(StatusCode::from_u16(status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR))
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::VARY, VARY_RSC)
        .body(Body::from(body))
        .unwrap_or_else(|_| Response::new(Body::empty()))
}

fn query_param(uri: &axum::http::Uri, key: &str) -> String {
    let Some(q) = uri.query() else {
        return String::new();
    };
    url::form_urlencoded::parse(q.as_bytes())
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.into_owned())
        .unwrap_or_default()
}

pub async fn handle(route: &str, _params: HashMap<String, String>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    let reply = match route {
        "GET /api/download/bt-search" => {
            let q = query_param(&parts.uri, "q");
            api_download_rs::port::handle_bt_search(&q).await
        }
        "POST /api/download/resolve-link" => {
            let Ok(bytes) = axum::body::to_bytes(body, 4 * 1024 * 1024).await else {
                let err_body =
                    serde_json::to_vec(&json!({ "error": "Unreadable body" })).unwrap_or_default();
                return json_response(500, err_body);
            };
            api_download_rs::port::handle_resolve_link(&bytes).await
        }
        "GET /api/download/rss-fetch" => {
            let url = query_param(&parts.uri, "url");
            api_download_rs::port::handle_rss_fetch(&url).await
        }
        _ => {
            let err_body = serde_json::to_vec(&json!({ "error": "Not found" })).unwrap_or_default();
            return json_response(404, err_body);
        }
    };
    let bytes = serde_json::to_vec(&reply.body).unwrap_or_default();
    json_response(reply.status, bytes)
}
