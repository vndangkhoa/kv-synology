import { SnmpDevice } from "./types";

const DEVICES_KEY = "dsm_snmp_devices_v3";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function createDefaultSynologyDevice(hostname?: string, model?: string): SnmpDevice {
  return {
    id: "device_synology_master",
    name: `Synology NAS (${model || "DS920+"})`,
    host: "127.0.0.1",
    port: 161,
    online: true,
    credentials: {
      version: "v2c",
      community: "public",
    },
    pollIntervalSec: 3,
    sensors: [
      {
        id: "s_ping",
        name: "Ping Web DSM (Cổng 8088)",
        kind: "ping",
        pingPort: 8088,
        unit: "ms",
      },
      {
        id: "s_cpu",
        name: "Tải CPU (hrProcessorLoad)",
        kind: "cpu",
        oid: "1.3.6.1.2.1.25.3.3.1.2",
        unit: "%",
        scale: 1,
      },
      {
        id: "s_memory",
        name: "Bộ nhớ RAM đã dùng (UCD-SNMP-MIB)",
        kind: "memory",
        oid: "1.3.6.1.4.1.2021.4",
        unit: "%",
      },
      {
        id: "s_traffic",
        name: "Băng thông Mạng LAN1",
        kind: "traffic",
        oid: "1.3.6.1.2.1.2.2.1",
        ifIndex: 2,
        unit: "kb/s",
      },
      {
        id: "s_uptime",
        name: "Thời gian hoạt động (sysUpTime)",
        kind: "uptime",
        oid: "1.3.6.1.2.1.1.3.0",
        unit: "ngày",
      },
      {
        id: "s_disk",
        name: "Dung lượng Lưu trữ / Storage Pool",
        kind: "disk",
        oid: "1.3.6.1.2.1.25.2.3.1",
        unit: "%",
      },
    ],
  };
}

export function getSnmpDevices(fallbackHostname?: string, fallbackModel?: string): SnmpDevice[] {
  if (!isBrowser()) return [createDefaultSynologyDevice(fallbackHostname, fallbackModel)];
  try {
    const raw = localStorage.getItem(DEVICES_KEY);
    if (!raw) {
      const defaultDevice = createDefaultSynologyDevice(fallbackHostname, fallbackModel);
      saveSnmpDevices([defaultDevice]);
      return [defaultDevice];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const defaultDevice = createDefaultSynologyDevice(fallbackHostname, fallbackModel);
      saveSnmpDevices([defaultDevice]);
      return [defaultDevice];
    }
    // strip runtime fields and normalize localhost for default master device
    const list = parsed.map((d: SnmpDevice) => {
      const isMaster = d.id === "device_synology_master" || d.name?.includes("Synology");
      const host = isMaster ? "127.0.0.1" : d.host || "127.0.0.1";
      return {
        ...d,
        host,
        online: isMaster ? true : (d.online ?? true),
        lastError: undefined,
        lastPoll: undefined,
        sensors: (d.sensors || []).map((s) => ({
          ...s,
          pingPort: s.kind === "ping" && isMaster ? 8088 : s.pingPort,
          value: undefined,
          status: undefined,
          error: undefined,
          history: undefined,
          inHistory: undefined,
          outHistory: undefined,
          lastRaw: undefined,
          lastInRaw: undefined,
          lastOutRaw: undefined,
          lastTs: undefined,
        })),
      };
    });
    return list;
  } catch {
    return [createDefaultSynologyDevice(fallbackHostname, fallbackModel)];
  }
}

export function saveSnmpDevices(devices: SnmpDevice[]): void {
  if (!isBrowser()) return;
  try {
    const clean = devices.map((d) => ({
      id: d.id,
      name: d.name,
      host: d.host,
      port: d.port,
      credentials: d.credentials,
      sensors: d.sensors.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        oid: s.oid,
        unit: s.unit,
        scale: s.scale,
        ifIndex: s.ifIndex,
        pingPort: s.pingPort,
      })),
      pollIntervalSec: d.pollIntervalSec,
      createdAt: d.createdAt,
    }));
    localStorage.setItem(DEVICES_KEY, JSON.stringify(clean));
  } catch {}
}

export function addSnmpDevice(device: SnmpDevice): SnmpDevice[] {
  const devices = getSnmpDevices();
  const next = [...devices, device];
  saveSnmpDevices(next);
  return next;
}

export function updateSnmpDevice(device: SnmpDevice): SnmpDevice[] {
  const devices = getSnmpDevices();
  const next = devices.map((d) => (d.id === device.id ? device : d));
  saveSnmpDevices(next);
  return next;
}

export function removeSnmpDevice(id: string): SnmpDevice[] {
  const devices = getSnmpDevices().filter((d) => d.id !== id);
  saveSnmpDevices(devices);
  return devices;
}

export function genId(prefix = "snmp"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
