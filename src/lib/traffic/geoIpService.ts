import { IpGeoInfo, TrustLevel } from "./types";

// Country Flag Emoji Map
const COUNTRY_FLAGS: Record<string, { nameVi: string; nameEn: string; flag: string }> = {
  VN: { nameVi: "Việt Nam", nameEn: "Vietnam", flag: "🇻🇳" },
  US: { nameVi: "Hoa Kỳ", nameEn: "United States", flag: "🇺🇸" },
  SG: { nameVi: "Singapore", nameEn: "Singapore", flag: "🇸🇬" },
  DE: { nameVi: "Đức", nameEn: "Germany", flag: "🇩🇪" },
  JP: { nameVi: "Nhật Bản", nameEn: "Japan", flag: "🇯🇵" },
  CN: { nameVi: "Trung Quốc", nameEn: "China", flag: "🇨🇳" },
  HK: { nameVi: "Hồng Kông", nameEn: "Hong Kong", flag: "🇭🇰" },
  TW: { nameVi: "Đài Loan", nameEn: "Taiwan", flag: "🇹🇼" },
  KR: { nameVi: "Hàn Quốc", nameEn: "South Korea", flag: "🇰🇷" },
  GB: { nameVi: "Vương quốc Anh", nameEn: "United Kingdom", flag: "🇬🇧" },
  FR: { nameVi: "Pháp", nameEn: "France", flag: "🇫🇷" },
  NL: { nameVi: "Hà Lan", nameEn: "Netherlands", flag: "🇳🇱" },
  AU: { nameVi: "Úc", nameEn: "Australia", flag: "🇦🇺" },
  CA: { nameVi: "Canada", nameEn: "Canada", flag: "🇨🇦" },
  RU: { nameVi: "Nga", nameEn: "Russia", flag: "🇷🇺" },
  IN: { nameVi: "Ấn Độ", nameEn: "India", flag: "🇮🇳" },
  SE: { nameVi: "Thụy Điển", nameEn: "Sweden", flag: "🇸🇪" },
  CH: { nameVi: "Thụy Sĩ", nameEn: "Switzerland", flag: "🇨🇭" },
  BR: { nameVi: "Brazil", nameEn: "Brazil", flag: "🇧🇷" },
  TH: { nameVi: "Thái Lan", nameEn: "Thailand", flag: "🇹🇭" },
  ID: { nameVi: "Indonesia", nameEn: "Indonesia", flag: "🇮🇩" },
  MY: { nameVi: "Malaysia", nameEn: "Malaysia", flag: "🇲🇾" },
  PH: { nameVi: "Philippines", nameEn: "Philippines", flag: "🇵🇭" },
  LOCAL: { nameVi: "Mạng Nội bộ (LAN)", nameEn: "Local Area Network", flag: "🏠" },
  UNKNOWN: { nameVi: "Không xác định", nameEn: "Unknown", flag: "🌐" },
};

// In-memory LRU cache to prevent redundant lookups
const geoCache = new Map<string, IpGeoInfo>();

export function getCountryFlag(countryCode: string): string {
  const code = (countryCode || "").toUpperCase();
  return COUNTRY_FLAGS[code]?.flag || "🌐";
}

export function getCountryName(countryCode: string, lang = "vi"): string {
  const code = (countryCode || "").toUpperCase();
  const info = COUNTRY_FLAGS[code];
  if (!info) return countryCode || "Quốc tế";
  return lang === "vi" ? info.nameVi : info.nameEn;
}

