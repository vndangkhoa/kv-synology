//! The Rust port of `src/lib/traffic/`.

#![forbid(unsafe_code)]

use serde_json::json;

struct CountryEntry {
    code: &'static str,
    name_vi: &'static str,
    name_en: &'static str,
    flag: &'static str,
}

const COUNTRY_FLAGS: &[CountryEntry] = &[
    CountryEntry {
        code: "VN",
        name_vi: "Việt Nam",
        name_en: "Vietnam",
        flag: "🇻🇳",
    },
    CountryEntry {
        code: "US",
        name_vi: "Hoa Kỳ",
        name_en: "United States",
        flag: "🇺🇸",
    },
    CountryEntry {
        code: "SG",
        name_vi: "Singapore",
        name_en: "Singapore",
        flag: "🇸🇬",
    },
    CountryEntry {
        code: "DE",
        name_vi: "Đức",
        name_en: "Germany",
        flag: "🇩🇪",
    },
    CountryEntry {
        code: "JP",
        name_vi: "Nhật Bản",
        name_en: "Japan",
        flag: "🇯🇵",
    },
    CountryEntry {
        code: "CN",
        name_vi: "Trung Quốc",
        name_en: "China",
        flag: "🇨🇳",
    },
    CountryEntry {
        code: "HK",
        name_vi: "Hồng Kông",
        name_en: "Hong Kong",
        flag: "🇭🇰",
    },
    CountryEntry {
        code: "TW",
        name_vi: "Đài Loan",
        name_en: "Taiwan",
        flag: "🇹🇼",
    },
    CountryEntry {
        code: "KR",
        name_vi: "Hàn Quốc",
        name_en: "South Korea",
        flag: "🇰🇷",
    },
    CountryEntry {
        code: "GB",
        name_vi: "Vương quốc Anh",
        name_en: "United Kingdom",
        flag: "🇬🇧",
    },
    CountryEntry {
        code: "FR",
        name_vi: "Pháp",
        name_en: "France",
        flag: "🇫🇷",
    },
    CountryEntry {
        code: "NL",
        name_vi: "Hà Lan",
        name_en: "Netherlands",
        flag: "🇳🇱",
    },
    CountryEntry {
        code: "AU",
        name_vi: "Úc",
        name_en: "Australia",
        flag: "🇦🇺",
    },
    CountryEntry {
        code: "CA",
        name_vi: "Canada",
        name_en: "Canada",
        flag: "🇨🇦",
    },
    CountryEntry {
        code: "RU",
        name_vi: "Nga",
        name_en: "Russia",
        flag: "🇷🇺",
    },
    CountryEntry {
        code: "IN",
        name_vi: "Ấn Độ",
        name_en: "India",
        flag: "🇮🇳",
    },
    CountryEntry {
        code: "SE",
        name_vi: "Thụy Điển",
        name_en: "Sweden",
        flag: "🇸🇪",
    },
    CountryEntry {
        code: "CH",
        name_vi: "Thụy Sĩ",
        name_en: "Switzerland",
        flag: "🇨🇭",
    },
    CountryEntry {
        code: "BR",
        name_vi: "Brazil",
        name_en: "Brazil",
        flag: "🇧🇷",
    },
    CountryEntry {
        code: "TH",
        name_vi: "Thái Lan",
        name_en: "Thailand",
        flag: "🇹🇭",
    },
    CountryEntry {
        code: "ID",
        name_vi: "Indonesia",
        name_en: "Indonesia",
        flag: "🇮🇩",
    },
    CountryEntry {
        code: "MY",
        name_vi: "Malaysia",
        name_en: "Malaysia",
        flag: "🇲🇾",
    },
    CountryEntry {
        code: "PH",
        name_vi: "Philippines",
        name_en: "Philippines",
        flag: "🇵🇭",
    },
    CountryEntry {
        code: "LOCAL",
        name_vi: "Mạng Nội bộ (LAN)",
        name_en: "Local Area Network",
        flag: "🏠",
    },
    CountryEntry {
        code: "UNKNOWN",
        name_vi: "Không xác định",
        name_en: "Unknown",
        flag: "🌐",
    },
];

fn lookup_country(country_code: &str) -> Option<&'static CountryEntry> {
    let code = country_code.to_uppercase();
    COUNTRY_FLAGS.iter().find(|entry| entry.code == code)
}

