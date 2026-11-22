//! Glue from the front door to `api-traffic-rs` (`GET /api/traffic/connections`).

use std::collections::HashMap;

use axum::body::Body;
use axum::extract::Request;
use axum::http::{StatusCode, header};
use axum::response::Response;

use api_traffic_rs::port::DsmTrafficHeaders;

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

fn header_str(headers: &axum::http::HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|v| v.to_str().ok())
        .map(ToString::to_string)
}

pub async fn handle(_route: &str, _params: HashMap<String, String>, req: Request) -> Response {
    let headers = req.headers();
    let dsm_hdrs = DsmTrafficHeaders {
        host: header_str(headers, "x-dsm-host"),
        port: header_str(headers, "x-dsm-port").and_then(|s| s.parse::<u16>().ok()),
        https: header_str(headers, "x-dsm-https").as_deref() == Some("true"),
        sid: header_str(headers, "x-dsm-sid"),
        syno_token: header_str(headers, "x-dsm-synotoken"),
    };
    let reply = api_traffic_rs::port::handle_connections(Some(&dsm_hdrs)).await;
    let body = serde_json::to_vec(&reply.body).unwrap_or_default();
    json_response(reply.status, body)
}
