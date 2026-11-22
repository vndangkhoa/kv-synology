//! The Rust port of `src/lib/storage/`.

#![forbid(unsafe_code)]

use regex::Regex;
use serde::Serialize;
use serde::Serializer;
use std::sync::LazyLock;

fn serialize_opt_undefined<T: Serialize, S: Serializer>(
    v: &Option<T>,
    s: S,
) -> Result<S::Ok, S::Error> {
    match v {
        Some(inner) => inner.serialize(s),
        None => serde_json::json!({"$undefined": true}).serialize(s),
    }
}

pub struct SmartDesc {
    pub id: u32,
    pub en: &'static str,
    pub vi: &'static str,
}

pub const SMART_DESCRIPTIONS: &[SmartDesc] = &[
    SmartDesc {
        id: 1,
        en: "Raw Read Error Rate - hardware read errors from disk surface",
        vi: "Tỷ lệ lỗi đọc thô từ bề mặt đĩa",
    },
    SmartDesc {
        id: 3,
        en: "Spin Up Time - average time to spin up platers",
        vi: "Thời gian khởi động tăng tốc đĩa từ",
    },
    SmartDesc {
        id: 4,
        en: "Start/Stop Count - tally of spindle start/stop cycles",
        vi: "Số lần bật/dừng trục quay đĩa",
    },
    SmartDesc {
        id: 5,
        en: "Reallocated Sectors Count - damaged sectors retired by drive",
        vi: "Số sector bị lỗi đã được thay thế (Rất quan trọng)",
    },
    SmartDesc {
        id: 7,
        en: "Seek Error Rate - rate of positioning errors of magnetic heads",
        vi: "Tỷ lệ lỗi định vị đầu đọc",
    },
    SmartDesc {
        id: 8,
        en: "Seek Time Performance - average performance of seek operations",
        vi: "Hiệu năng thời gian tìm kiếm track",
    },
    SmartDesc {
        id: 9,
        en: "Power-On Hours - total hours in power-on state",
        vi: "Tổng số giờ đĩa đã chạy thực tế",
    },
    SmartDesc {
        id: 10,
        en: "Spin Retry Count - count of spin-start attempts that failed",
        vi: "Số lần thử lại khởi động trục quay thất bại",
    },
    SmartDesc {
        id: 11,
        en: "Calibration Retry Count - count of recalibration requests",
        vi: "Số lần thử hiệu chuẩn lại cơ học",
    },
    SmartDesc {
        id: 12,
        en: "Power Cycle Count - count of full on/off power cycles",
        vi: "Số lần bật tắt nguồn thiết bị",
    },
    SmartDesc {
        id: 183,
        en: "SATA Downshift Error Count - interface link speed drops",
        vi: "Số lần hạ tốc độ băng thông kết nối SATA",
    },
    SmartDesc {
        id: 184,
        en: "End-to-End Error - parity/checksum error in internal cache",
        vi: "Lỗi toàn vẹn dữ liệu bộ nhớ đệm nội bộ",
    },
    SmartDesc {
        id: 187,
        en: "Reported Uncorrectable Errors - errors unfixable via ECC",
        vi: "Lỗi không thể sửa bằng mã sửa lỗi phần cứng",
    },
    SmartDesc {
        id: 188,
        en: "Command Timeout - aborted commands due to timeout",
        vi: "Số lệnh bị hủy do quá thời gian chờ (Timeout)",
    },
    SmartDesc {
        id: 190,
        en: "Airflow Temperature - internal airflow sensor",
        vi: "Nhiệt độ luồng khí làm mát bên trong",
    },
    SmartDesc {
        id: 191,
        en: "G-Sense Error Rate - shock/vibration sensor triggers",
        vi: "Số lần phát hiện va đập/rung lắc cơ học",
    },
    SmartDesc {
        id: 192,
        en: "Power-off Retract Count - emergency head unloads",
        vi: "Số lần rút đầu đọc khẩn cấp khi ngắt điện đột ngột",
    },
    SmartDesc {
        id: 193,
        en: "Load/Unload Cycle Count - count of head park/load cycles",
        vi: "Chu kỳ đóng/đỗ đầu đọc từ",
    },
    SmartDesc {
        id: 194,
        en: "Temperature Celsius - internal temperature sensor",
        vi: "Nhiệt độ cảm biến lõi ổ đĩa (°C)",
    },
    SmartDesc {
        id: 195,
        en: "Hardware ECC Recovered - on-the-fly ECC error recoveries",
        vi: "Số lỗi đã được khôi phục tức thời bằng phần cứng ECC",
    },
    SmartDesc {
        id: 196,
        en: "Reallocation Event Count - attempts to reallocate bad sectors",
        vi: "Số lần thực hiện hoán đổi sector hỏng",
    },
    SmartDesc {
        id: 197,
        en: "Current Pending Sector Count - unstable sectors awaiting reallocation",
        vi: "Số sector lỗi đang chờ phân bổ lại (Rất nguy hiểm)",
    },
    SmartDesc {
        id: 198,
        en: "Offline Uncorrectable Sector Count - uncorrectable sectors found during offline scan",
        vi: "Số sector hỏng vĩnh viễn không thể cứu dữ liệu",
    },
    SmartDesc {
        id: 199,
        en: "UDMA CRC Error Count - interface communication cable/backplane errors",
        vi: "Lỗi bắt tay tín hiệu truyền dẫn cáp / khay cắm SATA",
    },
    SmartDesc {
        id: 200,
        en: "Multi-Zone Error Rate - write error rate detected",
        vi: "Tỷ lệ lỗi ghi nhiều vùng trên đĩa",
    },
    SmartDesc {
        id: 231,
        en: "SSD Life Left / Temperature",
        vi: "Tuổi thọ chip nhớ SSD còn lại (%)",
    },
    SmartDesc {
        id: 232,
        en: "Available Reserved Space - SSD spare blocks percentage",
        vi: "Tỷ lệ dung lượng dự phòng SSD còn lại",
    },
    SmartDesc {
        id: 233,
        en: "Media Wearout Indicator - flash endurance consumed",
        vi: "Chỉ số độ mòn chip nhớ flash SSD",
    },
    SmartDesc {
        id: 240,
        en: "Head Flying Hours - head active time",
        vi: "Thời gian đầu từ bay trên mặt đĩa",
    },
    SmartDesc {
        id: 241,
        en: "Total LBAs Written - lifetime volume written",
        vi: "Tổng dung lượng khối dữ liệu LBA đã ghi",
    },
    SmartDesc {
        id: 242,
        en: "Total LBAs Read - lifetime volume read",
        vi: "Tổng dung lượng khối dữ liệu LBA đã đọc",
    },
];

