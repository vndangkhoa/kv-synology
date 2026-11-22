import XCTest
@testable import KVSynologyCore

final class DSMClientTests: XCTestCase {

    // MARK: - URL Building Tests

    func testUrlBuildingHttpsDefaultPort() async {
        let client = DSMClient.shared
        let config = ConnectionConfig(
            name: "Home NAS",
            host: "192.168.1.100",
            port: 5001,
            https: true,
            account: "admin"
        )
        let session = DsmSession(sid: "test_sid_123", synoToken: "test_syno_token")
        await client.setSession(session, config: config)

        let params = [
            "api": "SYNO.Core.System",
            "version": "1",
            "method": "info"
        ]

        let url = await client.buildGetUrl(path: "/webapi/entry.cgi", params: params)
        XCTAssertNotNil(url)
        XCTAssertEqual(url?.scheme, "https")
        XCTAssertEqual(url?.host, "192.168.1.100")
        XCTAssertEqual(url?.port, 5001)
        XCTAssertEqual(url?.path, "/webapi/entry.cgi")

        guard let components = URLComponents(url: url!, resolvingAgainstBaseURL: false),
              let queryItems = components.queryItems else {
            XCTFail("Failed to parse query components")
            return
        }

        let queryMap = Dictionary(uniqueKeysWithValues: queryItems.map { ($0.name, $0.value ?? "") })
        XCTAssertEqual(queryMap["api"], "SYNO.Core.System")
        XCTAssertEqual(queryMap["version"], "1")
        XCTAssertEqual(queryMap["method"], "info")
        XCTAssertEqual(queryMap["_sid"], "test_sid_123")
        XCTAssertEqual(queryMap["SynoToken"], "test_syno_token")
        XCTAssertEqual(queryMap["_synotoken"], "test_syno_token")
    }

    func testUrlBuildingHttpCustomPort() async {
        let client = DSMClient.shared
        let config = ConnectionConfig(
            host: "nas.local",
            port: 5000,
            https: false,
            account: "user"
        )
        let session = DsmSession(sid: "", synoToken: nil)
        await client.setSession(session, config: config)

        let url = await client.buildGetUrl(path: "/webapi/query.cgi", params: ["query": "all"])
        XCTAssertNotNil(url)
        XCTAssertEqual(url?.scheme, "http")
        XCTAssertEqual(url?.host, "nas.local")
        XCTAssertEqual(url?.port, 5000)
        XCTAssertEqual(url?.path, "/webapi/query.cgi")

        let components = URLComponents(url: url!, resolvingAgainstBaseURL: false)
        let queryMap = Dictionary(uniqueKeysWithValues: (components?.queryItems ?? []).map { ($0.name, $0.value ?? "") })
        XCTAssertEqual(queryMap["query"], "all")
        XCTAssertNil(queryMap["_sid"])
    }

    // MARK: - Query & POST Body Generation Tests

    func testPostQueryBodyGeneration() async {
        let client = DSMClient.shared
        let config = ConnectionConfig(host: "10.0.0.1", port: 5001, https: true)
        let session = DsmSession(sid: "session_abc", synoToken: "token_xyz")
        await client.setSession(session, config: config)

        let params = [
            "api": "SYNO.Core.Process",
            "method": "list",
            "version": "1"
        ]

        let postBody = await client.buildPostQueryString(params: params)
        XCTAssertTrue(postBody.contains("api=SYNO.Core.Process"))
        XCTAssertTrue(postBody.contains("method=list"))
        XCTAssertTrue(postBody.contains("version=1"))
        XCTAssertTrue(postBody.contains("_sid=session_abc"))
        XCTAssertTrue(postBody.contains("SynoToken=token_xyz"))
        XCTAssertTrue(postBody.contains("_synotoken=token_xyz"))
    }

    // MARK: - JSON Decoding Tests

