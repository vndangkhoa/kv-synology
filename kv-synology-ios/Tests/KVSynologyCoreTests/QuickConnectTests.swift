import XCTest
@testable import KVSynologyCore

final class QuickConnectTests: XCTestCase {

    var resolver: QuickConnectResolver!

    override func setUp() async throws {
        resolver = QuickConnectResolver()
        await resolver.clearCache()
    }

    // MARK: - 1. Regex & Pattern Validation Tests

    func testIsQuickConnectIdValidation() async {
        // Valid QuickConnect IDs
        let validIds = [
            "my-nas",
            "khoa_synology",
            "dsm72",
            "nas2024",
            "home-nas.quickconnect.to",
            "TEST-SERVER.quickconnect.to"
        ]

        for id in validIds {
            let isValid = await resolver.isQuickConnectId(id)
            XCTAssertTrue(isValid, "Expected '\(id)' to be a valid QuickConnect ID")
        }

        // Invalid QuickConnect IDs (Direct IPs, domain names, localhost, ports)
        let invalidIds = [
            "192.168.1.100",
            "10.0.0.1",
            "synology.me",
            "khoavo.synology.me",
            "nas.lan",
            "localhost",
            "my-nas:5001",
            "192.168.1.10:5000",
            "",
            "   "
        ]

        for id in invalidIds {
            let isValid = await resolver.isQuickConnectId(id)
            XCTAssertFalse(isValid, "Expected '\(id)' to NOT be a QuickConnect ID")
        }
    }

    func testConnectionConfigQuickConnectProperties() {
        let qcConfig = ConnectionConfig(host: "my-home-nas", port: 5001)
        XCTAssertTrue(qcConfig.isQuickConnect)
        XCTAssertEqual(qcConfig.quickConnectId, "my-home-nas")

        let fullDomainConfig = ConnectionConfig(host: "my-home-nas.quickconnect.to", port: 5001)
        XCTAssertTrue(fullDomainConfig.isQuickConnect)
        XCTAssertEqual(fullDomainConfig.quickConnectId, "my-home-nas")

        let directIpConfig = ConnectionConfig(host: "192.168.1.50", port: 5001)
        XCTAssertFalse(directIpConfig.isQuickConnect)
        XCTAssertNil(directIpConfig.quickConnectId)
    }

    // MARK: - 2. Candidate Extraction from Serv.php Payload

    func testCandidateExtractionFromMockServPayload() async {
        let mockPayload: [String: Any] = [
            "errno": 0,
            "server": [
                "serverID": "khoa_nas",
                "ddns": "khoavo.synology.me",
                "https_port": 5001,
                "port": 5000,
                "external": [
                    "ip": "203.113.152.12"
                ],
                "interface": [
                    [
                        "ip": "192.168.1.100",
                        "mask": "255.255.255.0"
                    ]
                ]
            ],
            "service": [
                "relay_dn": "relay01.quickconnect.to",
                "relay_port": 5001,
                "relay_ip": "198.51.100.1"
            ],
            "smartdns": [
                "host": "khoa_nas.direct.quickconnect.to"
            ]
        ]

        let candidates = await resolver.extractCandidates(
            cleanId: "khoa_nas",
            parsed: mockPayload,
            userPort: nil,
            userHttps: true
        )

        XCTAssertFalse(candidates.isEmpty, "Candidates list should not be empty")

        // 1. Verify Relay Tunnel endpoints extracted
        XCTAssertTrue(candidates.contains(where: { $0.host == "relay01.quickconnect.to" && $0.port == 5001 && $0.isHttps }))
        XCTAssertTrue(candidates.contains(where: { $0.host == "198.51.100.1" && $0.port == 5001 && $0.isHttps }))

        // 2. Verify DDNS endpoints extracted
        XCTAssertTrue(candidates.contains(where: { $0.host == "khoavo.synology.me" && $0.port == 5001 && $0.isHttps }))

        // 3. Verify Direct QuickConnect subdomain extracted
        XCTAssertTrue(candidates.contains(where: { $0.host == "khoa_nas.direct.quickconnect.to" }))

        // 4. Verify WAN IP extracted
        XCTAssertTrue(candidates.contains(where: { $0.host == "203.113.152.12" }))

        // 5. Verify LAN IP interface extracted
        XCTAssertTrue(candidates.contains(where: { $0.host == "192.168.1.100" && $0.port == 5001 && $0.isHttps }))
    }

    // MARK: - 3. Caching Logic Tests

    func testQuickConnectCachingLifecycle() async {
        let cleanId = "demo_nas"
        let cacheKey = "demo_nas_5001_true"
        let futureExpiration = Int64(Date().timeIntervalSince1970 * 1000) + 600_000

        let target = ResolvedTarget(
            host: "192.168.1.150",
            port: 5001,
            isHttps: true,
            expires: futureExpiration
        )

        // Ensure initially cache is empty
        let initialCache = await resolver.getCached(key: cacheKey)
        XCTAssertNil(initialCache)

        // Store into cache
        await resolver.setCached(key: cacheKey, target: target)
        await resolver.setCached(key: cleanId, target: target)

        // Verify retrieval succeeds
        let retrieved = await resolver.getCached(key: cacheKey)
        XCTAssertNotNil(retrieved)
        XCTAssertEqual(retrieved?.host, "192.168.1.150")
        XCTAssertEqual(retrieved?.port, 5001)
        XCTAssertEqual(retrieved?.isHttps, true)

        // Verify clearCache works
        await resolver.clearCache()
        let afterClear = await resolver.getCached(key: cacheKey)
        XCTAssertNil(afterClear)
    }

    func testResolvedTargetExpiration() {
        let expiredTime = Int64(Date().timeIntervalSince1970 * 1000) - 1000
        let target = ResolvedTarget(host: "10.0.0.2", port: 5001, isHttps: true, expires: expiredTime)
        
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        XCTAssertTrue(target.expires < now, "Target should be expired")
    }
}
