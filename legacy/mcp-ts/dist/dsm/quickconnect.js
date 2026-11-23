/**
 * QuickConnect resolver - ported from kv-synology src/app/api/dsm/[...path]/route.ts
 * Resolves Synology QuickConnect ID to reachable host/port
 */
import https from "node:https";
import net from "node:net";
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
});
const quickConnectCache = new Map();
async function fetchServerInfo(cleanId, controlHost) {
    const payload = JSON.stringify({
        version: 1,
        command: "get_server_info",
        stop_mirror: true,
        serverID: cleanId,
        id: "dsm_portal_https",
    });
    const raw = await new Promise((resolve, reject) => {
        const req = https.request(`https://${controlHost}/Serv.php`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Synology/DSM",
            },
            timeout: 6000,
            agent: httpsAgent,
        }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve(data));
        });
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
export async function resolveQuickConnect(serverId) {
    const cleanId = serverId.replace(/\.quickconnect\.to$/i, "").trim().toLowerCase();
    const cached = quickConnectCache.get(cleanId);
    if (cached && cached.expires > Date.now()) {
        return cached;
    }
    try {
        let parsed = await fetchServerInfo(cleanId, "global.quickconnect.to");
        if (parsed.errno === 4 && Array.isArray(parsed.sites) && parsed.sites.length > 0) {
            try {
                parsed = await fetchServerInfo(cleanId, parsed.sites[0]);
            }
            catch (_) { }
        }
        if (parsed.errno === 0 && parsed.server) {
            const lanIp = parsed.server.interface?.[0]?.ip;
            const ddns = parsed.server.ddns && parsed.server.ddns !== "NULL" ? parsed.server.ddns : null;
            const smartDns = parsed.smartdns?.host;
            const smartDnsLan = parsed.smartdns?.lan?.[0];
            const smartDnsExt = parsed.smartdns?.external;
            const wanIp = parsed.server.external?.ip;
            const port = parsed.service?.port || 5001;
            const relayIp = parsed.service?.relay_ip || null;
            const relayPort = parsed.service?.relay_port || null;
            const relayDn = parsed.service?.relay_dn || null;
            const candidates = [];
            if (ddns)
                candidates.push({ host: ddns, port, isHttps: true });
            if (smartDns)
                candidates.push({ host: smartDns, port: 443, isHttps: true });
            if (smartDnsExt)
                candidates.push({ host: smartDnsExt, port: 443, isHttps: true });
            candidates.push({ host: `${cleanId}.direct.quickconnect.to`, port, isHttps: true });
            if (lanIp)
                candidates.push({ host: lanIp, port, isHttps: true });
            if (smartDnsLan)
                candidates.push({ host: smartDnsLan, port, isHttps: true });
            if (wanIp)
                candidates.push({ host: wanIp, port, isHttps: true });
            if (relayDn && relayPort)
                candidates.push({ host: relayDn, port: relayPort, isHttps: true });
            if (relayIp && relayPort)
                candidates.push({ host: relayIp, port: relayPort, isHttps: true });
            const results = await Promise.all(candidates.map(async (c) => {
                const ok = await testHostConnection(c.host, c.port, 1500);
                return ok ? c : null;
            }));
            const firstReachable = results.find(Boolean);
            let target = firstReachable || null;
            if (!target) {
                if (relayDn && relayPort)
                    target = { host: relayDn, port: relayPort, isHttps: true };
                else if (relayIp && relayPort)
                    target = { host: relayIp, port: relayPort, isHttps: true };
                else if (ddns)
                    target = { host: ddns, port, isHttps: true };
                else
                    target = candidates[0] || null;
            }
            if (!target)
                return null;
            const resolved = { host: target.host, port: target.port, isHttps: target.isHttps, expires: Date.now() + 10 * 60 * 1000 };
            quickConnectCache.set(cleanId, resolved);
            console.error(`[QuickConnect] ${cleanId} -> ${resolved.host}:${resolved.port} https=${resolved.isHttps}`);
            return resolved;
        }
        else {
            console.error("[QuickConnect] lookup failed", parsed);
        }
    }
    catch (err) {
        console.error("[QuickConnect Resolver Error]", err);
    }
    return null;
}
export function testHostConnection(host, port, timeout = 1200) {
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
export function isQuickConnectId(host) {
    const h = host.trim().toLowerCase();
    if (h.endsWith(".quickconnect.to"))
        return true;
    if (!h.includes(".") && !h.includes(":") && h !== "localhost" && !h.match(/^\d+\.\d+\.\d+\.\d+$/))
        return true;
    return false;
}
export function parseHostInput(rawHost, rawPort, isHttps) {
    let host = rawHost.trim();
    let port = parseInt(rawPort, 10) || (isHttps ? 5001 : 5000);
    if (host.startsWith("http://") || host.startsWith("https://")) {
        try {
            const parsed = new URL(host);
            isHttps = parsed.protocol === "https:";
            host = parsed.hostname;
            if (parsed.port)
                port = parseInt(parsed.port, 10);
        }
        catch { }
    }
    else if (host.includes(":") && !host.includes(".quickconnect.to")) {
        const [h, p] = host.split(":");
        host = h;
        if (p)
            port = parseInt(p, 10) || port;
    }
    return { host, port, isHttps };
}
//# sourceMappingURL=quickconnect.js.map