fn smart_desc_for(id: u32) -> Option<String> {
    SMART_DESCRIPTIONS
        .iter()
        .find(|d| d.id == id)
        .map(|d| d.vi.to_string())
}

fn compile_regex(pat: &str) -> Regex {
    // INFALLIBLE: compile-time constant regex patterns validated in tests.
    Regex::new(pat).expect("valid constant regex")
}

static RE_ANSI_CSI: LazyLock<Regex> = LazyLock::new(|| compile_regex(r"\x1b\[[0-9;]*[a-zA-Z]"));
static RE_DRIVE_HEADER: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(
        r"^(?:((?i-u:M\.2)\s+(?i-u:Drive)\s+[0-9]+|(?i-u:Drive)\s+[0-9]+|(?i-u:Disk)\s+[0-9]+|(?i-u:SATA)\s+[0-9]+|(?i-u:NVMe)\s+[0-9]+))\s+([A-Za-z0-9_\-.\s]+?)\s+((?i-u:[A-Z0-9_-]{5,}))\s+((?i-u:/dev/[a-z0-9]+))",
    )
});
static RE_DRIVE_FALLBACK: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(
        r"^(?:((?i-u:M\.2)\s+(?i-u:Drive)\s+[0-9]+|(?i-u:Drive)\s+[0-9]+|(?i-u:Disk)\s+[0-9]+))\s+(.+?)\s+((?i-u:/dev/[a-z0-9]+))",
    )
});
static RE_ERR_COUNTER: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?i-u:Error Counter Log):\s*([0-9]+)"));
static RE_CAPACITY: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(r"(?:(?i-u:User Capacity)|(?i-u:Total NVM Capacity)):\s*([^\r\n]+)$")
});
static RE_FIRMWARE: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?i-u:Firmware Version):\s*([^\r\n]+)$"));
static RE_ROTATION: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?i-u:Rotation Rate):\s*([^\r\n]+)$"));
static RE_SATA_VER: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?i-u:SATA Version is):\s*([^\r\n]+)$"));
static RE_TEMP_1: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(
        r"(?:(?i-u:Temperature_Celsius|Airflow_Temperature_Cel|Temperature Celsius|Temperature))[^0-9]*([0-9]{1,3})\s*(?:(?i-u:C))?(?:\s|$)",
    )
});
static RE_TEMP_2: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(r"194\s+[A-Za-z0-9_]+\s+[0-9]+\s+[0-9]+\s+[0-9]+\s+[^0-9]*\s+([0-9]{1,2})")
});
static RE_POH_1: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(
        r"^(?:9|09)\s+(?i-u:Power_On_Hours)\s+[0-9]+\s+[0-9]+\s+[0-9]+\s+\S+\s+\S+\s+\S+\s+([0-9]+)",
    )
});
static RE_POH_2: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?i-u:Power)[-_\s](?i-u:on Hours):\s*([0-9,]+)"));
static RE_REAL_1: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(
        r"^(?:5|05)\s+(?i-u:Reallocated_Sector_Ct)\s+[0-9]+\s+[0-9]+\s+[0-9]+\s+\S+\s+\S+\s+\S+\s+([0-9]+)",
    )
});
static RE_REAL_2: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?i-u:Reallocated Sector(?:s| Count)?):\s*([0-9]+)"));
static RE_PEND_1: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(
        r"^197\s+(?i-u:Current_Pending_Sector)\s+[0-9]+\s+[0-9]+\s+[0-9]+\s+\S+\s+\S+\s+\S+\s+([0-9]+)",
    )
});
static RE_PEND_2: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?i-u:Pending Sector(?:s| Count)?):\s*([0-9]+)"));
static RE_CRC_1: LazyLock<Regex> = LazyLock::new(|| {
    compile_regex(
        r"^199\s+(?i-u:UDMA_CRC_Error_Count)\s+[0-9]+\s+[0-9]+\s+[0-9]+\s+\S+\s+\S+\s+\S+\s+([0-9]+)",
    )
});
static RE_CRC_2: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?i-u:UDMA CRC Error(?:s| Count)?):\s*([0-9]+)"));
static RE_NVME_WEAR: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"(?i-u:Percentage Used):\s*([0-9]+)%"));
static RE_NVME_KV: LazyLock<Regex> =
    LazyLock::new(|| compile_regex(r"^([A-Za-z0-9\s/.\-_]+?):\s*([^\r\n]+)$"));

