import { NextRequest, NextResponse } from "next/server";
import http from "http";
import https from "https";
import net from "net";
import { URL } from "url";

export const dynamic = "force-dynamic";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Bypass self-signed SSL certificate errors for local NAS
  keepAlive: true,
});

const httpAgent = new http.Agent({
  keepAlive: true,
});

// Cache resolved QuickConnect IDs for 10 minutes
const quickConnectCache = new Map<string, { host: string; port: number; isHttps: boolean; expires: number }>();

async function fetchServerInfo(cleanId: string, controlHost: string): Promise<any> {
  const payload = JSON.stringify({
    version: 1,
    command: "get_server_info",
    stop_mirror: true,
    serverID: cleanId,
    id: "dsm_portal_https",
  });
  const raw = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      `https://${controlHost}/Serv.php`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Synology/DSM",
        },
        timeout: 6000,
        agent: httpsAgent,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("QuickConnect lookup timeout"));
    });
    req.write(payload);
    req.end();
  });
  return JSON.parse(raw);
}

async function resolveQuickConnect(serverId: string): Promise<{ host: string; port: number; isHttps: boolean } | null> {
  const cleanId = serverId.replace(/\.quickconnect\.to$/i, "").trim().toLowerCase();

  const cached = quickConnectCache.get(cleanId);
  if (cached && cached.expires > Date.now()) {
    return cached;
  }

  try {
    let parsed = await fetchServerInfo(cleanId, "global.quickconnect.to");

    // Handle site redirect (errno 4) like the Flutter app does: retry with alternative control_host
    if (parsed.errno === 4 && Array.isArray(parsed.sites) && parsed.sites.length > 0) {
      try {
        parsed = await fetchServerInfo(cleanId, parsed.sites[0]);
      } catch (_) {
        // keep original parsed
      }
    }

    if (parsed.errno === 0 && parsed.server) {
      const lanIp = parsed.server.interface?.[0]?.ip;
      const ddns = parsed.server.ddns && parsed.server.ddns !== "NULL" ? parsed.server.ddns : null;
      const smartDns = parsed.smartdns?.host;
      const smartDnsLan = parsed.smartdns?.lan?.[0];
      const smartDnsExt = parsed.smartdns?.external;
      const wanIp = parsed.server.external?.ip;
      const port = parsed.service?.port || 5001;
      const relayIp: string | null = parsed.service?.relay_ip || null;
      const relayPort: number | null = parsed.service?.relay_port || null;
      const relayDn: string | null = parsed.service?.relay_dn || null;

      // Build candidates with per-host port/isHttps – relay uses its own port and is always HTTPS
      type Candidate = { host: string; port: number; isHttps: boolean };
      const candidates: Candidate[] = [];
      if (lanIp) candidates.push({ host: lanIp, port, isHttps: true });
      if (smartDnsLan) candidates.push({ host: smartDnsLan, port, isHttps: true });
      if (ddns) candidates.push({ host: ddns, port, isHttps: true });
      if (smartDns) candidates.push({ host: smartDns, port: 443, isHttps: true });
      if (smartDnsExt) candidates.push({ host: smartDnsExt, port: 443, isHttps: true });
      if (wanIp) candidates.push({ host: wanIp, port, isHttps: true });
      candidates.push({ host: `${cleanId}.direct.quickconnect.to`, port, isHttps: true });
      // Relay is the guaranteed fallback for NAT without port forwarding
      if (relayDn && relayPort) candidates.push({ host: relayDn, port: relayPort, isHttps: true });
      if (relayIp && relayPort) candidates.push({ host: relayIp, port: relayPort, isHttps: true });

      // Test all candidates concurrently – each with its own port
      const results = await Promise.all(
        candidates.map(async (c) => {
          const ok = await testHostConnection(c.host, c.port, 1500);
          return ok ? c : null;
        })
      );
      const firstReachable = results.find(Boolean) as Candidate | undefined;

      // Prefer first reachable; if none, fall back to relay (which we just proved is reachable via pingpong)
      let target: Candidate | null = firstReachable || null;
      if (!target) {
        // No direct host reachable – use relay DN/IP as fallback even without TCP probe (tunnel is up)
        if (relayDn && relayPort) target = { host: relayDn, port: relayPort, isHttps: true };
        else if (relayIp && relayPort) target = { host: relayIp, port: relayPort, isHttps: true };
        else target = candidates[0] || null;
      }

      if (!target) return null;

      const resolved = { host: target.host, port: target.port, isHttps: target.isHttps, expires: Date.now() + 10 * 60 * 1000 };
      quickConnectCache.set(cleanId, resolved);
      console.log(`[QuickConnect] ${cleanId} -> ${resolved.host}:${resolved.port} https=${resolved.isHttps}`);
      return resolved;
    } else {
      console.warn("[QuickConnect] lookup failed", parsed);
    }
  } catch (err) {
    console.error("[QuickConnect Resolver Error]", err);
  }

  return null;
}