/// JS `parseInt(str, 10)`: skips leading whitespace, reads optional sign + ASCII decimal digits.
fn js_parse_int10(s: &str) -> Option<i64> {
    let trimmed = s.trim_start();
    if trimmed.is_empty() {
        return None;
    }
    let mut chars = trimmed.chars().peekable();
    let negative = match chars.peek().copied() {
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
    let val = digits.parse::<i64>().ok()?;
    Some(if negative { -val } else { val })
}

fn clean_ip_str(ip: &str) -> &str {
    ip.strip_prefix("::ffff:").unwrap_or(ip).trim()
}

/// Port of `getCountryFlag` (`src/lib/traffic/geoIpService.ts:35`).
pub fn get_country_flag(country_code: String) -> Result<String, String> {
    Ok(lookup_country(&country_code)
        .map(|entry| entry.flag)
        .unwrap_or("🌐")
        .to_string())
}

/// Port of `getCountryName` (`src/lib/traffic/geoIpService.ts:40`).
pub fn get_country_name(country_code: String, lang: Option<String>) -> Result<String, String> {
    let lang_str = lang.as_deref().unwrap_or("vi");
    match lookup_country(&country_code) {
        Some(info) => Ok(if lang_str == "vi" {
            info.name_vi
        } else {
            info.name_en
        }
        .to_string()),
        None => Ok(if country_code.is_empty() {
            "Quốc tế".to_string()
        } else {
            country_code
        }),
    }
}

/// Port of `isPrivateIp` (`src/lib/traffic/geoIpService.ts:47`).
pub fn is_private_ip(ip: String) -> Result<bool, String> {
    if ip.is_empty() {
        return Ok(false);
    }
    let clean = clean_ip_str(&ip);
    if clean == "127.0.0.1"
        || clean == "::1"
        || clean == "localhost"
        || clean.starts_with("192.168.")
        || clean.starts_with("10.")
        || clean.starts_with("169.254.")
        || clean == "0.0.0.0"
    {
        return Ok(true);
    }
    if clean.starts_with("172.") {
        let second = clean.split('.').nth(1).and_then(js_parse_int10);
        if matches!(second, Some(v) if (16..=31).contains(&v)) {
            return Ok(true);
        }
    }
    Ok(false)
}

struct GeoEntry<'a> {
    ip: &'a str,
    country_code: &'a str,
    country_name: &'a str,
    flag_emoji: &'a str,
    city: &'a str,
    region: &'a str,
    isp: &'a str,
    org: &'a str,
    asn: &'a str,
    is_private: bool,
    trust_level: &'a str,
}

fn make_geo(g: GeoEntry<'_>) -> serde_json::Value {
    json!({
        "ip": g.ip,
        "countryCode": g.country_code,
        "countryName": g.country_name,
        "flagEmoji": g.flag_emoji,
        "city": g.city,
        "region": g.region,
        "isp": g.isp,
        "org": g.org,
        "asn": g.asn,
        "isPrivate": g.is_private,
        "trustLevel": g.trust_level,
    })
}

