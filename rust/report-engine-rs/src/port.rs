//! The Rust port of `src/lib/reports/reportEngine.ts`.

#![forbid(unsafe_code)]

mod pinned;

use chrono::{DateTime, Datelike, Local, NaiveTime, TimeZone, Timelike, Utc};
use indexmap::IndexMap;
use serde_json::{Value, json};

pub const VND_PER_KWH: f64 = 3000.0;

fn country_info(code: &str) -> Option<(&'static str, &'static str)> {
    match code {
        "VN" => Some(("Việt Nam", "🇻🇳")),
        "US" => Some(("Hoa Kỳ", "🇺🇸")),
        "CN" => Some(("Trung Quốc", "🇨🇳")),
        "RU" => Some(("Nga", "🇷🇺")),
        "NL" => Some(("Hà Lan", "🇳🇱")),
        "DE" => Some(("Đức", "🇩🇪")),
        "FR" => Some(("Pháp", "🇫🇷")),
        "GB" | "UK" => Some(("Anh", "🇬🇧")),
        "JP" => Some(("Nhật Bản", "🇯🇵")),
        "KR" => Some(("Hàn Quốc", "🇰🇷")),
        "SG" => Some(("Singapore", "🇸🇬")),
        "HK" => Some(("Hồng Kông", "🇭🇰")),
        "TW" => Some(("Đài Loan", "🇹🇼")),
        "IN" => Some(("Ấn Độ", "🇮🇳")),
        "BR" => Some(("Brazil", "🇧🇷")),
        "CA" => Some(("Canada", "🇨🇦")),
        "AU" => Some(("Úc", "🇦🇺")),
        _ => None,
    }
}

fn is_pinned_clock() -> bool {
    std::env::var("RUST_ANYTHING_NOW_MS").is_ok()
}

struct DateParts {
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
    weekday_sun0: usize,
}

fn ms_to_date_parts(ms_f64: f64) -> Option<DateParts> {
    if !ms_f64.is_finite() || ms_f64.abs() > 8.64e15 {
        return None;
    }
    let ms = ms_f64.trunc() as i64;
    let utc_dt = DateTime::from_timestamp_millis(ms)?;
    if is_pinned_clock() {
        Some(DateParts {
            year: utc_dt.year(),
            month: utc_dt.month(),
            day: utc_dt.day(),
            hour: utc_dt.hour(),
            minute: utc_dt.minute(),
            second: utc_dt.second(),
            weekday_sun0: utc_dt.weekday().num_days_from_sunday() as usize,
        })
    } else {
        let local_dt: DateTime<Local> = utc_dt.with_timezone(&Local);
        Some(DateParts {
            year: local_dt.year(),
            month: local_dt.month(),
            day: local_dt.day(),
            hour: local_dt.hour(),
            minute: local_dt.minute(),
            second: local_dt.second(),
            weekday_sun0: local_dt.weekday().num_days_from_sunday() as usize,
        })
    }
}

fn day_start_ms(ms_f64: f64) -> Option<f64> {
    let parts = ms_to_date_parts(ms_f64)?;
    let naive_date = chrono::NaiveDate::from_ymd_opt(parts.year, parts.month, parts.day)?;
    let midnight = NaiveTime::from_hms_opt(0, 0, 0)?;
    let naive_dt = naive_date.and_time(midnight);
    if is_pinned_clock() {
        Some(Utc.from_utc_datetime(&naive_dt).timestamp_millis() as f64)
    } else {
        let local_dt = Local
            .from_local_datetime(&naive_dt)
            .earliest()
            .or_else(|| Local.from_local_datetime(&naive_dt).latest())?;
        Some(local_dt.timestamp_millis() as f64)
    }
}

fn fmt_vi_date(p: &DateParts) -> String {
    format!("{}/{}/{}", p.day, p.month, p.year)
}

fn fmt_vi_hm(p: &DateParts) -> String {
    format!("{:02}:{:02}", p.hour, p.minute)
}

fn fmt_vi_hms(p: &DateParts) -> String {
    format!("{:02}:{:02}:{:02}", p.hour, p.minute, p.second)
}

fn fmt_dd_mm(p: &DateParts) -> (String, String) {
    let date = format!("{:02}/{:02}", p.day, p.month);
    let full = format!("{date}/{}", p.year);
    (date, full)
}

fn day_name(weekday_sun0: usize) -> &'static str {
    const NAMES: [&str; 7] = [
        "Chủ Nhật",
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy",
    ];
    NAMES[weekday_sun0 % 7]
}

fn fmt_vi_number(x: f64) -> String {
    if x.is_nan() {
        return "NaN".to_string();
    }
    if x.is_infinite() {
        return if x.is_sign_negative() { "-∞" } else { "∞" }.to_string();
    }
    if x == 0.0 {
        return "0".to_string();
    }
    let neg = x < 0.0;
    let abs = x.abs();
    let rounded = if abs >= 1e15 {
        crate::js::math_round(abs)
    } else {
        crate::js::math_round(abs * 1000.0) / 1000.0
    };
    let s = crate::js::number_to_string(rounded);
    if s.contains('e') || s.contains('E') {
        return if neg { format!("-{s}") } else { s };
    }
    let (int_part, frac_part) = s.split_once('.').unwrap_or((&s, ""));
    let bytes = int_part.as_bytes();
    let mut out = String::with_capacity(bytes.len() + bytes.len() / 3 + 4);
    if neg {
        out.push('-');
    }
    for (idx, b) in bytes.iter().enumerate() {
        if idx > 0 && (bytes.len() - idx).is_multiple_of(3) {
            out.push('.');
        }
        out.push(*b as char);
    }
    if !frac_part.is_empty() {
        out.push(',');
        out.push_str(frac_part);
    }
    out
}

fn round_fixed_f64(x: f64, decimals: usize) -> f64 {
    if !x.is_finite() {
        return x;
    }
    format!("{x:.decimals$}").parse::<f64>().unwrap_or(x)
}

fn js_truthy(v: &Value) -> bool {
    if crate::js::is_undefined(v) {
        return false;
    }
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().is_some_and(|x| x != 0.0 && !x.is_nan()),
        Value::String(s) => !s.is_empty(),
        Value::Array(_) => true,
        Value::Object(_) => crate::js::as_number(v)
            .map(|x| x != 0.0 && !x.is_nan())
            .unwrap_or(true),
    }
}

fn js_to_number(v: &Value) -> f64 {
    if crate::js::is_undefined(v) {
        return f64::NAN;
    }
    if let Some(n) = crate::js::as_number(v) {
        return n;
    }
    match v {
        Value::Null => 0.0,
        Value::Bool(b) => {
            if *b {
                1.0
            } else {
                0.0
            }
        }
        Value::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                0.0
            } else {
                trimmed.parse::<f64>().unwrap_or(f64::NAN)
            }
        }
        Value::Array(arr) => {
            if arr.is_empty() {
                0.0
            } else if arr.len() == 1 {
                js_to_number(&arr[0])
            } else {
                f64::NAN
            }
        }
        _ => f64::NAN,
    }
}

fn js_to_string(v: &Value) -> String {
    if crate::js::is_undefined(v) {
        return "undefined".to_string();
    }
    if let Some(n) = crate::js::as_number(v) {
        return crate::js::number_to_string(n);
    }
    match v {
        Value::Null => "null".to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => crate::js::number_to_string(n.as_f64().unwrap_or(0.0)),
        Value::String(s) => s.clone(),
        Value::Array(arr) => arr
            .iter()
            .map(|el| {
                if el.is_null() || crate::js::is_undefined(el) {
                    String::new()
                } else {
                    js_to_string(el)
                }
            })
            .collect::<Vec<_>>()
            .join(","),
        Value::Object(_) => "[object Object]".to_string(),
    }
}

fn prop<'a>(v: &'a Value, key: &str) -> &'a Value {
    match v {
        Value::Object(map) => map.get(key).unwrap_or(&Value::Null),
        _ => &Value::Null,
    }
}

fn has_defined_prop<'a>(v: &'a Value, key: &str) -> Option<&'a Value> {
    let map = v.as_object()?;
    let val = map.get(key)?;
    if crate::js::is_undefined(val) {
        None
    } else {
        Some(val)
    }
}

fn parse_js_date_ms(s: &str) -> Option<f64> {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
        return Some(dt.timestamp_millis() as f64);
    }
    if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
        return Some(naive.and_utc().timestamp_millis() as f64);
    }
    if let Ok(date) = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
        && let Some(midnight) = NaiveTime::from_hms_opt(0, 0, 0)
    {
        return Some(date.and_time(midnight).and_utc().timestamp_millis() as f64);
    }
    None
}

fn parse_log_timestamp(raw_time: Option<&Value>) -> f64 {
    let Some(raw) = raw_time else {
        return pinned::now_ms();
    };
    if !js_truthy(raw) {
        return pinned::now_ms();
    }
    if let Some(n) = crate::js::as_number(raw) {
        return if n < 1e11 { n * 1000.0 } else { n };
    }
    if let Some(d_str) = raw
        .as_object()
        .filter(|o| o.len() == 1)
        .and_then(|o| o.get("$date"))
        .and_then(|v| v.as_str())
    {
        return parse_js_date_ms(d_str).unwrap_or_else(pinned::now_ms);
    }
    let s = js_to_string(raw);
    parse_js_date_ms(&s).unwrap_or_else(pinned::now_ms)
}

fn num_json(x: f64) -> Value {
    crate::js::number(x)
}

fn field_or_default(input: &Value, key: &str, default: Value) -> Value {
    match input.as_object().and_then(|o| o.get(key)) {
        Some(v) if !crate::js::is_undefined(v) => v.clone(),
        _ => default,
    }
}

fn check_non_null_or_undef(v: &Value, prop_name: &str) -> Result<(), String> {
    if v.is_null() {
        return Err(format!(
            "TypeError: Cannot read properties of null (reading '{prop_name}')"
        ));
    }
    if crate::js::is_undefined(v) {
        return Err(format!(
            "TypeError: Cannot read properties of undefined (reading '{prop_name}')"
        ));
    }
    Ok(())
}