function testHostConnection(host: string, port: number, timeout = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

async function handleProxy(request: NextRequest, resolvedParams: { path: string[] }) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Read host/port/protocol from Header OR Query Param OR Cookie (for media tags <video>, <img>, <audio>)
    let rawHost =
      request.headers.get("x-dsm-host") ||
      searchParams.get("_host") ||
      request.cookies.get("dsm_host")?.value ||
      "";
    let rawPort =
      request.headers.get("x-dsm-port") ||
      searchParams.get("_port") ||
      request.cookies.get("dsm_port")?.value ||
      "5000";
    let isHttps =
      request.headers.get("x-dsm-https") === "true" ||
      searchParams.get("_https") === "true" ||
      request.cookies.get("dsm_https")?.value === "true";

    let targetCookie =
      request.headers.get("x-dsm-cookie") ||
      request.cookies.get("dsm_cookie")?.value ||
      "";
    const targetSynoToken =
      request.headers.get("x-dsm-synotoken") ||
      searchParams.get("_synotoken") ||
      "";
    const querySid = searchParams.get("_sid");

    if (!targetCookie && querySid) {
      targetCookie = `id=${querySid}`;
    }

    if (!rawHost) {
      return NextResponse.json(
        { success: false, error: { code: 400, message: "Thiếu thông tin địa chỉ NAS (x-dsm-host hoặc _host)" } },
        { status: 400 }
      );
    }

    rawHost = rawHost.trim();
    if (rawHost.startsWith("http://") || rawHost.startsWith("https://")) {
      try {
        const parsed = new URL(rawHost);
        isHttps = parsed.protocol === "https:";
        rawHost = parsed.hostname;
        if (parsed.port) rawPort = parsed.port;
      } catch (_) {}
    } else if (rawHost.includes(":") && !rawHost.includes(".quickconnect.to")) {
      const [h, p] = rawHost.split(":");
      rawHost = h;
      if (p) rawPort = p;
    }

    let targetHost = rawHost;
    let targetPort = parseInt(rawPort, 10) || (isHttps ? 5001 : 5000);

    // Auto-resolve QuickConnect ID
    const isQuickConnect =
      rawHost.toLowerCase().endsWith(".quickconnect.to") ||
      (!rawHost.includes(".") && !rawHost.includes(":") && rawHost.toLowerCase() !== "localhost");

    if (isQuickConnect) {
      const resolved = await resolveQuickConnect(rawHost);
      if (resolved) {
        targetHost = resolved.host;
        targetPort = resolved.port;
        isHttps = resolved.isHttps;
      }
    }

    const pathSegments = resolvedParams.path || [];
    const targetPath = "/" + pathSegments.map((s) => encodeURIComponent(decodeURIComponent(s))).join("/");
    
    // Do NOT prepend /webapi if path is /fbdownload or /webman
    const apiPrefix = (targetPath.startsWith("/fbdownload") || targetPath.startsWith("/webman")) ? "" : "/webapi";
    
    // Rebuild search parameters excluding internal routing parameters without decoding existing %2F values
    const cleanSearchParams = new URLSearchParams();
    searchParams.forEach((val, key) => {
      if (!["_host", "_port", "_https", "_synotoken"].includes(key)) {
        cleanSearchParams.set(key, val);
      }
    });

    const queryString = cleanSearchParams.toString() ? `?${cleanSearchParams.toString()}` : "";
    const fullPath = `${apiPrefix}${targetPath}${queryString}`;

    const hostWithPort = (targetPort === 443 && isHttps) || (targetPort === 80 && !isHttps)
      ? targetHost
      : `${targetHost}:${targetPort}`;

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DSMHelper/1.0",
      "Accept": "*/*",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
      "Origin": `${isHttps ? "https" : "http"}://${hostWithPort}`,
      "Referer": `${isHttps ? "https" : "http"}://${hostWithPort}/`,
      "Host": hostWithPort,
    };

    // Forward Range header for HTML5 video and audio seeking
    if (request.headers.get("range")) {
      headers["Range"] = request.headers.get("range")!;
    }

    if (targetCookie) {
      headers["Cookie"] = targetCookie;
    }
    if (targetSynoToken) {
      headers["X-SYNO-TOKEN"] = targetSynoToken;
    }

    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    let requestBody: Buffer | null = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      const arrayBuf = await request.arrayBuffer();
      if (arrayBuf.byteLength > 0) {
        requestBody = Buffer.from(arrayBuf);
        headers["Content-Length"] = String(requestBody.byteLength);
      }
    }

    let result;
    try {
      result = await makeNodeRequest({
        isHttps,
        host: targetHost,
        port: targetPort,
        path: fullPath,
        method: request.method,
        headers,
        body: requestBody,
      });
    } catch (initialErr: any) {
      // Auto-fallback: If port 5001 times out or is refused on a DDNS/domain, retry on standard HTTPS port 443
      if (
        (initialErr.code === "ETIMEDOUT" || initialErr.code === "ECONNREFUSED") &&
        isHttps &&
        targetPort === 5001 &&
        targetHost.includes(".")
      ) {
        headers["Origin"] = `https://${targetHost}`;
        headers["Referer"] = `https://${targetHost}/`;
        headers["Host"] = targetHost;
        result = await makeNodeRequest({
          isHttps: true,
          host: targetHost,
          port: 443,
          path: fullPath,
          method: request.method,
          headers,
          body: requestBody,
        });
      } else {
        throw initialErr;
      }
    }

    const responseHeaders = new Headers();
    if (result.headers["set-cookie"]) {
      const setCookies = Array.isArray(result.headers["set-cookie"])
        ? result.headers["set-cookie"].join("; ")
        : result.headers["set-cookie"];
      responseHeaders.set("set-cookie", setCookies);
    }

    // Forward crucial media streaming and download headers
    if (result.headers["accept-ranges"]) responseHeaders.set("accept-ranges", String(result.headers["accept-ranges"]));
    if (result.headers["content-range"]) responseHeaders.set("content-range", String(result.headers["content-range"]));
    if (result.headers["content-length"]) responseHeaders.set("content-length", String(result.headers["content-length"]));
    if (result.headers["content-disposition"]) responseHeaders.set("content-disposition", String(result.headers["content-disposition"]));

    responseHeaders.set("content-type", result.headers["content-type"] || "application/json");

    return new NextResponse(new Uint8Array(result.body), {
      status: result.statusCode,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("[DSM Proxy Error]", error);

    let userFriendlyMsg = error.message || "Không thể kết nối đến máy chủ Synology";
    if (error.code === "ENOTFOUND" || error.message?.includes("ENOTFOUND")) {
      userFriendlyMsg = `Không tìm thấy địa chỉ máy chủ "${request.headers.get("x-dsm-host")}". Hãy kiểm tra lại QuickConnect ID hoặc IP nội bộ của NAS.`;
    } else if (error.code === "ECONNREFUSED" || error.message?.includes("ECONNREFUSED")) {
      userFriendlyMsg = `Kết nối bị từ chối tại cổng ${request.headers.get("x-dsm-port") || 5001}. Hãy kiểm tra lại cổng HTTPS (5001) hoặc HTTP (5000).`;
    } else if (error.code === "ETIMEDOUT" || error.message?.includes("ETIMEDOUT")) {
      userFriendlyMsg = `Hết thời gian chờ kết nối (Timeout). Vui lòng kiểm tra lại địa chỉ IP NAS và kết nối mạng.`;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || 502,
          message: userFriendlyMsg,
        },
      },
      { status: 502 }
    );
  }
}

interface RequestOptions {
  isHttps: boolean;
  host: string;
  port: number;
  path: string;
  method: string;
  headers: Record<string, string>;
  body: Buffer | null;
}

function makeNodeRequest(options: RequestOptions): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const client = options.isHttps ? https : http;
    
    // Safely encode any non-ASCII characters without destroying existing %2F or %XX encodings
    const safePath = options.path.replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c));

    const reqOptions: https.RequestOptions = {
      hostname: options.host,
      port: options.port,
      path: safePath,
      method: options.method,
      headers: options.headers,
      agent: options.isHttps ? httpsAgent : httpAgent,
      timeout: 30000,
    };

    const req = client.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode || 200,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      const timeoutErr: any = new Error("Connection timed out (30s)");
      timeoutErr.code = "ETIMEDOUT";
      reject(timeoutErr);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}