/// Port of `resolveKnownIp` (`src/lib/traffic/geoIpService.ts:71`).
pub fn resolve_known_ip(ip: String) -> Result<Option<serde_json::Value>, String> {
    let clean = clean_ip_str(&ip);

    if is_private_ip(clean.to_string())? {
        return Ok(Some(make_geo(GeoEntry {
            ip: clean,
            country_code: "LOCAL",
            country_name: "Mạng Nội bộ (LAN)",
            flag_emoji: "🏠",
            city: "Mạng cục bộ",
            region: "LAN",
            isp: "Mạng Cục bộ (Private RFC1918)",
            org: "Local Subnet",
            asn: "AS-PRIVATE",
            is_private: true,
            trust_level: "local_lan",
        })));
    }

    if clean.contains("synology")
        || clean.starts_with("125.227.")
        || clean.starts_with("210.61.")
        || clean.starts_with("220.130.")
        || clean.starts_with("59.124.")
        || clean.starts_with("54.215.")
        || clean.starts_with("52.53.")
    {
        return Ok(Some(make_geo(GeoEntry {
            ip: clean,
            country_code: "TW",
            country_name: "Đài Loan",
            flag_emoji: "🇹🇼",
            city: "Taipei",
            region: "Taipei City",
            isp: "Synology Inc.",
            org: "Synology QuickConnect & DDNS Cloud",
            asn: "AS17408",
            is_private: false,
            trust_level: "safe_cloud",
        })));
    }

    if clean.starts_with("1.1.1.")
        || clean.starts_with("1.0.0.")
        || clean.starts_with("104.16.")
        || clean.starts_with("104.21.")
        || clean.starts_with("172.67.")
    {
        return Ok(Some(make_geo(GeoEntry {
            ip: clean,
            country_code: "US",
            country_name: "Hoa Kỳ",
            flag_emoji: "🇺🇸",
            city: "San Francisco",
            region: "California",
            isp: "Cloudflare, Inc.",
            org: "Cloudflare Anycast DNS & CDN",
            asn: "AS13335",
            is_private: false,
            trust_level: "safe_cloud",
        })));
    }

    if clean.starts_with("8.8.8.")
        || clean.starts_with("8.8.4.")
        || clean.starts_with("142.250.")
        || clean.starts_with("172.217.")
    {
        return Ok(Some(make_geo(GeoEntry {
            ip: clean,
            country_code: "US",
            country_name: "Hoa Kỳ",
            flag_emoji: "🇺🇸",
            city: "Mountain View",
            region: "California",
            isp: "Google LLC",
            org: "Google Services & Cloud Storage",
            asn: "AS15169",
            is_private: false,
            trust_level: "safe_cloud",
        })));
    }

    if clean.starts_with("99.84.")
        || clean.starts_with("13.224.")
        || clean.starts_with("13.250.")
        || clean.starts_with("52.221.")
        || clean.starts_with("54.169.")
    {
        return Ok(Some(make_geo(GeoEntry {
            ip: clean,
            country_code: "SG",
            country_name: "Singapore",
            flag_emoji: "🇸🇬",
            city: "Singapore",
            region: "Central",
            isp: "Amazon.com, Inc. (AWS)",
            org: "AWS CloudFront & S3 Cloud",
            asn: "AS16509",
            is_private: false,
            trust_level: "safe_cloud",
        })));
    }

    if clean.starts_with("20.198.") || clean.starts_with("40.126.") || clean.starts_with("13.107.")
    {
        return Ok(Some(make_geo(GeoEntry {
            ip: clean,
            country_code: "US",
            country_name: "Hoa Kỳ",
            flag_emoji: "🇺🇸",
            city: "Redmond",
            region: "Washington",
            isp: "Microsoft Corporation",
            org: "Azure Cloud & OneDrive Sync",
            asn: "AS8075",
            is_private: false,
            trust_level: "safe_cloud",
        })));
    }

    if clean.starts_with("115.7")
        || clean.starts_with("116.9")
        || clean.starts_with("116.10")
        || clean.starts_with("171.22")
        || clean.starts_with("171.23")
        || clean.starts_with("171.24")
        || clean.starts_with("27.6")
        || clean.starts_with("27.7")
    {
        return Ok(Some(make_geo(GeoEntry {
            ip: clean,
            country_code: "VN",
            country_name: "Việt Nam",
            flag_emoji: "🇻🇳",
            city: "Hà Nội / TP.HCM",
            region: "Vietnam",
            isp: "Viettel Group (Tập đoàn Viettel)",
            org: "Viettel Telecom Corporation",
            asn: "AS7552",
            is_private: false,
            trust_level: "standard_foreign",
        })));
    }

    if clean.starts_with("113.16")
        || clean.starts_with("113.17")
        || clean.starts_with("113.18")
        || clean.starts_with("123.16")
        || clean.starts_with("123.17")
        || clean.starts_with("14.16")
        || clean.starts_with("14.17")
        || clean.starts_with("14.22")
    {
        return Ok(Some(make_geo(GeoEntry {
            ip: clean,
            country_code: "VN",
            country_name: "Việt Nam",
            flag_emoji: "🇻🇳",
            city: "Hà Nội / TP.HCM",
            region: "Vietnam",
            isp: "VNPT (Tập đoàn Bưu chính Viễn thông VN)",
            org: "VNPT Telecom Network",
            asn: "AS45899",
            is_private: false,
            trust_level: "standard_foreign",
        })));
    }

    if clean.starts_with("1.52.")
        || clean.starts_with("1.53.")
        || clean.starts_with("118.68.")
        || clean.starts_with("118.69.")
        || clean.starts_with("210.245.")
        || clean.starts_with("42.112.")
        || clean.starts_with("42.113.")
        || clean.starts_with("42.118.")
    {
        return Ok(Some(make_geo(GeoEntry {
            ip: clean,
            country_code: "VN",
            country_name: "Việt Nam",
            flag_emoji: "🇻🇳",
            city: "TP. Hồ Chí Minh / Hà Nội",
            region: "Vietnam",
            isp: "FPT Telecom (Công ty Cổ phần Viễn thông FPT)",
            org: "FPT Broadband Network",
            asn: "AS18403",
            is_private: false,
            trust_level: "standard_foreign",
        })));
    }

    Ok(None)
}