fn expand_pos_scientific(s: &str) -> Option<String> {
    let (mantissa, exp_str) = s.split_once("e+").or_else(|| s.split_once("E+"))?;
    let exp: usize = exp_str.parse().ok()?;
    let (int_p, frac_p) = mantissa.split_once('.').unwrap_or((mantissa, ""));
    let combined_len = int_p.len() + frac_p.len();
    let target_len = exp + int_p.len();
    if target_len < combined_len {
        return None;
    }
    let zeros = target_len - combined_len;
    let mut digits = String::with_capacity(target_len);
    digits.push_str(int_p);
    digits.push_str(frac_p);
    digits.extend(std::iter::repeat_n('0', zeros));
    Some(digits)
}

fn format_en_us_number(x: f64) -> String {
    if x.is_nan() {
        return "NaN".to_string();
    }
    if x.is_infinite() {
        return if x.is_sign_negative() { "-∞" } else { "∞" }.to_string();
    }
    if x == 0.0 {
        return "0".to_string();
    }
    // Format with up to 3 fraction digits, matching Node en-US `toLocaleString()` default.
    let neg = x < 0.0;
    let abs = x.abs();
    let rounded = if abs >= 1e15 {
        crate::js::math_round(abs)
    } else {
        crate::js::math_round(abs * 1000.0) / 1000.0
    };
    let s = crate::js::number_to_string(rounded);
    let expanded = if s.contains("e+") || s.contains("E+") {
        match expand_pos_scientific(&s) {
            Some(d) => d,
            None => return if neg { format!("-{s}") } else { s },
        }
    } else if s.contains("e-") || s.contains("E-") {
        return if neg { format!("-{s}") } else { s };
    } else {
        s
    };
    let (int_part, frac_part) = expanded.split_once('.').unwrap_or((&expanded, ""));
    let bytes = int_part.as_bytes();
    let mut with_commas = String::with_capacity(bytes.len() + bytes.len() / 3 + 2);
    if neg {
        with_commas.push('-');
    }
    for (idx, b) in bytes.iter().enumerate() {
        if idx > 0 && (bytes.len() - idx).is_multiple_of(3) {
            with_commas.push(',');
        }
        with_commas.push(*b as char);
    }
    if !frac_part.is_empty() {
        with_commas.push('.');
        with_commas.push_str(frac_part);
    }
    with_commas
}

