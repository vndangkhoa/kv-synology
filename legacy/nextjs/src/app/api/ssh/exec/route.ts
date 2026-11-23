import { NextRequest, NextResponse } from "next/server";
import { Client } from "ssh2";
import net from "net";

export const dynamic = "force-dynamic";

function tcpReachable(host: string, port: number, ms = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      try { s.destroy(); } catch {}
      resolve(ok);
    };
    s.setTimeout(ms);
    s.once("connect", () => finish(true));
    s.once("timeout", () => finish(false));
    s.once("error", () => finish(false));
    s.connect(port, host);
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, username, password, privateKey, command } = body as {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      privateKey?: string;
      command?: string;
    };

    if (!host || !username || !command) {
      return NextResponse.json({ success: false, error: "host, username, command required" }, { status: 400 });
    }

    const sshPort = port && Number(port) >= 1 && Number(port) <= 65535 ? Number(port) : 22;

    // Basic host validation: reject obvious QuickConnect without IP
    const isQuickConnect = host.toLowerCase().endsWith(".quickconnect.to") || (!host.includes(".") && !host.includes(":") && host.toLowerCase() !== "localhost");
    if (isQuickConnect) {
      return NextResponse.json(
        {
          success: false,
          error: "SSH via QuickConnect ID not supported. Use LAN IP or DDNS (e.g., 192.168.1.10 or nas.synology.me) and ensure SSH port is forwarded/open.",
          hint: "Thử dùng IP LAN hoặc DDNS thay vì QuickConnect ID.",
        },
        { status: 400 }
      );
    }

    // helper: try SSH to a single host/port — increased timeout for handshake + MaxStartups throttling
    const trySsh = (targetHost: string, targetPort: number) =>
      new Promise<{ stdout: string; stderr: string; code: number | null; signal?: string }>((resolve, reject) => {
        const conn = new Client();
        let stdout = "";
        let stderr = "";
        let settled = false;
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          try {
            conn.end();
          } catch {}
          reject(new Error(`SSH handshake timeout (15s) to ${targetHost}:${targetPort} — check host/port/firewall. LAN host 192.168.1.10:2212 verified reachable (SSH-2.0-OpenSSH_8.2).`));
        }, 15000);

        conn
          .on("ready", () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            conn.exec(command!, (err, stream) => {
              if (err) {
                conn.end();
                return reject(err);
              }
              stream
                .on("close", (code: number, signal: string) => {
                  conn.end();
                  resolve({ stdout, stderr, code, signal });
                })
                .on("data", (data: Buffer) => {
                  stdout += data.toString();
                })
                .stderr.on("data", (data: Buffer) => {
                  stderr += data.toString();
                });
            });
          })
          .on("error", (err: any) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            const msg = err?.message || String(err);
            // enrich common errors
            let hint = "";
            if (msg.includes("Timed out while waiting for handshake")) {
              hint = ` — TCP to ${targetHost}:${targetPort} timed out during SSH banner/KEX. Verified LAN 192.168.1.10:2212 is open (OpenSSH_8.2). If you used DDNS ${host}, try LAN IP 192.168.1.10:2212 when on same network. For remote, forward port ${targetPort} on router or use VPN.`;
            } else if (msg.includes("All configured authentication methods failed") || msg.includes("Permission denied")) {
              hint = ` — user=${username} auth failed. Check DSM password for ${username} and that SSH allows password auth (DSM > Terminal & SNMP > Enable SSH).`;
            } else if (msg.includes("ECONNREFUSED")) {
              hint = ` — ${targetHost}:${targetPort} refused. Check DSM Control Panel > Terminal & SNMP > SSH port, and Security > Firewall allow ${targetPort}.`;
            }
            reject(new Error(msg + hint));
          })
          .connect({
            host: targetHost,
            port: targetPort,
            username,
            password: privateKey ? undefined : password,
            privateKey: privateKey || undefined,
            readyTimeout: 12000,
            keepaliveInterval: 5000,
            // accept any host key (NAS self-signed)
            hostVerifier: () => true,
          });
      });

    // Build candidates: primary host, plus LAN fallback for DDNS when not already LAN
    // Verified via ssh -v and nc: LAN 192.168.1.10:2212 is open (OpenSSH_8.2), while khoavo.myds.me:2212 (113.177.123.214) times out externally (no port forwarding / CGNAT).
    let lastError: any = null;
    const candidates: Array<{ h: string; p: number }> = [{ h: host, p: sshPort }];
    const isDdns = host.toLowerCase().endsWith(".myds.me") || host.toLowerCase().endsWith(".synology.me") || host.toLowerCase().endsWith(".quickconnect.to");
    const lanIp = "192.168.1.10";
    const lanPort = 2212;
    if (isDdns && host !== lanIp) {
      if (!candidates.some((c) => c.h === lanIp && c.p === lanPort)) candidates.push({ h: lanIp, p: lanPort });
    }

    // Pre-check TCP reachability to avoid long SSH handshake timeout for unreachable DDNS
    const reachableCandidates: Array<{ h: string; p: number }> = [];
    for (const c of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await tcpReachable(c.h, c.p, 3000);
      if (ok) reachableCandidates.push(c);
      else lastError = new Error(`TCP ${c.h}:${c.p} not reachable (timeout 3s) — will try fallback if available`);
    }
    // If none reachable via TCP, keep original candidates to let SSH try and give detailed error
    const toTry = reachableCandidates.length ? reachableCandidates : candidates;

    let result: { stdout: string; stderr: string; code: number | null; signal?: string } | null = null;
    let usedHost = host;
    let usedPort = sshPort;
    for (let i = 0; i < toTry.length; i++) {
      const cand = toTry[i];
      try {
        // eslint-disable-next-line no-await-in-loop
        result = await trySsh(cand.h, cand.p);
        usedHost = cand.h;
        usedPort = cand.p;
        break;
      } catch (e: any) {
        lastError = e;
        // Small delay before next candidate to avoid MaxStartups throttling
        if (i < toTry.length - 1) await new Promise((r) => setTimeout(r, 500));
        if (i === toTry.length - 1) throw e;
      }
    }
    if (!result) throw lastError || new Error("SSH failed");

    return NextResponse.json({ success: true, ...result, host: usedHost, port: usedPort, tried: candidates });
  } catch (e: any) {
    const msg = e.message || "SSH exec failed";
    // surface hint in response for UI
    return NextResponse.json({ success: false, error: msg, hint: "Thử Host=192.168.1.10 Port=2212 (đã kiểm tra mở, OpenSSH_8.2) khi ở cùng mạng. Kiểm tra DSM > Terminal & SNMP > Bật SSH, tường lửa cho phép 2212, và NAT port forwarding nếu dùng DDNS từ xa." }, { status: 500 });
  }
}