    func testSystemInfoJsonDecoding() throws {
        let info = SystemInfo(
            model: "DS920+",
            serial: "2060QBR123456",
            version: "DSM 7.2.1-69057 Update 3",
            uptime: 864000,
            temperature: 42,
            time: "2026-09-23 06:00:00",
            ramTotal: 8192,
            ramUsed: 3645,
            cpuModel: "Intel Celeron J4125 @ 2.0 GHz",
            cpuCores: 4
        )

        let encoded = try JSONEncoder().encode(info)
        let decoded = try JSONDecoder().decode(SystemInfo.self, from: encoded)

        XCTAssertEqual(decoded.model, "DS920+")
        XCTAssertEqual(decoded.cpuCores, 4)
        XCTAssertEqual(decoded.ramTotal, 8192)
        XCTAssertEqual(decoded.temperature, 42)
        XCTAssertEqual(decoded.serial, "2060QBR123456")
        XCTAssertGreaterThan(decoded.ramUsagePercent, 40.0)
    }

    func testDockerContainerJsonDecoding() throws {
        let container = DockerContainerDetails(
            id: "c1_vaultwarden",
            name: "vaultwarden",
            image: "vaultwarden/server:latest",
            status: "running",
            created: "2026-01-01",
            ports: ["8088:80/tcp"],
            cpuUsage: 1.8,
            memoryUsage: "75 MB",
            uptime: "14 days",
            restartPolicy: "unless-stopped",
            envVars: [DockerEnvVar(key: "WEBSOCKET_ENABLED", value: "true")],
            volumeMounts: [DockerVolumeMount(hostPath: "/volume1/docker/vaultwarden/data", containerPath: "/data", mode: "rw")],
            portBindings: [DockerPortBinding(hostPort: "8088", containerPort: "80", protocolType: "tcp")]
        )

        let data = try JSONEncoder().encode(container)
        let decoded = try JSONDecoder().decode(DockerContainerDetails.self, from: data)

        XCTAssertEqual(decoded.id, "c1_vaultwarden")
        XCTAssertEqual(decoded.name, "vaultwarden")
        XCTAssertEqual(decoded.status, "running")
        XCTAssertEqual(decoded.portBindings.first?.hostPort, "8088")
        XCTAssertEqual(decoded.volumeMounts.first?.containerPath, "/data")
        XCTAssertEqual(decoded.envVars.first?.key, "WEBSOCKET_ENABLED")
    }

    func testDownloadTaskStatusParsing() {
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("2"), .downloading)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("3"), .paused)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("5"), .finished)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("101"), .error)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("downloading"), .downloading)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("complete"), .finished)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("paused"), .paused)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("custom", speedDl: 1024), .downloading)
    }

    // MARK: - Error Handling Tests

    func testDSMAuthErrorDescriptions() {
        let invalidHost = DSMAuthError.invalidHost("bad_host:99999")
        XCTAssertNotNil(invalidHost.errorDescription)
        XCTAssertTrue(invalidHost.errorDescription?.contains("bad_host:99999") == true)

        let error403 = DSMAuthError.accessDenied403
        XCTAssertTrue(error403.errorDescription?.contains("403") == true)

        let credsError = DSMAuthError.invalidCredentials
        XCTAssertTrue(credsError.errorDescription?.contains("mật khẩu") == true)

        let otpReq = DSMAuthError.otpRequired
        XCTAssertTrue(otpReq.errorDescription?.contains("OTP") == true)

        let otpBad = DSMAuthError.otpInvalid
        XCTAssertTrue(otpBad.errorDescription?.contains("hết hạn") == true)

        let customErr = DSMAuthError.unknown(999, "Custom DSM Failure")
        XCTAssertEqual(customErr.errorDescription, "Custom DSM Failure")
    }

    func testDSMClientDemoSession() async {
        let client = DSMClient()
        let demoConfig = ConnectionConfig(name: "Demo Server", host: "demo.synology.local", isDemo: true)
        
        let result = await client.login(config: demoConfig)
        switch result {
        case .success(let session):
            XCTAssertTrue(session.isConnected)
            XCTAssertEqual(session.account, "admin")
            XCTAssertFalse(session.sid.isEmpty)
        case .failure(let error):
            XCTFail("Demo login should succeed, failed with: \(error)")
        }

        let isConn = await client.isConnected()
        XCTAssertTrue(isConn)

        await client.logout()
        let isConnAfterLogout = await client.isConnected()
        XCTAssertFalse(isConnAfterLogout)
    }
}
