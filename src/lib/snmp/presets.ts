import { SensorKind } from "./types";

export interface SensorPreset {
  kind: SensorKind;
  label: string;
  // default OID or base; traffic uses ifIndex, ping uses pingPort
  oid?: string;
  unit: string;
  scale?: number;
  isCounter?: boolean;
  description: string;
}

// Common MIB defaults (overridable per sensor)
export const SENSOR_PRESETS: Record<SensorKind, SensorPreset> = {
  ping: {
    kind: "ping",
    label: "Ping (TCP)",
    unit: "ms",
    description: "Kiểm tra thiết bị online qua cổng TCP (mặc định 80/443/23).",
  },
  cpu: {
    kind: "cpu",
    label: "CPU Load",
    oid: "1.3.6.1.2.1.25.3.3.1.2", // HOST-RESOURCES-MIB hrProcessorLoad (walk, avg)
    unit: "%",
    scale: 1,
    description: "Tải CPU trung bình (HOST-RESOURCES-MIB).",
  },
  memory: {
    kind: "memory",
    label: "Memory",
    oid: "1.3.6.1.4.1.2021.4", // UCD-SNMP-MIB (memTotalReal / memAvailReal)
    unit: "%",
    description: "Bộ nhớ đã dùng (UCD-SNMP-MIB: memTotalReal - memAvailReal).",
  },
  traffic: {
    kind: "traffic",
    label: "Traffic",
    oid: "1.3.6.1.2.1.2.2.1", // IF-MIB ifInOctets / ifOutOctets by ifIndex
    unit: "kb/s",
    isCounter: true,
    description: "Băng thông vào/ra của interface (IF-MIB ifInOctets/ifOutOctets).",
  },
  uptime: {
    kind: "uptime",
    label: "Uptime",
    oid: "1.3.6.1.2.1.1.3.0", // sysUpTime
    unit: "days",
    description: "Thời gian hoạt động (sysUpTime).",
  },
  disk: {
    kind: "disk",
    label: "Disk",
    oid: "1.3.6.1.2.1.25.2.3.1", // HOST-RESOURCES hrStorage
    unit: "%",
    description: "Sử dụng ổ đĩa (HOST-RESOURCES hrStorage).",
  },
  custom: {
    kind: "custom",
    label: "Custom OID",
    oid: "1.3.6.1.2.1.1.1.0", // sysDescr as example
    unit: "",
    scale: 1,
    description: "OID tùy chỉnh với hệ số và đơn vị riêng.",
  },
};

export const SENSOR_KIND_ORDER: SensorKind[] = [
  "ping",
  "cpu",
  "memory",
  "traffic",
  "uptime",
  "disk",
  "custom",
];

// Common IF-MIB OIDs used by the traffic sensor
export const IF_MIB = {
  ifInOctets: "1.3.6.1.2.1.2.2.1.10",
  ifOutOctets: "1.3.6.1.2.1.2.2.1.16",
  ifDescr: "1.3.6.1.2.1.2.2.1.2",
  ifName: "1.3.6.1.2.1.31.1.1.1.1",
  ifOperStatus: "1.3.6.1.2.1.2.2.1.8",
  ifHCInOctets: "1.3.6.1.2.1.31.1.1.1.6",
  ifHCOutOctets: "1.3.6.1.2.1.31.1.1.1.10",
};

// UCD-SNMP-MIB memory OIDs
export const UCD_MEM = {
  memTotalReal: "1.3.6.1.4.1.2021.4.5.0",
  memAvailReal: "1.3.6.1.4.1.2021.4.6.0",
};