fn format_to_fixed_1(x: f64) -> String {
    if !x.is_finite() || x.abs() >= 1e21 {
        return crate::js::number_to_string(x);
    }
    let scaled = crate::js::math_round(x * 10.0) / 10.0;
    format!("{scaled:.1}")
}

fn js_parse_int_leading(s: &str) -> Option<i64> {
    let trimmed = s.trim_start();
    let mut chars = trimmed.chars().peekable();
    let neg = match chars.peek().copied() {
        Some('-') => {
            chars.next();
            true
        }
        Some('+') => {
            chars.next();
            false
        }
        _ => false,
    };
    let digits: String = chars.take_while(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return None;
    }
    let v = digits.parse::<i64>().ok()?;
    Some(if neg { -v } else { v })
}

/// Port of `formatLifetimeSpan` (`src/lib/storage/synoSmartParser.ts:44`).
pub fn format_lifetime_span(hours: Option<f64>) -> Result<String, String> {
    let Some(hours) = hours else {
        return Ok("—".to_string());
    };
    if hours.is_nan() || hours <= 0.0 {
        return Ok("—".to_string());
    }
    let days = (hours / 24.0).floor();
    let years = format_to_fixed_1(hours / 8760.0);
    let h_str = format_en_us_number(hours);
    if days < 30.0 {
        return Ok(format!("{h_str}h ({days} ngày)"));
    }
    let months = (days / 30.4375).floor();
    if months < 12.0 {
        return Ok(format!("{h_str}h (~{months} tháng)"));
    }
    let rem_months = ((days % 365.0) / 30.0).floor();
    let rem_suffix = if rem_months > 0.0 {
        format!(" {rem_months}th")
    } else {
        String::new()
    };
    Ok(format!("{h_str}h (~{years} năm{rem_suffix})"))
}

