//! Glue from the front door to `report-engine-rs` for `/api/reports/summary` and `/api/reports/export`.

use std::collections::HashMap;

use axum::body::Body;
use axum::extract::Request;
use axum::http::{HeaderMap, StatusCode, header};
use axum::response::Response;
use serde_json::{Map, Value, json};

const VARY_RSC: &str =
    "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch";

fn build_response(status: StatusCode, content_type: &str, body: Vec<u8>) -> Response {
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, content_type)
        .header(header::VARY, VARY_RSC)
        .body(Body::from(body))
        .unwrap_or_else(|_| Response::new(Body::empty()))
}

fn json_response(status: StatusCode, val: &Value) -> Response {
    let bytes = serde_json::to_vec(val).unwrap_or_else(|_| b"{}".to_vec());
    build_response(status, "application/json", bytes)
}

fn text_response(status: StatusCode, content_type: &str, text: String) -> Response {
    build_response(status, content_type, text.into_bytes())
}

fn strip_js_undefined(val: Value) -> Value {
    match val {
        Value::Object(map) => {
            let mut out = Map::with_capacity(map.len());
            for (k, v) in map {
                if v.as_object().is_some_and(|o| {
                    o.len() == 1 && o.get("$undefined") == Some(&Value::Bool(true))
                }) {
                    continue;
                }
                out.insert(k, strip_js_undefined(v));
            }
            Value::Object(out)
        }
        Value::Array(arr) => Value::Array(arr.into_iter().map(strip_js_undefined).collect()),
        other => other,
    }
}

fn query_param(uri: &axum::http::Uri, key: &str) -> Option<String> {
    let q = uri.query()?;
    url::form_urlencoded::parse(q.as_bytes())
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.into_owned())
}

fn header_non_empty(headers: &HeaderMap, name: &str) -> Option<String> {
    let val = headers.get(name)?.to_str().ok()?;
    if val.is_empty() {
        None
    } else {
        Some(val.to_string())
    }
}

fn js_val_str(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                i.to_string()
            } else if let Some(f) = n.as_f64() {
                if f.fract() == 0.0 && f.abs() < 9_007_199_254_740_992.0 {
                    (f as i64).to_string()
                } else {
                    n.to_string()
                }
            } else {
                n.to_string()
            }
        }
        Value::Bool(b) => b.to_string(),
        Value::Null => "null".to_string(),
        _ => String::new(),
    }
}

fn fmt_grouped_int(n: f64, sep: char) -> String {
    if !n.is_finite() {
        return "0".to_string();
    }
    let rounded = n.round() as i64;
    let neg = rounded < 0;
    let abs_str = rounded.unsigned_abs().to_string();
    let bytes = abs_str.as_bytes();
    let mut out = String::with_capacity(bytes.len() + bytes.len() / 3 + 2);
    if neg {
        out.push('-');
    }
    for (idx, b) in bytes.iter().enumerate() {
        if idx > 0 && (bytes.len() - idx).is_multiple_of(3) {
            out.push(sep);
        }
        out.push(*b as char);
    }
    out
}

fn fmt_vi_num(v: &Value) -> String {
    let Some(f) = v.as_f64() else {
        return js_val_str(v);
    };
    if f.fract() == 0.0 {
        return fmt_grouped_int(f, '.');
    }
    let s = format!("{f}");
    let (int_p, frac_p) = s.split_once('.').unwrap_or((&s, ""));
    let neg = int_p.starts_with('-');
    let digits = int_p.strip_prefix('-').unwrap_or(int_p);
    let bytes = digits.as_bytes();
    let mut out = String::with_capacity(bytes.len() + bytes.len() / 3 + frac_p.len() + 2);
    if neg {
        out.push('-');
    }
    for (idx, b) in bytes.iter().enumerate() {
        if idx > 0 && (bytes.len() - idx).is_multiple_of(3) {
            out.push('.');
        }
        out.push(*b as char);
    }
    if !frac_p.is_empty() {
        out.push(',');
        out.push_str(frac_p);
    }
    out
}

fn fmt_en_num(v: &Value) -> String {
    let Some(f) = v.as_f64() else {
        return js_val_str(v);
    };
    fmt_grouped_int(f, ',')
}

