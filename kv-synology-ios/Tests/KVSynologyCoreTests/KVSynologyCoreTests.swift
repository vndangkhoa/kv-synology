import XCTest
@testable import KVSynologyCore

final class KVSynologyCoreTests: XCTestCase {

    // MARK: - Model Tests

    func testConnectionConfigBasics() {
        let config = ConnectionConfig(
            host: "192.168.1.100",
            port: 5001,
            https: true,
            account: "admin"
        )
        XCTAssertEqual(config.baseUrl, "https://192.168.1.100:5001")
        XCTAssertFalse(config.isQuickConnect)
        XCTAssertNil(config.quickConnectId)

        let qcConfig = ConnectionConfig(
            host: "khoavo-synology.quickconnect.to",
            account: "admin"
        )
        XCTAssertTrue(qcConfig.isQuickConnect)
        XCTAssertEqual(qcConfig.quickConnectId, "khoavo-synology")

        let rawIdConfig = ConnectionConfig(
            host: "myquickconnectnas",
            account: "admin"
        )
        XCTAssertTrue(rawIdConfig.isQuickConnect)
        XCTAssertEqual(rawIdConfig.quickConnectId, "myquickconnectnas")
    }

    func testDownloadTaskStatusMapping() {
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("2"), .downloading)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("1"), .waiting)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("5"), .finished)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("3"), .paused)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("105"), .error)

        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("downloading"), .downloading)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("finished"), .finished)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("paused"), .paused)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("error"), .error)
        XCTAssertEqual(DownloadTaskStatus.fromDsmStatus("seeding"), .downloading)
    }

    func testFileItemHelpers() {
        let video = DsmFile(path: "/docker/movie.mp4", name: "movie.mp4", isdir: false)
        XCTAssertTrue(video.isVideo)
        XCTAssertTrue(video.isMedia)
        XCTAssertFalse(video.isAudio)
        XCTAssertEqual(video.fileExtension, "mp4")

        let music = DsmFile(path: "/music/song.flac", name: "song.flac", isdir: false)
        XCTAssertTrue(music.isAudio)
        XCTAssertTrue(music.isMedia)
        XCTAssertFalse(music.isVideo)
        XCTAssertEqual(music.fileExtension, "flac")

        let img = DsmFile(path: "/photos/pic.png", name: "pic.png", isdir: false)
        XCTAssertTrue(img.isImage)
        XCTAssertTrue(img.isMedia)

        let doc = DsmFile(path: "/docs/notes.md", name: "notes.md", isdir: false)
        XCTAssertTrue(doc.isText)
        XCTAssertFalse(doc.isMedia)

        let folder = DsmFile(path: "/photos", name: "photos", isdir: true)
        XCTAssertFalse(folder.isMedia)
        XCTAssertEqual(folder.fileExtension, "")
    }

    func testCodableRoundTrip() throws {
        let original = DockerContainerDetails(
            id: "c1",
            name: "vaultwarden",
            image: "vaultwarden/server:latest",
            status: "running",
            ports: ["8080:80"],
            cpuUsage: 1.5,
            memoryUsage: "45 MB"
        )
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(DockerContainerDetails.self, from: data)
        XCTAssertEqual(original.id, decoded.id)
        XCTAssertEqual(original.name, decoded.name)
        XCTAssertEqual(original.status, decoded.status)
        XCTAssertTrue(decoded.isRunning)
    }

    // MARK: - Mock Engine Tests

    func testMockDSMClientSystem() async {
        let mock = MockDSMClient.shared

        let session = await mock.getMockSession()
        XCTAssertTrue(session.isConnected)
        XCTAssertEqual(session.account, "admin")

        let info = await mock.getMockSystemInfo()
        XCTAssertEqual(info.model, "DS920+")
        XCTAssertEqual(info.cpuCores, 4)
        XCTAssertGreaterThan(info.ramUsagePercent, 0)

        let util = await mock.getMockUtilization()
        XCTAssertGreaterThanOrEqual(util.cpuPercent, 0)
        XCTAssertLessThanOrEqual(util.cpuPercent, 100)
        XCTAssertGreaterThan(util.memoryUsedMB, 0)

        let processes = await mock.getMockProcesses()
        XCTAssertFalse(processes.isEmpty)
        XCTAssertTrue(processes.contains(where: { $0.name == "synoscgi" }))
    }

    func testMockDockerOperations() async {
        let mock = MockDSMClient.shared

        let containers = await mock.getMockDockerContainers()
        XCTAssertFalse(containers.isEmpty)
        guard let first = containers.first else {
            XCTFail("Containers should not be empty")
            return
        }

        // Toggle container
        let ok = await mock.toggleMockDockerContainer(id: first.id, action: "stop")
        XCTAssertTrue(ok)
        let updated = await mock.getMockDockerContainers()
        let matching = updated.first(where: { $0.id == first.id })
        XCTAssertEqual(matching?.status, "stopped")

        // Resume container
        _ = await mock.toggleMockDockerContainer(id: first.id, action: "start")
        let restarted = await mock.getMockDockerContainers()
        XCTAssertEqual(restarted.first(where: { $0.id == first.id })?.status, "running")

        // Projects
        let projects = await mock.getMockDockerProjects()
        XCTAssertFalse(projects.isEmpty)
    }

    func testMockFileStationOperations() async {
        let mock = MockDSMClient.shared

        let rootFiles = await mock.getMockFiles(folderPath: "/")
        XCTAssertFalse(rootFiles.isEmpty)
        XCTAssertTrue(rootFiles.contains(where: { $0.name == "docker" }))

        // Create folder
        let created = await mock.createMockFolder(folderPath: "/", name: "test_folder_\(UUID().uuidString.prefix(4))")
        XCTAssertTrue(created)

        // Read and save file content
        let path = "/docker/synology_config.json"
        let content = await mock.getMockFileContent(path: path)
        XCTAssertTrue(content.contains("server_name"))

        let newContent = content + "\n// modified"
        let saved = await mock.saveMockFileContent(path: path, content: newContent)
        XCTAssertTrue(saved)
        let reloaded = await mock.getMockFileContent(path: path)
        XCTAssertEqual(reloaded, newContent)
    }

    func testMockDownloadTasks() async {
        let mock = MockDSMClient.shared

        let initialTasks = await mock.getMockDownloadTasks()
        XCTAssertFalse(initialTasks.isEmpty)

        let added = await mock.addMockDownloadTask(uri: "https://example.com/test_file.iso")
        XCTAssertTrue(added)

        let tasksAfterAdd = await mock.getMockDownloadTasks()
        XCTAssertEqual(tasksAfterAdd.count, initialTasks.count + 1)
    }

    // MARK: - Storage & Profile Storage Tests

    func testProfileStorage() {
        let storage = ProfileStorage.shared
        storage.clearAllProfiles()

        let profile1 = ConnectionConfig(
            id: "profile_1",
            name: "Home NAS",
            host: "192.168.1.50",
            port: 5001,
            account: "admin",
            password: "supersecretpassword",
            isDemo: false
        )

        storage.saveProfile(profile1, rememberPassword: true)
        storage.setActiveProfileId(profile1.id)

        let profiles = storage.getAllProfiles()
        XCTAssertEqual(profiles.count, 1)
        XCTAssertEqual(profiles.first?.name, "Home NAS")
        XCTAssertEqual(profiles.first?.password, "supersecretpassword")
        XCTAssertEqual(storage.getActiveProfileId(), "profile_1")

        let active = storage.getActiveProfile()
        XCTAssertEqual(active?.id, "profile_1")

        // Delete profile
        storage.deleteProfile(id: "profile_1")
        XCTAssertTrue(storage.getAllProfiles().isEmpty)
    }

    // MARK: - DSMRepository Integration Tests

    func testRepositoryDemoMode() async throws {
        let repo = DSMRepository.shared

        let demoConfig = ConnectionConfig(
            id: "demo_id",
            name: "Demo Mode NAS",
            isDemo: true
        )

        let loginResult = await repo.login(config: demoConfig)
        switch loginResult {
        case .success(let session):
            XCTAssertTrue(session.isConnected)
            XCTAssertEqual(session.model, "DS920+")
        case .failure(let error):
            XCTFail("Demo login failed: \(error)")
        }

        let isDemo = await repo.isDemoSession()
        XCTAssertTrue(isDemo)

        let sysInfo = await repo.getSystemInfo()
        XCTAssertEqual(sysInfo.model, "DS920+")

        let containers = await repo.getContainers()
        XCTAssertFalse(containers.isEmpty)

        let volumes = await repo.getVolumes()
        XCTAssertFalse(volumes.isEmpty)
        XCTAssertEqual(volumes.first?.name, "Volume 1")

        let packages = await repo.getPackages()
        XCTAssertFalse(packages.isEmpty)

        let notifs = await repo.getNotifications()
        XCTAssertFalse(notifs.isEmpty)

        let traffic = await repo.getTrafficSummary()
        XCTAssertGreaterThan(traffic.totalConnections, 0)
    }
}