/// Port of `buildLiveReportSummary` (`src/lib/reports/reportEngine.ts:73`).
pub fn build_live_report_summary(input: Value) -> Result<Value, String> {
    if input.is_null() || crate::js::is_undefined(&input) {
        return Err(
            "TypeError: Cannot destructure property 'period' of 'input' as it is null.".to_string(),
        );
    }

    let period = field_or_default(&input, "period", Value::String("weekly".to_string()));
    let host_name = field_or_default(
        &input,
        "hostName",
        Value::String("Synology-NAS".to_string()),
    );
    let model = field_or_default(&input, "model", Value::String("DS920+".to_string()));
    let dsm_version = field_or_default(&input, "dsmVersion", Value::String("DSM 7.2".to_string()));

    let uptime_seconds_val = field_or_default(&input, "uptimeSeconds", Value::from(0));
    let uptime_seconds = js_to_number(&uptime_seconds_val);

    let storage_volumes = field_or_default(&input, "storageVolumes", Value::Array(Vec::new()));
    let storage_volumes_arr = storage_volumes
        .as_array()
        .ok_or_else(|| "TypeError: storageVolumes is not iterable".to_string())?;

    let ups_info = field_or_default(&input, "upsInfo", Value::Null);
    let system_logs = field_or_default(&input, "systemLogs", Value::Array(Vec::new()));
    let system_logs_arr = system_logs
        .as_array()
        .ok_or_else(|| "TypeError: systemLogs.filter is not a function".to_string())?;

    let connection_logs = field_or_default(&input, "connectionLogs", Value::Array(Vec::new()));
    let connection_logs_arr = connection_logs
        .as_array()
        .ok_or_else(|| "TypeError: connectionLogs.filter is not a function".to_string())?;

    let blocked_ips = field_or_default(&input, "blockedIps", Value::Array(Vec::new()));
    let blocked_ips_arr = blocked_ips
        .as_array()
        .ok_or_else(|| "TypeError: blockedIps is not iterable".to_string())?;

    let utilization = field_or_default(&input, "utilization", Value::Null);
    let terminal_info = field_or_default(&input, "terminalInfo", Value::Null);
    let dsm_users = field_or_default(&input, "dsmUsers", Value::Array(Vec::new()));
    let dsm_users_arr = dsm_users
        .as_array()
        .ok_or_else(|| "TypeError: dsmUsers.find is not a function".to_string())?;

    let is_weekly = period.as_str() == Some("weekly");
    let days: usize = if is_weekly { 7 } else { 30 };

    let now_ms = pinned::now_ms();
    let now_parts = ms_to_date_parts(now_ms).ok_or_else(|| "Invalid Date".to_string())?;
    let end_date_str = fmt_vi_date(&now_parts);
    let generated_at = format!("{} {}", fmt_vi_date(&now_parts), fmt_vi_hm(&now_parts));

    let period_start_ms = now_ms - (days as f64) * 86_400_000.0;
    let past_parts =
        ms_to_date_parts(period_start_ms).ok_or_else(|| "Invalid past Date".to_string())?;
    let start_date_str = fmt_vi_date(&past_parts);

    // 1. Uptime String
    let uptime_string = if uptime_seconds > 0.0 {
        let days_up = (uptime_seconds / 86400.0).floor();
        let hours_up = ((uptime_seconds % 86400.0) / 3600.0).floor();
        format!(
            "{} ngày {} giờ",
            crate::js::number_to_string(days_up),
            crate::js::number_to_string(hours_up)
        )
    } else {
        "Đang vận hành liên tục".to_string()
    };

    // Filter system & connection logs in period
    let mut period_sys_logs: Vec<(&Value, f64)> = Vec::new();
    for l in system_logs_arr {
        check_non_null_or_undef(l, "time")?;
        let raw_t = l.as_object().and_then(|o| o.get("time"));
        let ts = parse_log_timestamp(raw_t);
        if ts >= period_start_ms {
            period_sys_logs.push((l, ts));
        }
    }

    let mut period_conn_logs: Vec<(&Value, f64)> = Vec::new();
    for l in connection_logs_arr {
        check_non_null_or_undef(l, "time")?;
        let raw_t = l.as_object().and_then(|o| o.get("time"));
        let ts = parse_log_timestamp(raw_t);
        if ts >= period_start_ms {
            period_conn_logs.push((l, ts));
        }
    }

    // 2. Storage Health Data
    let mut total_storage_bytes: f64 = 0.0;
    let mut used_storage_bytes: f64 = 0.0;
    let mut free_storage_bytes: f64 = 0.0;
    let mut pools_status = "normal".to_string();
    let mut drives_list: Vec<Value> = Vec::new();

    if !storage_volumes_arr.is_empty() {
        for v in storage_volumes_arr {
            check_non_null_or_undef(v, "totalBytes")?;
            if let Some(tb) = has_defined_prop(v, "totalBytes").filter(|x| js_truthy(x)) {
                total_storage_bytes += js_to_number(tb);
            }
            if let Some(ub) = has_defined_prop(v, "usedBytes").filter(|x| js_truthy(x)) {
                used_storage_bytes += js_to_number(ub);
            }
            if let Some(fb) = has_defined_prop(v, "freeBytes").filter(|x| js_truthy(x)) {
                free_storage_bytes += js_to_number(fb);
            }

            let v_status = v
                .as_object()
                .and_then(|o| o.get("status"))
                .and_then(Value::as_str);
            if v_status == Some("critical") {
                pools_status = "critical".to_string();
            } else if v_status == Some("warning") && pools_status != "critical" {
                pools_status = "warning".to_string();
            }

            if let Some(drives) = v
                .as_object()
                .and_then(|o| o.get("drives"))
                .and_then(Value::as_array)
            {
                for d in drives {
                    check_non_null_or_undef(d, "temp")?;
                    let temp_val = has_defined_prop(d, "temp").filter(|x| js_truthy(x));
                    let temp_c = temp_val.map_or(36.0, js_to_number);
                    let max_temp_c = temp_c + 3.0;

                    let reallocated_val = has_defined_prop(d, "reallocatedSectors")
                        .filter(|x| js_truthy(x))
                        .or_else(|| has_defined_prop(d, "badSectors").filter(|x| js_truthy(x)));
                    let reallocated_sectors = reallocated_val.map_or(0.0, js_to_number);

                    let pending_sectors = has_defined_prop(d, "pendingSectors")
                        .filter(|x| js_truthy(x))
                        .map_or(0.0, js_to_number);
                    let uncorrectable_sectors = 0.0;
                    let crc_errors = 0.0;
                    let power_on_hours = has_defined_prop(d, "powerOnHours")
                        .filter(|x| js_truthy(x))
                        .map_or(0.0, js_to_number);

                    let drive_type = d
                        .as_object()
                        .and_then(|o| o.get("driveType"))
                        .and_then(Value::as_str);
                    let model_raw = d.as_object().and_then(|o| o.get("model"));
                    let model_str_for_lower =
                        model_raw.map_or_else(|| "undefined".to_string(), js_to_string);
                    let model_lower = model_str_for_lower.to_lowercase();
                    let is_ssd = drive_type == Some("SSD")
                        || drive_type == Some("NVMe")
                        || model_lower.contains("ssd");
                    let dtype = if is_ssd {
                        if drive_type == Some("NVMe") || model_lower.contains("nvme") {
                            "NVMe"
                        } else {
                            "SSD"
                        }
                    } else {
                        "HDD"
                    };

                    let d_status = d
                        .as_object()
                        .and_then(|o| o.get("status"))
                        .and_then(Value::as_str);
                    let mut status = "normal";
                    let mut health_label = "Tốt (100%)".to_string();
                    if uncorrectable_sectors > 0.0 || d_status == Some("critical") {
                        status = "critical";
                        health_label = format!("Nguy hiểm ({uncorrectable_sectors} bad sectors)");
                    } else if pending_sectors > 0.0
                        || reallocated_sectors > 10.0
                        || d_status == Some("warning")
                    {
                        status = "warning";
                        let chosen = if js_truthy(&num_json(pending_sectors)) {
                            pending_sectors
                        } else {
                            reallocated_sectors
                        };
                        health_label = format!(
                            "Cảnh báo ({} bad sectors)",
                            crate::js::number_to_string(chosen)
                        );
                    }

                    let slot_str = if let Some(sn) =
                        has_defined_prop(d, "slotName").filter(|x| js_truthy(x))
                    {
                        js_to_string(sn)
                    } else if let Some(sl) = d.as_object().and_then(|o| o.get("slot")) {
                        if let Some(n) = crate::js::as_number(sl) {
                            format!("Bay {}", crate::js::number_to_string(n))
                        } else if js_truthy(sl) {
                            js_to_string(sl)
                        } else {
                            format!("Bay {}", drives_list.len() + 1)
                        }
                    } else {
                        format!("Bay {}", drives_list.len() + 1)
                    };

                    let drive_model = has_defined_prop(d, "model")
                        .filter(|x| js_truthy(x))
                        .map_or_else(
                            || Value::String("Synology Storage Disk".to_string()),
                            Clone::clone,
                        );

                    drives_list.push(json!({
                        "slot": slot_str,
                        "model": drive_model,
                        "type": dtype,
                        "status": status,
                        "tempC": num_json(temp_c),
                        "maxTempC": num_json(max_temp_c),
                        "reallocatedSectors": num_json(reallocated_sectors),
                        "pendingSectors": num_json(pending_sectors),
                        "uncorrectableSectors": num_json(uncorrectable_sectors),
                        "crcErrors": num_json(crc_errors),
                        "powerOnHours": num_json(power_on_hours),
                        "healthLabel": health_label,
                    }));
                }
            }
        }
    }

    if drives_list.is_empty() {
        drives_list.push(json!({
            "slot": "Bay 1",
            "model": "Synology Storage Pool (Internal)",
            "type": "HDD",
            "status": "normal",
            "tempC": 36,
            "maxTempC": 39,
            "reallocatedSectors": 0,
            "pendingSectors": 0,
            "uncorrectableSectors": 0,
            "crcErrors": 0,
            "powerOnHours": 12000,
            "healthLabel": "Tốt (100%)",
        }));
    }

    let used_percent = if total_storage_bytes > 0.0 {
        round_fixed_f64((used_storage_bytes / total_storage_bytes) * 100.0, 1)
    } else {
        0.0
    };

    let storage = json!({
        "poolsStatus": pools_status,
        "volumesCount": storage_volumes_arr.len().max(1),
        "totalStorageBytes": if total_storage_bytes > 0.0 { num_json(total_storage_bytes) } else { json!(4_000_000_000_000_i64) },
        "usedStorageBytes": if used_storage_bytes > 0.0 { num_json(used_storage_bytes) } else { json!(1_500_000_000_000_i64) },
        "freeStorageBytes": if free_storage_bytes > 0.0 { num_json(free_storage_bytes) } else { json!(2_500_000_000_000_i64) },
        "usedPercent": if used_percent > 0.0 { num_json(used_percent) } else { json!(37.5) },
        "scrubbingDone": true,
        "drives": drives_list,
    });

    // 3. Disk Wear & Life Expectancy
    let ssds: Vec<Value> = drives_list
        .iter()
        .filter(|d| matches!(d.get("type").and_then(Value::as_str), Some("SSD" | "NVMe")))
        .map(|ssd| {
            json!({
                "slot": ssd["slot"],
                "model": ssd["model"],
                "lifeLeftPercent": 99,
                "tbwWrittenInPeriod": if is_weekly { 0.3 } else { 1.2 },
                "totalTbwWritten": 14.5,
                "ratedTbw": 600,
                "wearRatePercentPerMonth": 0.3,
                "estimatedYearsRemaining": 7,
            })
        })
        .collect();

    let hdds: Vec<Value> = drives_list
        .iter()
        .filter(|d| d.get("type").and_then(Value::as_str) == Some("HDD"))
        .map(|hdd| {
            let poh = hdd
                .get("powerOnHours")
                .and_then(Value::as_f64)
                .unwrap_or(0.0);
            let hours = if poh != 0.0 { poh } else { 12000.0 };
            let load_cycles = crate::js::math_round(hours * 0.35);
            let years = round_fixed_f64(hours / 8760.0, 1);
            let risk = if load_cycles > 200_000.0 {
                "high"
            } else {
                "low"
            };
            json!({
                "slot": hdd["slot"],
                "model": hdd["model"],
                "powerOnHours": num_json(hours),
                "powerOnYears": num_json(years),
                "loadCycleCount": num_json(load_cycles),
                "ratedLoadCycles": 300000,
                "hibernationRiskLevel": risk,
                "startStopCount": num_json(crate::js::math_round(hours / 120.0)),
                "powerCycleCount": num_json(crate::js::math_round(hours / 600.0)),
            })
        })
        .collect();

    let overall_drive_endurance_status = if drives_list
        .iter()
        .any(|d| d.get("status").and_then(Value::as_str) == Some("critical"))
    {
        "critical"
    } else if drives_list
        .iter()
        .any(|d| d.get("status").and_then(Value::as_str) == Some("warning"))
    {
        "warning"
    } else {
        "excellent"
    };

    let disk_wear = json!({
        "ssds": ssds,
        "hdds": hdds,
        "overallDriveEnduranceStatus": overall_drive_endurance_status,
        "hibernationRecommendation": "Các ổ cứng đang vận hành ở chu kỳ quay tải an toàn, nhiệt độ trong ngưỡng tối ưu.",
    });

    // 4. Power & UPS Data
    let ups_connected = !ups_info.is_null()
        && !crate::js::is_undefined(&ups_info)
        && (has_defined_prop(&ups_info, "model").is_some_and(js_truthy)
            || has_defined_prop(&ups_info, "status").is_some_and(js_truthy)
            || has_defined_prop(&ups_info, "battery_charge").is_some_and(js_truthy)
            || has_defined_prop(&ups_info, "batteryCharge").is_some_and(js_truthy));

    let ups_model = if ups_connected {
        has_defined_prop(&ups_info, "model")
            .filter(|v| js_truthy(v))
            .or_else(|| has_defined_prop(&ups_info, "device_model").filter(|v| js_truthy(v)))
            .or_else(|| has_defined_prop(&ups_info, "mfr").filter(|v| js_truthy(v)))
            .map_or_else(|| "UPS Thiết bị bảo vệ nguồn".to_string(), js_to_string)
    } else {
        "Không kết nối UPS (Nguồn AC trực tiếp)".to_string()
    };

    let ups_battery_percent = if ups_connected {
        let v = has_defined_prop(&ups_info, "battery_charge")
            .filter(|x| js_truthy(x))
            .or_else(|| has_defined_prop(&ups_info, "batteryCharge").filter(|x| js_truthy(x)));
        v.map_or(100.0, js_to_number)
    } else {
        0.0
    };

    let ups_load_percent = if ups_connected {
        let v = has_defined_prop(&ups_info, "load")
            .filter(|x| js_truthy(x))
            .or_else(|| has_defined_prop(&ups_info, "load_percent").filter(|x| js_truthy(x)));
        v.map_or(15.0, js_to_number)
    } else {
        0.0
    };

    let mut outages_count: usize = 0;
    let mut improper_shutdowns: usize = 0;
    for (log, _) in &period_sys_logs {
        let raw_text = has_defined_prop(log, "msg")
            .filter(|x| js_truthy(x))
            .or_else(|| has_defined_prop(log, "message").filter(|x| js_truthy(x)))
            .or_else(|| has_defined_prop(log, "event").filter(|x| js_truthy(x)));
        let text = raw_text
            .map_or_else(String::new, js_to_string)
            .to_lowercase();
        if text.contains("switched to battery")
            || text.contains("battery mode")
            || text.contains("power failure")
            || text.contains("on battery")
        {
            outages_count += 1;
        }
        if text.contains("improper shutdown")
            || text.contains("abnormal shutdown")
            || text.contains("was not shut down properly")
            || text.contains("power was lost")
        {
            improper_shutdowns += 1;
        }
    }

    let model_str = model
        .as_str()
        .ok_or_else(|| "TypeError: model.includes is not a function".to_string())?;
    let base_watts: f64 = if model_str.contains('9') || model_str.contains('4') {
        26.0
    } else if model_str.contains('2') {
        16.0
    } else {
        32.0
    };
    let avg_watt = round_fixed_f64(base_watts + (drives_list.len() as f64) * 3.5, 1);
    let total_hours = (days * 24) as f64;
    let estimated_kwh = round_fixed_f64((avg_watt * total_hours) / 1000.0, 1);
    let estimated_cost_vnd = crate::js::math_round(estimated_kwh * VND_PER_KWH);

    let power_history: Vec<Value> = if is_weekly {
        ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
            .iter()
            .enumerate()
            .map(|(idx, label)| {
                json!({
                    "label": label,
                    "kwh": num_json(round_fixed_f64(estimated_kwh / 7.0, 2)),
                    "outages": if idx == 0 { outages_count } else { 0 },
                })
            })
            .collect()
    } else {
        vec![
            json!({ "label": "Tuần 1", "kwh": num_json(round_fixed_f64(estimated_kwh * 0.25, 1)), "outages": 0 }),
            json!({ "label": "Tuần 2", "kwh": num_json(round_fixed_f64(estimated_kwh * 0.25, 1)), "outages": outages_count }),
            json!({ "label": "Tuần 3", "kwh": num_json(round_fixed_f64(estimated_kwh * 0.25, 1)), "outages": 0 }),
            json!({ "label": "Tuần 4", "kwh": num_json(round_fixed_f64(estimated_kwh * 0.25, 1)), "outages": 0 }),
        ]
    };

    let power = json!({
        "outagesCount": outages_count,
        "improperShutdowns": improper_shutdowns,
        "totalBatterySeconds": outages_count * 300,
        "estimatedKWh": num_json(estimated_kwh),
        "estimatedCostVND": num_json(estimated_cost_vnd),
        "averageWattage": num_json(avg_watt),
        "upsConnected": ups_connected,
        "upsModel": ups_model,
        "upsBatteryPercent": num_json(ups_battery_percent),
        "upsLoadPercent": num_json(ups_load_percent),
        "powerHistory": power_history,
    });

    // 5. Security & Attack Defense
    let blocked_ips_count = blocked_ips_arr.len();
    let mut failed_logins_count: usize = 0;
    for (log, _) in &period_conn_logs {
        let raw_text = has_defined_prop(log, "msg")
            .filter(|x| js_truthy(x))
            .or_else(|| has_defined_prop(log, "message").filter(|x| js_truthy(x)))
            .or_else(|| has_defined_prop(log, "event").filter(|x| js_truthy(x)));
        let text = raw_text
            .map_or_else(String::new, js_to_string)
            .to_lowercase();
        if text.contains("failed")
            || text.contains("incorrect")
            || text.contains("login fail")
            || text.contains("authentication fail")
        {
            failed_logins_count += 1;
        }
    }
    if failed_logins_count == 0 && blocked_ips_count > 0 {
        failed_logins_count = blocked_ips_count * 5;
    }

    let mut country_counts: IndexMap<String, usize> = IndexMap::new();
    for ip_item in blocked_ips_arr {
        check_non_null_or_undef(ip_item, "country")?;
        let c_val = has_defined_prop(ip_item, "country").filter(|x| js_truthy(x));
        let c_str = match c_val {
            Some(v) => v
                .as_str()
                .ok_or_else(|| "TypeError: country.toUpperCase is not a function".to_string())?
                .to_uppercase(),
            None => "UNKNOWN".to_string(),
        };
        *country_counts.entry(c_str).or_insert(0) += 1;
    }

    let mut country_entries: Vec<(String, usize)> = country_counts.into_iter().collect();
    crate::js::sort(&mut country_entries, |a, b| (b.1 as f64) - (a.1 as f64));
    let mut top_attacking_countries: Vec<Value> = country_entries
        .into_iter()
        .take(5)
        .map(|(code, count)| {
            let (name, flag) = country_info(&code).map_or((code.as_str(), "🌐"), |(n, f)| (n, f));
            json!({
                "countryCode": code,
                "countryName": name,
                "attackCount": count,
                "flagEmoji": flag,
            })
        })
        .collect();
    if top_attacking_countries.is_empty() {
        top_attacking_countries.push(json!({
            "countryCode": "VN",
            "countryName": "Việt Nam (Nội bộ an toàn)",
            "attackCount": 0,
            "flagEmoji": "🇻🇳",
        }));
    }

    let mut recent_attackers: Vec<Value> = Vec::new();
    for item in blocked_ips_arr.iter().take(4) {
        let ip_val = item
            .as_object()
            .and_then(|o| o.get("ip"))
            .cloned()
            .unwrap_or_else(crate::js::undefined);
        let deny_time_val = item
            .as_object()
            .and_then(|o| o.get("denyTime"))
            .cloned()
            .unwrap_or_else(crate::js::undefined);
        let c_prop = item.as_object().and_then(|o| o.get("country"));
        let country_display = match c_prop {
            Some(c_v) if js_truthy(c_v) => {
                let c_up = c_v
                    .as_str()
                    .ok_or_else(|| "TypeError: country.toUpperCase is not a function".to_string())?
                    .to_uppercase();
                country_info(&c_up)
                    .map(|(n, _)| Value::String(n.to_string()))
                    .unwrap_or_else(|| c_v.clone())
            }
            _ => Value::String("UNKNOWN".to_string()),
        };
        recent_attackers.push(json!({
            "ip": ip_val,
            "country": country_display,
            "time": deny_time_val,
            "attempts": 5,
            "service": "AutoBlock Rule",
        }));
    }

    let security = json!({
        "failedLoginsCount": failed_logins_count,
        "blockedIpsCount": blocked_ips_count,
        "dosProtectionTriggers": 0,
        "topAttackingCountries": top_attacking_countries,
        "targetedServices": [
            { "service": "SSH (Port 22)", "count": num_json(crate::js::math_round((failed_logins_count as f64) * 0.75)), "percent": 75 },
            { "service": "DSM Web Portal", "count": num_json(crate::js::math_round((failed_logins_count as f64) * 0.25)), "percent": 25 },
        ],
        "recentAttackers": recent_attackers,
        "bruteForceBlockedRate": 100,
    });

    // 6. Network Telemetry
    let mut net_outages: usize = 0;
    for (log, _) in &period_sys_logs {
        let raw_text = has_defined_prop(log, "msg")
            .filter(|x| js_truthy(x))
            .or_else(|| has_defined_prop(log, "message").filter(|x| js_truthy(x)))
            .or_else(|| has_defined_prop(log, "event").filter(|x| js_truthy(x)));
        let text = raw_text
            .map_or_else(String::new, js_to_string)
            .to_lowercase();
        if text.contains("link down")
            || text.contains("network down")
            || text.contains("disconnected from wan")
            || text.contains("connection lost")
        {
            net_outages += 1;
        }
    }
    let downtime_minutes = (net_outages * 5) as f64;
    let uptime_percent = if uptime_seconds > 0.0 {
        let raw_pct = ((total_hours * 60.0 - downtime_minutes) / (total_hours * 60.0)) * 100.0;
        round_fixed_f64(raw_pct.clamp(90.0, 100.0), 2)
    } else {
        100.0
    };

    let rx_rate = utilization
        .as_object()
        .and_then(|o| o.get("networkRxBytes"))
        .filter(|x| js_truthy(x))
        .map(js_to_number);
    let total_rx_gb = match rx_rate {
        Some(r) => round_fixed_f64((r * total_hours * 3600.0) / 1e9, 1),
        None => {
            if is_weekly {
                135.2
            } else {
                540.8
            }
        }
    };

    let tx_rate = utilization
        .as_object()
        .and_then(|o| o.get("networkTxBytes"))
        .filter(|x| js_truthy(x))
        .map(js_to_number);
    let total_tx_gb = match tx_rate {
        Some(t) => round_fixed_f64((t * total_hours * 3600.0) / 1e9, 1),
        None => {
            if is_weekly {
                82.4
            } else {
                320.1
            }
        }
    };

    let network = json!({
        "outagesCount": net_outages,
        "downtimeMinutes": num_json(downtime_minutes),
        "uptimePercent": num_json(uptime_percent),
        "averageLatencyMs": 2.8,
        "totalRxGB": num_json(total_rx_gb.max(10.0)),
        "totalTxGB": num_json(total_tx_gb.max(5.0)),
        "dnsFailures": 0,
        "recentEvents": [],
    });

    // 7. Vulnerabilities & Compliance
    let ssh_port_val = terminal_info
        .as_object()
        .and_then(|o| o.get("ssh_port"))
        .filter(|x| js_truthy(x))
        .cloned()
        .unwrap_or_else(|| json!(22));
    let default_ssh_port_changed =
        ssh_port_val.as_f64() != Some(22.0) && ssh_port_val.as_i64() != Some(22);

    let default_admin_disabled = if !dsm_users_arr.is_empty() {
        let mut found = false;
        for u in dsm_users_arr {
            check_non_null_or_undef(u, "name")?;
            let name_val = u.as_object().and_then(|o| o.get("name"));
            let name_str = match name_val {
                Some(v) if !crate::js::is_undefined(v) && !v.is_null() => v
                    .as_str()
                    .ok_or_else(|| "TypeError: u.name.toLowerCase is not a function".to_string())?,
                Some(v) if v.is_null() => {
                    return Err(
                        "TypeError: Cannot read properties of null (reading 'toLowerCase')"
                            .to_string(),
                    );
                }
                _ => {
                    return Err(
                        "TypeError: Cannot read properties of undefined (reading 'toLowerCase')"
                            .to_string(),
                    );
                }
            };
            let st = u
                .as_object()
                .and_then(|o| o.get("status"))
                .and_then(Value::as_str);
            if name_str.to_lowercase() == "admin" && matches!(st, Some("disabled" | "expired")) {
                found = true;
                break;
            }
        }
        found
    } else {
        true
    };

    let mut findings: Vec<Value> = Vec::new();
    if !default_ssh_port_changed {
        findings.push(json!({
            "id": "vuln_ssh",
            "category": "network",
            "severity": "warning",
            "title": "Cổng SSH đang sử dụng cổng 22 mặc định",
            "description": "Cổng 22 thường thu hút nhiều đợt quét bot tự động trên Internet.",
            "recommendation": "Đổi cổng SSH sang dải số bảo mật (ví dụ: 2222) trong Terminal để tránh dò quét.",
            "fixed": false,
        }));
    }
    if !default_admin_disabled {
        findings.push(json!({
            "id": "vuln_admin",
            "category": "account",
            "severity": "warning",
            "title": "Tài khoản 'admin' mặc định chưa được vô hiệu hóa",
            "description": "Tài khoản 'admin' là đối tượng mục tiêu hàng đầu của tấn công brute-force.",
            "recommendation": "Tạo tài khoản quản trị viên mới với tên riêng và vô hiệu hóa tài khoản 'admin'.",
            "fixed": false,
        }));
    }
    let bad_drive = drives_list
        .iter()
        .find(|d| d.get("status").and_then(Value::as_str) != Some("normal"));
    if let Some(bd) = bad_drive {
        let slot = bd.get("slot").and_then(Value::as_str).unwrap_or("");
        let hlabel = bd.get("healthLabel").and_then(Value::as_str).unwrap_or("");
        findings.push(json!({
            "id": "vuln_storage",
            "category": "system",
            "severity": "critical",
            "title": format!("Ổ đĩa tại {slot} có cảnh báo sức khỏe ({hlabel})"),
            "description": "Phát hiện sector bất thường trên ổ cứng lưu trữ.",
            "recommendation": "Kiểm tra S.M.A.R.T chi tiết và chuẩn bị phương án sao lưu dự phòng.",
            "fixed": false,
        }));
    }
    if findings.is_empty() {
        findings.push(json!({
            "id": "vuln_good",
            "category": "system",
            "severity": "info",
            "title": "Hệ thống bảo mật và phân quyền NAS đạt trạng thái tối ưu",
            "description": "Tất cả các dịch vụ mạng, cổng bảo mật và tài khoản quản trị đều đang tuân thủ tiêu chuẩn an toàn.",
            "recommendation": "Duy trì sao lưu dữ liệu và kiểm tra nhật ký sự kiện định kỳ.",
            "fixed": true,
        }));
    }

    let score_raw = 100_i64
        - if default_ssh_port_changed { 0 } else { 10 }
        - if default_admin_disabled { 0 } else { 10 }
        - if bad_drive.is_some() { 20 } else { 0 };
    let security_advisor_score = score_raw.max(65);
    let security_advisor_status = if security_advisor_score >= 90 {
        "good"
    } else if security_advisor_score >= 75 {
        "warning"
    } else {
        "danger"
    };

    let vulnerabilities = json!({
        "securityAdvisorScore": security_advisor_score,
        "securityAdvisorStatus": security_advisor_status,
        "defaultAdminDisabled": default_admin_disabled,
        "twoFactorEnabled": true,
        "defaultSshPortChanged": default_ssh_port_changed,
        "sshPort": ssh_port_val,
        "httpExposedToWan": false,
        "dsmUpdateAvailable": false,
        "dsmCurrentVersion": dsm_version,
        "vulnerablePackagesCount": 0,
        "findings": findings,
    });

    // 8. Daily Records
    let mut daily_records: Vec<Value> = Vec::with_capacity(days);
    let hottest_slot = drives_list
        .first()
        .and_then(|d| d.get("slot"))
        .filter(|x| js_truthy(x))
        .and_then(Value::as_str)
        .unwrap_or("Bay 1")
        .to_string();
    let hottest_model = drives_list
        .first()
        .and_then(|d| d.get("model"))
        .filter(|x| js_truthy(x))
        .and_then(Value::as_str)
        .unwrap_or("HDD")
        .to_string();
    let max_temp_c = drives_list
        .first()
        .and_then(|d| d.get("tempC"))
        .filter(|x| js_truthy(x))
        .cloned()
        .unwrap_or_else(|| json!(36));
    let peak_cpu_percent = utilization
        .as_object()
        .and_then(|o| o.get("cpuPercent"))
        .filter(|x| js_truthy(x))
        .map_or(25.0, |v| crate::js::math_round(js_to_number(v)));
    let peak_mem_percent = utilization
        .as_object()
        .and_then(|o| o.get("memoryPercent"))
        .filter(|x| js_truthy(x))
        .map_or(45.0, |v| crate::js::math_round(js_to_number(v)));

    for rev_i in (0..days).rev() {
        let target_ms = now_ms - (rev_i as f64) * 86_400_000.0;
        let target_parts =
            ms_to_date_parts(target_ms).ok_or_else(|| "Invalid target date".to_string())?;
        let d_start = day_start_ms(target_ms).ok_or_else(|| "Invalid day start".to_string())?;
        let d_end = d_start + 86_400_000.0;

        let day_sys_logs: Vec<(&Value, f64)> = period_sys_logs
            .iter()
            .copied()
            .filter(|(_, ts)| *ts >= d_start && *ts < d_end)
            .collect();
        let day_conn_logs: Vec<(&Value, f64)> = period_conn_logs
            .iter()
            .copied()
            .filter(|(_, ts)| *ts >= d_start && *ts < d_end)
            .collect();

        let mut day_blocked_ips: Vec<Value> = Vec::new();
        for ip_item in blocked_ips_arr {
            let deny_t = ip_item.as_object().and_then(|o| o.get("denyTime"));
            let ts = parse_log_timestamp(deny_t);
            if ts >= d_start && ts < d_end {
                let ip_val = ip_item
                    .as_object()
                    .and_then(|o| o.get("ip"))
                    .cloned()
                    .unwrap_or_else(crate::js::undefined);
                let deny_val = deny_t.cloned().unwrap_or_else(crate::js::undefined);
                let c_prop = ip_item.as_object().and_then(|o| o.get("country"));
                let country_display = match c_prop {
                    Some(c_v) if js_truthy(c_v) => {
                        let c_up = c_v.as_str().unwrap_or("").to_uppercase();
                        country_info(&c_up)
                            .map(|(n, _)| Value::String(n.to_string()))
                            .unwrap_or_else(|| c_v.clone())
                    }
                    _ => Value::String("UNKNOWN".to_string()),
                };
                day_blocked_ips.push(json!({
                    "ip": ip_val,
                    "country": country_display,
                    "service": "AutoBlock",
                    "time": deny_val,
                }));
            }
        }

        let mut day_failed_logins: usize = 0;
        for (log, _) in &day_conn_logs {
            let raw_text = has_defined_prop(log, "msg")
                .filter(|x| js_truthy(x))
                .or_else(|| has_defined_prop(log, "message").filter(|x| js_truthy(x)))
                .or_else(|| has_defined_prop(log, "event").filter(|x| js_truthy(x)));
            let text = raw_text
                .map_or_else(String::new, js_to_string)
                .to_lowercase();
            if text.contains("failed") || text.contains("incorrect") || text.contains("fail") {
                day_failed_logins += 1;
            }
        }

        let mut day_events: Vec<Value> = Vec::new();
        for (log, ts) in day_sys_logs.iter().take(3) {
            let msg = has_defined_prop(log, "msg")
                .filter(|x| js_truthy(x))
                .or_else(|| has_defined_prop(log, "message").filter(|x| js_truthy(x)))
                .or_else(|| has_defined_prop(log, "event").filter(|x| js_truthy(x)))
                .map_or_else(|| "Sự kiện hệ thống".to_string(), js_to_string);
            let log_level = log
                .as_object()
                .and_then(|o| o.get("level"))
                .and_then(Value::as_str);
            let lvl = match log_level {
                Some("err" | "error") => "critical",
                Some("warn" | "warning") => "warning",
                _ => "info",
            };
            let msg_low = msg.to_lowercase();
            let cat = if msg_low.contains("disk") || msg_low.contains("storage") {
                "storage"
            } else {
                "system"
            };
            let t_parts = ms_to_date_parts(*ts).unwrap_or(DateParts {
                year: 1970,
                month: 1,
                day: 1,
                hour: 0,
                minute: 0,
                second: 0,
                weekday_sun0: 0,
            });
            day_events.push(json!({
                "time": fmt_vi_hm(&t_parts),
                "level": lvl,
                "category": cat,
                "message": msg,
            }));
        }

        if day_events.is_empty() {
            day_events.push(json!({
                "time": "00:00",
                "level": "info",
                "category": "system",
                "message": "Hệ thống NAS và các phân vùng lưu trữ vận hành ổn định.",
            }));
        }

        let has_critical = day_events
            .iter()
            .any(|e| e.get("level").and_then(Value::as_str) == Some("critical"));
        let has_warning = day_events
            .iter()
            .any(|e| e.get("level").and_then(Value::as_str) == Some("warning"))
            || day_failed_logins > 10;
        let day_status = if has_critical {
            "critical"
        } else if has_warning {
            "warning"
        } else {
            "optimal"
        };

        let daily_kwh = round_fixed_f64((avg_watt * 24.0) / 1000.0, 2);
        let day_of_week = day_name(target_parts.weekday_sun0);
        let (date, full_date) = fmt_dd_mm(&target_parts);

        daily_records.push(json!({
            "date": date,
            "fullDate": full_date,
            "dayOfWeek": day_of_week,
            "status": day_status,
            "power": {
                "kwh": num_json(daily_kwh),
                "costVND": num_json(crate::js::math_round(daily_kwh * VND_PER_KWH)),
                "peakWatts": num_json(crate::js::math_round(avg_watt * 1.2)),
                "outagesCount": 0,
                "batteryRuntimeSec": 0,
            },
            "network": {
                "rxGB": num_json(round_fixed_f64(total_rx_gb.max(10.0) / (days as f64), 1)),
                "txGB": num_json(round_fixed_f64(total_tx_gb.max(5.0) / (days as f64), 1)),
                "peakSpeedMBs": 85,
                "avgLatencyMs": 2.8,
                "outagesCount": 0,
                "downtimeMinutes": 0,
            },
            "storage": {
                "maxTempC": max_temp_c,
                "hottestDrive": format!("{hottest_slot} ({hottest_model})"),
                "newBadSectors": 0,
                "ssdCacheWrittenGB": 35,
            },
            "security": {
                "failedLogins": day_failed_logins,
                "blockedIpsCount": day_blocked_ips.len(),
                "blockedIps": day_blocked_ips,
            },
            "system": {
                "peakCpuPercent": num_json(peak_cpu_percent),
                "peakMemPercent": num_json(peak_mem_percent),
            },
            "events": day_events,
        }));
    }

    let health_score = compute_health_score(
        power.clone(),
        storage.clone(),
        security.clone(),
        network.clone(),
        disk_wear.clone(),
        vulnerabilities.clone(),
    )?;

    Ok(json!({
        "period": period,
        "startDate": start_date_str,
        "endDate": end_date_str,
        "generatedAt": generated_at,
        "hostName": host_name,
        "model": model,
        "dsmVersion": dsm_version,
        "uptimeString": uptime_string,
        "healthScore": health_score,
        "power": power,
        "network": network,
        "storage": storage,
        "diskWear": disk_wear,
        "security": security,
        "vulnerabilities": vulnerabilities,
        "dailyRecords": daily_records,
    }))
}

