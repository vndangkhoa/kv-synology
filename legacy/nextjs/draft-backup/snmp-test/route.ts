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
      timeout = 2000,
    } = body as {
      host: string;
      port?: number;
      version?: "v1" | "v2c" | "v3";
      community?: string;
      v3Config?: any;
      timeout?: number;
    };

    if (!host) {
      return NextResponse.json(
        { success: false, error: "Thiếu địa chỉ host thiết bị SNMP" },
        { status: 400 }
      );
    }

    const testOids = ["1.3.6.1.2.1.1.1.0", "1.3.6.1.2.1.1.3.0", "1.3.6.1.2.1.1.5.0"];
    const startTime = Date.now();

    const testResult = await new Promise<{
      sysDescr: string;
      sysUpTime: string;
      sysName: string;
      responseTimeMs: number;
    }>((resolve, reject) => {
      let session: any = null;

      try {
        const snmpPort = Number(port) || 161;
        const snmpTimeout = Math.min(Math.max(Number(timeout) || 2000, 500), 5000);

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

        session.get(testOids, (err: any, varbinds: any[]) => {
          const elapsed = Date.now() - startTime;
          try {
            session.close();
          } catch (_) {}

          if (err) return reject(err);

          let sysDescr = "";
          let sysUpTime = "";
          let sysName = "";

          for (const vb of varbinds || []) {
            if (snmp.isVarbindError(vb)) continue;
            let val = vb.value;
            if (Buffer.isBuffer(val)) val = val.toString("utf-8");

            if (vb.oid === "1.3.6.1.2.1.1.1.0") sysDescr = String(val);
            if (vb.oid === "1.3.6.1.2.1.1.3.0") sysUpTime = String(val);
            if (vb.oid === "1.3.6.1.2.1.1.5.0") sysName = String(val);
          }

          resolve({
            sysDescr: sysDescr || "SNMP Device Responder",
            sysUpTime: sysUpTime || "N/A",
            sysName: sysName || host,
            responseTimeMs: elapsed,
          });
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
      online: true,
      host,
      port,
      version,
      ...testResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        online: false,
        error: `Không thể kết nối SNMP tới thiết bị: ${error.message || String(error)}`,
      },
      { status: 500 }
    );
  }
}
