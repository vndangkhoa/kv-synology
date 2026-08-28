export type TrafficDirection = "outbound" | "inbound" | "local";

export type TrustLevel = "safe_cloud" | "local_lan" | "standard_foreign" | "suspicious";

export interface IpGeoInfo {
  ip: string;
  countryCode: string; // "VN", "US", "SG", "DE", "JP", "CN", etc.
  countryName: string; // "Việt Nam", "Hoa Kỳ", "Singapore", etc.
  flagEmoji: string; // "🇻🇳", "🇺🇸", "🇸🇬", etc.
  city?: string;
  region?: string;
  isp: string; // "Viettel Group", "VNPT", "FPT Telecom", "Cloudflare, Inc.", "Amazon AWS", "Synology Inc."
  org?: string;
  asn?: string; // "AS7552", "AS13335", "AS16509"
  isPrivate: boolean;
  trustLevel: TrustLevel;
}

export interface NetworkConnectionItem {
  id: string;
  direction: TrafficDirection;
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  protocol: "TCP" | "UDP";
  state: "ESTABLISHED" | "LISTEN" | "TIME_WAIT" | "CLOSE_WAIT" | "SYN_SENT" | "UDP";
  processName: string;
  pid?: number;
  geo: IpGeoInfo;
  rxSpeedBytes: number; // Tốc độ nhận (B/s)
  txSpeedBytes: number; // Tốc độ gửi (B/s)
  totalRxBytes: number; // Tổng nhận
  totalTxBytes: number; // Tổng gửi
  firstSeen: number;
  lastActive: number;
}

export interface CountryTrafficSummary {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  activeConnections: number;
  outboundBytes: number;
  inboundBytes: number;
  percentOutbound: number;
  primaryIsps: string[];
}

export interface TrafficSummary {
  totalConnections: number;
  outboundConnections: number;
  inboundConnections: number;
  localConnections: number;
  suspiciousCount: number;
  currentOutboundSpeed: number; // Bytes/sec
  currentInboundSpeed: number; // Bytes/sec
  totalOutboundBytes: number;
  totalInboundBytes: number;
  topCountries: CountryTrafficSummary[];
  topProcesses: Array<{ name: string; connections: number; outboundBytes: number }>;
}
