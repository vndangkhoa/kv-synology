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
const quickConnectCandidatesMap = new Map<string, Array<{ host: string; port: number; isHttps: boolean }>>();

async function fetchServerInfo(cleanId: string, controlHost: string, portalId = "dsm_portal_https"): Promise<any> {
  // First attempt: request_tunnel (activates QuickConnect relay tunnel and returns relay_dn / relay_port)
  try {
    const payloadTunnel = JSON.stringify({
      version: 1,
      command: "request_tunnel",
      stop_mirror: true,
      serverID: cleanId,
      id: portalId,
    });
    const rawTunnel = await new Promise<string>((resolve, reject) => {
      const req = https.request(
        `https://${controlHost}/Serv.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Synology/DSM",
          },
          timeout: 5000,
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
        reject(new Error("QuickConnect tunnel request timeout"));
      });
      req.write(payloadTunnel);
      req.end();
    });
    const parsedTunnel = JSON.parse(rawTunnel);
    if (parsedTunnel && parsedTunnel.errno === 0 && parsedTunnel.server) {
      return parsedTunnel;
    }
  } catch (_) {}

  // Fallback: get_server_info
  const payload = JSON.stringify({
    version: 1,
    command: "get_server_info",
    stop_mirror: true,
    serverID: cleanId,
    id: portalId,
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
        timeout: 5000,
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

async function verifyDsmCandidate(c: { host: string; port: number; isHttps: boolean }, timeout = 1800): Promise<boolean> {
  try {
    const res = await makeNodeRequest({
      isHttps: c.isHttps,
      host: c.host,
      port: c.port,
      path: "/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=SYNO.API.Auth",
      method: "GET",
      headers: {
        "User-Agent": "DSMHelper/1.0",
        Accept: "*/*",
      },
      body: null,
      timeoutMs: timeout,
    });
    const ctype = String(res.headers["content-type"] || "");
    const bodyStr = res.body.toString("utf-8", 0, Math.min(res.body.length, 1000));
    const isHtml = bodyStr.includes("<html") || bodyStr.includes("<!DOCTYPE") || ctype.includes("text/html");
    if (!isHtml && (bodyStr.includes('"success"') || bodyStr.includes("SYNO.API.Auth") || ctype.includes("json"))) {
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
}

async function resolveQuickConnect(
  serverId: string,
  userPort?: number,
  userHttps?: boolean
): Promise<{ host: string; port: number; isHttps: boolean } | null> {
  const cleanId = serverId.replace(/\.quickconnect\.to$/i, "").trim().toLowerCase();
  const cacheKey = `${cleanId}_${userPort || "auto"}_${userHttps ?? "auto"}`;

  const cached = quickConnectCache.get(cacheKey) || quickConnectCache.get(cleanId);
  if (cached && cached.expires > Date.now()) {
    return cached;
  }

  const controlHosts = ["global.quickconnect.to", "usc.quickconnect.to", "tw.quickconnect.to", "us.quickconnect.to", "eu.quickconnect.to"];

  for (const controlHost of controlHosts) {
    try {
      let parsed = await fetchServerInfo(cleanId, controlHost, "dsm_portal_https");

      // If dsm_portal_https failed (e.g. user uses HTTP or custom portal), fallback to dsm_portal
      if (!parsed || parsed.errno !== 0 || !parsed.server) {
        try {
          parsed = await fetchServerInfo(cleanId, controlHost, "dsm_portal");
        } catch (_) {}
      }

      // Handle site redirect (errno 4)
      if (parsed?.errno === 4 && Array.isArray(parsed.sites) && parsed.sites.length > 0) {
        try {
          parsed = await fetchServerInfo(cleanId, parsed.sites[0], "dsm_portal_https");
          if (!parsed || parsed.errno !== 0) {
            parsed = await fetchServerInfo(cleanId, parsed.sites[0], "dsm_portal");
          }
        } catch (_) {}
      }

      if (parsed && parsed.errno === 0 && parsed.server) {
        const lanIp = parsed.server.interface?.[0]?.ip;
        const allLanIps: string[] = (parsed.server.interface || []).map((i: any) => i.ip).filter(Boolean);
        const ddns = parsed.server.ddns && parsed.server.ddns !== "NULL" ? parsed.server.ddns : null;
        const smartDns = parsed.smartdns?.host;
        const smartDnsLan = parsed.smartdns?.lan?.[0];
        const smartDnsExt = parsed.smartdns?.external;
        const wanIp = parsed.server.external?.ip;

        const dsmHttpsPort = parsed.server?.https_port || parsed.service?.port || 5001;
        const dsmHttpPort = parsed.server?.port || 5000;
        const dsmExtPort = parsed.server?.external?.port || parsed.service?.ext_port;

        const relayIp: string | null = parsed.service?.relay_ip || null;
        const relayPort: number | null = parsed.service?.relay_port || 443;
        const relayDn: string | null = parsed.service?.relay_dn || null;

        type Candidate = { host: string; port: number; isHttps: boolean };
        const candidates: Candidate[] = [];
        const seen = new Set<string>();

        const addCand = (h: string | undefined | null, p: number | undefined | null, isHttps: boolean) => {
          if (!h || !p || p <= 0 || p > 65535) return;
          const key = `${h}:${p}:${isHttps}`;
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({ host: h, port: p, isHttps });
          }
        };

        // Standard DSM Ports to try
        const standardPorts = Array.from(new Set([userPort, dsmHttpsPort, 5001, dsmHttpPort, 5000, dsmExtPort].filter(Boolean))) as number[];
        
        // 1. Local container / Docker bridge host gateway (for apps running in container on the NAS)
        for (const p of standardPorts) {
          const isH = p === 5001 || p === dsmHttpsPort || (userHttps ?? true);
          addCand("172.17.0.1", p, isH);
          addCand("192.168.1.10", p, isH);
          addCand("127.0.0.1", p, isH);
        }

        // 2. Relay tunnels from request_tunnel (guaranteed global reachability through NAT)
        if (relayDn && relayPort) addCand(relayDn, relayPort, true);
        if (relayIp && relayPort) addCand(relayIp, relayPort, true);

        // 3. DDNS and SmartDNS candidates
        for (const p of standardPorts) {
          const isH = p === 5001 || p === dsmHttpsPort || (userHttps ?? true);
          if (ddns) addCand(ddns, p, isH);
          if (smartDns) addCand(smartDns, p, isH);
          if (smartDnsExt) addCand(smartDnsExt, p, isH);
          addCand(`${cleanId}.direct.quickconnect.to`, p, isH);
          for (const ip of allLanIps) addCand(ip, p, isH);
          if (lanIp) addCand(lanIp, p, isH);
          if (smartDnsLan) addCand(smartDnsLan, p, isH);
          if (wanIp) addCand(wanIp, p, isH);
        }

        // Web ports (443, 80)
        for (const p of [443, 80]) {
          const isH = p === 443;
          if (ddns) addCand(ddns, p, isH);
          if (smartDnsExt) addCand(smartDnsExt, p, isH);
          if (wanIp) addCand(wanIp, p, isH);
        }

        // Store all candidate routes for fallback during actual proxy requests
        quickConnectCandidatesMap.set(cacheKey, candidates);
        quickConnectCandidatesMap.set(cleanId, candidates);

        // Concurrently probe all candidates for genuine DSM API response
        const probeResults = await Promise.all(
          candidates.map(async (cand) => {
            const ok = await verifyDsmCandidate(cand, 1800);
            return ok ? cand : null;
          })
        );
        const valid = probeResults.filter(Boolean) as Candidate[];
        let verifiedTarget: Candidate | null = valid[0] || null;

        if (!verifiedTarget) {
          // If direct DSM API probe didn't reply in time, test TCP reachability
          const tcpProbes = await Promise.all(
            candidates.slice(0, 10).map(async (cand) => {
              const ok = await testHostConnection(cand.host, cand.port, 1000);
              return ok ? cand : null;
            })
          );
          const tcpOk = tcpProbes.filter(Boolean) as Candidate[];
          verifiedTarget = tcpOk[0] || null;
        }

        if (!verifiedTarget) {
          // Fallback: prefer relay or DDNS or localhost gateway over unverified private IP
          verifiedTarget =
            (relayDn && relayPort ? { host: relayDn, port: relayPort, isHttps: true } : null) ||
            (relayIp && relayPort ? { host: relayIp, port: relayPort, isHttps: true } : null) ||
            { host: "172.17.0.1", port: dsmHttpsPort, isHttps: true };
        }

        if (verifiedTarget) {
          const resolved = {
            host: verifiedTarget.host,
            port: verifiedTarget.port,
            isHttps: verifiedTarget.isHttps,
            expires: Date.now() + 10 * 60 * 1000,
          };
          quickConnectCache.set(cacheKey, resolved);
          quickConnectCache.set(cleanId, resolved);
          console.log(`[QuickConnect] ${cleanId} -> ${resolved.host}:${resolved.port} https=${resolved.isHttps}`);
          return resolved;
        }
      }
    } catch (err) {
      console.warn(`[QuickConnect] query error on ${controlHost}:`, err);
    }
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

function buildUniversalCandidates(host: string, port: number, isHttps: boolean): Array<{ host: string; port: number; isHttps: boolean }> {
  const list: Array<{ host: string; port: number; isHttps: boolean }> = [];
  const seen = new Set<string>();
  const push = (h: string, p: number, https: boolean) => {
    const key = `${h}:${p}:${https}`;
    if (!seen.has(key)) {
      seen.add(key);
      list.push({ host: h, port: p, isHttps: https });
    }
  };
  // Original as provided
  push(host, port, isHttps);
  // Standard DSM ports
  push(host, 5001, true);
  push(host, 5000, false);
  push(host, 443, true);
  push(host, 80, false);
  push(host, port, !isHttps);
  return list;
}

async function findWorkingCandidate(
  candidates: Array<{ host: string; port: number; isHttps: boolean }>,
  pathSegments: string[]
): Promise<{ host: string; port: number; isHttps: boolean } | null> {
  // Try to hit SYNO.API.Info and ensure it is real DSM JSON
  for (const cand of candidates) {
    try {
      const probePath = "/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=SYNO.API.Auth";
      const res = await makeNodeRequest({
        isHttps: cand.isHttps,
        host: cand.host,
        port: cand.port,
        path: probePath,
        method: "GET",
        headers: {
          "User-Agent": "DSMHelper/1.0",
          Accept: "*/*",
        },
        body: null,
        timeoutMs: 2000,
      });
      const ctype = String(res.headers["content-type"] || "");
      const bodyStr = res.body.toString("utf-8", 0, Math.min(res.body.length, 1000));
      const isHtml = bodyStr.includes("<html") || bodyStr.includes("<!DOCTYPE") || ctype.includes("text/html");
      if (!isHtml && (bodyStr.includes('"success"') || bodyStr.includes("SYNO.API.Auth") || ctype.includes("json"))) {
        return cand;
      }
    } catch (_) {}
  }
  return candidates[0] || null;
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
    } else if (rawHost.includes(":")) {
      const lastColon = rawHost.lastIndexOf(":");
      const possiblePort = rawHost.slice(lastColon + 1);
      if (/^\d+$/.test(possiblePort)) {
        rawPort = possiblePort;
        rawHost = rawHost.slice(0, lastColon);
      }
    }

    let targetHost = rawHost;
    let targetPort = parseInt(rawPort, 10) || (isHttps ? 5001 : 5000);
    let targetHttps = isHttps;

    // Auto-resolve QuickConnect ID
    const isQuickConnect =
      rawHost.toLowerCase().endsWith(".quickconnect.to") ||
      (!rawHost.includes(".") && !rawHost.includes(":") && rawHost.toLowerCase() !== "localhost");

    // DDNS / reverse-proxy detection (myds.me, synology.me, custom domain)
    const isDDNS = !isQuickConnect && (rawHost.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(rawHost) && rawHost !== "localhost");
    // Heuristic: if host looks like DDNS/synology.me/myds.me or user provided custom port like 41533, treat as potential reverse proxy

    const isDirectIp = /^\d+\.\d+\.\d+\.\d+$/.test(rawHost) || rawHost === "localhost" || rawHost === "127.0.0.1";

    if (isQuickConnect) {
      const resolved = await resolveQuickConnect(rawHost, targetPort, targetHttps);
      if (resolved) {
        targetHost = resolved.host;
        targetPort = resolved.port;
        targetHttps = resolved.isHttps;
      }
    } else if (!isDirectIp && (isDDNS || targetPort === 41533)) {
      // Universal DDNS/reverse-proxy resolver: try multiple port/protocol combos
      // For custom reverse proxy 41533, DSM may actually be on 5001/5000/443
      const candidates = buildUniversalCandidates(rawHost, targetPort, targetHttps);
      const working = await findWorkingCandidate(candidates, resolvedParams.path || []);
      if (working) {
        targetHost = working.host;
        targetPort = working.port;
        targetHttps = working.isHttps;
        console.log(`[Universal] ${rawHost}:${rawPort} https=${isHttps} -> ${targetHost}:${targetPort} https=${targetHttps} via probe`);
      }
    }
    isHttps = targetHttps;

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
    let lastErr: any = null;
    const tried = new Set<string>();
    // Try primary target first, then fallback candidates on failure
    const allCandidates: Array<{ host: string; port: number; isHttps: boolean }> = [{ host: targetHost, port: targetPort, isHttps }];
    
    // If QuickConnect was resolved, add all discovered candidates as fallback routes
    if (isQuickConnect) {
      const cleanId = rawHost.replace(/\.quickconnect\.to$/i, "").trim().toLowerCase();
      const qcList = quickConnectCandidatesMap.get(cleanId) || [];
      for (const c of qcList) {
        if (!allCandidates.some(existing => existing.host === c.host && existing.port === c.port && existing.isHttps === c.isHttps)) {
          allCandidates.push(c);
        }
      }
    } else if (!isDirectIp && (isDDNS || targetPort === 41533 || rawPort === "41533")) {
      const uni = buildUniversalCandidates(rawHost, parseInt(rawPort, 10) || (isHttps ? 5001 : 5000), isHttps);
      for (const u of uni) {
        if (!allCandidates.some(c => c.host === u.host && c.port === u.port && c.isHttps === u.isHttps)) {
          allCandidates.push(u);
        }
      }
    }
    let lastStatus404 = false;
    for (const cand of allCandidates) {
      const key = `${cand.host}:${cand.port}:${cand.isHttps}`;
      if (tried.has(key)) continue;
      tried.add(key);
      const candHostWithPort = (cand.port === 443 && cand.isHttps) || (cand.port === 80 && !cand.isHttps) ? cand.host : `${cand.host}:${cand.port}`;
      const candHeaders = {
        ...headers,
        Origin: `${cand.isHttps ? "https" : "http"}://${candHostWithPort}`,
        Referer: `${cand.isHttps ? "https" : "http"}://${candHostWithPort}/`,
        Host: candHostWithPort,
      };
      try {
        const candResult = await makeNodeRequest({
          isHttps: cand.isHttps,
          host: cand.host,
          port: cand.port,
          path: fullPath,
          method: request.method,
          headers: candHeaders,
          body: requestBody,
          timeoutMs: 3500,
        });
        // If DSM returns 404 for /webapi, this candidate is wrong (e.g., 41533 reverse proxy without DSM) -> try next
        if (candResult.statusCode === 404) {
          const bodyPreview = candResult.body.toString("utf-8", 0, Math.min(candResult.body.length, 500));
          // Only treat as retryable if body looks like nginx 404 html, not DSM JSON error
          if (!bodyPreview.includes('"success"') && (bodyPreview.includes("<html") || bodyPreview.includes("404"))) {
            console.warn(`[DSM Proxy] ${cand.host}:${cand.port} https=${cand.isHttps} returned 404 for ${fullPath}, trying next candidate`);
            lastStatus404 = true;
            lastErr = new Error(`DSM 404 on ${cand.host}:${cand.port}${fullPath}`);
            (lastErr as any).code = "HTTP_404";
            continue;
          }
        }
        result = candResult;
        // Update target to successful candidate for logging/headers and refresh cache
        targetHost = cand.host;
        targetPort = cand.port;
        isHttps = cand.isHttps;
        if (isQuickConnect) {
          const cleanId = rawHost.replace(/\.quickconnect\.to$/i, "").trim().toLowerCase();
          quickConnectCache.set(cleanId, {
            host: targetHost,
            port: targetPort,
            isHttps,
            expires: Date.now() + 10 * 60 * 1000,
          });
        }
        break;
      } catch (e: any) {
        lastErr = e;
        // Retry on network errors and unreachable subnets
        const isRetryable =
          e.code === "ETIMEDOUT" ||
          e.code === "ECONNREFUSED" ||
          e.code === "ENOTFOUND" ||
          e.code === "EHOSTUNREACH" ||
          e.code === "ENETUNREACH" ||
          e.code === "ECONNRESET" ||
          e.code === "EADDRNOTAVAIL" ||
          e.code === "EPIPE" ||
          e.code === "EAI_AGAIN" ||
          e.code === "ECONNABORTED" ||
          e.code === "HTTP_404" ||
          e.message?.includes("EHOSTUNREACH") ||
          e.message?.includes("ENETUNREACH") ||
          e.message?.includes("ECONNREFUSED") ||
          e.message?.includes("ETIMEDOUT");

        if (isRetryable) {
          console.warn(`[DSM Proxy] Candidate ${cand.host}:${cand.port} failed (${e.code || e.message}), trying next candidate...`);
          continue;
        }
        throw e;
      }
    }
    if (!result) {
      if (lastStatus404) {
        throw new Error(`DSM API not found (404) on ${rawHost}:${rawPort}. Tried ${allCandidates.map(c=>`${c.host}:${c.port}${c.isHttps?" https":" http"}`).join(", ")}. Check if DSM is on 5000/5001 or reverse proxy forwards /webapi.`);
      }
      throw lastErr || new Error("All DSM candidates failed");
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
  timeoutMs?: number;
}

function makeNodeRequest(options: RequestOptions): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const client = options.isHttps ? https : http;
    
    // Safely encode any non-ASCII characters without destroying existing %2F or %XX encodings
    const safePath = options.path.replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c));

    const timeout = options.timeoutMs || 30000;
    const reqOptions: https.RequestOptions = {
      hostname: options.host,
      port: options.port,
      path: safePath,
      method: options.method,
      headers: options.headers,
      agent: options.isHttps ? httpsAgent : httpAgent,
      timeout,
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
