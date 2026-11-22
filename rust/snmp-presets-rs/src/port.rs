//! The Rust port of `src/lib/snmp/`.

#![forbid(unsafe_code)]

/// Typed SNMP MIB constants and sensor presets for reuse in Wave 3 & UI.
pub mod presets {
    pub struct SensorPreset {
        pub kind: &'static str,
        pub label: &'static str,
        pub oid: Option<&'static str>,
        pub unit: &'static str,
        pub scale: Option<f64>,
        pub is_counter: bool,
        pub description: &'static str,
    }

    pub const SENSOR_KIND_ORDER: &[&str] = &[
        "ping", "cpu", "memory", "traffic", "uptime", "disk", "custom",
    ];

    pub const SENSOR_PRESETS: &[SensorPreset] = &[
        SensorPreset {
            kind: "ping",
            label: "Ping (TCP)",
            oid: None,
            unit: "ms",
            scale: None,
            is_counter: false,
            description: "Kiểm tra thiết bị online qua cổng TCP (mặc định 80/443/23).",
        },
        SensorPreset {
            kind: "cpu",
            label: "CPU Load",
            oid: Some("1.3.6.1.2.1.25.3.3.1.2"),
            unit: "%",
            scale: Some(1.0),
            is_counter: false,
            description: "Tải CPU trung bình (HOST-RESOURCES-MIB).",
        },
        SensorPreset {
            kind: "memory",
            label: "Memory",
            oid: Some("1.3.6.1.4.1.2021.4"),
            unit: "%",
            scale: None,
            is_counter: false,
            description: "Bộ nhớ đã dùng (UCD-SNMP-MIB: memTotalReal - memAvailReal).",
        },
        SensorPreset {
            kind: "traffic",
            label: "Traffic",
            oid: Some("1.3.6.1.2.1.2.2.1"),
            unit: "kb/s",
            scale: None,
            is_counter: true,
            description: "Băng thông vào/ra của interface (IF-MIB ifInOctets/ifOutOctets).",
        },
        SensorPreset {
            kind: "uptime",
            label: "Uptime",
            oid: Some("1.3.6.1.2.1.1.3.0"),
            unit: "days",
            scale: None,
            is_counter: false,
            description: "Thời gian hoạt động (sysUpTime).",
        },
        SensorPreset {
            kind: "disk",
            label: "Disk",
            oid: Some("1.3.6.1.2.1.25.2.3.1"),
            unit: "%",
            scale: None,
            is_counter: false,
            description: "Sử dụng ổ đĩa (HOST-RESOURCES hrStorage).",
        },
        SensorPreset {
            kind: "custom",
            label: "Custom OID",
            oid: Some("1.3.6.1.2.1.1.1.0"),
            unit: "",
            scale: Some(1.0),
            is_counter: false,
            description: "OID tùy chỉnh với hệ số và đơn vị riêng.",
        },
    ];

    pub mod if_mib {
        pub const IF_IN_OCTETS: &str = "1.3.6.1.2.1.2.2.1.10";
        pub const IF_OUT_OCTETS: &str = "1.3.6.1.2.1.2.2.1.16";
        pub const IF_DESCR: &str = "1.3.6.1.2.1.2.2.1.2";
        pub const IF_NAME: &str = "1.3.6.1.2.1.31.1.1.1.1";
        pub const IF_OPER_STATUS: &str = "1.3.6.1.2.1.2.2.1.8";
        pub const IF_HC_IN_OCTETS: &str = "1.3.6.1.2.1.31.1.1.1.6";
        pub const IF_HC_OUT_OCTETS: &str = "1.3.6.1.2.1.31.1.1.1.10";
    }

    pub mod ucd_mem {
        pub const MEM_TOTAL_REAL: &str = "1.3.6.1.4.1.2021.4.5.0";
        pub const MEM_AVAIL_REAL: &str = "1.3.6.1.4.1.2021.4.6.0";
        pub const MEM_TOTAL_FREE: &str = "1.3.6.1.4.1.2021.4.11.0";
        pub const MEM_SHARED: &str = "1.3.6.1.4.1.2021.4.13.0";
        pub const MEM_BUFFER: &str = "1.3.6.1.4.1.2021.4.14.0";
        pub const MEM_CACHED: &str = "1.3.6.1.4.1.2021.4.15.0";
    }

    pub mod syno_mib {
        pub const SYSTEM_STATUS: &str = "1.3.6.1.4.1.6574.1.1.0";
        pub const TEMPERATURE: &str = "1.3.6.1.4.1.6574.1.2.0";
        pub const POWER_STATUS: &str = "1.3.6.1.4.1.6574.1.3.0";
        pub const SYSTEM_FAN_STATUS: &str = "1.3.6.1.4.1.6574.1.4.1.0";
        pub const CPU_FAN_STATUS: &str = "1.3.6.1.4.1.6574.1.4.2.0";
        pub const MODEL_NAME: &str = "1.3.6.1.4.1.6574.1.5.1.0";
        pub const SERIAL_NUMBER: &str = "1.3.6.1.4.1.6574.1.5.2.0";
        pub const VERSION: &str = "1.3.6.1.4.1.6574.1.5.3.0";
        pub const UPGRADE_AVAILABLE: &str = "1.3.6.1.4.1.6574.1.5.4.0";
        pub const DISK_STATUS: &str = "1.3.6.1.4.1.6574.2.1.1.5";
        pub const DISK_TEMPERATURE: &str = "1.3.6.1.4.1.6574.2.1.1.6";
        pub const RAID_STATUS: &str = "1.3.6.1.4.1.6574.3.1.1.3";
        pub const RAID_FREE_SIZE: &str = "1.3.6.1.4.1.6574.3.1.1.4";
        pub const RAID_TOTAL_SIZE: &str = "1.3.6.1.4.1.6574.3.1.1.5";
    }
}

/// Port of `isLocalHost` (`src/lib/snmp/server.ts:11`).
pub fn is_local_host(host: Option<String>) -> Result<bool, String> {
    let Some(host) = host else {
        return Ok(true);
    };
    if host.is_empty() {
        return Ok(true);
    }
    let h = host.to_lowercase();
    let h = h.trim();
    Ok(h == "127.0.0.1" || h == "localhost" || h == "::1" || h == "0.0.0.0")
}
