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
  memTotalFree: "1.3.6.1.4.1.2021.4.11.0",
  memShared: "1.3.6.1.4.1.2021.4.13.0",
  memBuffer: "1.3.6.1.4.1.2021.4.14.0",
  memCached: "1.3.6.1.4.1.2021.4.15.0",
};

// SYNOLOGY Enterprise MIB OIDs (.1.3.6.1.4.1.6574)
export const SYNO_MIB = {
  enterprise: "1.3.6.1.4.1.6574",
  systemStatus: "1.3.6.1.4.1.6574.1.1.0",
  temperature: "1.3.6.1.4.1.6574.1.2.0",
  powerStatus: "1.3.6.1.4.1.6574.1.3.0",
  systemFanStatus: "1.3.6.1.4.1.6574.1.4.1.0",
  cpuFanStatus: "1.3.6.1.4.1.6574.1.4.2.0",
  modelName: "1.3.6.1.4.1.6574.1.5.1.0",
  serialNumber: "1.3.6.1.4.1.6574.1.5.2.0",
  version: "1.3.6.1.4.1.6574.1.5.3.0",
  upgradeAvailable: "1.3.6.1.4.1.6574.1.5.4.0",
  diskTable: "1.3.6.1.4.1.6574.2.1.1",
  diskStatus: "1.3.6.1.4.1.6574.2.1.1.5",
  diskTemp: "1.3.6.1.4.1.6574.2.1.1.6",
  raidTable: "1.3.6.1.4.1.6574.3.1.1",
  raidName: "1.3.6.1.4.1.6574.3.1.1.2",
  raidStatus: "1.3.6.1.4.1.6574.3.1.1.3",
  raidFreeSize: "1.3.6.1.4.1.6574.3.1.1.4",
  raidTotalSize: "1.3.6.1.4.1.6574.3.1.1.5",
  upsModel: "1.3.6.1.4.1.6574.4.1.1.0",
  upsStatus: "1.3.6.1.4.1.6574.4.2.1.0",
  upsBatteryCharge: "1.3.6.1.4.1.6574.4.3.1.1.0",
  upsBatteryRuntime: "1.3.6.1.4.1.6574.4.3.6.1.0",
};