/// Port of `computeHealthScore` (`src/lib/reports/reportEngine.ts:582`).
pub fn compute_health_score(
    power: Value,
    storage: Value,
    security: Value,
    network: Value,
    disk_wear: Value,
    vuln: Value,
) -> Result<Value, String> {
    check_non_null_or_undef(&power, "improperShutdowns")?;
    let improper_shutdowns = prop(&power, "improperShutdowns")
        .as_f64()
        .or_else(|| crate::js::as_number(prop(&power, "improperShutdowns")))
        .unwrap_or(0.0);
    let power_outages = prop(&power, "outagesCount")
        .as_f64()
        .or_else(|| crate::js::as_number(prop(&power, "outagesCount")))
        .unwrap_or(0.0);

    let mut power_score: f64 = 20.0;
    if improper_shutdowns > 0.0 {
        power_score -= (improper_shutdowns * 10.0).min(15.0);
    }
    if power_outages > 3.0 {
        power_score -= 3.0;
    }
    power_score = power_score.max(0.0);

    check_non_null_or_undef(&storage, "poolsStatus")?;
    let pools_status = prop(&storage, "poolsStatus").as_str().unwrap_or("");
    let drives_val = storage
        .as_object()
        .and_then(|o| o.get("drives"))
        .unwrap_or(&Value::Null);
    let drives = drives_val
        .as_array()
        .ok_or_else(|| "TypeError: storage.drives is not iterable".to_string())?;

    let mut storage_score: f64 = 30.0;
    if pools_status == "critical" {
        storage_score -= 25.0;
    } else if pools_status == "warning" {
        storage_score -= 12.0;
    }

    let mut total_bad_or_pending: f64 = 0.0;
    for d in drives {
        check_non_null_or_undef(d, "pendingSectors")?;
        let pend = crate::js::as_number(prop(d, "pendingSectors")).unwrap_or(0.0);
        let real = crate::js::as_number(prop(d, "reallocatedSectors")).unwrap_or(0.0);
        let temp_c = crate::js::as_number(prop(d, "tempC")).unwrap_or(0.0);
        if pend > 0.0 {
            total_bad_or_pending += pend;
        }
        if real > 0.0 {
            total_bad_or_pending += real;
        }
        if temp_c >= 50.0 {
            storage_score -= 3.0;
        }
    }
    if total_bad_or_pending > 0.0 {
        storage_score -= (total_bad_or_pending * 3.0).min(15.0);
    }
    storage_score = storage_score.max(0.0);

    check_non_null_or_undef(&vuln, "defaultAdminDisabled")?;
    let mut security_score: f64 = 25.0;
    if !js_truthy(prop(&vuln, "defaultAdminDisabled")) {
        security_score -= 7.0;
    }
    if prop(&vuln, "sshPort").as_f64() == Some(22.0) {
        security_score -= 4.0;
    }
    if !js_truthy(prop(&vuln, "twoFactorEnabled")) {
        security_score -= 4.0;
    }
    if js_truthy(prop(&vuln, "dsmUpdateAvailable")) {
        security_score -= 5.0;
    }
    let vuln_pkgs = crate::js::as_number(prop(&vuln, "vulnerablePackagesCount")).unwrap_or(0.0);
    if vuln_pkgs > 0.0 {
        security_score -= (vuln_pkgs * 2.0).min(5.0);
    }
    security_score = security_score.max(0.0);

    check_non_null_or_undef(&network, "uptimePercent")?;
    let mut network_score: f64 = 15.0;
    let net_uptime = prop(&network, "uptimePercent").as_f64().unwrap_or(100.0);
    let net_outages = prop(&network, "outagesCount").as_f64().unwrap_or(0.0);
    if net_uptime < 99.0 {
        network_score -= 8.0;
    } else if net_uptime < 99.9 {
        network_score -= 3.0;
    }
    if net_outages > 5.0 {
        network_score -= 4.0;
    }
    network_score = network_score.max(0.0);

    check_non_null_or_undef(&disk_wear, "ssds")?;
    let ssds = disk_wear
        .as_object()
        .and_then(|o| o.get("ssds"))
        .and_then(Value::as_array)
        .ok_or_else(|| "TypeError: diskWear.ssds is not iterable".to_string())?;
    let hdds = disk_wear
        .as_object()
        .and_then(|o| o.get("hdds"))
        .and_then(Value::as_array)
        .ok_or_else(|| "TypeError: diskWear.hdds is not iterable".to_string())?;

    let mut wear_score: f64 = 10.0;
    for ssd in ssds {
        check_non_null_or_undef(ssd, "lifeLeftPercent")?;
        let life = crate::js::as_number(prop(ssd, "lifeLeftPercent")).unwrap_or(100.0);
        if life < 20.0 {
            wear_score -= 5.0;
        } else if life < 50.0 {
            wear_score -= 2.0;
        }
    }
    for hdd in hdds {
        check_non_null_or_undef(hdd, "hibernationRiskLevel")?;
        if prop(hdd, "hibernationRiskLevel").as_str() == Some("high") {
            wear_score -= 3.0;
        }
    }
    wear_score = wear_score.max(0.0);

    let total_score = crate::js::math_round(
        power_score + storage_score + security_score + network_score + wear_score,
    );

    let (grade, status_text) = if total_score >= 95.0 {
        ("A+", "Xuất sắc: Phần cứng & bảo mật đạt trạng thái tối ưu")
    } else if total_score >= 85.0 {
        ("A", "Rất tốt: Toàn bộ dịch vụ vận hành an toàn và bền bỉ")
    } else if total_score >= 70.0 {
        ("B", "Khá: Có một số cảnh báo cần theo dõi định kỳ")
    } else if total_score >= 50.0 {
        (
            "C",
            "Cảnh báo: Cần can thiệp cấu hình hoặc kiểm tra phần cứng",
        )
    } else {
        (
            "D",
            "Nguy hiểm: Phát hiện sự cố nghiêm trọng đe dọa an toàn dữ liệu",
        )
    };

    check_non_null_or_undef(&security, "blockedIpsCount")?;
    let blocked_ips_count = &security
        .as_object()
        .and_then(|o| o.get("blockedIpsCount"))
        .cloned()
        .unwrap_or_else(crate::js::undefined);
    let net_uptime_val = &network
        .as_object()
        .and_then(|o| o.get("uptimePercent"))
        .cloned()
        .unwrap_or_else(crate::js::undefined);

    let mut summary_highlights = Vec::with_capacity(4);
    if improper_shutdowns == 0.0 {
        summary_highlights.push("0 lần sập nguồn đột ngột".to_string());
    } else {
        summary_highlights.push(format!(
            "⚠️ {} lần sập nguồn đột ngột",
            js_to_string(prop(&power, "improperShutdowns"))
        ));
    }
    if total_bad_or_pending == 0.0 {
        summary_highlights.push("Toàn bộ đĩa cứng không có bad sector".to_string());
    } else {
        summary_highlights.push(format!(
            "⚠️ Phát hiện {} sectors bất thường",
            crate::js::number_to_string(total_bad_or_pending)
        ));
    }
    summary_highlights.push(format!(
        "Đã chặn {} IP tấn công dò quét",
        js_to_string(blocked_ips_count)
    ));
    summary_highlights.push(format!(
        "Độ khả dụng mạng đạt {}%",
        js_to_string(net_uptime_val)
    ));

    Ok(json!({
        "score": num_json(total_score),
        "grade": grade,
        "statusText": status_text,
        "summaryHighlights": summary_highlights,
        "powerScore": num_json(power_score),
        "storageScore": num_json(storage_score),
        "securityScore": num_json(security_score),
        "networkScore": num_json(network_score),
        "wearScore": num_json(wear_score),
    }))
}

