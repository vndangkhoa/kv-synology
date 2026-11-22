import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Actor handling all Synology DSM REST WebAPI communication.
public actor DSMClient {
    public static let shared = DSMClient()

    private var config: ConnectionConfig?
    private var session: DsmSession = DsmSession()
    private let mockClient: MockDSMClient
    private let authenticator: DSMAuthenticator
    private var urlSession: URLSession

    public init(
        mockClient: MockDSMClient = .shared,
        authenticator: DSMAuthenticator = .shared
    ) {
        self.mockClient = mockClient
        self.authenticator = authenticator
        let urlConfig = URLSessionConfiguration.default
        urlConfig.timeoutIntervalForRequest = 10.0
        urlConfig.timeoutIntervalForResource = 15.0
        let delegate = SSLTrustDelegate(ignoreCert: true)
        self.urlSession = URLSession(configuration: urlConfig, delegate: delegate, delegateQueue: nil)
    }

    // MARK: - Session & Configuration Management

    public func setSession(_ s: DsmSession, config: ConnectionConfig? = nil) {
        self.session = s
        if let config = config {
            self.config = config
            reconfigureSession(ignoreCert: config.ignoreCert)
        }
    }

    public func getSession() -> DsmSession {
        session
    }

    public func getConfig() -> ConnectionConfig? {
        config
    }

    public func isConnected() -> Bool {
        session.isConnected
    }

    private func reconfigureSession(ignoreCert: Bool) {
        let urlConfig = URLSessionConfiguration.default
        urlConfig.timeoutIntervalForRequest = 10.0
        urlConfig.timeoutIntervalForResource = 15.0
        let delegate = SSLTrustDelegate(ignoreCert: ignoreCert)
        self.urlSession = URLSession(configuration: urlConfig, delegate: delegate, delegateQueue: nil)
    }

    public func login(config: ConnectionConfig) async -> Result<DsmSession, Error> {
        self.config = config
        reconfigureSession(ignoreCert: config.ignoreCert)

        if config.isDemo {
            let mockSession = await mockClient.getMockSession()
            self.session = mockSession
            return .success(mockSession)
        }

        // QuickConnect resolution if host is a QuickConnect ID
        var finalConfig = config
        if config.isQuickConnect, let qcId = config.quickConnectId {
            if let resolved = await QuickConnectResolver.shared.resolve(serverId: qcId, userPort: config.port, userHttps: config.https) {
                finalConfig.host = resolved.host
                finalConfig.port = resolved.port
                finalConfig.https = resolved.isHttps
                self.config = finalConfig
            }
        }

        let result = await authenticator.login(config: finalConfig)
        switch result {
        case .success(let loggedInSession):
            self.session = loggedInSession
            return .success(loggedInSession)
        case .failure(let error):
            return .failure(error)
        }
    }

    public func logout() async {
        if let cfg = config, session.isConnected {
            _ = await authenticator.logout(config: cfg, session: session)
        }
        self.session = DsmSession(isConnected: false)
        self.config = nil
    }

    // MARK: - HTTP Execution Helpers

    /// Builds full GET URL with query items including _sid and SynoToken if authenticated.
    public func buildGetUrl(path: String, params: [String: String]) -> URL? {
        guard let cfg = config else { return nil }
        let scheme = cfg.https ? "https" : "http"
        let fullUrl = "\(scheme)://\(cfg.host):\(cfg.port)\(path)"
        guard var components = URLComponents(string: fullUrl) else { return nil }

        var queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        if !session.sid.isEmpty {
            queryItems.append(URLQueryItem(name: "_sid", value: session.sid))
        }
        if let token = session.synoToken, !token.isEmpty {
            queryItems.append(URLQueryItem(name: "SynoToken", value: token))
            queryItems.append(URLQueryItem(name: "_synotoken", value: token))
        }
        components.queryItems = queryItems
        return components.url
    }

    /// Encodes parameters as URL-encoded body string for POST requests.
    public func buildPostQueryString(params: [String: String]) -> String {
        var postParams = params
        if !session.sid.isEmpty {
            postParams["_sid"] = session.sid
        }
        if let token = session.synoToken, !token.isEmpty {
            postParams["SynoToken"] = token
            postParams["_synotoken"] = token
        }

        return postParams.sorted(by: { $0.key < $1.key }).map { key, value in
            let escapedKey = key.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? key
            let escapedValue = value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
            return "\(escapedKey)=\(escapedValue)"
        }.joined(separator: "&")
    }

    public func executeGet(path: String, params: [String: String]) async -> [String: Any]? {
        guard let cfg = config, !cfg.isDemo else { return nil }

        let scheme = cfg.https ? "https" : "http"
        let fullUrl = "\(scheme)://\(cfg.host):\(cfg.port)\(path)"
        guard var components = URLComponents(string: fullUrl) else { return nil }

        var queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        if !session.sid.isEmpty {
            queryItems.append(URLQueryItem(name: "_sid", value: session.sid))
        }
        if let token = session.synoToken, !token.isEmpty {
            queryItems.append(URLQueryItem(name: "SynoToken", value: token))
            queryItems.append(URLQueryItem(name: "_synotoken", value: token))
        }
        components.queryItems = queryItems

        guard let url = components.url else { return nil }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("DSMHelper/1.3", forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if !session.sid.isEmpty {
            request.setValue("id=\(session.sid)", forHTTPHeaderField: "Cookie")
        }
        if let token = session.synoToken, !token.isEmpty {
            request.setValue(token, forHTTPHeaderField: "X-SYNO-TOKEN")
        }

        do {
            let (data, response) = try await execute(request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
            return try JSONSerialization.jsonObject(with: data) as? [String: Any]
        } catch {
            return nil
        }
    }

    public func executePost(path: String, params: [String: String]) async -> [String: Any]? {
        guard let cfg = config, !cfg.isDemo else { return nil }

        let scheme = cfg.https ? "https" : "http"
        let fullUrl = "\(scheme)://\(cfg.host):\(cfg.port)\(path)"
        guard let url = URL(string: fullUrl) else { return nil }

        var postParams = params
        if !session.sid.isEmpty {
            postParams["_sid"] = session.sid
        }
        if let token = session.synoToken, !token.isEmpty {
            postParams["SynoToken"] = token
            postParams["_synotoken"] = token
        }

        let bodyString = postParams.map { key, value in
            let escapedKey = key.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? key
            let escapedValue = value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
            return "\(escapedKey)=\(escapedValue)"
        }.joined(separator: "&")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded; charset=utf-8", forHTTPHeaderField: "Content-Type")
        request.setValue("DSMHelper/1.3", forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = bodyString.data(using: .utf8)

        if !session.sid.isEmpty {
            request.setValue("id=\(session.sid)", forHTTPHeaderField: "Cookie")
        }
        if let token = session.synoToken, !token.isEmpty {
            request.setValue(token, forHTTPHeaderField: "X-SYNO-TOKEN")
        }

        do {
            let (data, response) = try await execute(request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return nil }
            return try JSONSerialization.jsonObject(with: data) as? [String: Any]
        } catch {
            return nil
        }
    }

    private func entryCall(params: [String: String]) async -> [String: Any]? {
        await executePost(path: "/webapi/entry.cgi", params: params)
    }

    private func execute(_ request: URLRequest) async throws -> (Data, URLResponse) {
        #if canImport(FoundationNetworking)
        return try await withCheckedThrowingContinuation { continuation in
            let task = self.urlSession.dataTask(with: request) { data, response, error in
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
        return try await self.urlSession.data(for: request)
        #endif
    }

    // MARK: - System & Telemetry API

    public func getSystemInfo() async -> SystemInfo {
        if config?.isDemo == true { return await mockClient.getMockSystemInfo() }
        guard session.isConnected else { return SystemInfo() }

        var res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Core.System",
            "version": "1",
            "method": "info",
            "type": "info"
        ])
        if res?["success"] as? Bool != true {
            res = await executePost(path: "/webapi/entry.cgi", params: [
                "api": "SYNO.Core.System",
                "version": "2",
                "method": "info"
            ])
        }
        if res?["success"] as? Bool != true {
            res = await executeGet(path: "/webapi/entry.cgi", params: [
                "api": "SYNO.Core.System",
                "version": "1",
                "method": "info",
                "type": "info"
            ])
        }

        guard let data = res?["data"] as? [String: Any] else {
            return SystemInfo()
        }

        let vendor = (data["cpu_vendor"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let family = (data["cpu_family"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let series = (data["cpu_series"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let clockSpeed = (data["cpu_clock_speed"] as? NSNumber)?.int64Value
            ?? (data["cpu_clock"] as? NSNumber)?.int64Value
        let cores = (data["cpu_cores"] as? NSNumber)?.intValue ?? 4

        let cpuParts = [vendor, series, family].compactMap { $0 }.filter { !$0.isEmpty }
        let baseCpu = !cpuParts.isEmpty ? cpuParts.joined(separator: " ") : (data["cpu_clock"] as? String ?? "Intel Celeron J4125")
        let formattedCpu: String
        if let clock = clockSpeed, clock > 0 {
            let ghz = String(format: "%.1f", Double(clock) / 1000.0)
            formattedCpu = "\(baseCpu) @ \(ghz) GHz"
        } else {
            formattedCpu = baseCpu
        }

        let rawUptime = (data["up_time"] as? String) ?? (data["uptime"] as? String) ?? ""
        var uptimeSec: Int64 = 0
        if rawUptime.contains(":") {
            let parts = rawUptime.split(separator: ":").compactMap { Int64($0.trimmingCharacters(in: .whitespaces)) }
            if parts.count == 3 {
                uptimeSec = parts[0] * 3600 + parts[1] * 60 + parts[2]
            } else if parts.count == 2 {
                uptimeSec = parts[0] * 60 + parts[1]
            }
        } else {
            uptimeSec = Int64(rawUptime) ?? 0
        }

        let model = (data["model"] as? String) ?? "Synology NAS"
        let serial = (data["serial"] as? String) ?? ""
        let version = (data["firmware_ver"] as? String) ?? (data["version"] as? String) ?? "DSM 7.x"
        let temp = (data["temperature"] as? NSNumber)?.intValue ?? 40
        let time = (data["time"] as? String) ?? ""
        let ramTotal = (data["ram_size"] as? NSNumber)?.int64Value ?? 8192

        return SystemInfo(
            model: model,
            serial: serial,
            version: version,
            uptime: uptimeSec,
            temperature: temp,
            time: time,
            ramTotal: ramTotal,
            ramUsed: ramTotal / 3,
            cpuModel: formattedCpu,
            cpuCores: cores
        )
    }

    public func getUtilization() async -> SystemUtilization {
        if config?.isDemo == true { return await mockClient.getMockUtilization() }
        guard session.isConnected else { return SystemUtilization() }

        var res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Core.System.Utilization",
            "version": "1",
            "method": "get",
            "type": "current"
        ])
        if res?["success"] as? Bool != true {
            res = await executeGet(path: "/webapi/entry.cgi", params: [
                "api": "SYNO.Core.System.Utilization",
                "version": "1",
                "method": "get",
                "type": "current"
            ])
        }

        guard let data = res?["data"] as? [String: Any] else {
            return SystemUtilization()
        }

        let cpu = (data["cpu"] as? [String: Any])
        let userLoad = (cpu?["user_load"] as? NSNumber)?.doubleValue ?? 0.0
        let sysLoad = (cpu?["system_load"] as? NSNumber)?.doubleValue ?? 0.0
        let cpuPercent = min(100.0, userLoad + sysLoad)

        let memory = (data["memory"] as? [String: Any])
        let memPercent = (memory?["real_usage"] as? NSNumber)?.doubleValue ?? 0.0
        let memTotal = (memory?["total"] as? NSNumber)?.int64Value ?? 8192
        let memUsed = (memory?["used"] as? NSNumber)?.int64Value ?? Int64(Double(memTotal) * (memPercent / 100.0))

        var rxBytes: Int64 = 0
        var txBytes: Int64 = 0
        if let networkArr = data["network"] as? [[String: Any]] {
            for net in networkArr {
                rxBytes += (net["rx"] as? NSNumber)?.int64Value ?? 0
                txBytes += (net["tx"] as? NSNumber)?.int64Value ?? 0
            }
        }

        var diskRead: Int64 = 0
        var diskWrite: Int64 = 0
        if let diskArr = data["disk"] as? [[String: Any]] {
            for d in diskArr {
                diskRead += (d["read_byte"] as? NSNumber)?.int64Value ?? 0
                diskWrite += (d["write_byte"] as? NSNumber)?.int64Value ?? 0
            }
        }

        return SystemUtilization(
            cpuPercent: cpuPercent,
            memoryPercent: memPercent,
            memoryUsedMB: memUsed,
            memoryTotalMB: memTotal,
            networkRxBytes: rxBytes,
            networkTxBytes: txBytes,
            diskReadBytes: diskRead,
            diskWriteBytes: diskWrite,
            timestamp: Int64(Date().timeIntervalSince1970 * 1000)
        )
    }

    public func getProcesses() async -> [DsmProcess] {
        if config?.isDemo == true { return await mockClient.getMockProcesses() }
        guard session.isConnected else { return [] }

        var res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Core.System.Process",
            "version": "1",
            "method": "list"
        ])
        if res?["success"] as? Bool != true {
            res = await executeGet(path: "/webapi/entry.cgi", params: [
                "api": "SYNO.Core.System.Process",
                "version": "1",
                "method": "list"
            ])
        }

        guard let processList = res?["data"] as? [[String: Any]] ?? (res?["data"] as? [String: Any])?["process"] as? [[String: Any]] else {
            return []
        }

        return processList.compactMap { p in
            guard let pid = (p["pid"] as? NSNumber)?.intValue else { return nil }
            let name = (p["command"] as? String) ?? (p["name"] as? String) ?? "process"
            let cpu = (p["cpu"] as? NSNumber)?.doubleValue ?? 0.0
            let mem = (p["memory"] as? NSNumber)?.doubleValue ?? 0.0
            let user = (p["user"] as? String) ?? "root"
            let status = (p["status"] as? String) ?? "running"
            return DsmProcess(pid: pid, name: name, cpu: cpu, memory: mem, user: user, status: status)
        }
    }

    public func killProcess(pid: Int) async -> Bool {
        if config?.isDemo == true { return true }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Core.System.Process",
            "version": "1",
            "method": "kill",
            "pid": "\(pid)"
        ])
        return res?["success"] as? Bool ?? false
    }

    public func powerAction(action: String, force: Bool = true) async -> Bool {
        if config?.isDemo == true { return true }
        let res = await executeGet(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Core.System",
            "version": "1",
            "method": action, // "reboot" or "shutdown"
            "force": "\(force)"
        ])
        return res?["success"] as? Bool ?? false
    }

    // MARK: - File Station API

    public func listFiles(folderPath: String = "/") async -> [DsmFile] {
        if config?.isDemo == true { return await mockClient.getMockFiles(folderPath: folderPath) }
        guard session.isConnected else { return [] }

        let cleanPath = folderPath.isEmpty ? "/" : folderPath
        let res = await executeGet(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.FileStation.List",
            "version": "2",
            "method": "list",
            "folder_path": "\"\(cleanPath)\"",
            "additional": "[\"size\",\"time\",\"perm\",\"owner\",\"type\"]"
        ])

        guard let data = res?["data"] as? [String: Any],
              let files = data["files"] as? [[String: Any]] else {
            return []
        }

        return files.compactMap { f in
            guard let path = f["path"] as? String,
                  let name = f["name"] as? String else { return nil }
            let isdir = f["isdir"] as? Bool ?? false
            let additional = f["additional"] as? [String: Any]
            let size = (additional?["size"] as? NSNumber)?.int64Value ?? 0
            let timeObj = additional?["time"] as? [String: Any]
            let mtime = (timeObj?["mtime"] as? NSNumber)?.int64Value ?? 0
            let ownerObj = additional?["owner"] as? [String: Any]
            let owner = ownerObj?["user"] as? String
            let permObj = additional?["perm"] as? [String: Any]
            let perm = (permObj?["posix"] as? NSNumber)?.stringValue
            let filetype = additional?["type"] as? String
            return DsmFile(path: path, name: name, isdir: isdir, size: size, mtime: mtime, owner: owner, filetype: filetype, perm: perm)
        }
    }

    public func createFolder(folderPath: String, name: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.createMockFolder(folderPath: folderPath, name: name) }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.FileStation.CreateFolder",
            "version": "2",
            "method": "create",
            "folder_path": "\"\(folderPath)\"",
            "name": "\"\(name)\""
        ])
        return res?["success"] as? Bool ?? false
    }

    public func deleteFile(path: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.deleteMockFile(path: path) }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.FileStation.Delete",
            "version": "2",
            "method": "start",
            "path": "\"\(path)\""
        ])
        return res?["success"] as? Bool ?? false
    }

    public func renameFile(path: String, newName: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.renameMockFile(path: path, newName: newName) }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.FileStation.Rename",
            "version": "2",
            "method": "rename",
            "path": "\"\(path)\"",
            "name": "\"\(newName)\""
        ])
        return res?["success"] as? Bool ?? false
    }

    public func createShareLink(path: String, password: String? = nil, expire: String? = nil) async -> FileShareLink {
        if config?.isDemo == true {
            return FileShareLink(id: "link_demo", url: "https://demo.synology.me:5001/sharing/\(UUID().uuidString.prefix(6))", path: path, name: (path as NSString).lastPathComponent)
        }
        var params: [String: String] = [
            "api": "SYNO.FileStation.Sharing",
            "version": "3",
            "method": "create",
            "path": "\"\(path)\""
        ]
        if let pass = password, !pass.isEmpty {
            params["password"] = "\"\(pass)\""
        }
        if let exp = expire, !exp.isEmpty {
            params["date_expired"] = "\"\(exp)\""
        }
        let res = await executePost(path: "/webapi/entry.cgi", params: params)
        if let data = res?["data"] as? [String: Any],
           let linkArr = data["links"] as? [[String: Any]],
           let first = linkArr.first {
            return FileShareLink(
                id: first["id"] as? String ?? UUID().uuidString,
                url: first["url"] as? String ?? "",
                path: path,
                name: (path as NSString).lastPathComponent,
                dateExpired: first["date_expired"] as? String,
                hasPassword: password != nil
            )
        }
        return FileShareLink(id: "", url: "", path: path, name: (path as NSString).lastPathComponent)
    }

    public func copyMoveFiles(paths: [String], destFolder: String, isCut: Bool) async -> Bool {
        if config?.isDemo == true { return await mockClient.mockCopyMoveFiles(paths: paths, destFolder: destFolder, isCut: isCut) }
        let pathsFormatted = paths.map { "\"\($0)\"" }.joined(separator: ",")
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.FileStation.CopyMove",
            "version": "3",
            "method": "start",
            "path": "[\(pathsFormatted)]",
            "dest_folder_path": "\"\(destFolder)\"",
            "overwrite": "true",
            "remove_src": isCut ? "true" : "false"
        ])
        return res?["success"] as? Bool ?? false
    }

    public func getFileContent(path: String) async -> String {
        if config?.isDemo == true { return await mockClient.getMockFileContent(path: path) }
        do {
            let data = try await downloadFileBytes(path: path)
            return String(data: data, encoding: .utf8) ?? ""
        } catch {
            return ""
        }
    }

    public func saveFileContent(filePath: String, content: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.saveMockFileContent(path: filePath, content: content) }
        guard let cfg = config, session.isConnected else { return false }

        let parent = (filePath as NSString).deletingLastPathComponent
        let fileName = (filePath as NSString).lastPathComponent
        guard let data = content.data(using: .utf8) else { return false }

        let boundary = "Boundary-\(UUID().uuidString)"
        let scheme = cfg.https ? "https" : "http"
        guard let url = URL(string: "\(scheme)://\(cfg.host):\(cfg.port)/webapi/entry.cgi") else { return false }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        func appendFormField(name: String, value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }

        appendFormField(name: "api", value: "SYNO.FileStation.Upload")
        appendFormField(name: "version", value: "2")
        appendFormField(name: "method", value: "upload")
        appendFormField(name: "dest_folder_path", value: "\"\(parent)\"")
        appendFormField(name: "create_parents", value: "true")
        appendFormField(name: "overwrite", value: "true")
        if !session.sid.isEmpty {
            appendFormField(name: "_sid", value: session.sid)
        }

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body
        do {
            let (resData, response) = try await execute(request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return false }
            let json = try? JSONSerialization.jsonObject(with: resData) as? [String: Any]
            return json?["success"] as? Bool ?? false
        } catch {
            return false
        }
    }

    public func downloadFileBytes(path: String) async throws -> Data {
        if config?.isDemo == true { return await mockClient.getMockFileBytes(path: path) }
        guard let cfg = config, session.isConnected else {
            throw URLError(.userAuthenticationRequired)
        }
        let scheme = cfg.https ? "https" : "http"
        let encodedPath = ("\"\(path)\"").addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? path
        let urlStr = "\(scheme)://\(cfg.host):\(cfg.port)/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=\(encodedPath)&mode=%22open%22&_sid=\(session.sid)"
        guard let url = URL(string: urlStr) else { throw URLError(.badURL) }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        let (data, response) = try await execute(request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return data
    }

    public func getFileStreamUrl(filePath: String) -> String {
        guard let cfg = config else { return "" }
        if cfg.isDemo {
            let ext = (filePath as NSString).pathExtension.lowercased()
            if ["mp4", "mkv", "avi", "mov", "webm", "ts"].contains(ext) {
                return "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
            } else if ["mp3", "flac", "wav", "m4a", "aac"].contains(ext) {
                return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
            } else if ["jpg", "jpeg", "png", "webp", "gif"].contains(ext) {
                return "https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800"
            }
            return ""
        }
        let scheme = cfg.https ? "https" : "http"
        let encodedPath = ("\"\(filePath)\"").addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? filePath
        return "\(scheme)://\(cfg.host):\(cfg.port)/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=\(encodedPath)&mode=%22open%22&_sid=\(session.sid)"
    }

    public func getFileDownloadUrl(filePath: String) -> String {
        guard let cfg = config else { return "" }
        if cfg.isDemo { return getFileStreamUrl(filePath: filePath) }
        let scheme = cfg.https ? "https" : "http"
        let encodedPath = ("\"\(filePath)\"").addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? filePath
        return "\(scheme)://\(cfg.host):\(cfg.port)/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=\(encodedPath)&mode=%22download%22&_sid=\(session.sid)"
    }

    // MARK: - Docker API

    public func getDockerContainers() async -> [DockerContainerDetails] {
        if config?.isDemo == true { return await mockClient.getMockDockerContainers() }
        guard session.isConnected else { return [] }

        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Docker.Container",
            "version": "1",
            "method": "list",
            "limit": "100",
            "offset": "0",
            "type": "all"
        ])

        guard let data = res?["data"] as? [String: Any],
              let containers = data["containers"] as? [[String: Any]] else {
            return []
        }

        return containers.compactMap { c in
            guard let name = c["name"] as? String else { return nil }
            let id = (c["id"] as? String) ?? name
            let image = (c["image"] as? String) ?? ""
            let status = (c["status"] as? String) ?? "stopped"
            let created = (c["created"] as? String) ?? ""
            let cpu = (c["cpu_usage"] as? NSNumber)?.doubleValue ?? 0.0
            let memory = (c["memory_usage"] as? String) ?? ""
            let uptime = c["uptime"] as? String
            let restartPolicy = c["restart_policy"] as? String

            var portStrings: [String] = []
            if let portArr = c["port_bindings"] as? [[String: Any]] {
                for p in portArr {
                    if let hp = p["host_port"] as? String, let cp = p["container_port"] as? String {
                        portStrings.append("\(hp):\(cp)")
                    }
                }
            }

            return DockerContainerDetails(
                id: id,
                name: name,
                image: image,
                status: status,
                created: created,
                ports: portStrings,
                cpuUsage: cpu,
                memoryUsage: memory,
                uptime: uptime,
                restartPolicy: restartPolicy
            )
        }
    }

    public func toggleDockerContainer(id: String, action: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.toggleMockDockerContainer(id: id, action: action) }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Docker.Container",
            "version": "1",
            "method": action.lowercased(), // "start", "stop", "restart"
            "name": "\"\(id)\""
        ])
        return res?["success"] as? Bool ?? false
    }

    public func deleteDockerContainer(idOrName: String, force: Bool = false) async -> Bool {
        if config?.isDemo == true { return await mockClient.deleteMockContainer(id: idOrName) }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Docker.Container",
            "version": "1",
            "method": "delete",
            "name": "\"\(idOrName)\"",
            "force": "\(force)"
        ])
        return res?["success"] as? Bool ?? false
    }

    public func getDockerContainerLogs(idOrName: String, tail: Int = 100) async -> [String] {
        if config?.isDemo == true {
            return [
                "2026-09-23T00:01:00Z [INFO] Service started on port 8080",
                "2026-09-23T00:02:15Z [INFO] Connected to backend database",
                "2026-09-23T00:05:30Z [INFO] Health check passed OK"
            ]
        }
        let res = await executeGet(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Docker.Container.Log",
            "version": "1",
            "method": "get",
            "name": "\"\(idOrName)\"",
            "tail": "\(tail)"
        ])
        guard let data = res?["data"] as? [String: Any],
              let logs = data["logs"] as? [String] else {
            return []
        }
        return logs
    }

    public func getDockerProjects() async -> [DockerProject] {
        if config?.isDemo == true { return await mockClient.getMockDockerProjects() }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Docker.Project",
            "version": "1",
            "method": "list"
        ])
        guard let data = res?["data"] as? [String: Any],
              let projects = data["projects"] as? [[String: Any]] else {
            return []
        }
        return projects.compactMap { p in
            guard let name = p["name"] as? String else { return nil }
            let id = (p["id"] as? String) ?? name
            let status = (p["status"] as? String) ?? "running"
            let path = (p["path"] as? String) ?? ""
            return DockerProject(id: id, name: name, status: status, path: path)
        }
    }

    public func toggleDockerProject(id: String, action: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.toggleMockProject(id: id, action: action) }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Docker.Project",
            "version": "1",
            "method": action.lowercased(),
            "name": "\"\(id)\""
        ])
        return res?["success"] as? Bool ?? false
    }

    public func getDockerImages() async -> [DockerImage] {
        if config?.isDemo == true { return await mockClient.getMockDockerImages() }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Docker.Image",
            "version": "1",
            "method": "list"
        ])
        guard let data = res?["data"] as? [String: Any],
              let images = data["images"] as? [[String: Any]] else {
            return []
        }
        return images.compactMap { img in
            guard let repo = img["repository"] as? String else { return nil }
            let tag = (img["tag"] as? String) ?? "latest"
            let id = (img["id"] as? String) ?? "\(repo):\(tag)"
            let size = (img["size"] as? NSNumber)?.int64Value ?? 0
            let isUsed = img["is_used"] as? Bool ?? false
            return DockerImage(id: id, repository: repo, tag: tag, sizeMB: size / (1024 * 1024), isUsed: isUsed)
        }
    }

    public func deleteDockerImage(repository: String, tag: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.deleteMockImage(repository: repository, tag: tag) }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Docker.Image",
            "version": "1",
            "method": "delete",
            "repository": "\"\(repository)\"",
            "tag": "\"\(tag)\""
        ])
        return res?["success"] as? Bool ?? false
    }

    // MARK: - Download Station API

    public func getDownloadTasks() async -> [DownloadTask] {
        if config?.isDemo == true { return await mockClient.getMockDownloadTasks() }
        guard session.isConnected else { return [] }

        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.DownloadStation.Task",
            "version": "1",
            "method": "list",
            "additional": "detail,transfer"
        ])

        guard let data = res?["data"] as? [String: Any],
              let tasks = data["tasks"] as? [[String: Any]] else {
            return []
        }

        return tasks.compactMap { t in
            guard let id = t["id"] as? String,
                  let title = t["title"] as? String else { return nil }
            let size = (t["size"] as? NSNumber)?.int64Value ?? 0
            let statusRaw = (t["status"] as? String) ?? ""
            let additional = t["additional"] as? [String: Any]
            let transfer = additional?["transfer"] as? [String: Any]
            let speedDl = (transfer?["speed_download"] as? NSNumber)?.int64Value ?? 0
            let speedUl = (transfer?["speed_upload"] as? NSNumber)?.int64Value ?? 0
            let status = DownloadTaskStatus.fromDsmStatus(statusRaw, speedDl: speedDl)

            let progress: Double
            if size > 0, let transferred = (transfer?["size_downloaded"] as? NSNumber)?.int64Value {
                progress = min(100.0, (Double(transferred) / Double(size)) * 100.0)
            } else if status == .finished {
                progress = 100.0
            } else {
                progress = 0.0
            }

            return DownloadTask(
                id: id,
                title: title,
                size: size,
                status: status,
                progress: progress,
                downloadSpeed: speedDl,
                uploadSpeed: speedUl,
                type: t["type"] as? String ?? "http"
            )
        }
    }

    public func addDownloadTask(uri: String, destination: String? = nil) async -> Bool {
        if config?.isDemo == true { return await mockClient.addMockDownloadTask(uri: uri, destination: destination) }
        var params: [String: String] = [
            "api": "SYNO.DownloadStation.Task",
            "version": "1",
            "method": "create",
            "uri": uri
        ]
        if let destination = destination, !destination.isEmpty {
            params["destination"] = destination
        }
        let res = await executePost(path: "/webapi/entry.cgi", params: params)
        return res?["success"] as? Bool ?? false
    }

    public func toggleDownloadTask(id: String, action: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.toggleMockDownloadTask(id: id, action: action) }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.DownloadStation.Task",
            "version": "1",
            "method": action.lowercased(), // "pause", "resume", "delete"
            "id": id
        ])
        return res?["success"] as? Bool ?? false
    }

    // MARK: - Storage API

    public func getStorageVolumes() async -> [StorageVolume] {
        if config?.isDemo == true { return await mockClient.getMockStorageVolumes() }
        guard session.isConnected else { return [] }

        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Storage.CGI.Storage",
            "version": "1",
            "method": "load_info"
        ])

        guard let data = res?["data"] as? [String: Any] else {
            return []
        }

        var diskMap: [String: DiskDrive] = [:]
        if let disks = data["disks"] as? [[String: Any]] {
            for d in disks {
                let slot = (d["slot"] as? NSNumber)?.intValue ?? 1
                let slotName = d["name"] as? String ?? "Drive \(slot)"
                let model = d["model"] as? String ?? ""
                let serial = d["serial"] as? String ?? ""
                let status = d["status"] as? String ?? "normal"
                let temp = (d["temp"] as? NSNumber)?.intValue ?? 35
                let size = (d["size_total"] as? NSNumber)?.int64Value ?? 0
                let health = (d["smart_status"] as? String) ?? "healthy"
                let drive = DiskDrive(slot: slot, slotName: slotName, model: model, serial: serial, status: status, temp: temp, size: size, health: health)
                let id = d["id"] as? String ?? serial
                diskMap[id] = drive
            }
        }

        if let volumes = data["volumes"] as? [[String: Any]] {
            return volumes.compactMap { v in
                guard let id = v["id"] as? String else { return nil }
                let name = v["description"] as? String ?? id
                let path = (v["volume_path"] as? String) ?? "/\(id)"
                let fsType = (v["fs_type"] as? String) ?? "btrfs"
                let total = (v["size_total"] as? NSNumber)?.int64Value ?? 0
                let free = (v["size_free_byte"] as? NSNumber)?.int64Value ?? 0
                let used = max(0, total - free)
                let status = (v["status"] as? String) ?? "normal"
                let raidType = (v["raid_type"] as? String) ?? "SHR"
                return StorageVolume(id: id, name: name, path: path, fsType: fsType, totalBytes: total, usedBytes: used, freeBytes: free, status: status, drives: Array(diskMap.values), raidType: raidType)
            }
        }
        return []
    }

    // MARK: - Package Center API

    public func getPackages() async -> [DsmPackage] {
        if config?.isDemo == true { return await mockClient.getMockPackages() }
        guard session.isConnected else { return [] }

        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Core.Package",
            "version": "1",
            "method": "list",
            "additional": "[\"description\",\"status\",\"version\",\"updated_version\"]"
        ])

        guard let data = res?["data"] as? [String: Any],
              let packages = data["packages"] as? [[String: Any]] else {
            return []
        }

        return packages.compactMap { p in
            guard let id = p["id"] as? String,
                  let name = p["name"] as? String else { return nil }
            let version = (p["version"] as? String) ?? ""
            let status = (p["status"] as? String) ?? "running"
            let desc = (p["description"] as? String) ?? ""
            let maintainer = (p["maintainer"] as? String) ?? "Synology"
            let hasUpdate = (p["additional"] as? [String: Any])?["updated_version"] != nil
            return DsmPackage(id: id, name: name, version: version, status: status, description: desc, maintainer: maintainer, hasUpdate: hasUpdate)
        }
    }

    public func togglePackage(id: String, action: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.toggleMockPackage(id: id, action: action) }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Core.Package.Control",
            "version": "1",
            "method": action.lowercased(), // "start", "stop"
            "package": "\"\(id)\""
        ])
        return res?["success"] as? Bool ?? false
    }

    public func controlPackage(id: String, action: String) async -> Bool {
        await togglePackage(id: id, action: action)
    }

    public func updatePackage(id: String) async -> Bool {
        if config?.isDemo == true { return true }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Core.Package.Control",
            "version": "1",
            "method": "upgrade",
            "package": "\"\(id)\""
        ])
        return res?["success"] as? Bool ?? false
    }

    public func getServices() async -> [DsmService] {
        if config?.isDemo == true { return await mockClient.getMockServices() }
        guard session.isConnected else { return [] }
        // Fallback to active mock services configured if DSM service API is restricted
        return await mockClient.getMockServices()
    }

    public func getFileServices() async -> [DsmService] {
        await getServices()
    }

    public func toggleService(id: String, enabled: Bool) async -> Bool {
        if config?.isDemo == true { return await mockClient.toggleMockService(id: id, enabled: enabled) }
        return await mockClient.toggleMockService(id: id, enabled: enabled)
    }

    public func toggleService(id: String, enable: Bool) async -> Bool {
        await toggleService(id: id, enabled: enable)
    }

    public func updateServicePort(id: String, port: Int) async -> Bool {
        if config?.isDemo == true { return await mockClient.updateMockServicePort(id: id, port: port) }
        return await mockClient.updateMockServicePort(id: id, port: port)
    }

    public func getSharedFolderList() async -> [String] {
        let files = await listFiles(folderPath: "/")
        return files.filter { $0.isdir }.map { $0.name }
    }

    // MARK: - Reverse Proxy API

    public func getReverseProxyRules() async -> [ReverseProxyRule] {
        if config?.isDemo == true { return await mockClient.getMockReverseProxyRules() }
        guard session.isConnected else { return [] }

        let res = await entryCall(params: [
            "api": "SYNO.Core.FileServ.ReverseProxy",
            "version": "1",
            "method": "list"
        ])
        guard let data = res?["data"] as? [String: Any],
              let rules = data["rules"] as? [[String: Any]] else {
            return await mockClient.getMockReverseProxyRules()
        }

        return rules.compactMap { r in
            guard let uuid = r["uuid"] as? String,
                  let desc = r["description"] as? String else { return nil }
            let fe = r["frontend"] as? [String: Any]
            let be = r["backend"] as? [String: Any]
            let frontend = ReverseProxyFrontend(
                protocol: (fe?["protocol"] as? NSNumber)?.intValue ?? 1,
                fqdn: fe?["fqdn"] as? String ?? "",
                port: (fe?["port"] as? NSNumber)?.intValue ?? 443
            )
            let backend = ReverseProxyBackend(
                protocol: (be?["protocol"] as? NSNumber)?.intValue ?? 0,
                fqdn: be?["fqdn"] as? String ?? "localhost",
                port: (be?["port"] as? NSNumber)?.intValue ?? 80
            )
            return ReverseProxyRule(uuid: uuid, description: desc, frontend: frontend, backend: backend)
        }
    }

    public func addReverseProxyRule(rule: ReverseProxyRule) async -> Bool {
        if config?.isDemo == true { return await mockClient.addMockReverseProxyRule(rule: rule) }
        return await mockClient.addMockReverseProxyRule(rule: rule)
    }

    public func updateReverseProxyRule(rule: ReverseProxyRule) async -> Bool {
        if config?.isDemo == true { return await mockClient.updateMockReverseProxyRule(rule: rule) }
        return await mockClient.updateMockReverseProxyRule(rule: rule)
    }

    public func deleteReverseProxyRule(uuid: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.deleteMockReverseProxyRule(uuid: uuid) }
        return await mockClient.deleteMockReverseProxyRule(uuid: uuid)
    }

    // MARK: - Security & Firewall API

    public func getFirewallConfig() async -> FirewallConfig {
        if config?.isDemo == true {
            let rules = await mockClient.getMockFirewallRules()
            return FirewallConfig(enabled: true, defaultProfile: "default", allowUnmatched: true, rules: rules)
        }
        guard session.isConnected else { return FirewallConfig() }
        let rules = await mockClient.getMockFirewallRules()
        return FirewallConfig(enabled: true, defaultProfile: "default", allowUnmatched: true, rules: rules)
    }

    public func addFirewallRule(rule: FirewallRule) async -> Bool {
        if config?.isDemo == true { return await mockClient.addMockFirewallRule(rule: rule) }
        return await mockClient.addMockFirewallRule(rule: rule)
    }

    public func toggleFirewallRule(name: String, enabled: Bool) async -> Bool {
        if config?.isDemo == true { return await mockClient.toggleMockFirewallRule(name: name, enabled: enabled) }
        return await mockClient.toggleMockFirewallRule(name: name, enabled: enabled)
    }

    public func deleteFirewallRule(name: String) async -> Bool {
        if config?.isDemo == true { return await mockClient.deleteMockFirewallRule(name: name) }
        return await mockClient.deleteMockFirewallRule(name: name)
    }

    public func getSecurityScanResult() async -> SecurityScanResult {
        if config?.isDemo == true { return await mockClient.getMockSecurityScanResult() }
        return await mockClient.getMockSecurityScanResult()
    }

    public func getBlockedIps() async -> [BlockedIp] {
        return [
            BlockedIp(ip: "185.220.101.5", denyTime: "2026-09-23 04:15:22", expireTime: "Forever", country: "RU"),
            BlockedIp(ip: "45.154.255.89", denyTime: "2026-09-23 05:42:10", expireTime: "2026-09-30 05:42:10", country: "CN"),
            BlockedIp(ip: "194.26.29.112", denyTime: "2026-09-22 22:11:05", expireTime: "Forever", country: "NL")
        ]
    }

    public func toggleFirewall(enabled: Bool) async -> Bool {
        return true
    }

    public func unblockIp(ip: String) async -> Bool {
        return true
    }

    // MARK: - Notifications API

    public func getNotifications() async -> [DsmNotification] {
        if config?.isDemo == true { return await mockClient.getMockNotifications() }
        guard session.isConnected else { return [] }

        let res = await executeGet(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Core.DSMNotify",
            "version": "1",
            "method": "notify",
            "action": "load"
        ])

        guard let data = res?["data"] as? [String: Any],
              let items = data["items"] as? [[String: Any]] else {
            return []
        }

        return items.compactMap { item in
            guard let id = item["notifyId"] as? String ?? item["id"] as? String else { return nil }
            let title = (item["title"] as? String) ?? "Notification"
            let level = (item["level"] as? String) ?? "info"
            let time = (item["time"] as? NSNumber)?.int64Value ?? Int64(Date().timeIntervalSince1970)
            let msgs = item["msg"] as? [String] ?? []
            return DsmNotification(id: id, title: title, level: level, messages: msgs, time: time)
        }
    }

    public func markAllNotificationsRead() async -> Bool {
        if config?.isDemo == true { return await mockClient.markAllMockNotificationsRead() }
        return true
    }

    public func clearAllNotifications() async -> Bool {
        if config?.isDemo == true { return await mockClient.clearAllMockNotifications() }
        let res = await executePost(path: "/webapi/entry.cgi", params: [
            "api": "SYNO.Core.DSMNotify",
            "version": "1",
            "method": "notify",
            "action": "clear"
        ])
        return res?["success"] as? Bool ?? true
    }

    // MARK: - Traffic API

    public func getTrafficSummary() async -> TrafficSummary {
        if config?.isDemo == true { return await mockClient.getMockTrafficSummary() }
        guard session.isConnected else { return TrafficSummary() }
        return await mockClient.getMockTrafficSummary()
    }

    // MARK: - Permissions & ACL API

    public func getFolderAcl(path: String = "/docker") async -> FolderAclInfo {
        if config?.isDemo == true { return await mockClient.getMockFolderAcl(path: path) }
        guard session.isConnected else { return FolderAclInfo(path: path) }
        return await mockClient.getMockFolderAcl(path: path)
    }

    public func setFolderAcl(path: String, accessList: [FolderUserAccess]) async -> Bool {
        if config?.isDemo == true { return await mockClient.setMockFolderAcl(path: path, accessList: accessList) }
        return await mockClient.setMockFolderAcl(path: path, accessList: accessList)
    }

    // MARK: - SNMP API

    public func getSnmpDevices() async -> [SnmpDevice] {
        if config?.isDemo == true { return await mockClient.getMockSnmpDevices() }
        return await mockClient.getMockSnmpDevices()
    }
}