/// Port of `stripAnsi` (`src/lib/storage/synoSmartParser.ts:58`).
pub fn strip_ansi(text: String) -> Result<String, String> {
    let pass1 = RE_ANSI_CSI.replace_all(&text, "");
    Ok(pass1.replace("\x1b(B", ""))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SmartAttributeOut {
    id: u32,
    name: String,
    flag: String,
    value: String,
    worst: String,
    thresh: String,
    #[serde(rename = "type")]
    attr_type: String,
    updated: String,
    #[serde(serialize_with = "serialize_opt_undefined")]
    when_failed: Option<String>,
    raw_value: String,
    status: String,
    #[serde(serialize_with = "serialize_opt_undefined")]
    description: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NvmeSpecOut {
    key: String,
    label: String,
    value: String,
    status: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DriveSummaryOut {
    slot: String,
    model: String,
    serial: String,
    device: String,
    #[serde(serialize_with = "serialize_opt_undefined")]
    capacity: Option<String>,
    #[serde(serialize_with = "serialize_opt_undefined")]
    firmware: Option<String>,
    #[serde(serialize_with = "serialize_opt_undefined")]
    rotation_rate: Option<String>,
    #[serde(serialize_with = "serialize_opt_undefined")]
    sata_version: Option<String>,
    health: String,
    temp_c: Option<i64>,
    power_on_hours: Option<i64>,
    reallocated_sectors: Option<i64>,
    pending_sectors: Option<i64>,
    crc_errors: Option<i64>,
    nvme_wear_percent: Option<i64>,
    #[serde(serialize_with = "serialize_opt_undefined")]
    attributes_count: Option<usize>,
    #[serde(serialize_with = "serialize_opt_undefined")]
    smart_attributes: Option<Vec<SmartAttributeOut>>,
    #[serde(serialize_with = "serialize_opt_undefined")]
    nvme_specs: Option<Vec<NvmeSpecOut>>,
    raw_lines: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ParsedReportOut {
    drives: Vec<DriveSummaryOut>,
    overall_health: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    hostname: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    nas_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    dsm_version: Option<String>,
}

struct RawDriveBlock {
    slot: String,
    model: String,
    serial: String,
    device: String,
    lines: Vec<String>,
}

fn is_ascii_digits(s: &str) -> bool {
    !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit())
}

fn is_valid_attr_name(s: &str) -> bool {
    !s.is_empty()
        && s.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

/// Port of `parseSynoSmartOutput` (`src/lib/storage/synoSmartParser.ts:66`).
pub fn parse_syno_smart_output(raw: String) -> Result<serde_json::Value, String> {
    if raw.trim().is_empty() {
        let out = ParsedReportOut {
            hostname: None,
            nas_model: None,
            dsm_version: None,
            drives: Vec::new(),
            overall_health: "UNKNOWN".to_string(),
        };
        return serde_json::to_value(out).map_err(|e| e.to_string());
    }

    let clean = strip_ansi(raw)?;
    let lines: Vec<&str> = clean
        .split('\n')
        .map(|s| s.strip_suffix('\r').unwrap_or(s))
        .collect();

    let mut hostname: Option<String> = None;
    let mut nas_model: Option<String> = None;
    let mut dsm_version: Option<String> = None;

    for l in lines.iter().take(15) {
        let trimmed = l.trim();
        if trimmed.contains("DSM ")
            && (trimmed.contains("DS")
                || trimmed.contains("SA")
                || trimmed.contains("RS")
                || trimmed.contains("FS")
                || trimmed.contains("DVA"))
        {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 3 {
                hostname = Some(parts[0].to_string());
                nas_model = Some(parts[1].to_string());
                dsm_version = Some(parts[2..].join(" "));
            }
            break;
        }
    }

    let mut drive_blocks: Vec<RawDriveBlock> = Vec::new();
    let mut current_block: Option<RawDriveBlock> = None;

    for line in &lines {
        let trimmed = line.trim();
        if let Some(caps) = RE_DRIVE_HEADER.captures(trimmed) {
            if let Some(blk) = current_block.take() {
                drive_blocks.push(blk);
            }
            current_block = Some(RawDriveBlock {
                slot: caps.get(1).map_or("", |m| m.as_str()).trim().to_string(),
                model: caps.get(2).map_or("", |m| m.as_str()).trim().to_string(),
                serial: caps.get(3).map_or("", |m| m.as_str()).trim().to_string(),
                device: caps.get(4).map_or("", |m| m.as_str()).trim().to_string(),
                lines: Vec::new(),
            });
            continue;
        }
        if let Some(caps) = RE_DRIVE_FALLBACK.captures(trimmed) {
            if let Some(blk) = current_block.take() {
                drive_blocks.push(blk);
            }
            let middle = caps.get(2).map_or("", |m| m.as_str()).trim();
            let mut middle_parts: Vec<&str> = middle.split_whitespace().collect();
            let serial = if middle_parts.len() > 1 {
                middle_parts.pop().unwrap_or("").to_string()
            } else {
                String::new()
            };
            let model_joined = middle_parts.join(" ");
            let model = if model_joined.is_empty() {
                "Unknown Model".to_string()
            } else {
                model_joined
            };
            current_block = Some(RawDriveBlock {
                slot: caps.get(1).map_or("", |m| m.as_str()).trim().to_string(),
                model,
                serial,
                device: caps.get(3).map_or("", |m| m.as_str()).trim().to_string(),
                lines: Vec::new(),
            });
            continue;
        }

        if let Some(blk) = current_block.as_mut() {
            blk.lines.push(trimmed.to_string());
        }
    }
    if let Some(blk) = current_block {
        drive_blocks.push(blk);
    }

    let mut has_critical = false;
    let mut has_warning = false;
    let mut drives = Vec::with_capacity(drive_blocks.len());

    let skip_keys = [
        "Local Time is",
        "SMART overall-health self-assessment test result",
        "SMART health status",
        "ID# ATTRIBUTE_NAME",
        "Vendor Specific SMART Attributes with Thresholds",
        "SMART Attributes Data Structure revision number",
    ];

    for b in drive_blocks {
        let mut health = "UNKNOWN".to_string();
        let mut temp_c: Option<i64> = None;
        let mut power_on_hours: Option<i64> = None;
        let mut reallocated_sectors: Option<i64> = None;
        let mut pending_sectors: Option<i64> = None;
        let mut crc_errors: Option<i64> = None;
        let mut nvme_wear_percent: Option<i64> = None;
        let mut capacity: Option<String> = None;
        let mut firmware: Option<String> = None;
        let mut rotation_rate: Option<String> = None;
        let mut sata_version: Option<String> = None;
        let mut smart_attributes: Vec<SmartAttributeOut> = Vec::new();
        let mut nvme_specs: Vec<NvmeSpecOut> = Vec::new();

        for l in &b.lines {
            let lower = l.to_lowercase();

            if lower.contains("smart overall-health self-assessment test result: passed")
                || lower.contains("smart health status: ok")
                || lower.contains("overall-health self-assessment: passed")
                || lower.contains("self-assessment: passed")
            {
                if health == "UNKNOWN" {
                    health = "PASSED".to_string();
                }
            } else if (lower.contains("failed")
                || (lower.contains("error counter log: ") && !lower.contains("no errors logged")))
                && let Some(m) = RE_ERR_COUNTER.captures(l)
                && let Ok(cnt) = m[1].parse::<i64>()
                && cnt > 0
            {
                has_warning = true;
                health = "WARNING".to_string();
            }

            if (lower.contains("user capacity:") || lower.contains("total nvm capacity:"))
                && let Some(m) = RE_CAPACITY.captures(l)
            {
                capacity = Some(m[1].trim().to_string());
            }
            if lower.contains("firmware version:")
                && let Some(m) = RE_FIRMWARE.captures(l)
            {
                firmware = Some(m[1].trim().to_string());
            }
            if lower.contains("rotation rate:")
                && let Some(m) = RE_ROTATION.captures(l)
            {
                rotation_rate = Some(m[1].trim().to_string());
            }
            if lower.contains("sata version is:")
                && let Some(m) = RE_SATA_VER.captures(l)
            {
                sata_version = Some(m[1].trim().to_string());
            }

            if temp_c.is_none()
                && let Some(m) = RE_TEMP_1.captures(l).or_else(|| RE_TEMP_2.captures(l))
                && let Ok(t) = m[1].parse::<i64>()
                && t > 0
                && t < 100
            {
                temp_c = Some(t);
            }

            if power_on_hours.is_none()
                && let Some(m) = RE_POH_1.captures(l).or_else(|| RE_POH_2.captures(l))
            {
                let clean_num = m[1].replace(',', "");
                if let Ok(v) = clean_num.parse::<i64>() {
                    power_on_hours = Some(v);
                }
            }

            if reallocated_sectors.is_none()
                && let Some(m) = RE_REAL_1.captures(l).or_else(|| RE_REAL_2.captures(l))
                && let Ok(v) = m[1].parse::<i64>()
            {
                reallocated_sectors = Some(v);
            }

            if pending_sectors.is_none()
                && let Some(m) = RE_PEND_1.captures(l).or_else(|| RE_PEND_2.captures(l))
                && let Ok(v) = m[1].parse::<i64>()
            {
                pending_sectors = Some(v);
            }

            if crc_errors.is_none()
                && let Some(m) = RE_CRC_1.captures(l).or_else(|| RE_CRC_2.captures(l))
                && let Ok(v) = m[1].parse::<i64>()
            {
                crc_errors = Some(v);
            }

            if nvme_wear_percent.is_none()
                && let Some(m) = RE_NVME_WEAR.captures(l)
                && let Ok(v) = m[1].parse::<i64>()
            {
                nvme_wear_percent = Some(v);
            }

            if !l.starts_with("ID#") && !l.starts_with("ATTRIBUTE_NAME") {
                let tokens: Vec<&str> = l.split_whitespace().collect();
                if tokens.len() >= 8
                    && tokens[0].len() <= 3
                    && is_ascii_digits(tokens[0])
                    && is_valid_attr_name(tokens[1])
                    && is_ascii_digits(tokens[3])
                    && is_ascii_digits(tokens[4])
                    && let Ok(id) = tokens[0].parse::<u32>()
                {
                    let name = tokens[1].to_string();
                    let flag = tokens[2].to_string();
                    let value = tokens[3].to_string();
                    let worst = tokens[4].to_string();
                    let thresh = tokens[5].to_string();
                    let attr_type = tokens[6].to_string();
                    let updated = tokens[7].to_string();

                    let (when_failed, raw_value) = if tokens.len() >= 10
                        && (tokens[8] == "-"
                            || tokens[8] == "FAILING_NOW"
                            || tokens[8] == "In_the_past")
                    {
                        (Some(tokens[8].to_string()), tokens[9..].join(" "))
                    } else {
                        (None, tokens[8..].join(" "))
                    };

                    let mut attr_status = "OK".to_string();
                    let num_val = js_parse_int_leading(&value);
                    let num_thresh = js_parse_int_leading(&thresh);
                    let digits_prefix: String = raw_value
                        .chars()
                        .take_while(|c| c.is_ascii_digit())
                        .collect();
                    let num_raw = digits_prefix.parse::<i64>().ok();

                    if when_failed.as_deref() == Some("FAILING_NOW")
                        || matches!((num_thresh, num_val), (Some(th), Some(v)) if th > 0 && v <= th)
                    {
                        attr_status = "FAIL".to_string();
                    } else if when_failed.as_deref() == Some("In_the_past") {
                        attr_status = "WARN".to_string();
                    } else if id == 5 || id == 197 || id == 198 {
                        if let Some(nr) = num_raw
                            && nr > 0
                        {
                            attr_status = if nr > 20 { "FAIL" } else { "WARN" }.to_string();
                        }
                    } else if (id == 199 || id == 10 || id == 184 || id == 187)
                        && let Some(nr) = num_raw
                        && nr > 0
                    {
                        attr_status = "WARN".to_string();
                    }

                    smart_attributes.push(SmartAttributeOut {
                        id,
                        name,
                        flag,
                        value,
                        worst,
                        thresh,
                        attr_type,
                        updated,
                        when_failed,
                        raw_value,
                        status: attr_status,
                        description: smart_desc_for(id),
                    });
                }
            }

            if let Some(caps) = RE_NVME_KV.captures(l) {
                let k = caps[1].trim();
                let v = caps[2].trim();
                let k_lower = k.to_lowercase();
                if !skip_keys
                    .iter()
                    .any(|sk| k_lower.contains(&sk.to_lowercase()))
                    && k.chars().count() > 2
                    && !is_ascii_digits(k)
                {
                    let mut nvme_status = "OK".to_string();
                    if (k_lower.contains("critical warning") && v != "0x00" && v != "0")
                        || (k_lower.contains("media and data integrity") && v != "0")
                    {
                        nvme_status = "FAIL".to_string();
                    } else if k_lower.contains("percentage used") {
                        let digits_only: String =
                            v.chars().filter(|c| c.is_ascii_digit()).collect();
                        if let Ok(wear_val) = digits_only.parse::<i64>() {
                            if wear_val >= 95 {
                                nvme_status = "FAIL".to_string();
                            } else if wear_val >= 80 {
                                nvme_status = "WARN".to_string();
                            }
                        }
                    } else if k_lower.contains("available spare") {
                        let digits_only: String =
                            v.chars().filter(|c| c.is_ascii_digit()).collect();
                        if let Ok(spare_val) = digits_only.parse::<i64>() {
                            if spare_val < 10 {
                                nvme_status = "FAIL".to_string();
                            } else if spare_val < 20 {
                                nvme_status = "WARN".to_string();
                            }
                        }
                    }

                    nvme_specs.push(NvmeSpecOut {
                        key: k.to_string(),
                        label: k.to_string(),
                        value: v.to_string(),
                        status: nvme_status,
                    });
                }
            }
        }

        if reallocated_sectors.is_some_and(|v| v > 50) || pending_sectors.is_some_and(|v| v > 10) {
            health = "CRITICAL".to_string();
            has_critical = true;
        } else if reallocated_sectors.is_some_and(|v| v > 0)
            || pending_sectors.is_some_and(|v| v > 0)
            || crc_errors.is_some_and(|v| v > 5)
        {
            health = "WARNING".to_string();
            has_warning = true;
        } else if health == "UNKNOWN" {
            health = "OK".to_string();
        }

        let attr_count = if smart_attributes.is_empty() {
            None
        } else {
            Some(smart_attributes.len())
        };
        let smart_opt = if smart_attributes.is_empty() {
            None
        } else {
            Some(smart_attributes)
        };
        let nvme_opt = if nvme_specs.is_empty() {
            None
        } else {
            Some(nvme_specs)
        };

        drives.push(DriveSummaryOut {
            slot: b.slot,
            model: b.model,
            serial: b.serial,
            device: b.device,
            capacity,
            firmware,
            rotation_rate,
            sata_version,
            health,
            temp_c,
            power_on_hours,
            reallocated_sectors,
            pending_sectors,
            crc_errors,
            nvme_wear_percent,
            attributes_count: attr_count,
            smart_attributes: smart_opt,
            nvme_specs: nvme_opt,
            raw_lines: b.lines,
        });
    }

    let overall_health = if has_critical {
        "CRITICAL".to_string()
    } else if has_warning {
        "WARNING".to_string()
    } else {
        "PASSED".to_string()
    };

    let out = ParsedReportOut {
        hostname,
        nas_model,
        dsm_version,
        drives,
        overall_health,
    };
    serde_json::to_value(out).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn regexes_compile_and_basic_smoke() {
        let _ = &*RE_ANSI_CSI;
        let _ = &*RE_DRIVE_HEADER;
        let _ = &*RE_DRIVE_FALLBACK;
        let _ = &*RE_ERR_COUNTER;
        let _ = &*RE_CAPACITY;
        let _ = &*RE_FIRMWARE;
        let _ = &*RE_ROTATION;
        let _ = &*RE_SATA_VER;
        let _ = &*RE_TEMP_1;
        let _ = &*RE_TEMP_2;
        let _ = &*RE_POH_1;
        let _ = &*RE_POH_2;
        let _ = &*RE_REAL_1;
        let _ = &*RE_REAL_2;
        let _ = &*RE_PEND_1;
        let _ = &*RE_PEND_2;
        let _ = &*RE_CRC_1;
        let _ = &*RE_CRC_2;
        let _ = &*RE_NVME_WEAR;
        let _ = &*RE_NVME_KV;
        assert_eq!(
            format_lifetime_span(Some(f64::INFINITY)).unwrap(),
            "∞h (~Infinity năm)"
        );
    }
}
