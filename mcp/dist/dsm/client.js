/**
 * DSM Node client for MCP - ported from kv-synology src/lib/dsm/client.ts + dsm_helper lib/util/api.dart
 * Direct HTTPS communication to DSM, bypassing Next.js proxy
 */
import http from "node:http";
import https from "node:https";
import { resolveQuickConnect, isQuickConnectId, parseHostInput } from "./quickconnect.js";
import { Client as SSHClient } from "ssh2";
const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
const httpAgent = new http.Agent({ keepAlive: true });
// Mock data fallbacks (copied from kv-synology mockData for demo mode)
import { mockSystemInfo, getMockUtilization, mockProcesses, mockFiles, mockDockerContainers, mockDownloadTasks, mockStorageVolumes, mockPackages, mockServices, mockNotifications, mockAppNotifications } from "./mockData.js";
export class DSMClient {
    config = null;
    rawHost = "";
    rawPort = "";
    rawHttps = true;
    session = {
        sid: "",
        isConnected: false,
        isDemo: false,
        dsmVersion: 7,
        versionString: "",
        model: "",
        hostname: "",
        account: "",
    };
    // Resolved after QuickConnect
    resolvedHost = null;
    resolvedPort = null;
    resolvedHttps = null;
    getSession() {
        return this.session;
    }
    getConfig() {
        return this.config;
    }
    isDemo() {
        return this.session.isDemo;
    }
    ensureConnected() {
        if (!this.session.isConnected)
            throw new Error("Not connected to DSM. Call dsm_login first.");
    }
    // --- Connection resolving ---
    async ensureResolvedTarget() {
        if (!this.config && !this.rawHost)
            throw new Error("No DSM host configured");
        // If already resolved via QuickConnect, reuse
        if (this.resolvedHost) {
            return { host: this.resolvedHost, port: this.resolvedPort, isHttps: this.resolvedHttps };
        }
        let host = this.rawHost || this.config.host;
        let portStr = this.rawPort || String(this.config.port || 5000);
        let isHttps = this.rawHttps ?? this.config.https ?? true;
        const parsed = parseHostInput(host, portStr, isHttps);
        host = parsed.host;
        let port = parsed.port;
        isHttps = parsed.isHttps;
        if (isQuickConnectId(host)) {
            const qc = await resolveQuickConnect(host);
            if (qc) {
                this.resolvedHost = qc.host;
                this.resolvedPort = qc.port;
                this.resolvedHttps = qc.isHttps;
                return qc;
            }
        }
        return { host, port, isHttps };
    }
    // Allow setting config directly (used by MCP login tool)
    setConnection(rawHost, rawPort, httpsFlag) {
        this.rawHost = String(rawHost);
        this.rawPort = String(rawPort);
        this.rawHttps = httpsFlag;
        this.resolvedHost = null;
        this.resolvedPort = null;
        this.resolvedHttps = null;
    }
    // --- Low level request ---
    async dsmRequest(path, method, params = {}, body, extraHeaders = {}) {
        const target = await this.ensureResolvedTarget();
        const isHttps = target.isHttps;
        const host = target.host;
        const port = target.port;
        // Build query string for GET OR POST params? DSM uses POST with form body
        // For auth.cgi GET with query, we append params to path
        let fullPath;
        let requestBody = null;
        const headers = {
            "User-Agent": "DSMHelper/MCP 1.0 (Synology DSM)",
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.8,vi;q=0.6",
            Origin: `${isHttps ? "https" : "http"}://${host}:${port}`,
            Referer: `${isHttps ? "https" : "http"}://${host}:${port}/`,
            ...extraHeaders,
        };
        if (this.session.sid) {
            headers["Cookie"] = `id=${this.session.sid}` + (this.session.did ? `; did=${this.session.did}` : "") + (this.session.cookie ? `; ${this.session.cookie}` : "");
        }
        if (this.session.synoToken) {
            headers["X-SYNO-TOKEN"] = this.session.synoToken;
        }
        if (method === "GET") {
            const qs = new URLSearchParams(params).toString();
            fullPath = `/webapi/${path}${qs ? `?${qs}` : ""}`;
        }
        else {
            fullPath = `/webapi/${path}`;
            const bodyStr = body ?? new URLSearchParams(params).toString();
            requestBody = Buffer.from(bodyStr, "utf-8");
            if (!headers["Content-Type"])
                headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
            headers["Content-Length"] = String(requestBody.byteLength);
        }
        const safePath = fullPath.replace(/[^\x00-\x7F]/g, (c) => encodeURIComponent(c));
        return new Promise((resolve, reject) => {
            const client = isHttps ? https : http;
            const reqOptions = {
                hostname: host,
                port,
                path: safePath,
                method,
                headers,
                agent: isHttps ? httpsAgent : httpAgent,
                timeout: 30000,
                rejectUnauthorized: false,
            };
            const req = client.request(reqOptions, (res) => {
                const chunks = [];
                // Capture set-cookie
                const setCookie = res.headers["set-cookie"];
                if (setCookie) {
                    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
                    for (const sc of cookies) {
                        const mSid = sc.match(/id=([^;]+)/);
                        if (mSid)
                            this.session.sid = mSid[1];
                        const mDid = sc.match(/did=([^;]+)/);
                        if (mDid)
                            this.session.did = mDid[1];
                        const mToken = sc.match(/SynoToken=([^;]+)/);
                        if (mToken)
                            this.session.synoToken = mToken[1];
                    }
                }
                // Capture syno token header
                if (res.headers["x-syno-token"])
                    this.session.synoToken = String(res.headers["x-syno-token"]);
                if (res.headers["x-syno-token2"])
                    this.session.synoToken = String(res.headers["x-syno-token2"]);
                res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                res.on("end", () => {
                    const bodyBuf = Buffer.concat(chunks);
                    const ct = String(res.headers["content-type"] || "");
                    if (ct.includes("application/json") || bodyBuf.toString().startsWith("{")) {
                        try {
                            const json = JSON.parse(bodyBuf.toString("utf-8"));
                            // Also extract synotoken from json if present (login)
                            if (json?.data?.synotoken)
                                this.session.synoToken = json.data.synotoken;
                            if (json?.data?.did)
                                this.session.did = json.data.did;
                            resolve(json);
                        }
                        catch (e) {
                            resolve(bodyBuf.toString("utf-8"));
                        }
                    }
                    else {
                        // binary or text
                        resolve(bodyBuf);
                    }
                });
            });
            req.on("error", reject);
            req.on("timeout", () => {
                req.destroy();
                const err = new Error("Connection timed out (30s)");
                err.code = "ETIMEDOUT";
                reject(err);
            });
            if (requestBody)
                req.write(requestBody);
            req.end();
        });
    }
    // --- Auth ---
    async login(config, isDemo = false) {
        if (isDemo) {
            this.session = {
                sid: "demo-session-token-12345",
                isConnected: true,
                isDemo: true,
                dsmVersion: 7,
                versionString: "DSM 7.2.1-69057 (Demo)",
                model: "DS920+",
                hostname: "Synology-Demo",
                account: config.account || "admin",
            };
            this.config = config;
            this.rawHost = config.host;
            this.rawPort = String(config.port || 5000);
            this.rawHttps = config.https;
            return this.session;
        }
        this.config = config;
        this.rawHost = config.host;
        this.rawPort = String(config.port || 5000);
        this.rawHttps = config.https;
        this.resolvedHost = null;
        this.resolvedPort = null;
        this.resolvedHttps = null;
        // QuickConnect pre-resolve for better error messages
        if (isQuickConnectId(config.host)) {
            const qc = await resolveQuickConnect(config.host);
            if (qc) {
                this.resolvedHost = qc.host;
                this.resolvedPort = qc.port;
                this.resolvedHttps = qc.isHttps;
            }
        }
        // First query API info to know auth versions
        let authVersions = [6, 4, 3, 2];
        try {
            const apiInfo = await this.dsmRequest("query.cgi", "GET", {
                api: "SYNO.API.Info",
                method: "query",
                version: "1",
                query: "all",
            });
            if (apiInfo?.data?.["SYNO.API.Auth"]?.maxVersion) {
                const max = Number(apiInfo.data["SYNO.API.Auth"].maxVersion);
                authVersions = [max, 6, 4, 3, 2].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => b - a);
            }
        }
        catch (_) { }
        let lastError = "Không thể xác thực với Synology DSM";
        for (const ver of authVersions) {
            try {
                const params = {
                    account: config.account,
                    passwd: config.password || "",
                    version: String(ver),
                    api: "SYNO.API.Auth",
                    method: "login",
                    session: "FileStation",
                    enable_device_token: "yes",
                    enable_sync_token: "yes",
                    isIframeLogin: "yes",
                };
                if (config.otp && config.otp.trim().length > 0) {
                    params["otp_code"] = config.otp.trim();
                }
                const data = await this.dsmRequest("auth.cgi", "GET", params);
                if (data?.success && data?.data) {
                    const sid = data.data.sid || "";
                    const synoToken = data.data.synotoken || "";
                    const did = data.data.did || "";
                    this.session = {
                        sid,
                        synoToken,
                        did,
                        isConnected: true,
                        isDemo: false,
                        dsmVersion: ver >= 6 ? 7 : 6,
                        versionString: ver >= 6 ? "DSM 7.x" : "DSM 6.x",
                        model: "Synology NAS",
                        hostname: config.host,
                        account: config.account,
                    };
                    // Try fetch system info to enrich
                    try {
                        const info = await this.getSystemInfo();
                        if (info?.model)
                            this.session.model = info.model;
                        if (info?.version)
                            this.session.versionString = info.version;
                    }
                    catch { }
                    return this.session;
                }
                else if (data?.error) {
                    const code = data.error.code;
                    if (code === 400)
                        throw new Error("Tài khoản hoặc mật khẩu không chính xác (400).");
                    if (code === 401)
                        throw new Error("Tài khoản đã bị khóa hoặc vô hiệu hóa (401).");
                    if (code === 402)
                        throw new Error("Quyền truy cập bị từ chối (402).");
                    if (code === 403 || code === 406) {
                        if (config.otp && config.otp.trim().length > 0)
                            throw new Error("Mã OTP không chính xác hoặc đã hết hạn (403/406).");
                        else
                            throw new Error("Tài khoản yêu cầu mã OTP 6 chữ số (403). Vui lòng nhập otp_code.");
                    }
                    if (code === 404) {
                        if (config.otp && config.otp.trim().length > 0)
                            throw new Error("Mã OTP không đúng hoặc đã hết hạn (404).");
                        continue;
                    }
                    if (code === 101)
                        continue;
                    if (data.error.message)
                        lastError = data.error.message;
                }
            }
            catch (err) {
                if (err.message && (err.message.includes("OTP") || err.message.includes("mật khẩu") || err.message.includes("khóa") || err.message.includes("từ chối")))
                    throw err;
                lastError = err.message || lastError;
            }
        }
        throw new Error(lastError);
    }
    logout() {
        this.session = {
            sid: "",
            isConnected: false,
            isDemo: false,
            dsmVersion: 7,
            versionString: "",
            model: "",
            hostname: "",
            account: "",
        };
    }
    // --- Generic entry.cgi ---
    async postEntry(api, method, version, extraParams = {}) {
        this.ensureConnected();
        if (this.session.isDemo)
            throw new Error("Demo mode: not connected to real DSM");
        const params = {
            api,
            method,
            version: String(version),
            _sid: this.session.sid,
            ...extraParams,
        };
        const data = await this.dsmRequest("entry.cgi", "POST", params);
        return data;
    }
    // --- System ---
    async getSystemInfo() {
        if (this.session.isDemo || !this.session.isConnected)
            return mockSystemInfo;
        try {
            const data = await this.postEntry("SYNO.Core.System", "info", 1);
            if (data.success && data.data) {
                const d = data.data;
                let cpuStr = "";
                if (d.cpu_vendor || d.cpu_family || d.cpu_series) {
                    const parts = [d.cpu_vendor, d.cpu_family, d.cpu_series].filter(Boolean);
                    cpuStr = parts.join(" ");
                }
                else
                    cpuStr = "Intel Celeron J4125";
                if (d.cpu_clock_speed) {
                    const ghz = (Number(d.cpu_clock_speed) / 1000).toFixed(1);
                    cpuStr += ` @ ${ghz} GHz`;
                }
                const totalRamMB = Number(d.ram_size || d.ram || 65536);
                let parsedUptime = 846200;
                if (typeof d.uptime === "number")
                    parsedUptime = d.uptime;
                else if (typeof d.up_time === "string") {
                    const [h, m, s] = d.up_time.split(":").map(Number);
                    if (!isNaN(h) && !isNaN(m) && !isNaN(s))
                        parsedUptime = h * 3600 + m * 60 + s;
                }
                const info = {
                    model: d.model || this.session.model || "DS920+",
                    serial: d.serial || "N/A",
                    version: d.firmware_ver || "DSM 7.2.2",
                    uptime: parsedUptime,
                    temperature: Number(d.sys_temp || d.temperature || 45),
                    time: d.time || new Date().toISOString(),
                    ramTotal: totalRamMB,
                    ramUsed: Math.floor(totalRamMB * 0.11),
                    cpuModel: cpuStr,
                    cpuCores: Number(d.cpu_cores || 4),
                };
                if (d.model)
                    this.session.model = d.model;
                if (d.firmware_ver)
                    this.session.versionString = d.firmware_ver;
                return info;
            }
        }
        catch { }
        return mockSystemInfo;
    }
    async getUtilization() {
        if (this.session.isDemo || !this.session.isConnected)
            return getMockUtilization();
        try {
            const data = await this.postEntry("SYNO.Core.System.Utilization", "get", 1, { type: '"current"' });
            if (data.success && data.data) {
                const d = data.data;
                const rx = Array.isArray(d.network) ? d.network.reduce((acc, n) => acc + (n.rx || 0), 0) : 0;
                const tx = Array.isArray(d.network) ? d.network.reduce((acc, n) => acc + (n.tx || 0), 0) : 0;
                const diskR = Array.isArray(d.disk?.disk) ? d.disk.disk.reduce((acc, n) => acc + (n.read_byte || 0), 0) : 0;
                const diskW = Array.isArray(d.disk?.disk) ? d.disk.disk.reduce((acc, n) => acc + (n.write_byte || 0), 0) : 0;
                const memPercent = Number(d.memory?.real_usage || 0);
                const memTotalMB = d.memory?.memory_size ? Math.round(Number(d.memory.memory_size) / 1024) : d.memory?.total_real ? Math.round(Number(d.memory.total_real) / 1024) : 65536;
                const memUsedMB = d.memory?.total_real && d.memory?.avail_real ? Math.round((Number(d.memory.total_real) - Number(d.memory.avail_real)) / 1024) : Math.round((memPercent / 100) * memTotalMB);
                const cpuUsage = Number(d.cpu?.user_load || 0) + Number(d.cpu?.system_load || 0);
                return { cpuPercent: cpuUsage, memoryPercent: memPercent, memoryUsedMB: memUsedMB, memoryTotalMB: memTotalMB, networkRxBytes: rx, networkTxBytes: tx, diskReadBytes: diskR, diskWriteBytes: diskW, timestamp: Date.now() };
            }
        }
        catch { }
        return getMockUtilization();
    }
    async getProcesses() {
        if (this.session.isDemo || !this.session.isConnected)
            return mockProcesses;
        try {
            const data = await this.postEntry("SYNO.Core.System.Process", "list", 1, { limit: "100", offset: "0", sort_by: '"cpu"', sort_direction: '"DESC"' });
            if (data.success && Array.isArray(data.data?.process)) {
                return data.data.process.map((p) => {
                    let ramBytes = 0;
                    if (p.mem_kb)
                        ramBytes = Number(p.mem_kb) * 1024;
                    else if (p.res)
                        ramBytes = Number(p.res) * 1024;
                    else if (p.mem)
                        ramBytes = Number(p.mem) * 1024;
                    else if (p.memory)
                        ramBytes = Number(p.memory);
                    return { pid: p.pid, name: p.command || p.name || "process", cpu: Number(p.cpu || 0) > 100 ? Number(p.cpu) / 10 : Number(p.cpu || 0), memory: ramBytes, user: p.user || "root", status: p.status || "R" };
                });
            }
        }
        catch { }
        return mockProcesses;
    }
    // --- Files ---
    async listShares() {
        if (this.session.isDemo || !this.session.isConnected)
            return mockFiles["/"] || [];
        try {
            const data = await this.postEntry("SYNO.FileStation.List", "list_share", 2, { additional: JSON.stringify(["perm", "time", "size", "owner", "real_path"]), limit: "1000", offset: "0", sort_by: '"name"', sort_direction: '"asc"' });
            if (data.success && Array.isArray(data.data?.shares)) {
                return data.data.shares.map((s) => ({ path: s.path, name: s.name, isdir: true, size: s.additional?.size || 0, mtime: (s.additional?.time?.mtime || 0) * 1000, owner: s.additional?.owner?.user || "admin", perm: s.additional?.perm?.posix ? `${s.additional.perm.posix}` : "0755", realPath: s.additional?.real_path || s.path }));
            }
        }
        catch { }
        return mockFiles["/"] || [];
    }
    async listFiles(folderPath) {
        if (this.session.isDemo || !this.session.isConnected)
            return mockFiles[folderPath] || [];
        try {
            if (folderPath === "/" || folderPath === "")
                return this.listShares();
            const data = await this.postEntry("SYNO.FileStation.List", "list", 2, { folder_path: JSON.stringify(folderPath), additional: JSON.stringify(["perm", "time", "size", "owner", "real_path", "type"]), limit: "5000", offset: "0", sort_by: '"name"', sort_direction: '"asc"' });
            if (data.success && Array.isArray(data.data?.files)) {
                return data.data.files.map((f) => ({ path: f.path, name: f.name, isdir: !!f.isdir, size: f.additional?.size || 0, mtime: (f.additional?.time?.mtime || 0) * 1000, owner: f.additional?.owner?.user || "admin", perm: f.additional?.perm?.posix ? `${f.additional.perm.posix}` : "0644", realPath: f.additional?.real_path || f.path }));
            }
        }
        catch { }
        return mockFiles[folderPath] || [];
    }
    async createFolder(folderPath, name) {
        if (this.session.isDemo || !this.session.isConnected)
            return true;
        const data = await this.postEntry("SYNO.FileStation.CreateFolder", "create", 2, { folder_path: JSON.stringify(folderPath), name: JSON.stringify(name), force_parent: "false" });
        return !!data.success;
    }
    async deleteFile(filePath) {
        if (this.session.isDemo || !this.session.isConnected)
            return true;
        const data = await this.postEntry("SYNO.FileStation.Delete", "start", 2, { path: JSON.stringify([filePath]), accurate_progress: "true" });
        return !!data.success;
    }
    async renameFile(filePath, newName) {
        if (this.session.isDemo || !this.session.isConnected)
            return true;
        const data = await this.postEntry("SYNO.FileStation.Rename", "rename", 2, { path: JSON.stringify(filePath), name: JSON.stringify(newName) });
        return !!data.success;
    }
    async getFileContent(filePath) {
        this.ensureConnected();
        if (this.session.isDemo)
            return Buffer.from("# Demo file content\nname: dsm-service\n");
        const target = await this.ensureResolvedTarget();
        const isHttps = target.isHttps;
        const host = target.host;
        const port = target.port;
        const qs = new URLSearchParams({ api: "SYNO.FileStation.Download", version: "2", method: "download", path: filePath, mode: "open", _sid: this.session.sid }).toString();
        const fullPath = `/webapi/entry.cgi?${qs}`;
        return new Promise((resolve, reject) => {
            const client = isHttps ? https : http;
            const req = client.request({ hostname: host, port, path: fullPath, method: "GET", headers: { Cookie: `id=${this.session.sid}`, "X-SYNO-TOKEN": this.session.synoToken || "" }, agent: isHttps ? httpsAgent : httpAgent, rejectUnauthorized: false }, (res) => {
                const chunks = [];
                res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                res.on("end", () => resolve(Buffer.concat(chunks)));
            });
            req.on("error", reject);
            req.end();
        });
    }
    // --- Upload (multipart) ---
    async uploadFile(folderPath, fileName, content) {
        if (this.session.isDemo || !this.session.isConnected)
            return true;
        const target = await this.ensureResolvedTarget();
        const isHttps = target.isHttps;
        const host = target.host;
        const port = target.port;
        // Build multipart
        const boundary = "----MCPBoundary" + Date.now().toString(16);
        const parts = [];
        const fields = {
            api: "SYNO.FileStation.Upload",
            version: "2",
            method: "upload",
            path: folderPath,
            create_parents: "true",
            overwrite: "true",
        };
        for (const [k, v] of Object.entries(fields)) {
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
        }
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
        parts.push(content);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        const body = Buffer.concat(parts);
        const result = await new Promise((resolve, reject) => {
            const client = isHttps ? https : http;
            const req = client.request({
                hostname: host,
                port,
                path: `/webapi/entry.cgi?_sid=${this.session.sid}`,
                method: "POST",
                headers: {
                    Cookie: `id=${this.session.sid}`,
                    "X-SYNO-TOKEN": this.session.synoToken || "",
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                    "Content-Length": String(body.byteLength),
                },
                agent: isHttps ? httpsAgent : httpAgent,
                rejectUnauthorized: false,
            }, (res) => {
                const chunks = [];
                res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
                res.on("end", () => {
                    try {
                        resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
                    }
                    catch {
                        resolve({ success: false });
                    }
                });
            });
            req.on("error", reject);
            req.write(body);
            req.end();
        });
        return !!result.success;
    }
    // --- Share ---
    async createShareLink(path, password, expireDate) {
        if (this.session.isDemo || !this.session.isConnected)
            return { id: "demo123", url: `https://demo.quickconnect.to/sharing/demo123`, path, name: path.split("/").pop() || "Shared", date_expired: expireDate || "2026-12-31", has_password: !!password };
        const extra = { path: JSON.stringify([path]) };
        if (password)
            extra.password = JSON.stringify(password);
        if (expireDate)
            extra.date_expired = JSON.stringify(expireDate);
        const data = await this.postEntry("SYNO.FileStation.Sharing", "create", 3, extra);
        if (data.success && Array.isArray(data.data?.links) && data.data.links.length > 0) {
            const item = data.data.links[0];
            const target = await this.ensureResolvedTarget();
            const baseUrl = `${target.isHttps ? "https" : "http"}://${target.host}:${target.port}`;
            let url = item.url || "";
            if (url.startsWith("/"))
                url = `${baseUrl}${url}`;
            else if (!url.startsWith("http"))
                url = `${baseUrl}/sharing/${item.id}`;
            return { id: item.id, url, path, name: path.split("/").pop() || "Shared", date_expired: item.date_expired || "", has_password: !!password };
        }
        throw new Error(data.error?.message || "Không thể tạo liên kết chia sẻ");
    }
    async listShareLinks() {
        if (this.session.isDemo || !this.session.isConnected)
            return [{ id: "demo123", url: "https://demo.quickconnect.to/sharing/demo123", path: "/docker/docker-compose.yml", name: "docker-compose.yml", date_expired: "2026-12-31", has_password: false }];
        try {
            const data = await this.postEntry("SYNO.FileStation.Sharing", "list", 3, { offset: "0", limit: "100" });
            if (data.success && Array.isArray(data.data?.links)) {
                const target = await this.ensureResolvedTarget();
                const baseUrl = `${target.isHttps ? "https" : "http"}://${target.host}:${target.port}`;
                return data.data.links.map((l) => ({ id: l.id, url: l.url?.startsWith("http") ? l.url : `${baseUrl}${l.url || `/sharing/${l.id}`}`, path: l.path, name: l.path?.split("/").pop() || l.id, date_expired: l.date_expired || "", has_password: !!l.has_password }));
            }
        }
        catch { }
        return [];
    }
    async deleteShareLink(id) {
        if (this.session.isDemo || !this.session.isConnected)
            return true;
        const data = await this.postEntry("SYNO.FileStation.Sharing", "delete", 3, { id: JSON.stringify([id]) });
        return !!data.success;
    }
    // --- Docker ---
    async getDockerContainers() {
        if (this.session.isDemo || !this.session.isConnected)
            return mockDockerContainers;
        try {
            const data = await this.postEntry("SYNO.Docker.Container", "list", 1, { limit: "-1", offset: "0", type: '"all"' });
            let resourceMap = {};
            try {
                const resData = await this.postEntry("SYNO.Docker.Container.Resource", "get", 1);
                if (resData.success && Array.isArray(resData.data?.resources)) {
                    for (const r of resData.data.resources) {
                        const rawCpu = Number(r.cpu || 0);
                        const cpuVal = Number(rawCpu.toFixed(1));
                        const memStr = r.memory ? `${Math.round(r.memory / 1024 / 1024)} MB` : "0 MB";
                        resourceMap[r.name] = { cpu: cpuVal, memory: memStr };
                    }
                }
            }
            catch { }
            if (data.success && Array.isArray(data.data?.containers)) {
                return data.data.containers.map((c) => {
                    const stats = resourceMap[c.name] || { cpu: Number(Number(c.cpu || 0).toFixed(1)), memory: c.memory ? `${Math.round(c.memory / 1024 / 1024)} MB` : "0 MB" };
                    return { id: c.id || c.name, name: c.name, image: c.image, status: c.status === "running" ? "running" : "stopped", created: c.created || "", ports: c.port_bindings ? Object.keys(c.port_bindings) : [], cpuUsage: stats.cpu, memoryUsage: stats.memory };
                });
            }
        }
        catch { }
        return mockDockerContainers;
    }
    async toggleDockerContainer(id, action) {
        if (this.session.isDemo || !this.session.isConnected)
            return true;
        const method = action === "start" ? "start" : action === "stop" ? "stop" : "restart";
        const data = await this.postEntry("SYNO.Docker.Container", method, 1, { name: JSON.stringify(id) });
        return !!data.success;
    }
    // --- Download Station ---
    async getDownloadTasks() {
        if (this.session.isDemo || !this.session.isConnected)
            return mockDownloadTasks;
        try {
            let data = await this.postEntry("SYNO.DownloadStation2.Task", "list", 2, { additional: JSON.stringify(["detail", "transfer"]), limit: "500", offset: "0" });
            if (!data.success)
                data = await this.postEntry("SYNO.DownloadStation.Task", "list", 1, { additional: JSON.stringify(["detail", "transfer"]) });
            const tasks = data.data?.tasks || data.data?.task || [];
            if (Array.isArray(tasks)) {
                return tasks.map((t) => {
                    const downloaded = t.additional?.transfer?.size_downloaded || t.additional?.transfer?.downloaded || 0;
                    const totalSize = t.size || 0;
                    const progress = totalSize > 0 ? Math.floor((downloaded / totalSize) * 100) : t.status === "finished" ? 100 : 0;
                    return { id: t.id, title: t.title || t.filename || "Download Task", size: totalSize, status: t.status === "downloading" || t.status === "waiting" ? "downloading" : t.status === "finished" || t.status === "complete" ? "finished" : "paused", progress, downloadSpeed: t.additional?.transfer?.speed_download || t.additional?.transfer?.download_rate || 0, uploadSpeed: t.additional?.transfer?.speed_upload || t.additional?.transfer?.upload_rate || 0, type: t.type || "HTTP" };
                });
            }
        }
        catch { }
        return mockDownloadTasks;
    }
    sanitizeDsmUri(raw) {
        raw = raw.trim();
        if (raw.includes("[") && raw.includes("](")) {
            const m = raw.match(/\((https?:\/\/[^\)]+)\)/);
            if (m)
                return m[1].trim().replace(/[\)\]\",]+$/, "");
            const any = raw.match(/https?:\/\/[^\s\)\]\"]+/);
            if (any)
                return any[0].replace(/[\)\]\",]+$/, "").trim();
        }
        const first = raw.match(/https?:\/\/[^\s\)\]\"]+/);
        if (first)
            return first[0].replace(/[\)\]\",]+$/, "").trim();
        return raw.replace(/^[\[\"'`]+|[\]\"'`]+$/g, "").trim();
    }
    async addDownloadTask(uri, destination) {
        if (this.session.isDemo || !this.session.isConnected)
            return true;
        uri = this.sanitizeDsmUri(uri);
        const cleanDest = destination ? destination.trim() : "";
        let data = await this.postEntry("SYNO.DownloadStation2.Task", "create", 2, {
            type: "url",
            create_list: "true",
            url: JSON.stringify([uri]),
            ...(cleanDest ? { destination: cleanDest } : {}),
        });
        if (!data.success && cleanDest.startsWith("/")) {
            data = await this.postEntry("SYNO.DownloadStation2.Task", "create", 2, {
                type: "url",
                create_list: "true",
                url: JSON.stringify([uri]),
                destination: cleanDest.replace(/^\//, ""),
            });
        }
        if (!data.success)
            data = await this.postEntry("SYNO.DownloadStation.Task", "create", 1, { uri, destination: cleanDest || "" });
        return !!data.success;
    }
    async toggleDownloadTask(id, action) {
        if (this.session.isDemo || !this.session.isConnected)
            return true;
        const method = action === "pause" ? "pause" : action === "resume" ? "resume" : "delete";
        let data = await this.postEntry("SYNO.DownloadStation2.Task", method, 2, { id: JSON.stringify([id]) });
        if (!data.success)
            data = await this.postEntry("SYNO.DownloadStation.Task", method, 1, { id });
        return !!data.success;
    }
    // --- Storage ---
    async getStorageVolumes() {
        if (this.session.isDemo || !this.session.isConnected)
            return mockStorageVolumes;
        try {
            const res = await this.postEntry("SYNO.Storage.CGI.Storage", "load_info", 1);
            if (res.success && Array.isArray(res.data?.volumes)) {
                const diskMap = {};
                if (Array.isArray(res.data?.disks))
                    for (const d of res.data.disks)
                        diskMap[d.id || d.name] = d;
                return res.data.volumes.map((v) => {
                    const totalBytes = Number(v.size?.total || v.total_size || 0);
                    const usedBytes = Number(v.size?.used || v.used_size || 0);
                    const freeBytes = totalBytes > usedBytes ? totalBytes - usedBytes : 0;
                    const attachedDisks = Array.isArray(v.disks) ? v.disks.map((dName, idx) => {
                        const diskObj = diskMap[dName] || {};
                        return { slot: idx + 1, model: diskObj.model || diskObj.vendor || `Ổ đĩa ${idx + 1}`, serial: diskObj.serial || "N/A", status: (diskObj.status === "normal" ? "normal" : "warning"), temp: Number(diskObj.temp || 38), size: Number(diskObj.size_total_byte || 4000000000000), health: diskObj.smart_status === "normal" ? "Bình thường" : "Cần kiểm tra" };
                    }) : [];
                    return { id: v.id || v.num_id?.toString() || "volume_1", name: v.display_name || v.name || `Volume ${v.num_id || 1}`, path: v.volume_path || `/volume${v.num_id || 1}`, fsType: (v.fs_type || "btrfs").toUpperCase(), totalBytes, usedBytes, freeBytes, status: v.status === "normal" ? "normal" : "warning", drives: attachedDisks };
                });
            }
        }
        catch { }
        return mockStorageVolumes;
    }
    // --- Packages ---
    async getPackages() {
        if (this.session.isDemo || !this.session.isConnected)
            return mockPackages;
        try {
            const data = await this.postEntry("SYNO.Core.Package", "list", 1, { additional: JSON.stringify(["description", "status", "maintainer", "version", "display_name"]) });
            if (data.success && Array.isArray(data.data?.packages)) {
                return data.data.packages.map((p) => ({ id: p.id, name: p.additional?.display_name || p.name || p.id, version: p.additional?.version || p.version || "1.0", status: p.additional?.status === "running" ? "running" : "stopped", description: p.additional?.description || "", maintainer: p.additional?.maintainer || "Synology Inc." }));
            }
        }
        catch { }
        return mockPackages;
    }
    async togglePackage(id, action) {
        if (this.session.isDemo || !this.session.isConnected)
            return true;
        const data = await this.postEntry("SYNO.Core.Package.Control", action, 1, { id: JSON.stringify(id) });
        return !!data.success;
    }
    // ==================== SERVICES ====================
    async getServices() {
        if (this.session.isDemo || !this.session.isConnected) {
            return JSON.parse(JSON.stringify(mockServices));
        }
        try {
            const compound = [
                { api: "SYNO.Core.FileServ.SMB", method: "get", version: 3 },
                { api: "SYNO.Core.FileServ.AFP", method: "get", version: 1 },
                { api: "SYNO.Core.FileServ.NFS", method: "get", version: 2 },
                { api: "SYNO.Core.FileServ.FTP", method: "get", version: 3 },
                { api: "SYNO.Core.FileServ.FTP.SFTP", method: "get", version: 1 },
                { api: "SYNO.Core.Terminal", method: "get", version: 3 },
            ];
            const data = await this.postEntry("SYNO.Entry.Request", "request", 1, {
                mode: '"sequential"',
                compound: JSON.stringify(compound),
                stop_when_error: "false",
            });
            const results = data?.data?.result || data?.data || [];
            const services = [];
            const getRes = (idx) => {
                const r = results[idx];
                if (!r)
                    return null;
                if (r.success && r.data)
                    return r.data;
                return r.data || r;
            };
            const smbData = getRes(0);
            if (smbData) {
                const enabled = !!smbData.enable_samba;
                services.push({ id: "smb", name: "smb", displayName: "SMB / CIFS (Windows File Service)", description: "Chia sẻ tệp cho Windows/macOS qua SMB. Cổng 445.", category: "file", enabled, running: enabled, status: enabled ? "running" : "stopped", port: 445, api: "SYNO.Core.FileServ.SMB", details: smbData, canToggle: true });
            }
            const afpData = getRes(1);
            if (afpData) {
                const enabled = !!afpData.enable_afp;
                services.push({ id: "afp", name: "afp", displayName: "AFP (Apple Filing)", description: "Dịch vụ AFP cho macOS.", category: "file", enabled, running: enabled, status: enabled ? "running" : "stopped", port: 548, api: "SYNO.Core.FileServ.AFP", details: afpData, canToggle: true });
            }
            const nfsData = getRes(2);
            if (nfsData) {
                const enabled = !!nfsData.enable_nfs;
                services.push({ id: "nfs", name: "nfs", displayName: "NFS", description: "Chia sẻ tệp cho Linux/Unix qua NFS.", category: "file", enabled, running: enabled, status: enabled ? "running" : "stopped", port: 2049, api: "SYNO.Core.FileServ.NFS", details: nfsData, canToggle: true });
            }
            const ftpData = getRes(3);
            if (ftpData) {
                const enabled = !!ftpData.enable_ftp;
                services.push({ id: "ftp", name: "ftp", displayName: "FTP", description: "Giao thức FTP/FTPS. Cổng 21.", category: "file", enabled, running: enabled, status: enabled ? "running" : "stopped", port: ftpData.portnum || 21, api: "SYNO.Core.FileServ.FTP", details: ftpData, canToggle: true });
            }
            const sftpData = getRes(4);
            if (sftpData) {
                const enabled = !!sftpData.enable;
                services.push({ id: "sftp", name: "sftp", displayName: "SFTP", description: "FTP an toàn qua SSH.", category: "file", enabled, running: enabled, status: enabled ? "running" : "stopped", port: sftpData.portnum || sftpData.sftp_portnum || 22, api: "SYNO.Core.FileServ.FTP.SFTP", details: sftpData, canToggle: true });
            }
            const termData = getRes(5);
            if (termData) {
                const sshEnabled = !!termData.enable_ssh;
                const telnetEnabled = !!termData.enable_telnet;
                services.push({ id: "ssh", name: "ssh", displayName: "SSH (Terminal)", description: "Truy cập dòng lệnh qua SSH. Cổng " + (termData.ssh_port || 22), category: "system", enabled: sshEnabled, running: sshEnabled, status: sshEnabled ? "running" : "stopped", port: termData.ssh_port || 22, api: "SYNO.Core.Terminal", details: termData, canToggle: true });
                services.push({ id: "telnet", name: "telnet", displayName: "Telnet", description: "Telnet không mã hóa.", category: "system", enabled: telnetEnabled, running: telnetEnabled, status: telnetEnabled ? "running" : "stopped", port: 23, api: "SYNO.Core.Terminal", details: termData, canToggle: true });
            }
            if (!services.find((s) => s.id === "rsync")) {
                services.push({ id: "rsync", name: "rsync", displayName: "rsync / Network Backup", description: "Dịch vụ rsync cho sao lưu.", category: "network", enabled: false, running: false, status: "stopped", port: 873, api: "SYNO.Backup.Service.NetworkBackup", details: {}, canToggle: true });
            }
            if (services.length > 0)
                return services;
        }
        catch (_) { }
        const fallback = [];
        const tryGet = async (api, method, version) => {
            try {
                const r = await this.postEntry(api, method, version);
                if (r.success && r.data)
                    return r.data;
                return null;
            }
            catch {
                return null;
            }
        };
        const smb = await tryGet("SYNO.Core.FileServ.SMB", "get", 3);
        fallback.push({ id: "smb", name: "smb", displayName: "SMB / CIFS", description: "SMB", category: "file", enabled: !!smb?.enable_samba, running: !!smb?.enable_samba, status: smb?.enable_samba ? "running" : "stopped", port: 445, api: "SYNO.Core.FileServ.SMB", details: smb || {}, canToggle: true });
        const afp = await tryGet("SYNO.Core.FileServ.AFP", "get", 1);
        fallback.push({ id: "afp", name: "afp", displayName: "AFP", description: "AFP", category: "file", enabled: !!afp?.enable_afp, running: !!afp?.enable_afp, status: afp?.enable_afp ? "running" : "stopped", port: 548, api: "SYNO.Core.FileServ.AFP", details: afp || {}, canToggle: true });
        const nfs = await tryGet("SYNO.Core.FileServ.NFS", "get", 2);
        fallback.push({ id: "nfs", name: "nfs", displayName: "NFS", description: "NFS", category: "file", enabled: !!nfs?.enable_nfs, running: !!nfs?.enable_nfs, status: nfs?.enable_nfs ? "running" : "stopped", port: 2049, api: "SYNO.Core.FileServ.NFS", details: nfs || {}, canToggle: true });
        const ftp = await tryGet("SYNO.Core.FileServ.FTP", "get", 3);
        fallback.push({ id: "ftp", name: "ftp", displayName: "FTP", description: "FTP", category: "file", enabled: !!ftp?.enable_ftp, running: !!ftp?.enable_ftp, status: ftp?.enable_ftp ? "running" : "stopped", port: ftp?.portnum || 21, api: "SYNO.Core.FileServ.FTP", details: ftp || {}, canToggle: true });
        const sftp = await tryGet("SYNO.Core.FileServ.FTP.SFTP", "get", 1);
        fallback.push({ id: "sftp", name: "sftp", displayName: "SFTP", description: "SFTP", category: "file", enabled: !!sftp?.enable, running: !!sftp?.enable, status: sftp?.enable ? "running" : "stopped", port: sftp?.portnum || 22, api: "SYNO.Core.FileServ.FTP.SFTP", details: sftp || {}, canToggle: true });
        const term = await tryGet("SYNO.Core.Terminal", "get", 3);
        fallback.push({ id: "ssh", name: "ssh", displayName: "SSH", description: `SSH ${term?.ssh_port || 22}`, category: "system", enabled: !!term?.enable_ssh, running: !!term?.enable_ssh, status: term?.enable_ssh ? "running" : "stopped", port: term?.ssh_port || 22, api: "SYNO.Core.Terminal", details: term || {}, canToggle: true });
        fallback.push({ id: "telnet", name: "telnet", displayName: "Telnet", description: "Telnet", category: "system", enabled: !!term?.enable_telnet, running: !!term?.enable_telnet, status: term?.enable_telnet ? "running" : "stopped", port: 23, api: "SYNO.Core.Terminal", details: term || {}, canToggle: true });
        fallback.push({ id: "rsync", name: "rsync", displayName: "rsync", description: "rsync", category: "network", enabled: false, running: false, status: "stopped", port: 873, api: "SYNO.Backup.Service.NetworkBackup", details: {}, canToggle: true });
        return fallback.length ? fallback : JSON.parse(JSON.stringify(mockServices));
    }
    async getService(id) {
        const all = await this.getServices();
        return all.find((s) => s.id === id) || null;
    }
    async getTerminalInfo() {
        if (this.session.isDemo || !this.session.isConnected) {
            const ssh = mockServices.find((s) => s.id === "ssh");
            const telnet = mockServices.find((s) => s.id === "telnet");
            return { enable_ssh: !!ssh?.enabled, enable_telnet: !!telnet?.enabled, ssh_port: ssh?.port || 22 };
        }
        const data = await this.postEntry("SYNO.Core.Terminal", "get", 3);
        if (data.success && data.data)
            return { enable_ssh: !!data.data.enable_ssh, enable_telnet: !!data.data.enable_telnet, ssh_port: Number(data.data.ssh_port || 22), hostname: data.data.hostname };
        throw new Error(data.error?.message || "Không thể lấy thông tin Terminal");
    }
    async setTerminal(enableSsh, enableTelnet, sshPort) {
        if (this.session.isDemo || !this.session.isConnected) {
            const ssh = mockServices.find((s) => s.id === "ssh");
            const telnet = mockServices.find((s) => s.id === "telnet");
            if (ssh) {
                ssh.enabled = enableSsh;
                ssh.running = enableSsh;
                ssh.status = enableSsh ? "running" : "stopped";
                if (sshPort)
                    ssh.port = sshPort;
            }
            if (telnet && enableTelnet !== undefined) {
                telnet.enabled = enableTelnet;
                telnet.running = enableTelnet;
                telnet.status = enableTelnet ? "running" : "stopped";
            }
            return true;
        }
        let current = {};
        try {
            const cur = await this.postEntry("SYNO.Core.Terminal", "get", 3);
            if (cur.success)
                current = cur.data;
        }
        catch { }
        const payload = { enable_ssh: String(enableSsh), enable_telnet: String(enableTelnet ?? current.enable_telnet ?? false), ssh_port: String(sshPort ?? current.ssh_port ?? 22) };
        const data = await this.postEntry("SYNO.Core.Terminal", "set", 3, payload);
        return !!data.success;
    }
    async toggleService(id, enabled) {
        if (this.session.isDemo || !this.session.isConnected) {
            const svc = mockServices.find((s) => s.id === id);
            if (!svc)
                return false;
            svc.enabled = enabled;
            svc.running = enabled;
            svc.status = enabled ? "running" : "stopped";
            return true;
        }
        try {
            if (id === "smb") {
                const cur = await this.postEntry("SYNO.Core.FileServ.SMB", "get", 3);
                if (!cur.success)
                    throw new Error(cur.error?.message || "Không lấy được SMB config");
                const d = cur.data;
                const data = await this.postEntry("SYNO.Core.FileServ.SMB", "set", 3, { enable_samba: String(enabled), workgroup: JSON.stringify(d.workgroup || "WORKGROUP"), disable_shadow_copy: String(!!d.disable_shadow_copy), smb_transfer_log_enable: String(!!d.smb_transfer_log_enable) });
                if (!data.success) {
                    const data2 = await this.postEntry("SYNO.Core.FileServ.SMB", "set", 3, { enable_samba: String(enabled), workgroup: d.workgroup || "WORKGROUP" });
                    return !!data2.success;
                }
                return !!data.success;
            }
            if (id === "afp") {
                const cur = await this.postEntry("SYNO.Core.FileServ.AFP", "get", 1);
                const d = cur.data || {};
                const data = await this.postEntry("SYNO.Core.FileServ.AFP", "set", 1, { enable_afp: String(enabled), afp_transfer_log_enable: String(!!d.afp_transfer_log_enable) });
                return !!data.success;
            }
            if (id === "nfs") {
                const cur = await this.postEntry("SYNO.Core.FileServ.NFS", "get", 2);
                const d = cur.data || {};
                const data = await this.postEntry("SYNO.Core.FileServ.NFS", "set", 2, { enable_nfs: String(enabled), enable_nfs_v4: String(!!d.enable_nfs_v4), enable_nfs_v4_1: String(!!d.enable_nfs_v4_1 || !!d.enable_nfs_v4), nfs_v4_domain: JSON.stringify(d.nfs_v4_domain || "") });
                if (!data.success) {
                    const data2 = await this.postEntry("SYNO.Core.FileServ.NFS", "set", 2, { enable_nfs: String(enabled) });
                    return !!data2.success;
                }
                return !!data.success;
            }
            if (id === "ftp") {
                const cur = await this.postEntry("SYNO.Core.FileServ.FTP", "get", 3);
                const d = cur.data || {};
                const data = await this.postEntry("SYNO.Core.FileServ.FTP", "set", 3, { enable_ftp: String(enabled), enable_ftps: String(!!d.enable_ftps), timeout: String(d.timeout || 300), portnum: String(d.portnum || 21), custom_port_range: JSON.stringify(d.custom_port_range || ""), use_ext_ip: String(!!d.use_ext_ip), enable_fxp: String(!!d.enable_fxp), enable_fips: String(!!d.enable_fips), enable_ascii: String(!!d.enable_ascii), utf8_mode: JSON.stringify(d.utf8_mode || "auto") });
                if (!data.success) {
                    const data2 = await this.postEntry("SYNO.Core.FileServ.FTP", "set", 3, { enable_ftp: String(enabled) });
                    return !!data2.success;
                }
                return !!data.success;
            }
            if (id === "sftp") {
                const cur = await this.postEntry("SYNO.Core.FileServ.FTP.SFTP", "get", 1);
                const d = cur.data || {};
                const data = await this.postEntry("SYNO.Core.FileServ.FTP.SFTP", "set", 1, { enable: String(enabled), sftp_portnum: String(d.sftp_portnum || d.portnum || 22), portnum: String(d.portnum || d.sftp_portnum || 22) });
                return !!data.success;
            }
            if (id === "ssh" || id === "telnet") {
                const cur = await this.postEntry("SYNO.Core.Terminal", "get", 3);
                const d = cur.data || {};
                const enableSsh = id === "ssh" ? enabled : !!d.enable_ssh;
                const enableTelnet = id === "telnet" ? enabled : !!d.enable_telnet;
                return this.setTerminal(enableSsh, enableTelnet, d.ssh_port);
            }
            const pkg = await this.postEntry("SYNO.Core.Package.Control", enabled ? "start" : "stop", 1, { id: JSON.stringify(id) }).catch(() => null);
            if (pkg && pkg.success)
                return true;
            throw new Error(`Dịch vụ '${id}' không được hỗ trợ`);
        }
        catch (e) {
            throw new Error(e.message || `Không thể ${enabled ? "bật" : "tắt"} ${id}`);
        }
    }
    async getFileServiceStatus() {
        const services = await this.getServices();
        const find = (id) => services.find((s) => s.id === id);
        return {
            smb: { enabled: !!find("smb")?.enabled, details: find("smb")?.details },
            afp: { enabled: !!find("afp")?.enabled, details: find("afp")?.details },
            nfs: { enabled: !!find("nfs")?.enabled, enable_nfs_v4: !!find("nfs")?.details?.enable_nfs_v4, details: find("nfs")?.details },
            ftp: { enabled: !!find("ftp")?.enabled, enable_ftps: !!find("ftp")?.details?.enable_ftps, port: find("ftp")?.port || 21, details: find("ftp")?.details },
            sftp: { enabled: !!find("sftp")?.enabled, port: find("sftp")?.port || 22, details: find("sftp")?.details },
        };
    }
    // ==================== NOTIFICATIONS ====================
    notifyStringsCache = null;
    notifyStringsExpiry = 0;
    async getNotificationStrings() {
        if (this.session.isDemo || !this.session.isConnected)
            return {};
        if (this.notifyStringsCache && Date.now() < this.notifyStringsExpiry)
            return this.notifyStringsCache;
        try {
            const data = await this.postEntry("SYNO.Core.DSMNotify.Strings", "get", 1, {
                pkgName: '""',
                lang: '"enu"',
            });
            if (data.success && data.data) {
                this.notifyStringsCache = data.data;
                this.notifyStringsExpiry = Date.now() + 30 * 60 * 1000;
                return data.data;
            }
            // fallback without quotes
            const data2 = await this.postEntry("SYNO.Core.DSMNotify.Strings", "get", 1, {
                pkgName: "",
                lang: "enu",
            });
            if (data2.success && data2.data) {
                this.notifyStringsCache = data2.data;
                return data2.data;
            }
        }
        catch (_) { }
        return {};
    }
    parseNotificationMessage(template, msgJson) {
        try {
            const map = JSON.parse(msgJson);
            let out = template
                .replaceAll("%LINK_BEGIN%", "")
                .replaceAll("%LINK_END%", "")
                .replaceAll("%PRE_APP_LINK%", "")
                .replaceAll("%POST_APP_LINK%", "");
            // strip html tags
            out = out.replace(/<[^>]*>/g, " ");
            for (const [k, v] of Object.entries(map)) {
                out = out.replaceAll(k, String(v));
            }
            return out.trim().replace(/\s+/g, " ");
        }
        catch {
            return msgJson;
        }
    }
    inferCategory(className, title) {
        const s = `${className} ${title}`.toLowerCase();
        if (s.includes("storage"))
            return "storage";
        if (s.includes("package") || s.includes("pkgman"))
            return "package";
        if (s.includes("security") || s.includes("scan"))
            return "security";
        if (s.includes("network"))
            return "network";
        if (s.includes("backup") || s.includes("hyper"))
            return "backup";
        if (s.includes("file") || s.includes("download"))
            return "file";
        if (s.includes("app") || s.includes("foto") || s.includes("photo"))
            return "app";
        return "system";
    }
    inferLevel(title, msg) {
        const s = `${title} ${msg}`.toLowerCase();
        if (s.includes("error") || s.includes("fail") || s.includes("degraded") || s.includes("warning") || s.includes("cảnh báo") || s.includes("mất kết"))
            return "warning";
        if (s.includes("success") || s.includes("complete") || s.includes("hoàn tất") || s.includes("thành công"))
            return "success";
        return "info";
    }
    async getNotifications() {
        if (this.session.isDemo || !this.session.isConnected) {
            return JSON.parse(JSON.stringify(mockNotifications));
        }
        try {
            // Prefer compound fetch for efficiency, fallback to single
            const now = Math.floor(Date.now() / 1000);
            const strings = await this.getNotificationStrings().catch(() => ({}));
            let rawItems = [];
            try {
                const data = await this.postEntry("SYNO.Core.DSMNotify", "notify", 1, {
                    action: '"load"',
                    lastRead: String(now),
                    lastSeen: String(now),
                });
                if (data.success && Array.isArray(data.data?.items))
                    rawItems = data.data.items;
                else if (data.success && Array.isArray(data.data))
                    rawItems = data.data;
            }
            catch {
                const data = await this.postEntry("SYNO.Core.DSMNotify", "notify", 1, {
                    action: "load",
                    lastRead: String(now),
                    lastSeen: String(now),
                });
                if (data.success && Array.isArray(data.data?.items))
                    rawItems = data.data.items;
            }
            if (!rawItems.length) {
                // fallback to Entry.Request compound with AppNotify to catch any notify there
                try {
                    const cData = await this.postEntry("SYNO.Entry.Request", "request", 1, {
                        mode: '"parallel"',
                        compound: JSON.stringify([
                            { api: "SYNO.Core.DSMNotify", method: "notify", version: 1, action: "load", lastRead: now, lastSeen: now },
                            { api: "SYNO.Core.AppNotify", method: "get", version: 1 },
                        ]),
                    });
                    const resArr = cData?.data?.result || cData?.data || [];
                    for (const r of resArr) {
                        if (r?.api === "SYNO.Core.DSMNotify" && r?.data?.items) {
                            rawItems = r.data.items;
                            break;
                        }
                        if (r?.success && r?.data?.items) {
                            rawItems = r.data.items;
                            break;
                        }
                    }
                }
                catch { }
            }
            if (!rawItems.length)
                return JSON.parse(JSON.stringify(mockNotifications));
            const parsed = rawItems.map((item, idx) => {
                const titleKey = item.title || "";
                const className = item.className || "";
                const rawMsgs = Array.isArray(item.msg) ? item.msg : [];
                const time = Number(item.time || now);
                let displayTitle = titleKey;
                let template = "";
                if (strings[titleKey]) {
                    displayTitle = strings[titleKey].title || titleKey;
                    template = strings[titleKey].msg || "";
                }
                else {
                    // fallback: use className or title last segment
                    if (className)
                        displayTitle = className.split(".").pop() || className;
                    else if (titleKey.includes(":"))
                        displayTitle = titleKey.split(":").pop() || titleKey;
                }
                const messages = rawMsgs.map((m) => (template ? this.parseNotificationMessage(template, m) : m));
                // if no template replacement happened and message looks like json, try to extract values
                const finalMessages = messages.map((m) => {
                    if (m.startsWith("{") && m.endsWith("}")) {
                        try {
                            const o = JSON.parse(m);
                            return Object.values(o).join(" ");
                        }
                        catch {
                            return m;
                        }
                    }
                    return m;
                });
                return {
                    id: item.id || `n_${idx}_${time}`,
                    title: titleKey,
                    displayTitle,
                    className,
                    category: this.inferCategory(className, titleKey),
                    level: this.inferLevel(displayTitle, finalMessages.join(" ")),
                    messages: finalMessages.length ? finalMessages : [displayTitle],
                    rawMessages: rawMsgs,
                    time,
                    read: false,
                };
            });
            return parsed.length ? parsed : JSON.parse(JSON.stringify(mockNotifications));
        }
        catch {
            return JSON.parse(JSON.stringify(mockNotifications));
        }
    }
    async getAppNotifications() {
        if (this.session.isDemo || !this.session.isConnected) {
            return JSON.parse(JSON.stringify(mockAppNotifications));
        }
        try {
            const data = await this.postEntry("SYNO.Core.AppNotify", "get", 1);
            if (data.success && data.data) {
                // AppNotify shape: data.items or data.list etc - normalize
                const items = data.data.items || data.data.list || data.data.appNotify || [];
                if (Array.isArray(items) && items.length) {
                    return items.map((it, i) => ({
                        id: it.id || `a_${i}`,
                        title: it.title || it.pkgName || "App",
                        content: it.content || it.msg || JSON.stringify(it),
                        level: "info",
                        time: Number(it.time || Math.floor(Date.now() / 1000)),
                        unread: !!it.unread,
                        pkgId: it.pkgId,
                    }));
                }
            }
        }
        catch { }
        return JSON.parse(JSON.stringify(mockAppNotifications));
    }
    async clearNotifications() {
        if (this.session.isDemo || !this.session.isConnected) {
            mockNotifications.splice(0, mockNotifications.length);
            mockAppNotifications.splice(0, mockAppNotifications.length);
            return true;
        }
        try {
            // Primary
            let data = await this.postEntry("SYNO.Core.DSMNotify", "notify", 1, {
                action: '"apply"',
                clean: '"all"',
            }).catch(() => null);
            if (data?.success)
                return true;
            // fallback without quotes
            data = await this.postEntry("SYNO.Core.DSMNotify", "notify", 1, {
                action: "apply",
                clean: "all",
            });
            return !!data.success;
        }
        catch {
            return false;
        }
    }
    async markNotificationsRead() {
        if (this.session.isDemo || !this.session.isConnected) {
            mockNotifications.forEach((n) => (n.read = true));
            return true;
        }
        const now = Math.floor(Date.now() / 1000);
        try {
            // DSMNotify tracks lastRead/lastSeen server side via action load? We send load with now to mark seen.
            await this.postEntry("SYNO.Core.DSMNotify", "notify", 1, {
                action: '"load"',
                lastRead: String(now),
                lastSeen: String(now),
            });
            return true;
        }
        catch {
            return false;
        }
    }
    // --- Power ---
    async powerAction(method, force = true) {
        if (this.session.isDemo || !this.session.isConnected)
            return true;
        const data = await this.postEntry("SYNO.Core.System", method, 1, { force: String(force), local: "true" });
        return !!data.success;
    }
    // --- API Info ---
    async getApiInfo() {
        const data = await this.dsmRequest("query.cgi", "GET", { api: "SYNO.API.Info", method: "query", version: "1", query: "all" });
        return data;
    }
    // --- Generic raw entry.cgi for advanced use ---
    async rawEntryCall(api, method, version, params = {}) {
        return this.postEntry(api, method, version, params);
    }
    // --- Search & other helpers ---
    async searchFiles(folderPath, pattern, recursive = true) {
        this.ensureConnected();
        if (this.session.isDemo)
            return { success: true, data: { files: [] } };
        // SYNO.FileStation.Search start + list
        const startData = await this.postEntry("SYNO.FileStation.Search", "start", 2, { folder_path: JSON.stringify(folderPath), pattern: JSON.stringify(pattern), recursive: String(recursive), search_content: "false", search_type: JSON.stringify("simple") });
        if (!startData.success || !startData.data?.taskid)
            return startData;
        const taskId = startData.data.taskid;
        // Poll briefly
        await new Promise((r) => setTimeout(r, 600));
        const listData = await this.postEntry("SYNO.FileStation.Search", "list", 2, { taskid: taskId, offset: "0", limit: "100", sort_by: JSON.stringify("name"), sort_direction: JSON.stringify("asc"), additional: JSON.stringify(["real_path", "size", "owner", "time", "perm", "type"]) });
        // If still searching, return taskId
        return listData;
    }
    async getLogs(limit = 50) {
        this.ensureConnected();
        try {
            const data = await this.postEntry("SYNO.Core.SyslogClient.Log", "list", 1, { start: "0", limit: String(limit), target: "LOCAL", logtype: "system,netbackup", method: "list" });
            return data;
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    // --- SSH Exec (MCP direct) ---
    async execSshCommand(opts) {
        const { host, port, username, password, privateKey, command } = opts;
        if (!host || !username || !command)
            return { success: false, error: "host, username, command required" };
        const sshPort = port && Number(port) >= 1 && Number(port) <= 65535 ? Number(port) : 22;
        // Demo mock
        if (host === "demo.synology.lan" || host.includes("demo") || username === "demo_admin") {
            const mockOut = `[demo] $ ${command}\nLinux Synology-NAS 4.4.302+ #69057 SMP\n${new Date().toISOString()} — demo output for: ${command}\nuid=1026(admin) gid=100(users)\n`;
            return { success: true, stdout: mockOut, stderr: "", code: 0 };
        }
        const isQuickConnect = host.toLowerCase().endsWith(".quickconnect.to") || (!host.includes(".") && !host.includes(":") && host.toLowerCase() !== "localhost");
        if (isQuickConnect) {
            return { success: false, error: "SSH via QuickConnect ID not supported. Use LAN IP or DDNS and ensure SSH port is forwarded." };
        }
        return new Promise((resolve) => {
            const conn = new SSHClient();
            let stdout = "";
            let stderr = "";
            const timeout = setTimeout(() => {
                try {
                    conn.end();
                }
                catch { }
                resolve({ success: false, error: "SSH connection timeout (10s)" });
            }, 10000);
            conn
                .on("ready", () => {
                clearTimeout(timeout);
                conn.exec(command, (err, stream) => {
                    if (err) {
                        conn.end();
                        return resolve({ success: false, error: err.message });
                    }
                    stream
                        .on("close", (code, signal) => {
                        conn.end();
                        resolve({ success: true, stdout, stderr, code, signal });
                    })
                        .on("data", (data) => { stdout += data.toString(); })
                        .stderr.on("data", (data) => { stderr += data.toString(); });
                });
            })
                .on("error", (err) => {
                clearTimeout(timeout);
                resolve({ success: false, error: err.message });
            })
                .connect({
                host,
                port: sshPort,
                username,
                password: privateKey ? undefined : password,
                privateKey: privateKey || undefined,
                readyTimeout: 8000,
            });
        });
    }
}
export const dsmClient = new DSMClient();
//# sourceMappingURL=client.js.map