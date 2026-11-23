#![forbid(unsafe_code)]

mod bla_shield;
mod static_ui;
mod units;

use std::net::SocketAddr;

use axum::serve::ListenerExt;

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        if let Ok(mut term) =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
        {
            tokio::select! {
                _ = tokio::signal::ctrl_c() => {}
                _ = term.recv() => {}
            }
            return;
        }
    }
    let _ = tokio::signal::ctrl_c().await;
}

#[tokio::main]
async fn main() {
    let _shield_tag = bla_shield::initialize_shield();
    let app = units::router();
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8088);
    let listener = tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port)))
        .await
        .expect("binding the port");
    let listener = listener.tap_io(|tcp| {
        let _ = tcp.set_nodelay(true);
    });
    eprintln!("kv-synology (Pure Rust) listening on http://0.0.0.0:{port}");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("serving");
}

#[cfg(test)]
mod functional_qc {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode, header};
    use serde_json::Value;
    use tower::ServiceExt;

    async fn call(req: Request<Body>) -> (StatusCode, String, Vec<u8>) {
        let res = units::router().oneshot(req).await.expect("router oneshot");
        let status = res.status();
        let ctype = res
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();
        let bytes = axum::body::to_bytes(res.into_body(), 16 * 1024 * 1024)
            .await
            .expect("read body")
            .to_vec();
        (status, ctype, bytes)
    }

    fn extract_attr<'a>(html: &'a str, prefix: &str) -> &'a str {
        let start = html.find(prefix).expect("missing attribute") + prefix.len();
        let rest = &html[start..];
        let end = rest.find('"').expect("unterminated attr");
        &rest[..end]
    }

    #[tokio::test]
    async fn embedded_static_ui_and_pwa_assets_serve_cleanly() {
        let (st, ctype, body) = call(Request::get("/").body(Body::empty()).unwrap()).await;
        assert_eq!(st, StatusCode::OK);
        assert!(ctype.contains("text/html"));
        let html = String::from_utf8(body).expect("utf8 html");
        assert!(html.contains("DSM Helper"));

        let css_path = extract_attr(&html, r#"rel="stylesheet" href=""#);
        let (css_st, css_ct, css_bytes) =
            call(Request::get(css_path).body(Body::empty()).unwrap()).await;
        assert_eq!(css_st, StatusCode::OK);
        assert!(css_ct.contains("text/css"));
        assert!(
            css_bytes.len() > 5_000,
            "CSS too small: {}",
            css_bytes.len()
        );

        let js_path = extract_attr(&html, r#"modulepreload" href=""#);
        let (js_st, js_ct, js_bytes) =
            call(Request::get(js_path).body(Body::empty()).unwrap()).await;
        assert_eq!(js_st, StatusCode::OK);
        assert!(js_ct.contains("javascript"));
        assert!(js_bytes.len() > 5_000);

        let wasm_clean = extract_attr(&html, r#"rel="preload" href=""#);
        let (w_st, w_ct, w_bytes) =
            call(Request::get(wasm_clean).body(Body::empty()).unwrap()).await;
        assert_eq!(w_st, StatusCode::OK);
        assert_eq!(w_ct, "application/wasm");
        assert!(w_bytes.len() > 100_000);

        let (m_st, _, m_bytes) =
            call(Request::get("/manifest.json").body(Body::empty()).unwrap()).await;
        assert_eq!(m_st, StatusCode::OK);
        let m_json: Value = serde_json::from_slice(&m_bytes).unwrap();
        assert_eq!(m_json["short_name"], "DSM Helper");

        let (s_st, s_ct, _) = call(Request::get("/logo.svg").body(Body::empty()).unwrap()).await;
        assert_eq!(s_st, StatusCode::OK);
        assert_eq!(s_ct, "image/svg+xml");

        let (i_st, i_ct, i_bytes) = call(
            Request::get("/icons/icon-192x192.png")
                .body(Body::empty())
                .unwrap(),
        )
        .await;
        assert_eq!(i_st, StatusCode::OK);
        assert_eq!(i_ct, "image/png");
        assert!(!i_bytes.is_empty());

        let (nf_st, _, _) = call(
            Request::get("/nonexistent-page")
                .body(Body::empty())
                .unwrap(),
        )
        .await;
        assert_eq!(nf_st, StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn all_backend_apis_respond_in_pure_rust() {
        // Health
        let (st, _, b) = call(Request::get("/api/health").body(Body::empty()).unwrap()).await;
        assert_eq!(st, StatusCode::OK);
        let v: Value = serde_json::from_slice(&b).unwrap();
        assert_eq!(v["runtime"], "rust");

        // AI models
        let (st, _, b) = call(
            Request::post("/api/ai/models")
                .body(Body::from(r#"{"provider":"gemini"}"#))
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        let v: Value = serde_json::from_slice(&b).unwrap();
        assert_eq!(v["success"], true);

        // AI chat validation
        let (st, _, _) = call(
            Request::post("/api/ai/chat")
                .body(Body::from(r#"{"provider":"gemini","messages":[]}"#))
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);

        // Notifications validation
        let (st, _, _) = call(
            Request::post("/api/notifications/dispatch")
                .body(Body::from(r#"{"channel":"telegram"}"#))
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);

        // Download bt-search, resolve-link, rss-fetch
        let (st, _, b) = call(
            Request::get("/api/download/bt-search?q=")
                .body(Body::empty())
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        let v: Value = serde_json::from_slice(&b).unwrap();
        assert_eq!(v["total"], 0);

        let (st, _, _) = call(
            Request::post("/api/download/resolve-link")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);

        let (st, _, _) = call(
            Request::get("/api/download/rss-fetch")
                .body(Body::empty())
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);

        // Reports summary + export
        let (st, _, b) = call(
            Request::post("/api/reports/summary")
                .body(Body::from(
                    r#"{"period":"weekly","hostName":"ds920","model":"DS920+"}"#,
                ))
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        let rep_v: Value = serde_json::from_slice(&b).unwrap();
        assert_eq!(rep_v["success"], true);

        let (st, ct, _) = call(
            Request::post("/api/reports/export")
                .body(Body::from(
                    serde_json::to_vec(&serde_json::json!({ "report": rep_v["data"] })).unwrap(),
                ))
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        assert!(ct.contains("text/html"));

        // GeoIP & Traffic
        let (st, _, b) = call(
            Request::get("/api/geoip/lookup?ip=192.168.1.10")
                .body(Body::empty())
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        let v: Value = serde_json::from_slice(&b).unwrap();
        assert_eq!(v["data"]["isPrivate"], true);

        let (st, _, b) = call(
            Request::get("/api/traffic/connections")
                .body(Body::empty())
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::OK);
        let v: Value = serde_json::from_slice(&b).unwrap();
        assert_eq!(v["success"], true);

        // SNMP query local & discover validation
        let (st, _, _) = call(
            Request::post("/api/snmp/query")
                .body(Body::from(
                    r#"{"host":"127.0.0.1","credentials":{"version":"v2c","community":"public"},"sensors":[{"id":"cpu","name":"CPU","kind":"cpu_usage"}]}"#,
                ))
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::OK);

        let (st, _, _) = call(
            Request::post("/api/snmp/discover")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);

        // SSH QuickConnect rejection
        let (st, _, _) = call(
            Request::post("/api/ssh/exec")
                .body(Body::from(
                    r#"{"host":"myqc.quickconnect.to","username":"admin","command":"uptime"}"#,
                ))
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);

        // Storage smart-info unauth check
        let (st, _, _) = call(
            Request::post("/api/storage/smart-info")
                .body(Body::from("{}"))
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::UNAUTHORIZED);

        // DSM proxy missing host check
        let (st, _, _) = call(
            Request::get("/api/dsm/query.cgi?api=SYNO.API.Info")
                .body(Body::empty())
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST);

        // Unknown API route 404
        let (st, _, _) = call(
            Request::get("/api/nonexistent")
                .body(Body::empty())
                .unwrap(),
        )
        .await;
        assert_eq!(st, StatusCode::NOT_FOUND);
    }
}
