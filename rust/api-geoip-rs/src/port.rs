//! HTTP handler and async GeoIP + reverse PTR DNS resolution.

#![forbid(unsafe_code)]

use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::LazyLock;
use std::time::Duration;

use hickory_resolver::TokioResolver;
use serde::Deserialize;
use serde_json::{Map, Value, json};
use tokio::sync::RwLock;

static GEO_CACHE: LazyLock<RwLock<HashMap<String, Value>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .timeout(Duration::from_millis(1500))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
});

static DNS_RESOLVER: LazyLock<Option<TokioResolver>> = LazyLock::new(|| {
    TokioResolver::builder_tokio()
        .ok()
        .and_then(|builder| builder.build().ok())
});

#[derive(Debug, Clone)]
pub struct HttpReply {
    pub status: u16,
    pub body: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IpApiResp {
    status: Option<String>,
    country_code: Option<String>,
    region_name: Option<String>,
    city: Option<String>,
    isp: Option<String>,
    org: Option<String>,
    #[serde(rename = "as")]
    as_field: Option<String>,
}

fn clean_ip(ip: &str) -> &str {
    ip.strip_prefix("::ffff:").unwrap_or(ip).trim()
}

fn format_arpa_name(ip: IpAddr) -> String {
    match ip {
        IpAddr::V4(v4) => {
            let [a, b, c, d] = v4.octets();
            format!("{d}.{c}.{b}.{a}.in-addr.arpa.")
        }
        IpAddr::V6(v6) => {
            let bytes = v6.octets();
            let mut out = String::with_capacity(64 + 10);
            for b in bytes.iter().rev() {
                let lo = b & 0x0f;
                let hi = (b >> 4) & 0x0f;
                out.push(char::from_digit(u32::from(lo), 16).unwrap_or('0'));
                out.push('.');
                out.push(char::from_digit(u32::from(hi), 16).unwrap_or('0'));
                out.push('.');
            }
            out.push_str("ip6.arpa.");
            out
        }
    }
}

/// Port of `resolveIpGeo` (`src/lib/traffic/geoIpService.ts:267`).
pub async fn resolve_ip_geo(ip: &str) -> Value {
    let clean = clean_ip(ip);

    if let Some(cached) = GEO_CACHE.read().await.get(clean).cloned() {
        return cached;
    }

    if let Ok(Some(known)) = geoip_helpers_rs::port::resolve_known_ip(clean.to_string()) {
        GEO_CACHE
            .write()
            .await
            .insert(clean.to_string(), known.clone());
        return known;
    }

    let url = format!(
        "http://ip-api.com/json/{clean}?fields=status,country,countryCode,regionName,city,isp,org,as,query"
    );
    if let Ok(res) = HTTP_CLIENT.get(url).send().await
        && res.status().is_success()
        && let Ok(data) = res.json::<IpApiResp>().await
        && data.status.as_deref() == Some("success")
    {
        let country_code = data
            .country_code
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "UNKNOWN".to_string());
        let isp_str = data
            .isp
            .clone()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "Internet Service Provider".to_string());
        let is_suspicious = matches!(country_code.as_str(), "RU" | "CN" | "IR" | "KP")
            && isp_str.to_lowercase().contains("host");

        let country_name =
            geoip_helpers_rs::port::get_country_name(country_code.clone(), Some("vi".to_string()))
                .unwrap_or_else(|_| country_code.clone());
        let flag_emoji = geoip_helpers_rs::port::get_country_flag(country_code.clone())
            .unwrap_or_else(|_| "🌐".to_string());
        let org_str = data
            .org
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| isp_str.clone());
        let asn = data
            .as_field
            .as_deref()
            .and_then(|s| s.split(' ').next())
            .filter(|s| !s.is_empty())
            .unwrap_or("AS-UNKNOWN")
            .to_string();

        let geo = json!({
            "ip": clean,
            "countryCode": country_code,
            "countryName": country_name,
            "flagEmoji": flag_emoji,
            "city": data.city.unwrap_or_default(),
            "region": data.region_name.unwrap_or_default(),
            "isp": isp_str,
            "org": org_str,
            "asn": asn,
            "isPrivate": false,
            "trustLevel": if is_suspicious { "suspicious" } else { "standard_foreign" },
        });
        GEO_CACHE
            .write()
            .await
            .insert(clean.to_string(), geo.clone());
        return geo;
    }

    let fallback = json!({
        "ip": clean,
        "countryCode": "US",
        "countryName": "Quốc tế (Hoa Kỳ)",
        "flagEmoji": "🇺🇸",
        "city": "Global Route",
        "region": "North America",
        "isp": "Quốc tế / Internet Backbone",
        "org": "Global Transit Carrier",
        "asn": "AS-TRANSIT",
        "isPrivate": false,
        "trustLevel": "standard_foreign",
    });
    GEO_CACHE
        .write()
        .await
        .insert(clean.to_string(), fallback.clone());
    fallback
}

