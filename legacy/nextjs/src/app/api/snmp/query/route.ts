import { NextRequest, NextResponse } from "next/server";
import { createSession, querySensor, tcpPing, isLocalHost, queryLocalSystemMetric } from "@/lib/snmp/server";
import { SnmpCredentials, SnmpSensor } from "@/lib/snmp/types";

export const dynamic = "force-dynamic";

interface QueryBody {
  host?: string;
  port?: number;
  credentials?: SnmpCredentials;
  sensors?: SnmpSensor[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QueryBody;
    const host = body.host?.trim();
    const port = Number(body.port) || 161;
    const credentials = body.credentials;
    const sensors = body.sensors || [];

    if (!host) {
      return NextResponse.json({ success: false, error: "host required" }, { status: 400 });
    }
    if (!credentials || !credentials.version) {
      return NextResponse.json(
        { success: false, error: "SNMP credentials required" },
        { status: 400 }
      );
    }

    const results: Record<string, any> = {};
    const isLocal = isLocalHost(host);

    // Ping sensors are TCP-based, independent of SNMP
    const snmpSensors: SnmpSensor[] = [];
    for (const s of sensors) {
      if (s.kind === "ping") {
        const r = await tcpPing(host, s.pingPort || 80, 3000);
        results[s.id] = {
          value: r.up ? r.latency : null,
          status: r.up ? "up" : "down",
          raw: r.up ? r.latency : null,
        };
      } else {
        snmpSensors.push(s);
      }
    }

    if (snmpSensors.length) {
      if (isLocal) {
        for (const s of snmpSensors) {
          const localRes = queryLocalSystemMetric(s);
          if (localRes && localRes.status === "up") {
            results[s.id] = localRes;
          } else {
            results[s.id] = { value: null, status: "up", raw: 0 };
          }
        }
      } else {
        const session = createSession(host, port, credentials);
        try {
          for (const s of snmpSensors) {
            results[s.id] = await querySensor(session, s);
          }
        } finally {
          try {
            session.close();
          } catch {}
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "SNMP query failed" },
      { status: 500 }
    );
  }
}
