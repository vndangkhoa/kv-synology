import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Resolved NAS connection endpoint from Synology QuickConnect infrastructure.
public struct ResolvedTarget: Codable, Sendable, Hashable {
    public var host: String
    public var port: Int
    public var isHttps: Bool
    public var expires: Int64

    public init(
        host: String,
        port: Int,
        isHttps: Bool,
        expires: Int64 = Int64(Date().timeIntervalSince1970 * 1000) + 10 * 60 * 1000
    ) {
        self.host = host
        self.port = port
        self.isHttps = isHttps
        self.expires = expires
    }
}

/// Actor responsible for resolving Synology QuickConnect IDs to direct LAN or WAN IP/domain addresses.
public actor QuickConnectResolver {
    public static let shared = QuickConnectResolver()

    private var cache: [String: ResolvedTarget] = [:]

    private let session: URLSession

    public init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 6.0
        config.timeoutIntervalForResource = 8.0
        let trustDelegate = SSLTrustDelegate(ignoreCert: true)
        self.session = URLSession(configuration: config, delegate: trustDelegate, delegateQueue: nil)
    }

    /// Determines if the provided host string is a QuickConnect ID.
    public func isQuickConnectId(_ host: String) -> Bool {
        let clean = host.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return clean.hasSuffix(".quickconnect.to") ||
            (!clean.contains(".") && !clean.contains(":") && clean != "localhost" && !clean.isEmpty)
    }

    /// Resolves a QuickConnect ID (e.g. "my_synology_id") into a verified IP/port target.
    public func resolve(
        serverId: String,
        userPort: Int? = nil,
        userHttps: Bool? = nil
    ) async -> ResolvedTarget? {
        let cleanId = serverId
            .replacingOccurrences(of: ".quickconnect.to", with: "", options: .caseInsensitive)
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()

        let cacheKey = "\(cleanId)_\(userPort.map(String.init) ?? "auto")_\(userHttps.map(String.init) ?? "auto")"

        let now = Int64(Date().timeIntervalSince1970 * 1000)
        if let cached = cache[cacheKey] ?? cache[cleanId], cached.expires > now {
            return cached
        }

        let controlHosts = [
            "global.quickconnect.to",
            "usc.quickconnect.to",
            "tw.quickconnect.to",
            "us.quickconnect.to",
            "eu.quickconnect.to"
        ]

        for controlHost in controlHosts {
            var info = await fetchServerInfo(cleanId: cleanId, controlHost: controlHost, portalId: "dsm_portal_https")
            if info == nil {
                info = await fetchServerInfo(cleanId: cleanId, controlHost: controlHost, portalId: "dsm_portal")
            }

            if let info = info {
                let candidates = extractCandidates(cleanId: cleanId, parsed: info, userPort: userPort, userHttps: userHttps)
                let verified = await probeCandidates(candidates)

                let target = verified ?? candidates.first(where: { $0.host.contains("synology.me") || $0.host.contains("quickconnect") }) ?? candidates.first

                if let target = target {
                    let resolved = ResolvedTarget(host: target.host, port: target.port, isHttps: target.isHttps)
                    cache[cacheKey] = resolved
                    cache[cleanId] = resolved
                    return resolved
                }
            }
        }

        return nil
    }

    private func fetchServerInfo(cleanId: String, controlHost: String, portalId: String) async -> [String: Any]? {
        // 1. Try request_tunnel
        let tunnelPayload = "{\"version\":1,\"command\":\"request_tunnel\",\"stop_mirror\":true,\"serverID\":\"\(cleanId)\",\"id\":\"\(portalId)\"}"
        if let tunnelRes = await executeServRequest(controlHost: controlHost, jsonBody: tunnelPayload) {
            let errno = tunnelRes["errno"] as? Int ?? -1
            if errno == 0 && tunnelRes["server"] != nil {
                if let env = tunnelRes["env"] as? [String: Any],
                   let redirectHost = env["control_host"] as? String,
                   !redirectHost.isEmpty && redirectHost != controlHost {
                    let regional = await fetchServerInfo(cleanId: cleanId, controlHost: redirectHost, portalId: portalId)
                    if regional != nil { return regional }
                }
                return tunnelRes
            }
        }

        // 2. Fallback: get_server_info
        let infoPayload = "{\"version\":1,\"command\":\"get_server_info\",\"stop_mirror\":true,\"serverID\":\"\(cleanId)\",\"id\":\"\(portalId)\"}"
        if let infoRes = await executeServRequest(controlHost: controlHost, jsonBody: infoPayload) {
            let errno = infoRes["errno"] as? Int ?? -1
            if errno == 0 && infoRes["server"] != nil {
                if let env = infoRes["env"] as? [String: Any],
                   let redirectHost = env["control_host"] as? String,
                   !redirectHost.isEmpty && redirectHost != controlHost {
                    let regional = await fetchServerInfo(cleanId: cleanId, controlHost: redirectHost, portalId: portalId)
                    if regional != nil { return regional }
                }
                return infoRes
            }
        }

        return nil
    }

    private func executeServRequest(controlHost: String, jsonBody: String) async -> [String: Any]? {
        guard let url = URL(string: "https://\(controlHost)/Serv.php") else { return nil }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Synology/DSM", forHTTPHeaderField: "User-Agent")
        request.httpBody = jsonBody.data(using: .utf8)

        do {
            let (data, response) = try await execute(request)
            if let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                return json
            }
        } catch {
            return nil
        }
        return nil
    }

    public func setCached(key: String, target: ResolvedTarget) {
        cache[key] = target
    }

    public func getCached(key: String) -> ResolvedTarget? {
        cache[key]
    }

    public func clearCache() {
        cache.removeAll()
    }

    public struct Candidate: Hashable, Sendable {
        public let host: String
        public let port: Int
        public let isHttps: Bool

        public init(host: String, port: Int, isHttps: Bool) {
            self.host = host
            self.port = port
            self.isHttps = isHttps
        }
    }

    public func extractCandidates(
        cleanId: String,
        parsed: [String: Any],
        userPort: Int? = nil,
        userHttps: Bool? = nil
    ) -> [Candidate] {
        let serverObj = parsed["server"] as? [String: Any]
        let serviceObj = parsed["service"] as? [String: Any]
        let smartDnsObj = parsed["smartdns"] as? [String: Any]

        let relayDn = serviceObj?["relay_dn"] as? String
        let relayPort = (serviceObj?["relay_port"] as? NSNumber)?.intValue
        let relayIp = serviceObj?["relay_ip"] as? String

        let ddnsRaw = serverObj?["ddns"] as? String
        let ddns = (ddnsRaw != nil && ddnsRaw != "NULL") ? ddnsRaw : nil

        let ext = serverObj?["external"] as? [String: Any]
        let wanIp = ext?["ip"] as? String
        let smartDns = smartDnsObj?["host"] as? String

        let dsmHttpsPort = (serverObj?["https_port"] as? NSNumber)?.intValue
            ?? (serviceObj?["port"] as? NSNumber)?.intValue ?? 5001
        let dsmHttpPort = (serverObj?["port"] as? NSNumber)?.intValue ?? 5000

        var candidates: [Candidate] = []
        var seen = Set<String>()

        func addCand(_ h: String?, _ p: Int?, _ isH: Bool) {
            guard let h = h?.trimmingCharacters(in: .whitespacesAndNewlines), !h.isEmpty,
                  let p = p, (1...65535).contains(p) else { return }
            let key = "\(h):\(p):\(isH)"
            if !seen.contains(key) {
                seen.insert(key)
                candidates.append(Candidate(host: h, port: p, isHttps: isH))
            }
        }

        // 1. WAN Relay Tunnels
        if let relayDn = relayDn, !relayDn.isEmpty, let relayPort = relayPort {
            addCand(relayDn, relayPort, true)
        }
        if let relayIp = relayIp, !relayIp.isEmpty, let relayPort = relayPort {
            addCand(relayIp, relayPort, true)
        }

        // 2. Direct DDNS & WAN ports
        var standardPorts: [Int] = []
        if let userPort = userPort { standardPorts.append(userPort) }
        standardPorts.append(contentsOf: [dsmHttpsPort, 5001, dsmHttpPort, 5000])
        var uniquePorts: [Int] = []
        for p in standardPorts where !uniquePorts.contains(p) {
            uniquePorts.append(p)
        }

        for p in uniquePorts {
            let isH = (p == 5001 || p == dsmHttpsPort || (userHttps ?? true))
            if let ddns = ddns { addCand(ddns, p, isH) }
            if let smartDns = smartDns { addCand(smartDns, p, isH) }
            addCand("\(cleanId).direct.quickconnect.to", p, isH)
            if let wanIp = wanIp { addCand(wanIp, p, isH) }
        }

        // 3. Web Ports (443, 80)
        for p in [443, 80] {
            let isH = (p == 443)
            if let ddns = ddns { addCand(ddns, p, isH) }
            if let wanIp = wanIp { addCand(wanIp, p, isH) }
        }

        // 4. LAN candidates
        if let interfaces = serverObj?["interface"] as? [[String: Any]] {
            for item in interfaces {
                if let ip = item["ip"] as? String, !ip.isEmpty {
                    for p in uniquePorts {
                        let isH = (p == 5001 || p == dsmHttpsPort || (userHttps ?? true))
                        addCand(ip, p, isH)
                    }
                }
            }
        }

        return candidates
    }

    private func probeCandidates(_ candidates: [Candidate]) async -> Candidate? {
        let probeSubset = Array(candidates.prefix(8))
        return await withTaskGroup(of: Candidate?.self) { group in
            for cand in probeSubset {
                group.addTask {
                    let ok = await self.verifyDsmApi(cand)
                    return ok ? cand : nil
                }
            }

            for await result in group {
                if let verified = result {
                    group.cancelAll()
                    return verified
                }
            }
            return nil
        }
    }

    private func verifyDsmApi(_ cand: Candidate) async -> Bool {
        let scheme = cand.isHttps ? "https" : "http"
        guard let url = URL(string: "\(scheme)://\(cand.host):\(cand.port)/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=SYNO.API.Auth") else {
            return false
        }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.timeoutInterval = 4.0
        req.setValue("DSMHelper/1.0", forHTTPHeaderField: "User-Agent")
        req.setValue("*/*", forHTTPHeaderField: "Accept")

        do {
            let (data, response) = try await execute(req)
            guard let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 else { return false }
            let body = String(data: data, encoding: .utf8) ?? ""
            let ctype = httpRes.allHeaderFields["Content-Type"] as? String ?? ""
            let isHtml = body.localizedCaseInsensitiveContains("<html") ||
                body.localizedCaseInsensitiveContains("<!DOCTYPE") ||
                ctype.localizedCaseInsensitiveContains("text/html")
            return !isHtml && (body.contains("\"success\"") || body.contains("SYNO.API.Auth") || ctype.contains("json"))
        } catch {
            return false
        }
    }

    private func execute(_ request: URLRequest) async throws -> (Data, URLResponse) {
        #if canImport(FoundationNetworking)
        return try await withCheckedThrowingContinuation { continuation in
            let task = self.session.dataTask(with: request) { data, response, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else if let data = data, let response = response {
                    continuation.resume(returning: (data, response))
                } else {
                    continuation.resume(throwing: URLError(.badServerResponse))
                }
            }
            task.resume()
        }
        #else
        return try await self.session.data(for: request)
        #endif
    }
}