/// Port of reverse PTR DNS lookup in `src/app/api/geoip/lookup/route.ts:17-25`.
pub async fn reverse_ptr_lookup(ip: &str) -> String {
    if geoip_helpers_rs::port::is_private_ip(ip.to_string()).unwrap_or(false) {
        return "Không có bản ghi PTR".to_string();
    }
    let Ok(addr) = ip.trim().parse::<IpAddr>() else {
        return "Không có bản ghi PTR".to_string();
    };
    let Some(resolver) = DNS_RESOLVER.as_ref() else {
        return "Không có bản ghi PTR".to_string();
    };
    let arpa = format_arpa_name(addr);
    if let Ok(Ok(lookup)) =
        tokio::time::timeout(Duration::from_secs(2), resolver.reverse_lookup(arpa)).await
        && let Some(first) = lookup.answers().first()
    {
        let host = first.data.to_string();
        let trimmed = host.trim_end_matches('.').to_string();
        if !trimmed.is_empty() {
            return trimmed;
        }
    }
    "Không có bản ghi PTR".to_string()
}

/// Port of `GET /api/geoip/lookup` (`src/app/api/geoip/lookup/route.ts`).
pub async fn handle_lookup(ip_param: Option<&str>) -> HttpReply {
    let Some(ip) = ip_param.filter(|s| !s.is_empty()) else {
        return HttpReply {
            status: 400,
            body: json!({
                "success": false,
                "error": "Thiếu tham số ip",
            }),
        };
    };

    let geo = resolve_ip_geo(ip).await;
    let reverse_dns = reverse_ptr_lookup(ip).await;

    let mut data_map = match geo {
        Value::Object(map) => map,
        _ => Map::new(),
    };
    data_map.insert("reverseDns".to_string(), Value::String(reverse_dns));
    data_map.insert(
        "whoisLink".to_string(),
        Value::String(format!("https://whois.domaintools.com/{ip}")),
    );
    data_map.insert(
        "abuseIpDbLink".to_string(),
        Value::String(format!("https://www.abuseipdb.com/check/{ip}")),
    );
    data_map.insert(
        "bgpLink".to_string(),
        Value::String(format!("https://bgp.he.net/ip/{ip}")),
    );

    HttpReply {
        status: 200,
        body: json!({
            "success": true,
            "data": Value::Object(data_map),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn missing_ip_returns_400() {
        let reply = handle_lookup(None).await;
        assert_eq!(reply.status, 400);
        assert_eq!(reply.body["success"], json!(false));
        assert_eq!(reply.body["error"], json!("Thiếu tham số ip"));

        let empty = handle_lookup(Some("")).await;
        assert_eq!(empty.status, 400);
    }

    #[tokio::test]
    async fn loopback_and_private_lan_match_recorded_cases() {
        let lo = handle_lookup(Some("127.0.0.1")).await;
        assert_eq!(lo.status, 200);
        assert_eq!(
            serde_json::to_string(&lo.body).unwrap(),
            r#"{"success":true,"data":{"ip":"127.0.0.1","countryCode":"LOCAL","countryName":"Mạng Nội bộ (LAN)","flagEmoji":"🏠","city":"Mạng cục bộ","region":"LAN","isp":"Mạng Cục bộ (Private RFC1918)","org":"Local Subnet","asn":"AS-PRIVATE","isPrivate":true,"trustLevel":"local_lan","reverseDns":"Không có bản ghi PTR","whoisLink":"https://whois.domaintools.com/127.0.0.1","abuseIpDbLink":"https://www.abuseipdb.com/check/127.0.0.1","bgpLink":"https://bgp.he.net/ip/127.0.0.1"}}"#
        );

        let lan = handle_lookup(Some("192.168.1.10")).await;
        assert_eq!(lan.status, 200);
        assert_eq!(
            serde_json::to_string(&lan.body).unwrap(),
            r#"{"success":true,"data":{"ip":"192.168.1.10","countryCode":"LOCAL","countryName":"Mạng Nội bộ (LAN)","flagEmoji":"🏠","city":"Mạng cục bộ","region":"LAN","isp":"Mạng Cục bộ (Private RFC1918)","org":"Local Subnet","asn":"AS-PRIVATE","isPrivate":true,"trustLevel":"local_lan","reverseDns":"Không có bản ghi PTR","whoisLink":"https://whois.domaintools.com/192.168.1.10","abuseIpDbLink":"https://www.abuseipdb.com/check/192.168.1.10","bgpLink":"https://bgp.he.net/ip/192.168.1.10"}}"#
        );
    }
}