/// Port of `generateDailyRecords` (`src/lib/reports/reportEngine.ts:699`).
pub fn generate_daily_records(
    period: Value,
    days_count: Option<f64>,
    now: Value,
) -> Result<Vec<Value>, String> {
    let period = if crate::js::is_undefined(&period) {
        Value::String("weekly".to_string())
    } else {
        period
    };
    let days_count = days_count.unwrap_or(7.0);
    let mut i = days_count - 1.0;
    if i.is_nan() || i < 0.0 {
        return Ok(Vec::new());
    }

    let now_ms = if crate::js::is_undefined(&now) {
        pinned::now_ms()
    } else if now.is_null() {
        return Err("TypeError: Cannot read properties of null (reading 'getTime')".to_string());
    } else if let Some(d_str) = now
        .as_object()
        .filter(|o| o.len() == 1)
        .and_then(|o| o.get("$date"))
        .and_then(Value::as_str)
    {
        if d_str == "Invalid" {
            f64::NAN
        } else {
            parse_js_date_ms(d_str).unwrap_or(f64::NAN)
        }
    } else {
        return Err("TypeError: now.getTime is not a function".to_string());
    };

    let period_str = period.as_str();
    let mut records = Vec::new();
    while i >= 0.0 {
        let d_ms = now_ms - i * 86_400_000.0;
        let Some(p) = ms_to_date_parts(d_ms) else {
            break;
        };
        let day_of_week = day_name(p.weekday_sun0);
        let (date, full_date) = fmt_dd_mm(&p);

        let day_seed =
            (((p.day as f64) * 19.0 + ((p.month as f64) * 37.0) + i * 11.0) % 100.0).trunc();
        let kwh = round_fixed_f64(0.74 + (day_seed % 10.0) * 0.01, 2);
        let cost_vnd = crate::js::math_round(kwh * VND_PER_KWH);
        let peak_watts = 42.0 + (day_seed % 14.0);

        let rx_gb = round_fixed_f64(16.5 + (day_seed % 15.0) * 0.8, 1);
        let tx_gb = round_fixed_f64(9.2 + (day_seed % 10.0) * 0.6, 1);
        let peak_speed_mbs = 68.0 + (day_seed % 35.0);
        let avg_latency_ms = round_fixed_f64(3.1 + (day_seed % 7.0) * 0.2, 1);

        let max_temp_c = 36.0 + (day_seed % 5.0);
        let ssd_cache_written_gb = 40.0 + (day_seed % 25.0);
        let failed_logins = 4.0 + (day_seed % 9.0);
        let peak_cpu_percent = 24.0 + (day_seed % 26.0);
        let peak_mem_percent = 48.0 + (day_seed % 10.0);

        let mut status = "optimal";
        let mut outages_count = 0;
        let mut battery_runtime_sec = 0;
        let mut new_bad_sectors = 0;
        let mut blocked_ips_count = 0;
        let mut blocked_ips: Vec<Value> = Vec::new();
        let mut net_outages = 0;
        let mut downtime_minutes = 0;

        let mut events = vec![json!({
            "time": "02:00",
            "level": "info",
            "category": "backup",
            "message": "Nhiệm vụ Hyper Backup (Offsite Storage) hoàn tất an toàn (+8.6 GB delta, 14 phút).",
        })];

        if (period_str == Some("weekly") && i == 3.0)
            || (period_str == Some("monthly") && i == 18.0)
        {
            status = "warning";
            outages_count = 1;
            battery_runtime_sec = 480;
            events.push(json!({
                "time": "14:15",
                "level": "warning",
                "category": "power",
                "message": "Mất điện lưới AC đột ngột! UPS APC Back-UPS chuyển tải sang pin an toàn.",
            }));
            events.push(json!({
                "time": "14:23",
                "level": "info",
                "category": "power",
                "message": "Điện lưới đã phục hồi (Pin đã dùng: 8 phút, còn 89%). Bắt đầu nạp lại.",
            }));
        }

        if (period_str == Some("weekly") && i == 1.0) || (period_str == Some("monthly") && i == 6.0)
        {
            status = "warning";
            blocked_ips_count = 1;
            blocked_ips.push(json!({
                "ip": "185.220.101.5",
                "country": "Nga",
                "service": "SSH (Port 22)",
                "time": "21:40",
            }));
            events.push(json!({
                "time": "21:38",
                "level": "warning",
                "category": "security",
                "message": "Phát hiện 18 lần thử mật khẩu SSH thất bại liên tiếp từ 185.220.101.5.",
            }));
            events.push(json!({
                "time": "21:40",
                "level": "info",
                "category": "security",
                "message": "AutoBlock đã tự động khóa vĩnh viễn địa chỉ IP 185.220.101.5 (Nga).",
            }));
        }

        if (period_str == Some("weekly") && i == 4.0)
            || (period_str == Some("monthly") && i == 24.0)
        {
            new_bad_sectors = 2;
            status = "warning";
            events.push(json!({
                "time": "04:00",
                "level": "info",
                "category": "storage",
                "message": "Bắt đầu chạy S.M.A.R.T Quick Test tự động định kỳ.",
            }));
            events.push(json!({
                "time": "04:06",
                "level": "warning",
                "category": "storage",
                "message": "Khay Bay 3 (WD Red Plus): Phát hiện 2 pending sectors mới (ID 197).",
            }));
        }

        if period_str == Some("monthly") && i == 14.0 {
            status = "warning";
            net_outages = 1;
            downtime_minutes = 8;
            events.push(json!({
                "time": "03:22",
                "level": "warning",
                "category": "network",
                "message": "Mất kết nối gateway Internet WAN (PPPoE timeout trong 8 phút).",
            }));
            events.push(json!({
                "time": "03:30",
                "level": "info",
                "category": "network",
                "message": "Tái kết nối WAN Internet thành công. IP ngoại mạng mới được gán.",
            }));
        }

        records.push(json!({
            "date": date,
            "fullDate": full_date,
            "dayOfWeek": day_of_week,
            "status": status,
            "power": {
                "kwh": num_json(kwh),
                "costVND": num_json(cost_vnd),
                "peakWatts": num_json(peak_watts),
                "outagesCount": outages_count,
                "batteryRuntimeSec": battery_runtime_sec,
            },
            "network": {
                "rxGB": num_json(rx_gb),
                "txGB": num_json(tx_gb),
                "peakSpeedMBs": num_json(peak_speed_mbs),
                "avgLatencyMs": num_json(avg_latency_ms),
                "outagesCount": net_outages,
                "downtimeMinutes": downtime_minutes,
            },
            "storage": {
                "maxTempC": num_json(max_temp_c),
                "hottestDrive": "Bay 2 (Seagate IronWolf)",
                "newBadSectors": new_bad_sectors,
                "ssdCacheWrittenGB": num_json(ssd_cache_written_gb),
            },
            "security": {
                "failedLogins": num_json(failed_logins),
                "blockedIpsCount": blocked_ips_count,
                "blockedIps": blocked_ips,
            },
            "system": {
                "peakCpuPercent": num_json(peak_cpu_percent),
                "peakMemPercent": num_json(peak_mem_percent),
            },
            "events": events,
        }));

        i -= 1.0;
    }

    Ok(records)
}

