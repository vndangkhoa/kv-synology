//! Glue from the front door to `api-smart-info-rs` (`POST /api/storage/smart-info`).

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

pub async fn handle(_route: &str, _params: HashMap<String, String>, req: Request) -> Response {
    let Ok(bytes) = axum::body::to_bytes(req.into_body(), 4 * 1024 * 1024).await else {
        let body = serde_json::to_vec(&json!({ "success": false, "error": "Unreadable body" }))
            .unwrap_or_default();
        return json_response(500, body);
    };
    let reply = api_smart_info_rs::port::handle_smart_info(&bytes).await;
    let body = serde_json::to_vec(&reply.body).unwrap_or_default();
    json_response(reply.status, body)
}
