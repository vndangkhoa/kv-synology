import { NextRequest, NextResponse } from "next/server";
import snmp from "net-snmp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      host,
      port = 161,
      version = "v2c",
      community = "public",
      v3Config,
      rootOid = ".1.3.6.1.4.1.6574", // Default to Synology MIB root
      maxRepetitions = 50,
      timeout = 4000,
    } = body as {
      host: string;
      port?: number;
      version?: "v1" | "v2c" | "v3";
      community?: string;
      v3Config?: any;
      rootOid?: string;
      maxRepetitions?: number;
      timeout?: number;
    };

    if (!host) {
      return NextResponse.json(
        { success: false, error: "Thiếu địa chỉ host thiết bị SNMP" },
        { status: 400 }
      );
    }

    let cleanRoot = (rootOid || "1.3.6.1.2.1").trim();
    if (cleanRoot.startsWith(".")) cleanRoot = cleanRoot.substring(1);

    const startTime = Date.now();
    const discovered: any[] = [];

    const walkResult = await new Promise<{ items: any[]; responseTimeMs: number }>((resolve, reject) => {
      let session: any = null;

      try {
        const snmpPort = Number(port) || 161;
        const snmpTimeout = Math.min(Math.max(Number(timeout) || 4000, 1000), 10000);

        if (version === "v3" && v3Config?.user) {
          const user = {
            name: v3Config.user,
            level:
              v3Config.level === "authPriv"
                ? snmp.SecurityLevel.authPriv
                : v3Config.level === "authNoPriv"
                ? snmp.SecurityLevel.authNoPriv
                : snmp.SecurityLevel.noAuthNoPriv,
            authProtocol:
              v3Config.authProtocol === "sha"
                ? snmp.AuthProtocols.sha
                : snmp.AuthProtocols.md5,
            authKey: v3Config.authKey || "",
            privProtocol:
              v3Config.privProtocol === "aes"
                ? snmp.PrivProtocols.aes
                : snmp.PrivProtocols.des,
            privKey: v3Config.privKey || "",
          };
          session = snmp.createV3Session(host, user, {
            port: snmpPort,
            timeout: snmpTimeout,
            retries: 1,
          });
        } else {
          session = snmp.createSession(host, community || "public", {
            port: snmpPort,
            version: version === "v1" ? snmp.Version1 : snmp.Version2c,
            timeout: snmpTimeout,
            retries: 1,
          });
        }

        const feedCb = (varbinds: any[]) => {
          for (const vb of varbinds) {
            if (snmp.isVarbindError(vb)) continue;
            let val = vb.value;
            let typeStr = "unknown";

            if (Buffer.isBuffer(val)) {
              val = val.toString("utf-8");
              typeStr = "OctetString";
            } else if (typeof val === "number" || typeof val === "bigint") {
              val = Number(val);
              typeStr = "Integer/Counter";
            }

            discovered.push({
              oid: `.${vb.oid}`,
              type: typeStr,
              value: val,
            });

            if (discovered.length >= maxRepetitions) {
              return false; // stop walk if cap reached
            }
          }
        };

        session.subtree(cleanRoot, maxRepetitions, feedCb, (err: any) => {
          const elapsed = Date.now() - startTime;
          try {
            session.close();
          } catch (_) {}

          if (err && discovered.length === 0) {
            return reject(err);
          }

          resolve({ items: discovered, responseTimeMs: elapsed });
        });
      } catch (e: any) {
        if (session) {
          try {
            session.close();
          } catch (_) {}
        }
        reject(e);
      }
    });

    return NextResponse.json({
      success: true,
      host,
      rootOid,
      count: walkResult.items.length,
      responseTimeMs: walkResult.responseTimeMs,
      data: walkResult.items,
    });
  } catch (error: any) {
    const msg = error.message || String(error);
    return NextResponse.json(
      {
        success: false,
        error: `SNMP Walk failed: ${msg}`,
      },
      { status: 500 }
    );
  }
}