/// Port of `generateMockReport` (`src/lib/reports/reportEngine.ts:881`).
pub fn generate_mock_report(
    period: Value,
    host_name: Option<String>,
    model: Option<String>,
    dsm_version: Option<String>,
) -> Result<Value, String> {
    let period = if crate::js::is_undefined(&period) {
        Value::String("weekly".to_string())
    } else {
        period
    };
    let host_name = host_name.unwrap_or_else(|| "Synology-DS920+".to_string());
    let model = model.unwrap_or_else(|| "DS920+".to_string());
    let dsm_version = dsm_version.unwrap_or_else(|| "DSM 7.2.1-69057 Update 3".to_string());

    let is_weekly = period.as_str() == Some("weekly");
    let days: usize = if is_weekly { 7 } else { 30 };

    let now_ms = pinned::now_ms();
    let now_parts = ms_to_date_parts(now_ms).ok_or_else(|| "Invalid Date".to_string())?;
    let end_date_str = fmt_vi_date(&now_parts);
    let generated_at = format!("{} {}", fmt_vi_hms(&now_parts), fmt_vi_date(&now_parts));

    let past_parts = ms_to_date_parts(now_ms - (days as f64) * 86_400_000.0)
        .ok_or_else(|| "Invalid past Date".to_string())?;
    let start_date_str = fmt_vi_date(&past_parts);

    let outages_count = if is_weekly { 1 } else { 2 };
    let improper_shutdowns = 0;
    let total_battery_seconds = if is_weekly { 480 } else { 1620 };
    let avg_watt = 32.5;
    let total_hours = (days * 24) as f64;
    let estimated_kwh = round_fixed_f64((avg_watt * total_hours) / 1000.0, 1);
    let estimated_cost_vnd = crate::js::math_round(estimated_kwh * VND_PER_KWH);

    let now_iso = chrono::DateTime::from_timestamp_millis(now_ms.trunc() as i64)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| "Invalid".to_string());
    let daily_records = generate_daily_records(
        period.clone(),
        Some(days as f64),
        json!({ "$date": now_iso }),
    )?;

    let power_history: Vec<Value> = if is_weekly {
        daily_records
            .iter()
            .map(|r| {
                let dow = r.get("dayOfWeek").and_then(Value::as_str).unwrap_or("");
                let label = dow.replacen("Thứ ", "T", 1).replacen("Chủ Nhật", "CN", 1);
                json!({
                    "label": label,
                    "kwh": r["power"]["kwh"],
                    "outages": r["power"]["outagesCount"],
                })
            })
            .collect()
    } else {
        vec![
            json!({ "label": "Tuần 1", "kwh": 5.4, "outages": 0 }),
            json!({ "label": "Tuần 2", "kwh": 5.6, "outages": 1 }),
            json!({ "label": "Tuần 3", "kwh": 5.3, "outages": 0 }),
            json!({ "label": "Tuần 4", "kwh": 5.5, "outages": 1 }),
        ]
    };

    let power = json!({
        "outagesCount": outages_count,
        "improperShutdowns": improper_shutdowns,
        "totalBatterySeconds": total_battery_seconds,
        "estimatedKWh": num_json(estimated_kwh),
        "estimatedCostVND": num_json(estimated_cost_vnd),
        "averageWattage": num_json(avg_watt),
        "upsConnected": true,
        "upsModel": "APC Back-UPS Pro 900VA",
        "upsBatteryPercent": 100,
        "upsLoadPercent": 18,
        "powerHistory": power_history,
    });

    let network = json!({
        "outagesCount": if is_weekly { 0 } else { 1 },
        "downtimeMinutes": if is_weekly { 0 } else { 8 },
        "uptimePercent": if is_weekly { json!(100) } else { json!(99.98) },
        "averageLatencyMs": 3.8,
        "totalRxGB": if is_weekly { 142.5 } else { 598.2 },
        "totalTxGB": if is_weekly { 84.1 } else { 341.6 },
        "dnsFailures": if is_weekly { 0 } else { 2 },
        "recentEvents": if is_weekly {
            vec![]
        } else {
            vec![json!({
                "time": "14/09 03:22",
                "event": "Mất kết nối gateway Internet (WAN PPPoE)",
                "duration": "8 phút",
                "type": "wan",
            })]
        },
    });

    let storage = json!({
        "poolsStatus": "normal",
        "volumesCount": 1,
        "totalStorageBytes": 11_627_885_000_000_i64,
        "usedStorageBytes": 7_751_923_333_333_i64,
        "freeStorageBytes": 3_875_961_666_667_i64,
        "usedPercent": 66.7,
        "scrubbingDone": true,
        "drives": [
            {
                "slot": "Bay 1",
                "model": "WD Red Plus WD40EFRX",
                "type": "HDD",
                "status": "normal",
                "tempC": 36,
                "maxTempC": 39,
                "reallocatedSectors": 0,
                "pendingSectors": 0,
                "uncorrectableSectors": 0,
                "crcErrors": 0,
                "powerOnHours": 14250,
                "healthLabel": "Tốt (100%)",
            },
            {
                "slot": "Bay 2",
                "model": "Seagate IronWolf ST4000VN008",
                "type": "HDD",
                "status": "normal",
                "tempC": 38,
                "maxTempC": 41,
                "reallocatedSectors": 0,
                "pendingSectors": 0,
                "uncorrectableSectors": 0,
                "crcErrors": 0,
                "powerOnHours": 9840,
                "healthLabel": "Tốt (100%)",
            },
            {
                "slot": "Bay 3",
                "model": "WD Red Plus WD40EFRX",
                "type": "HDD",
                "status": "warning",
                "tempC": 37,
                "maxTempC": 40,
                "reallocatedSectors": 0,
                "pendingSectors": 2,
                "uncorrectableSectors": 0,
                "crcErrors": 0,
                "powerOnHours": 13910,
                "healthLabel": "Cảnh báo (2 pending sectors)",
            },
            {
                "slot": "Bay 4",
                "model": "Seagate IronWolf ST4000VN008",
                "type": "HDD",
                "status": "normal",
                "tempC": 37,
                "maxTempC": 40,
                "reallocatedSectors": 0,
                "pendingSectors": 0,
                "uncorrectableSectors": 0,
                "crcErrors": 0,
                "powerOnHours": 9780,
                "healthLabel": "Tốt (100%)",
            },
            {
                "slot": "M.2 Slot 1",
                "model": "Samsung 970 EVO Plus 500GB",
                "type": "NVMe",
                "status": "normal",
                "tempC": 42,
                "maxTempC": 46,
                "reallocatedSectors": 0,
                "pendingSectors": 0,
                "uncorrectableSectors": 0,
                "crcErrors": 0,
                "powerOnHours": 8120,
                "healthLabel": "Tốt (NVMe Cache)",
            },
        ],
    });

    let disk_wear = json!({
        "ssds": [
            {
                "slot": "M.2 Slot 1",
                "model": "Samsung 970 EVO Plus 500GB",
                "lifeLeftPercent": 94,
                "tbwWrittenInPeriod": if is_weekly { 0.45 } else { 1.82 },
                "totalTbwWritten": 38.4,
                "ratedTbw": 300,
                "wearRatePercentPerMonth": 0.6,
                "estimatedYearsRemaining": 4.8,
            }
        ],
        "hdds": [
            {
                "slot": "Bay 1",
                "model": "WD Red Plus 4TB",
                "powerOnHours": 14250,
                "powerOnYears": 1.63,
                "loadCycleCount": 11200,
                "ratedLoadCycles": 300000,
                "hibernationRiskLevel": "low",
                "startStopCount": 48,
                "powerCycleCount": 42,
            },
            {
                "slot": "Bay 2",
                "model": "Seagate IronWolf 4TB",
                "powerOnHours": 9840,
                "powerOnYears": 1.12,
                "loadCycleCount": 8940,
                "ratedLoadCycles": 300000,
                "hibernationRiskLevel": "low",
                "startStopCount": 36,
                "powerCycleCount": 31,
            },
            {
                "slot": "Bay 3",
                "model": "WD Red Plus 4TB",
                "powerOnHours": 13910,
                "powerOnYears": 1.59,
                "loadCycleCount": 28400,
                "ratedLoadCycles": 300000,
                "hibernationRiskLevel": "medium",
                "startStopCount": 65,
                "powerCycleCount": 58,
            },
            {
                "slot": "Bay 4",
                "model": "Seagate IronWolf 4TB",
                "powerOnHours": 9780,
                "powerOnYears": 1.11,
                "loadCycleCount": 9100,
                "ratedLoadCycles": 300000,
                "hibernationRiskLevel": "low",
                "startStopCount": 34,
                "powerCycleCount": 29,
            },
        ],
        "overallDriveEnduranceStatus": "good",
        "hibernationRecommendation": "Tần suất đỗ đầu từ (Load Cycles) trên các ổ đang ở mức an toàn. Bay 3 có số lần đỗ cao hơn nhẹ, nên giữ chế độ HDD Hibernation ở mức 20 phút trở lên để bảo vệ cơ học.",
    });

    let failed_logins: f64 = if is_weekly { 48.0 } else { 184.0 };
    let blocked_ips_n = if is_weekly { 3 } else { 7 };

    let security = json!({
        "failedLoginsCount": failed_logins as i64,
        "blockedIpsCount": blocked_ips_n,
        "dosProtectionTriggers": if is_weekly { 12 } else { 54 },
        "topAttackingCountries": [
            { "countryCode": "RU", "countryName": "Nga", "attackCount": if is_weekly { 22 } else { 84 }, "flagEmoji": "🇷🇺" },
            { "countryCode": "CN", "countryName": "Trung Quốc", "attackCount": if is_weekly { 14 } else { 52 }, "flagEmoji": "🇨🇳" },
            { "countryCode": "NL", "countryName": "Hà Lan", "attackCount": if is_weekly { 7 } else { 28 }, "flagEmoji": "🇳🇱" },
            { "countryCode": "US", "countryName": "Hoa Kỳ", "attackCount": if is_weekly { 5 } else { 20 }, "flagEmoji": "🇺🇸" },
        ],
        "targetedServices": [
            { "service": "SSH (Port 22)", "count": num_json(crate::js::math_round(failed_logins * 0.72)), "percent": 72 },
            { "service": "DSM Web (Port 5000/5001)", "count": num_json(crate::js::math_round(failed_logins * 0.21)), "percent": 21 },
            { "service": "FTP (Port 21)", "count": num_json(crate::js::math_round(failed_logins * 0.07)), "percent": 7 },
        ],
        "recentAttackers": [
            { "ip": "185.220.101.5", "country": "Nga", "time": "Hôm qua 21:40", "attempts": 18, "service": "SSH" },
            { "ip": "45.155.205.233", "country": "Hà Lan", "time": "18/09 04:12", "attempts": 15, "service": "DSM Web" },
            { "ip": "218.92.0.114", "country": "Trung Quốc", "time": "16/09 11:05", "attempts": 24, "service": "SSH" },
        ],
        "bruteForceBlockedRate": 100,
    });

    let vulnerabilities = json!({
        "securityAdvisorScore": 88,
        "securityAdvisorStatus": "warning",
        "defaultAdminDisabled": false,
        "twoFactorEnabled": true,
        "defaultSshPortChanged": false,
        "sshPort": 22,
        "httpExposedToWan": false,
        "dsmUpdateAvailable": true,
        "dsmCurrentVersion": "DSM 7.2.1-69057 Update 3",
        "dsmLatestVersion": "DSM 7.2.1-69057 Update 5 (Bản vá khẩn)",
        "vulnerablePackagesCount": 1,
        "findings": [
            {
                "id": "vuln_admin",
                "category": "account",
                "severity": "warning",
                "title": "Tài khoản 'admin' mặc định vẫn đang kích hoạt",
                "description": "Tài khoản có tên 'admin' thường là mục tiêu đầu tiên của các đợt quét mật khẩu tự động.",
                "recommendation": "Tạo tài khoản quản trị viên mới với tên riêng và vô hiệu hóa tài khoản 'admin'.",
                "fixed": false,
            },
            {
                "id": "vuln_ssh",
                "category": "network",
                "severity": "warning",
                "title": "Cổng dịch vụ SSH đang sử dụng cổng 22 mặc định",
                "description": "Cổng 22 mặc định thu hút 70%+ các bot tự động quét trên toàn cầu.",
                "recommendation": "Đổi cổng SSH sang dải cổng cao bảo mật (ví dụ: 2222 hoặc 22122).",
                "fixed": false,
            },
            {
                "id": "vuln_dsm_patch",
                "category": "system",
                "severity": "warning",
                "title": "Bản cập nhật bảo mật DSM 7.2.1 Update 5 có sẵn",
                "description": "Bản cập nhật này khắc phục 2 lỗ hổng bảo mật cấp cao liên quan đến giao thức chia sẻ tệp SMB.",
                "recommendation": "Truy cập Cài đặt hệ thống để cập nhật ngay trong kỳ bảo trì tiếp theo.",
                "fixed": false,
            },
        ],
    });

    let health_score = compute_health_score(
        power.clone(),
        storage.clone(),
        security.clone(),
        network.clone(),
        disk_wear.clone(),
        vulnerabilities.clone(),
    )?;

    Ok(json!({
        "period": period,
        "startDate": start_date_str,
        "endDate": end_date_str,
        "generatedAt": generated_at,
        "hostName": host_name,
        "model": model,
        "dsmVersion": dsm_version,
        "uptimeString": "45 ngày 14 giờ",
        "healthScore": health_score,
        "power": power,
        "network": network,
        "storage": storage,
        "diskWear": disk_wear,
        "security": security,
        "vulnerabilities": vulnerabilities,
        "dailyRecords": daily_records,
    }))
}

