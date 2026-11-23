// SNMP monitoring types (PRTG-style multi-device monitoring)

export type SnmpVersion = "v1" | "v2c" | "v3";

export type SensorKind =
  | "ping"
  | "cpu"
  | "memory"
  | "traffic"
  | "uptime"
  | "disk"
  | "custom";

export type AuthProtocol = "md5" | "sha" | "sha224" | "sha256" | "sha384" | "sha512";
export type PrivProtocol = "des" | "aes" | "aes192" | "aes256" | "aes192c" | "aes256c" | "3des";
export type V3Level = "noAuthNoPriv" | "authNoPriv" | "authPriv";

export interface SnmpCredentials {
  version: SnmpVersion;
  community?: string;
  v3User?: string;
  v3AuthPass?: string;
  v3PrivPass?: string;
  v3AuthProtocol?: AuthProtocol;
  v3PrivProtocol?: PrivProtocol;
  v3Level?: V3Level;
}

export interface SnmpSensor {
  id: string;
  name: string;
  kind: SensorKind;
  oid?: string; // for custom / disk
  unit?: string;
  scale?: number;
  ifIndex?: number; // for traffic
  pingPort?: number; // for ping
  // runtime (client-side only, not persisted)
  value?: number | null;
  status?: "up" | "down" | "unknown";
  error?: string | null;
  history?: number[];
  inHistory?: number[];
  outHistory?: number[];
  lastRaw?: number;
  lastInRaw?: number;
  lastOutRaw?: number;
  lastTs?: number;
}

export interface SnmpDevice {
  id: string;
  name: string;
  host: string;
  port: number; // usually 161
  credentials: SnmpCredentials;
  sensors: SnmpSensor[];
  pollIntervalSec?: number;
  createdAt?: number;
  // runtime (client-side only)
  online?: boolean;
  lastError?: string | null;
  lastPoll?: number;
}

// Response shape from /api/snmp/query
export interface SnmpReading {
  value: number | null;
  status: "up" | "down" | "unknown";
  error?: string | null;
  raw?: number | null;
  extra?: Record<string, number | null>;
}

export interface SnmpQueryResult {
  results: Record<string, SnmpReading>;
}
