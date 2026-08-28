import { SnmpDevice, SnmpQueryResult, SnmpReading } from "./types";

interface QuerySensorPayload {
  id: string;
  kind: string;
  oid?: string;
  ifIndex?: number;
  pingPort?: number;
  scale?: number;
}

export async function querySnmp(
  device: SnmpDevice
): Promise<Record<string, SnmpReading>> {
  const payload = {
    host: device.host,
    port: device.port || 161,
    credentials: device.credentials,
    sensors: (device.sensors || []).map(
      (s): QuerySensorPayload => ({
        id: s.id,
        kind: s.kind || "custom",
        oid: s.oid,
        ifIndex: s.ifIndex,
        pingPort: s.pingPort,
        scale: s.scale,
      })
    ),
  };

  const res = await fetch("/api/snmp/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `SNMP query failed (${res.status})`);
  }

  const data = (await res.json()) as SnmpQueryResult;
  return data.results || {};
}

export interface DiscoveredInterface {
  ifIndex: number;
  name: string;
  descr: string;
}

export async function discoverInterfaces(
  device: Pick<SnmpDevice, "host" | "port" | "credentials">
): Promise<DiscoveredInterface[]> {
  const res = await fetch("/api/snmp/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host: device.host,
      port: device.port || 161,
      credentials: device.credentials,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `SNMP discover failed (${res.status})`);
  }
  const data = await res.json();
  return data.interfaces || [];
}