/// Port of `generateTelegramDigest` (`src/lib/reports/reportEngine.ts:1201`).
pub fn generate_telegram_digest(report: Value) -> Result<String, String> {
    check_non_null_or_undef(&report, "period")?;

    let is_weekly = report.get("period").and_then(Value::as_str) == Some("weekly");
    let start_date = report
        .get("startDate")
        .map_or_else(|| "undefined".to_string(), js_to_string);
    let end_date = report
        .get("endDate")
        .map_or_else(|| "undefined".to_string(), js_to_string);

    let title = if is_weekly {
        format!("📊 *[KV-SYNOLOGY] BÁO CÁO VẬN HÀNH TUẦN ({start_date} - {end_date})*")
    } else {
        format!("📊 *[KV-SYNOLOGY] BÁO CÁO VẬN HÀNH THÁNG ({start_date} - {end_date})*")
    };

    let hs = report.get("healthScore").unwrap_or(&Value::Null);
    if hs.is_null() || crate::js::is_undefined(hs) || !hs.is_object() {
        return Err("TypeError: Cannot read properties of undefined (reading 'score')".to_string());
    }
    let score = crate::js::as_number(prop(hs, "score")).unwrap_or(0.0);
    let grade_emoji = if score >= 90.0 {
        "🟢"
    } else if score >= 75.0 {
        "🟡"
    } else {
        "🔴"
    };

    let power = report
        .get("power")
        .filter(|v| v.is_object())
        .ok_or_else(|| {
            "TypeError: Cannot read properties of undefined (reading 'outagesCount')".to_string()
        })?;
    let network = report
        .get("network")
        .filter(|v| v.is_object())
        .ok_or_else(|| {
            "TypeError: Cannot read properties of undefined (reading 'outagesCount')".to_string()
        })?;
    let storage = report
        .get("storage")
        .filter(|v| v.is_object())
        .ok_or_else(|| {
            "TypeError: Cannot read properties of undefined (reading 'poolsStatus')".to_string()
        })?;
    let disk_wear = report
        .get("diskWear")
        .filter(|v| v.is_object())
        .ok_or_else(|| {
            "TypeError: Cannot read properties of undefined (reading 'ssds')".to_string()
        })?;
    let security = report
        .get("security")
        .filter(|v| v.is_object())
        .ok_or_else(|| {
            "TypeError: Cannot read properties of undefined (reading 'failedLoginsCount')"
                .to_string()
        })?;
    let vulns = report
        .get("vulnerabilities")
        .filter(|v| v.is_object())
        .ok_or_else(|| {
            "TypeError: Cannot read properties of undefined (reading 'securityAdvisorScore')"
                .to_string()
        })?;

    let p_battery_secs = crate::js::as_number(prop(power, "totalBatterySeconds")).unwrap_or(0.0);
    let p_battery_mins = crate::js::math_round(p_battery_secs / 60.0);
    let p_cost = crate::js::as_number(prop(power, "estimatedCostVND")).unwrap_or(0.0);

    let pools_status_str = prop(storage, "poolsStatus")
        .as_str()
        .ok_or_else(|| "TypeError: poolsStatus.toUpperCase is not a function".to_string())?
        .to_uppercase();
    let total_tb = crate::js::math_round(
        crate::js::as_number(prop(storage, "totalStorageBytes")).unwrap_or(0.0) / 1e12,
    );

    let drives = storage
        .get("drives")
        .and_then(Value::as_array)
        .ok_or_else(|| "TypeError: storage.drives is not iterable".to_string())?;
    let warn_drives_vec: Vec<String> = drives
        .iter()
        .filter(|d| prop(d, "status").as_str() != Some("normal"))
        .map(|d| {
            format!(
                "{}: {}",
                js_to_string(prop(d, "slot")),
                js_to_string(prop(d, "healthLabel"))
            )
        })
        .collect();
    let warn_drives = if warn_drives_vec.is_empty() {
        "Không có, tất cả 100% tốt".to_string()
    } else {
        warn_drives_vec.join(", ")
    };

    let first_ssd = disk_wear
        .get("ssds")
        .and_then(Value::as_array)
        .and_then(|arr| arr.first());
    let ssd_life = first_ssd
        .and_then(|s| has_defined_prop(s, "lifeLeftPercent"))
        .filter(|v| !v.is_null())
        .map_or_else(|| "100".to_string(), js_to_string);
    let ssd_tbw = first_ssd
        .and_then(|s| has_defined_prop(s, "tbwWrittenInPeriod"))
        .filter(|v| !v.is_null())
        .map_or_else(|| "0".to_string(), js_to_string);
    let ssd_years = first_ssd
        .and_then(|s| has_defined_prop(s, "estimatedYearsRemaining"))
        .filter(|v| !v.is_null())
        .map_or_else(|| "5".to_string(), js_to_string);

    let countries = security
        .get("topAttackingCountries")
        .and_then(Value::as_array)
        .ok_or_else(|| "TypeError: topAttackingCountries is not iterable".to_string())?;
    let countries_str = countries
        .iter()
        .map(|c| {
            format!(
                "{} {} ({})",
                js_to_string(prop(c, "flagEmoji")),
                js_to_string(prop(c, "countryName")),
                js_to_string(prop(c, "attackCount"))
            )
        })
        .collect::<Vec<_>>()
        .join(", ");

    let findings = vulns
        .get("findings")
        .and_then(Value::as_array)
        .ok_or_else(|| "TypeError: findings is not iterable".to_string())?;
    let findings_str = findings
        .iter()
        .map(|f| format!("  ⚠️ {}", js_to_string(prop(f, "title"))))
        .collect::<Vec<_>>()
        .join("\n");

    Ok(format!(
        "{title}\n\
🖥️ *Thiết bị:* {} ({}) | {}\n\
⏱️ *Thời gian chạy (Uptime):* {}\n\
{grade_emoji} *Đánh giá sức khỏe tổng thể:* *{}/100* ({} - {})\n\n\
───────────────────────────────\n\
⚡ *1. NGUỒN ĐIỆN & TIÊU THỤ:*\n\
• Số lần mất điện lưới: *{} lần* (UPS pin giữ {} phút)\n\
• Tắt đột ngột không qua UPS: *{} lần*\n\
• Tiêu thụ ước tính: *{} kWh* (~{} VNĐ)\n\
• Công suất trung bình: *{} W*\n\n\
🌐 *2. MẠNG & ĐƯỜNG TRUYỀN:*\n\
• Sự cố mất mạng: *{} lần* (Downtime: {} phút)\n\
• Độ khả dụng mạng: *{}%* (Ping: {}ms)\n\
• Băng thông: Tải về *{} GB* / Tải lên *{} GB*\n\n\
💾 *3. SỨC KHỎE & TIÊU HAO Ổ CỨNG:*\n\
• Trạng thái Volume: *{}* ({}% / {} TB)\n\
• Ổ đĩa cảnh báo: {}\n\
• Tiêu hao SSD Cache: *Còn {}%* (Đã ghi +{} TBW trong kỳ)\n\
• Dự kiến tuổi thọ SSD còn lại: *{} năm*\n\n\
🛡️ *4. BẢO MẬT & PHÒNG THỦ TẤN CÔNG:*\n\
• Dò mật khẩu thất bại: *{} lượt*\n\
• Đã chặn tự động (AutoBlock): *{} địa chỉ IP*\n\
• Top nguồn tấn công: {}\n\
• Điểm An toàn Security Advisor: *{}/100*\n\
{}\n\
───────────────────────────────\n\
👉 _Xem chi tiết và xuất báo cáo PDF tại giao diện Web KV-Synology._",
        js_to_string(prop(&report, "model")),
        js_to_string(prop(&report, "hostName")),
        js_to_string(prop(&report, "dsmVersion")),
        js_to_string(prop(&report, "uptimeString")),
        js_to_string(prop(hs, "score")),
        js_to_string(prop(hs, "grade")),
        js_to_string(prop(hs, "statusText")),
        js_to_string(prop(power, "outagesCount")),
        crate::js::number_to_string(p_battery_mins),
        js_to_string(prop(power, "improperShutdowns")),
        js_to_string(prop(power, "estimatedKWh")),
        fmt_vi_number(p_cost),
        js_to_string(prop(power, "averageWattage")),
        js_to_string(prop(network, "outagesCount")),
        js_to_string(prop(network, "downtimeMinutes")),
        js_to_string(prop(network, "uptimePercent")),
        js_to_string(prop(network, "averageLatencyMs")),
        js_to_string(prop(network, "totalRxGB")),
        js_to_string(prop(network, "totalTxGB")),
        pools_status_str,
        js_to_string(prop(storage, "usedPercent")),
        crate::js::number_to_string(total_tb),
        warn_drives,
        ssd_life,
        ssd_tbw,
        ssd_years,
        js_to_string(prop(security, "failedLoginsCount")),
        js_to_string(prop(security, "blockedIpsCount")),
        countries_str,
        js_to_string(prop(vulns, "securityAdvisorScore")),
        findings_str,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_vi_numbers_and_daily_records() {
        assert_eq!(fmt_vi_number(1234567.0), "1.234.567");
        assert_eq!(fmt_vi_number(1234.5), "1.234,5");
        let empty = generate_daily_records(json!("weekly"), Some(0.5), json!({})).unwrap();
        assert!(empty.is_empty());
    }
}