fn render_report_html(report: &Value, is_weekly: bool) -> String {
    let period_label = if is_weekly { "Tuần" } else { "Tháng" };
    let start_date = js_val_str(&report["startDate"]);
    let end_date = js_val_str(&report["endDate"]);
    let generated_at = js_val_str(&report["generatedAt"]);
    let model = js_val_str(&report["model"]);
    let host_name = js_val_str(&report["hostName"]);
    let uptime_string = js_val_str(&report["uptimeString"]);

    let hs = &report["healthScore"];
    let hs_status_text = js_val_str(&hs["statusText"]);
    let hs_score = js_val_str(&hs["score"]);
    let hs_grade = js_val_str(&hs["grade"]);
    let highlights_html: String = hs["summaryHighlights"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|h| format!("<span class=\"highlight-pill\">{}</span>", js_val_str(h)))
                .collect()
        })
        .unwrap_or_default();

    let power = &report["power"];
    let p_outages = js_val_str(&power["outagesCount"]);
    let p_batt_mins = (power["totalBatterySeconds"].as_f64().unwrap_or(0.0) / 60.0).round() as i64;
    let p_improper_n = power["improperShutdowns"].as_f64().unwrap_or(0.0);
    let p_improper_color = if p_improper_n > 0.0 {
        "var(--danger)"
    } else {
        "var(--success)"
    };
    let p_improper = js_val_str(&power["improperShutdowns"]);
    let p_kwh = js_val_str(&power["estimatedKWh"]);
    let p_watt = js_val_str(&power["averageWattage"]);
    let p_cost = fmt_vi_num(&power["estimatedCostVND"]);

    let net = &report["network"];
    let n_outages = js_val_str(&net["outagesCount"]);
    let n_downtime = js_val_str(&net["downtimeMinutes"]);
    let n_uptime = js_val_str(&net["uptimePercent"]);
    let n_latency = js_val_str(&net["averageLatencyMs"]);
    let n_rx = js_val_str(&net["totalRxGB"]);
    let n_tx = js_val_str(&net["totalTxGB"]);

    let drives_html: String = report["storage"]["drives"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|d| {
                    let pend_n = d["pendingSectors"].as_f64().unwrap_or(0.0);
                    let pend_color = if pend_n > 0.0 {
                        "var(--warning)"
                    } else {
                        "inherit"
                    };
                    let pend_weight = if pend_n > 0.0 { "700" } else { "normal" };
                    let badge_cls = if d["status"].as_str() == Some("normal") {
                        "badge-ok"
                    } else {
                        "badge-warn"
                    };
                    format!(
                        r#"<tr>
            <td><strong>{}</strong></td>
            <td>{}</td>
            <td><span class="meta-badge">{}</span></td>
            <td>{}°C (Max {}°C)</td>
            <td>{}</td>
            <td style="color: {pend_color}; font-weight: {pend_weight};">{}</td>
            <td>{}h</td>
            <td><span class="{badge_cls}">{}</span></td>
          </tr>"#,
                        js_val_str(&d["slot"]),
                        js_val_str(&d["model"]),
                        js_val_str(&d["type"]),
                        js_val_str(&d["tempC"]),
                        js_val_str(&d["maxTempC"]),
                        js_val_str(&d["reallocatedSectors"]),
                        js_val_str(&d["pendingSectors"]),
                        fmt_en_num(&d["powerOnHours"]),
                        js_val_str(&d["healthLabel"]),
                    )
                })
                .collect()
        })
        .unwrap_or_default();

    let first_ssd = report["diskWear"]["ssds"]
        .as_array()
        .and_then(|a| a.first());
    let ssd_life = first_ssd
        .and_then(|s| s.get("lifeLeftPercent"))
        .filter(|v| !v.is_null())
        .map_or_else(|| "100".to_string(), js_val_str);
    let ssd_tbw = first_ssd
        .and_then(|s| s.get("tbwWrittenInPeriod"))
        .filter(|v| !v.is_null())
        .map_or_else(|| "0".to_string(), js_val_str);
    let ssd_years = first_ssd
        .and_then(|s| s.get("estimatedYearsRemaining"))
        .filter(|v| !v.is_null())
        .map_or_else(|| "5".to_string(), js_val_str);
    let hib_rec = report["diskWear"]["hibernationRecommendation"]
        .as_str()
        .unwrap_or("Các ổ hoạt động bình thường, tần suất chu kỳ quay an toàn.");

    let sec = &report["security"];
    let sec_failed = js_val_str(&sec["failedLoginsCount"]);
    let sec_blocked = js_val_str(&sec["blockedIpsCount"]);
    let sec_rate = js_val_str(&sec["bruteForceBlockedRate"]);
    let countries_html: String = sec["topAttackingCountries"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|c| {
                    format!(
                        "{} {} ({})",
                        js_val_str(&c["flagEmoji"]),
                        js_val_str(&c["countryName"]),
                        js_val_str(&c["attackCount"])
                    )
                })
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default();

    let vulns = &report["vulnerabilities"];
    let sec_advisor = js_val_str(&vulns["securityAdvisorScore"]);
    let findings_html: String = vulns["findings"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|f| {
                    format!(
                        "<li style=\"margin-bottom: 6px;\"><strong>{}</strong>: {}</li>",
                        js_val_str(&f["title"]),
                        js_val_str(&f["recommendation"])
                    )
                })
                .collect()
        })
        .unwrap_or_default();

    let daily_html: String = report["dailyRecords"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|r| {
                    let st = r["status"].as_str().unwrap_or("");
                    let st_cls = if st == "optimal" {
                        "badge-ok"
                    } else {
                        "badge-warn"
                    };
                    let st_label = if st == "optimal" {
                        "Tối ưu"
                    } else {
                        "Cảnh báo"
                    };
                    let r_outages = r["power"]["outagesCount"].as_f64().unwrap_or(0.0);
                    let r_outages_html = if r_outages > 0.0 {
                        let mins = (r["power"]["batteryRuntimeSec"].as_f64().unwrap_or(0.0)
                            / 60.0)
                            .round() as i64;
                        format!(
                            "<span style=\"color: var(--warning); font-weight: 700;\">⚡ {} lần ({mins}p pin)</span>",
                            js_val_str(&r["power"]["outagesCount"])
                        )
                    } else {
                        "<span style=\"color: #64748b;\">0 sự cố</span>".to_string()
                    };
                    let new_bad = r["storage"]["newBadSectors"].as_f64().unwrap_or(0.0);
                    let new_bad_html = if new_bad > 0.0 {
                        format!(
                            "<span style=\"color: var(--danger); font-weight: 700;\">(+{} sector)</span>",
                            js_val_str(&r["storage"]["newBadSectors"])
                        )
                    } else {
                        String::new()
                    };
                    let blk_cnt = r["security"]["blockedIpsCount"].as_f64().unwrap_or(0.0);
                    let blk_html = if blk_cnt > 0.0 {
                        format!(
                            "<span class=\"badge-err\">Chặn {} IP</span>",
                            js_val_str(&r["security"]["blockedIpsCount"])
                        )
                    } else {
                        String::new()
                    };
                    let events_html: String = r["events"]
                        .as_array()
                        .map(|evs| {
                            evs.iter()
                                .map(|e| {
                                    format!(
                                        "<div style=\"margin-bottom: 2px;\"><strong>{}</strong>: {}</div>",
                                        js_val_str(&e["time"]),
                                        js_val_str(&e["message"])
                                    )
                                })
                                .collect()
                        })
                        .unwrap_or_default();

                    format!(
                        r#"<tr>
            <td><strong>{}</strong> <span style="font-size: 11px; color: #64748b;">({})</span></td>
            <td><span class="{st_cls}">{st_label}</span></td>
            <td><strong>{} kWh</strong> <span style="font-size: 11px; color: #64748b;">(~{}đ)</span></td>
            <td>{r_outages_html}</td>
            <td>↓{}G / ↑{}G</td>
            <td>{}°C {new_bad_html}</td>
            <td>{} lỗi {blk_html}</td>
            <td>{}% / {}%</td>
            <td style="font-size: 12px; color: #475569;">
              {events_html}
            </td>
          </tr>"#,
                        js_val_str(&r["date"]),
                        js_val_str(&r["dayOfWeek"]),
                        js_val_str(&r["power"]["kwh"]),
                        fmt_vi_num(&r["power"]["costVND"]),
                        js_val_str(&r["network"]["rxGB"]),
                        js_val_str(&r["network"]["txGB"]),
                        js_val_str(&r["storage"]["maxTempC"]),
                        js_val_str(&r["security"]["failedLogins"]),
                        js_val_str(&r["system"]["peakCpuPercent"]),
                        js_val_str(&r["system"]["peakMemPercent"]),
                    )
                })
                .collect()
        })
        .unwrap_or_default();

    format!(
        r#"<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Vận Hành Synology NAS - {period_label} ({start_date} - {end_date})</title>
  <style>
    :root {{
      --primary: #0284c7;
      --success: #16a34a;
      --warning: #d97706;
      --danger: #dc2626;
      --bg: #f8fafc;
      --text: #0f172a;
      --card-bg: #ffffff;
      --border: #e2e8f0;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
    body {{ background-color: var(--bg); color: var(--text); line-height: 1.5; padding: 24px; }}
    .container {{ max-width: 960px; margin: 0 auto; background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 32px; }}
    .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--border); padding-bottom: 20px; margin-bottom: 24px; }}
    .title {{ font-size: 24px; font-weight: 800; color: #0f172a; }}
    .subtitle {{ font-size: 14px; color: #64748b; margin-top: 4px; }}
    .meta-badge {{ background: #f1f5f9; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #334155; }}
    
    .score-card {{ background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; border-radius: 14px; padding: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }}
    .score-num {{ font-size: 48px; font-weight: 900; line-height: 1; }}
    .score-desc {{ font-size: 15px; opacity: 0.95; margin-top: 6px; }}
    .score-highlights {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }}
    .highlight-pill {{ background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }}

    .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }}
    .grid-3 {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }}
    .grid-4 {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }}

    .card {{ background: #ffffff; border: 1px solid var(--border); border-radius: 12px; padding: 18px; }}
    .card-title {{ font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }}
    .metric-value {{ font-size: 26px; font-weight: 800; color: #0f172a; }}
    .metric-sub {{ font-size: 13px; color: #64748b; margin-top: 2px; }}

    table {{ width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13.5px; }}
    th {{ text-align: left; padding: 10px 12px; background: #f8fafc; color: #475569; font-weight: 600; border-bottom: 1px solid var(--border); }}
    td {{ padding: 10px 12px; border-bottom: 1px solid var(--border); color: #1e293b; }}
    tr:last-child td {{ border-bottom: none; }}

    .badge-ok {{ background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }}
    .badge-warn {{ background: #fef3c7; color: #b45309; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }}
    .badge-err {{ background: #fee2e2; color: #b91c1c; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }}

    .print-bar {{ display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 16px; }}
    .btn {{ background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }}
    .btn:hover {{ background: #0369a1; }}
    
    @media print {{
      body {{ background: white; padding: 0; }}
      .container {{ border: none; box-shadow: none; padding: 0; width: 100%; max-width: 100%; }}
      .print-bar {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="print-bar">
      <button class="btn" onclick="window.print()">🖨️ In hoặc Lưu PDF</button>
      <button class="btn" style="background:#475569;" onclick="window.close()">Đóng</button>
    </div>

    <div class="header">
      <div>
        <div class="title">BÁO CÁO VẬN HÀNH HỆ THỐNG NAS</div>
        <div class="subtitle">Kỳ báo cáo: {period_label} ({start_date} - {end_date}) • Tạo lúc: {generated_at}</div>
      </div>
      <div style="text-align: right;">
        <div class="meta-badge">{model} • {host_name}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Uptime: {uptime_string}</div>
      </div>
    </div>

    <!-- Health Score Banner -->
    <div class="score-card">
      <div>
        <div style="font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Chỉ Số Sức Khỏe Tổng Thể</div>
        <div class="score-desc">{hs_status_text}</div>
        <div class="score-highlights">
          {highlights_html}
        </div>
      </div>
      <div style="text-align: right;">
        <div class="score-num">{hs_score}<span style="font-size: 24px; font-weight: 600;">/100</span></div>
        <div style="font-size: 14px; font-weight: 700; margin-top: 4px;">Hạng {hs_grade}</div>
      </div>
    </div>

    <!-- 1. Power & Energy -->
    <h3 style="font-size: 16px; margin-bottom: 12px; color: #1e293b;">⚡ 1. Nguồn Điện & Năng Lượng Tiêu Thụ</h3>
    <div class="grid-4">
      <div class="card">
        <div class="card-title">Mất Điện Lưới</div>
        <div class="metric-value">{p_outages} <span style="font-size: 14px; font-weight: 500;">lần</span></div>
        <div class="metric-sub">UPS pin: {p_batt_mins} phút</div>
      </div>
      <div class="card">
        <div class="card-title">Tắt Đột Ngột</div>
        <div class="metric-value" style="color: {p_improper_color};">
          {p_improper} <span style="font-size: 14px; font-weight: 500;">lần</span>
        </div>
        <div class="metric-sub">Không qua bảo vệ UPS</div>
      </div>
      <div class="card">
        <div class="card-title">Điện Năng Ước Tính</div>
        <div class="metric-value">{p_kwh} <span style="font-size: 14px; font-weight: 500;">kWh</span></div>
        <div class="metric-sub">Công suất TB: {p_watt}W</div>
      </div>
      <div class="card">
        <div class="card-title">Tiền Điện Ước Tính</div>
        <div class="metric-value">{p_cost} <span style="font-size: 14px; font-weight: 500;">đ</span></div>
        <div class="metric-sub">Biểu giá bậc 3 (~3.000đ/kWh)</div>
      </div>
    </div>

    <!-- 2. Network & Outages -->
    <h3 style="font-size: 16px; margin-bottom: 12px; color: #1e293b;">🌐 2. Mạng & Độ Sẵn Sàng Internet</h3>
    <div class="grid-4">
      <div class="card">
        <div class="card-title">Sự Cố Rớt Mạng</div>
        <div class="metric-value">{n_outages} <span style="font-size: 14px; font-weight: 500;">lần</span></div>
        <div class="metric-sub">Downtime: {n_downtime} phút</div>
      </div>
      <div class="card">
        <div class="card-title">Tỷ Lệ Uptime Mạng</div>
        <div class="metric-value" style="color: var(--success);">{n_uptime}%</div>
        <div class="metric-sub">Đạt chuẩn khả dụng cao</div>
      </div>
      <div class="card">
        <div class="card-title">Độ Trễ Trung Bình</div>
        <div class="metric-value">{n_latency} <span style="font-size: 14px; font-weight: 500;">ms</span></div>
        <div class="metric-sub">Ping Gateway & DNS</div>
      </div>
      <div class="card">
        <div class="card-title">Lưu Lượng Dữ Liệu</div>
        <div class="metric-value">{n_rx} <span style="font-size: 14px; font-weight: 500;">GB</span></div>
        <div class="metric-sub">Tải lên: {n_tx} GB</div>
      </div>
    </div>

    <!-- 3. Drive Health & Wear -->
    <h3 style="font-size: 16px; margin-bottom: 12px; color: #1e293b;">💾 3. Sức Khỏe Ổ Đĩa & Phân Tích Tiêu Hao</h3>
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-title">Chi Tiết Tình Trạng Các Ổ Đĩa (S.M.A.R.T & Sức Khỏe)</div>
      <table>
        <thead>
          <tr>
            <th>Khay</th>
            <th>Model Ổ Đĩa</th>
            <th>Loại</th>
            <th>Nhiệt Độ</th>
            <th>Bad Sector (ID 5)</th>
            <th>Pending (ID 197)</th>
            <th>Giờ Chạy (POH)</th>
            <th>Trạng Thái</th>
          </tr>
        </thead>
        <tbody>
          {drives_html}
        </tbody>
      </table>
      
      <!-- Wear Analysis details -->
      <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--border); display: flex; gap: 24px; flex-wrap: wrap;">
        <div>
          <span style="font-size: 12px; color: #64748b; font-weight: 600;">TIÊU HAO SSD CACHE:</span>
          <div style="font-size: 13.5px; font-weight: 600; margin-top: 2px;">
            Tuổi thọ còn {ssd_life}% • Đã ghi +{ssd_tbw} TBW • Dự kiến còn ~{ssd_years} năm
          </div>
        </div>
        <div>
          <span style="font-size: 12px; color: #64748b; font-weight: 600;">KHUYẾN NGHỊ ĐỖ ĐẦU TỪ (HIBERNATION):</span>
          <div style="font-size: 13px; color: #334155; margin-top: 2px;">
            {hib_rec}
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Security & Intrusion -->
    <h3 style="font-size: 16px; margin-bottom: 12px; color: #1e293b;">🛡️ 4. Phòng Thủ Tấn Công & An Toàn Bảo Mật</h3>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Hoạt Động Tấn Công Phát Hiện</div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <div class="metric-value">{sec_failed}</div>
            <div class="metric-sub">Dò mật khẩu thất bại</div>
          </div>
          <div>
            <div class="metric-value" style="color: var(--danger);">{sec_blocked}</div>
            <div class="metric-sub">Địa chỉ IP bị AutoBlock</div>
          </div>
          <div>
            <div class="metric-value" style="color: var(--success);">{sec_rate}%</div>
            <div class="metric-sub">Tỷ lệ chặn thành công</div>
          </div>
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
          <strong>Top nguồn tấn công:</strong> {countries_html}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Đánh Giá Lỗ Hổng (Security Advisor)</div>
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
          Điểm đánh giá bảo mật: <span style="color: var(--warning);">{sec_advisor}/100</span>
        </div>
        <ul style="padding-left: 18px; font-size: 13px; color: #475569;">
          {findings_html}
        </ul>
      </div>
    </div>

    <!-- 5. Day-by-Day Operational Ledger -->
    <h3 style="font-size: 16px; margin-bottom: 12px; color: #1e293b;">📅 5. Bảng Kê Chi Tiết Hoạt Động Từng Ngày (Daily Audit Ledger)</h3>
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-title">Nhật Ký Kiểm Toán Từng Chu Kỳ 24h</div>
      <table>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Trạng Thái</th>
            <th>Điện Năng</th>
            <th>Sự Cố Nguồn</th>
            <th>Mạng (Rx/Tx)</th>
            <th>Đĩa (Max °C)</th>
            <th>Bảo Mật</th>
            <th>CPU/RAM</th>
            <th>Sự Kiện Nổi Bật Trong Ngày</th>
          </tr>
        </thead>
        <tbody>
          {daily_html}
        </tbody>
      </table>
    </div>

    <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border);">
      Báo cáo được tự động tạo bởi KV-Synology DSM Web Manager & AI Engine.
    </div>
  </div>
</body>
</html>"#
    )
}

/// `route` is the route as wired (`GET /api/reports/summary`, etc.).
pub async fn handle(route: &str, _params: HashMap<String, String>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    match route {
        "GET /api/reports/summary" => handle_summary_get(&parts),
        "POST /api/reports/summary" => {
            let Ok(bytes) = axum::body::to_bytes(body, 16 * 1024 * 1024).await else {
                return json_response(
                    StatusCode::BAD_REQUEST,
                    &json!({ "success": false, "error": "Unreadable body" }),
                );
            };
            handle_summary_post(&bytes)
        }
        "GET /api/reports/export" => handle_export_get(&parts),
        "POST /api/reports/export" => {
            let Ok(bytes) = axum::body::to_bytes(body, 16 * 1024 * 1024).await else {
                return text_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "text/plain;charset=UTF-8",
                    "Lỗi tạo báo cáo: unreadable body".to_string(),
                );
            };
            handle_export_post(&bytes)
        }
        _ => json_response(
            StatusCode::NOT_FOUND,
            &json!({ "success": false, "error": "Not found" }),
        ),
    }
}

fn handle_summary_get(parts: &axum::http::request::Parts) -> Response {
    let period = if query_param(&parts.uri, "period").as_deref() == Some("monthly") {
        "monthly"
    } else {
        "weekly"
    };
    let host = header_non_empty(&parts.headers, "x-dsm-host");
    let sid = header_non_empty(&parts.headers, "x-dsm-sid");
    if host.is_none() && sid.is_none() {
        return json_response(
            StatusCode::UNAUTHORIZED,
            &json!({
                "success": false,
                "error": "Yêu cầu đăng nhập Synology DSM để tạo và xem báo cáo vận hành.",
            }),
        );
    }
    let host_name = host.unwrap_or_else(|| "Synology-NAS".to_string());
    let model =
        header_non_empty(&parts.headers, "x-dsm-model").unwrap_or_else(|| "DS920+".to_string());
    let dsm_version =
        header_non_empty(&parts.headers, "x-dsm-version").unwrap_or_else(|| "DSM 7.2".to_string());

    match report_engine_rs::port::build_live_report_summary(json!({
        "period": period,
        "hostName": host_name,
        "model": model,
        "dsmVersion": dsm_version,
    })) {
        Ok(summary) => json_response(
            StatusCode::OK,
            &json!({
                "success": true,
                "data": strip_js_undefined(summary),
            }),
        ),
        Err(err) => json_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &json!({
                "success": false,
                "error": err,
            }),
        ),
    }
}

fn handle_summary_post(bytes: &[u8]) -> Response {
    let body: Value = match serde_json::from_slice(bytes) {
        Ok(v) => v,
        Err(e) => {
            return json_response(
                StatusCode::BAD_REQUEST,
                &json!({ "success": false, "error": e.to_string() }),
            );
        }
    };
    if let Some(report) = body.get("report")
        && !report.is_null()
    {
        return json_response(StatusCode::OK, &json!({ "success": true, "data": report }));
    }
    match report_engine_rs::port::build_live_report_summary(body) {
        Ok(summary) => json_response(
            StatusCode::OK,
            &json!({ "success": true, "data": strip_js_undefined(summary) }),
        ),
        Err(err) => json_response(
            StatusCode::BAD_REQUEST,
            &json!({ "success": false, "error": err }),
        ),
    }
}

fn handle_export_get(parts: &axum::http::request::Parts) -> Response {
    let period = if query_param(&parts.uri, "period").as_deref() == Some("monthly") {
        "monthly"
    } else {
        "weekly"
    };
    let host = header_non_empty(&parts.headers, "x-dsm-host")
        .or_else(|| query_param(&parts.uri, "host").filter(|s| !s.is_empty()));
    let model = header_non_empty(&parts.headers, "x-dsm-model")
        .or_else(|| query_param(&parts.uri, "model").filter(|s| !s.is_empty()))
        .unwrap_or_else(|| "DS920+".to_string());

    let Some(host_name) = host else {
        return text_response(
            StatusCode::UNAUTHORIZED,
            "text/plain;charset=UTF-8",
            "Yêu cầu kết nối Synology DSM để xuất báo cáo.".to_string(),
        );
    };

    match report_engine_rs::port::build_live_report_summary(json!({
        "period": period,
        "hostName": host_name,
        "model": model,
    })) {
        Ok(summary) => {
            let clean = strip_js_undefined(summary);
            let html = render_report_html(&clean, period == "weekly");
            text_response(StatusCode::OK, "text/html; charset=utf-8", html)
        }
        Err(err) => text_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "text/plain;charset=UTF-8",
            format!("Lỗi tạo báo cáo: {err}"),
        ),
    }
}

fn handle_export_post(bytes: &[u8]) -> Response {
    let body: Value = match serde_json::from_slice(bytes) {
        Ok(v) => v,
        Err(e) => {
            return text_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "text/plain;charset=UTF-8",
                format!("Lỗi tạo báo cáo: {e}"),
            );
        }
    };
    let report = match body.get("report") {
        Some(r) if !r.is_null() => r,
        _ => &body,
    };
    let is_weekly = report.get("period").and_then(Value::as_str) == Some("weekly");
    let html = render_report_html(report, is_weekly);
    text_response(StatusCode::OK, "text/html; charset=utf-8", html)
}