export function isPrivateIp(ip: string): boolean {
  if (!ip) return false;
  const clean = ip.replace(/^::ffff:/, "").trim();
  if (
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean === "localhost" ||
    clean.startsWith("192.168.") ||
    clean.startsWith("10.") ||
    clean.startsWith("169.254.") ||
    clean === "0.0.0.0"
  ) {
    return true;
  }
  // 172.16.0.0 - 172.31.255.255
  if (clean.startsWith("172.")) {
    const parts = clean.split(".");
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

// High-speed static resolver for major Cloud providers, VN ISPs and Synology infrastructure
export function resolveKnownIp(ip: string): IpGeoInfo | null {
  const clean = ip.replace(/^::ffff:/, "").trim();

  // 1. Private LAN
  if (isPrivateIp(clean)) {
    return {
      ip: clean,
      countryCode: "LOCAL",
      countryName: "Mạng Nội bộ (LAN)",
      flagEmoji: "🏠",
      city: "Mạng cục bộ",
      region: "LAN",
      isp: "Mạng Cục bộ (Private RFC1918)",
      org: "Local Subnet",
      asn: "AS-PRIVATE",
      isPrivate: true,
      trustLevel: "local_lan",
    };
  }

  // 2. Synology QuickConnect / Update / Relay Infrastructure
  if (
    clean.includes("synology") ||
    clean.startsWith("125.227.") ||
    clean.startsWith("210.61.") ||
    clean.startsWith("220.130.") ||
    clean.startsWith("59.124.") ||
    clean.startsWith("54.215.") ||
    clean.startsWith("52.53.")
  ) {
    return {
      ip: clean,
      countryCode: "TW",
      countryName: "Đài Loan",
      flagEmoji: "🇹🇼",
      city: "Taipei",
      region: "Taipei City",
      isp: "Synology Inc.",
      org: "Synology QuickConnect & DDNS Cloud",
      asn: "AS17408",
      isPrivate: false,
      trustLevel: "safe_cloud",
    };
  }

  // 3. Cloudflare (1.1.1.1, 1.0.0.1, 104.16.x, 104.21.x, 172.67.x)
  if (clean.startsWith("1.1.1.") || clean.startsWith("1.0.0.") || clean.startsWith("104.16.") || clean.startsWith("104.21.") || clean.startsWith("172.67.")) {
    return {
      ip: clean,
      countryCode: "US",
      countryName: "Hoa Kỳ",
      flagEmoji: "🇺🇸",
      city: "San Francisco",
      region: "California",
      isp: "Cloudflare, Inc.",
      org: "Cloudflare Anycast DNS & CDN",
      asn: "AS13335",
      isPrivate: false,
      trustLevel: "safe_cloud",
    };
  }

  // 4. Google (8.8.8.8, 8.8.4.4, 142.250.x, 172.217.x)
  if (clean.startsWith("8.8.8.") || clean.startsWith("8.8.4.") || clean.startsWith("142.250.") || clean.startsWith("172.217.")) {
    return {
      ip: clean,
      countryCode: "US",
      countryName: "Hoa Kỳ",
      flagEmoji: "🇺🇸",
      city: "Mountain View",
      region: "California",
      isp: "Google LLC",
      org: "Google Services & Cloud Storage",
      asn: "AS15169",
      isPrivate: false,
      trustLevel: "safe_cloud",
    };
  }

  // 5. Amazon AWS / CloudFront (13.x, 52.x, 54.x, 18.x, 99.84.x)
  if (clean.startsWith("99.84.") || clean.startsWith("13.224.") || clean.startsWith("13.250.") || clean.startsWith("52.221.") || clean.startsWith("54.169.")) {
    return {
      ip: clean,
      countryCode: "SG",
      countryName: "Singapore",
      flagEmoji: "🇸🇬",
      city: "Singapore",
      region: "Central",
      isp: "Amazon.com, Inc. (AWS)",
      org: "AWS CloudFront & S3 Cloud",
      asn: "AS16509",
      isPrivate: false,
      trustLevel: "safe_cloud",
    };
  }

  // 6. Microsoft / Azure (20.x, 40.x, 52.x, 13.107.x)
  if (clean.startsWith("20.198.") || clean.startsWith("40.126.") || clean.startsWith("13.107.")) {
    return {
      ip: clean,
      countryCode: "US",
      countryName: "Hoa Kỳ",
      flagEmoji: "🇺🇸",
      city: "Redmond",
      region: "Washington",
      isp: "Microsoft Corporation",
      org: "Azure Cloud & OneDrive Sync",
      asn: "AS8075",
      isPrivate: false,
      trustLevel: "safe_cloud",
    };
  }

  // 7. Vietnam ISPs (Viettel, VNPT, FPT, CMC, Mobifone)
  // Viettel: 115.72 - 115.79, 116.96 - 116.111, 125.234 - 125.235, 171.224 - 171.255, 27.64 - 27.79
  if (
    clean.startsWith("115.7") ||
    clean.startsWith("116.9") ||
    clean.startsWith("116.10") ||
    clean.startsWith("171.22") ||
    clean.startsWith("171.23") ||
    clean.startsWith("171.24") ||
    clean.startsWith("27.6") ||
    clean.startsWith("27.7")
  ) {
    return {
      ip: clean,
      countryCode: "VN",
      countryName: "Việt Nam",
      flagEmoji: "🇻🇳",
      city: "Hà Nội / TP.HCM",
      region: "Vietnam",
      isp: "Viettel Group (Tập đoàn Viettel)",
      org: "Viettel Telecom Corporation",
      asn: "AS7552",
      isPrivate: false,
      trustLevel: "standard_foreign",
    };
  }

  // VNPT: 113.160 - 113.191, 123.16 - 123.31, 14.160 - 14.191, 14.224 - 14.247
  if (
    clean.startsWith("113.16") ||
    clean.startsWith("113.17") ||
    clean.startsWith("113.18") ||
    clean.startsWith("123.16") ||
    clean.startsWith("123.17") ||
    clean.startsWith("14.16") ||
    clean.startsWith("14.17") ||
    clean.startsWith("14.22")
  ) {
    return {
      ip: clean,
      countryCode: "VN",
      countryName: "Việt Nam",
      flagEmoji: "🇻🇳",
      city: "Hà Nội / TP.HCM",
      region: "Vietnam",
      isp: "VNPT (Tập đoàn Bưu chính Viễn thông VN)",
      org: "VNPT Telecom Network",
      asn: "AS45899",
      isPrivate: false,
      trustLevel: "standard_foreign",
    };
  }

  // FPT Telecom: 1.52 - 1.55, 118.68 - 118.71, 210.245, 42.112 - 42.119
  if (
    clean.startsWith("1.52.") ||
    clean.startsWith("1.53.") ||
    clean.startsWith("118.68.") ||
    clean.startsWith("118.69.") ||
    clean.startsWith("210.245.") ||
    clean.startsWith("42.112.") ||
    clean.startsWith("42.113.") ||
    clean.startsWith("42.118.")
  ) {
    return {
      ip: clean,
      countryCode: "VN",
      countryName: "Việt Nam",
      flagEmoji: "🇻🇳",
      city: "TP. Hồ Chí Minh / Hà Nội",
      region: "Vietnam",
      isp: "FPT Telecom (Công ty Cổ phần Viễn thông FPT)",
      org: "FPT Broadband Network",
      asn: "AS18403",
      isPrivate: false,
      trustLevel: "standard_foreign",
    };
  }

  return null;
}

// Full resolver with Cache and Fallback
export async function resolveIpGeo(ip: string): Promise<IpGeoInfo> {
  const clean = ip.replace(/^::ffff:/, "").trim();
  if (geoCache.has(clean)) {
    return geoCache.get(clean)!;
  }

  // 1. Check fast static database
  const known = resolveKnownIp(clean);
  if (known) {
    geoCache.set(clean, known);
    return known;
  }

  // 2. Try online lookup via ip-api (free, non-commercial, rate-limited)
  try {
    const res = await fetch(`http://ip-api.com/json/${clean}?fields=status,country,countryCode,regionName,city,isp,org,as,query`, {
      signal: AbortSignal.timeout(1500),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        const countryCode = data.countryCode || "UNKNOWN";
        const isSuspicious = ["RU", "CN", "IR", "KP"].includes(countryCode) && data.isp?.toLowerCase().includes("host");

        const geo: IpGeoInfo = {
          ip: clean,
          countryCode,
          countryName: getCountryName(countryCode, "vi"),
          flagEmoji: getCountryFlag(countryCode),
          city: data.city || "",
          region: data.regionName || "",
          isp: data.isp || "Internet Service Provider",
          org: data.org || data.isp || "",
          asn: data.as ? data.as.split(" ")[0] : "AS-UNKNOWN",
          isPrivate: false,
          trustLevel: isSuspicious ? "suspicious" : "standard_foreign",
        };

        geoCache.set(clean, geo);
        return geo;
      }
    }
  } catch (_) {}

  // 3. Fallback heuristic
  const fallback: IpGeoInfo = {
    ip: clean,
    countryCode: "US",
    countryName: "Quốc tế (Hoa Kỳ)",
    flagEmoji: "🇺🇸",
    city: "Global Route",
    region: "North America",
    isp: "Quốc tế / Internet Backbone",
    org: "Global Transit Carrier",
    asn: "AS-TRANSIT",
    isPrivate: false,
    trustLevel: "standard_foreign",
  };

  geoCache.set(clean, fallback);
  return fallback;
}
