import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/snmp/server";
import { SnmpCredentials } from "@/lib/snmp/types";
import { IF_MIB } from "@/lib/snmp/presets";

export const dynamic = "force-dynamic";

interface DiscoverBody {
  host?: string;
  port?: number;
  credentials?: SnmpCredentials;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DiscoverBody;
    const host = body.host?.trim();
    const port = Number(body.port) || 161;
    const credentials = body.credentials;

    if (!host || !credentials) {
      return NextResponse.json({ success: false, error: "host & credentials required" }, { status: 400 });
    }

    const session = createSession(host, port, credentials);
    const interfaces: { ifIndex: number; name: string; descr: string }[] = [];
    try {
      const names = await snmpSubtreeSafe(session, IF_MIB.ifName);
      const descrs = await snmpSubtreeSafe(session, IF_MIB.ifDescr);

      const nameByIndex = indexMap(names);
      const descrByIndex = indexMap(descrs);

      const indices = new Set<string>([
        ...Object.keys(nameByIndex),
        ...Object.keys(descrByIndex),
      ]);

      for (const idx of indices) {
        interfaces.push({
          ifIndex: Number(idx),
          name: String(nameByIndex[idx] ?? descrByIndex[idx] ?? `eth${idx}`),
          descr: String(descrByIndex[idx] ?? nameByIndex[idx] ?? ""),
        });
      }
      interfaces.sort((a, b) => a.ifIndex - b.ifIndex);
    } finally {
      try {
        session.close();
      } catch {}
    }

    return NextResponse.json({ success: true, interfaces });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "SNMP discover failed" },
      { status: 500 }
    );
  }
}

function indexMap(varbinds: any[]): Record<string, any> {
  const map: Record<string, any> = {};
  for (const v of varbinds || []) {
    const parts = String(v.oid).split(".");
    const idx = parts[parts.length - 1];
    map[idx] = v.value;
  }
  return map;
}

function snmpSubtreeSafe(session: any, oid: string): Promise<any[]> {
  return new Promise((resolve) => {
    const out: any[] = [];
    try {
      session.subtree(
        oid,
        (varbinds: any[]) => {
          if (varbinds) out.push(...varbinds);
        },
        () => resolve(out)
      );
    } catch {
      resolve(out);
    }
  });
}
