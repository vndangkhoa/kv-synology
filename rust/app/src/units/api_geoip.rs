//! Glue from the front door to `api-geoip-rs` (`GET /api/geoip/lookup`).

use std::collections::HashMap;

use axum::body::Body;
use axum::extract::Request;
use axum::http::{StatusCode, header};
use axum::response::Response;

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

fn query_param(uri: &axum::http::Uri, key: &str) -> Option<String> {
    let q = uri.query()?;
    url::form_urlencoded::parse(q.as_bytes())
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.into_owned())
}

pub async fn handle(_route: &str, _params: HashMap<String, String>, req: Request) -> Response {
    let ip = query_param(req.uri(), "ip");
    let reply = api_geoip_rs::port::handle_lookup(ip.as_deref()).await;
    let body = serde_json::to_vec(&reply.body).unwrap_or_default();
    json_response(reply.status, body)
}
