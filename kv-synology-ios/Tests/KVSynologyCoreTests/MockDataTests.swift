import XCTest
@testable import KVSynologyCore

final class MockDataTests: XCTestCase {

    var mock: MockDSMClient!

    override func setUp() async throws {
        mock = MockDSMClient.shared
    }

    // MARK: - 1. Telemetry & System Tests

    func testMockTelemetryAndSystemInfo() async {
        let info = await mock.getMockSystemInfo()
        XCTAssertEqual(info.model, "DS920+")
        XCTAssertEqual(info.cpuCores, 4)
        XCTAssertGreaterThan(info.ramTotal, 0)
        XCTAssertGreaterThanOrEqual(info.ramUsagePercent, 0)
        XCTAssertLessThanOrEqual(info.ramUsagePercent, 100)
        XCTAssertGreaterThan(info.temperature, 0)
        XCTAssertGreaterThan(info.uptime, 0)
        XCTAssertFalse(info.serial.isEmpty)

        let util = await mock.getMockUtilization()
        XCTAssertGreaterThanOrEqual(util.cpuPercent, 0)
        XCTAssertLessThanOrEqual(util.cpuPercent, 100)
        XCTAssertGreaterThan(util.memoryUsedMB, 0)
        XCTAssertGreaterThan(util.memoryTotalMB, 0)
        XCTAssertGreaterThanOrEqual(util.networkRxBytes, 0)
        XCTAssertGreaterThanOrEqual(util.networkTxBytes, 0)

        let processes = await mock.getMockProcesses()
        XCTAssertFalse(processes.isEmpty)
        XCTAssertTrue(processes.contains(where: { $0.name == "synoscgi" }))
        XCTAssertTrue(processes.contains(where: { $0.pid > 0 }))
    }

    // MARK: - 2. Docker & Container Tests

    func testMockContainerOperations() async {
        let containers = await mock.getMockDockerContainers()
        XCTAssertFalse(containers.isEmpty, "Mock containers should not be empty")

        guard let first = containers.first else {
            XCTFail("Missing container")
            return
        }

        // Test container stop action
        let stopSuccess = await mock.toggleMockDockerContainer(id: first.id, action: "stop")
        XCTAssertTrue(stopSuccess)

        let containersAfterStop = await mock.getMockDockerContainers()
        let stoppedContainer = containersAfterStop.first(where: { $0.id == first.id })
        XCTAssertEqual(stoppedContainer?.status, "stopped")

        // Test container restart/start action
        let startSuccess = await mock.toggleMockDockerContainer(id: first.id, action: "start")
        XCTAssertTrue(startSuccess)

        let containersAfterStart = await mock.getMockDockerContainers()
        let runningContainer = containersAfterStart.first(where: { $0.id == first.id })
        XCTAssertEqual(runningContainer?.status, "running")

        // Test Docker Projects
        let projects = await mock.getMockDockerProjects()
        XCTAssertFalse(projects.isEmpty)
        XCTAssertTrue(projects.contains(where: { !$0.services.isEmpty }))

        // Test Docker Images
        let images = await mock.getMockDockerImages()
        XCTAssertFalse(images.isEmpty)
        XCTAssertTrue(images.contains(where: { $0.repository.contains("vaultwarden") || $0.repository.contains("adguard") }))
    }

    // MARK: - 3. File Station Tests

    func testMockFileStationOperations() async {
        // List root files
        let rootFiles = await mock.getMockFiles(folderPath: "/")
        XCTAssertFalse(rootFiles.isEmpty)
        XCTAssertTrue(rootFiles.contains(where: { $0.name == "docker" && $0.isdir }))

        // File media detection helpers
        let videoFile = DsmFile(path: "/video/sample.mp4", name: "sample.mp4", isdir: false, size: 104_857_600)
        XCTAssertEqual(videoFile.fileExtension, "mp4")
        XCTAssertTrue(videoFile.isVideo)
        XCTAssertTrue(videoFile.isMedia)
        XCTAssertFalse(videoFile.isAudio)

        let audioFile = DsmFile(path: "/music/track.flac", name: "track.flac", isdir: false, size: 31_457_280)
        XCTAssertEqual(audioFile.fileExtension, "flac")
        XCTAssertTrue(audioFile.isAudio)
        XCTAssertTrue(audioFile.isMedia)

        // Folder Creation
        let randomFolderName = "test_dir_\(UUID().uuidString.prefix(6))"
        let created = await mock.createMockFolder(folderPath: "/docker", name: randomFolderName)
        XCTAssertTrue(created)

        // File Content reading & modification
        let configPath = "/docker/synology_config.json"
        let initialContent = await mock.getMockFileContent(path: configPath)
        XCTAssertTrue(initialContent.contains("server_name"))

        let updatedContent = initialContent + "\n// Unit test modified payload"
        let saveSuccess = await mock.saveMockFileContent(path: configPath, content: updatedContent)
        XCTAssertTrue(saveSuccess)

        let readBackContent = await mock.getMockFileContent(path: configPath)
        XCTAssertEqual(readBackContent, updatedContent)
    }

    // MARK: - 4. Download Station Tests

    func testMockDownloadStationOperations() async {
        let initialTasks = await mock.getMockDownloadTasks()
        XCTAssertFalse(initialTasks.isEmpty)

        // Add a new torrent / magnet download task
        let newMagnetUri = "magnet:?xt=urn:btih:dsm72mocktorrent\(UUID().uuidString.prefix(6))"
        let added = await mock.addMockDownloadTask(uri: newMagnetUri, destination: "/volume1/downloads")
        XCTAssertTrue(added)

        let updatedTasks = await mock.getMockDownloadTasks()
        XCTAssertEqual(updatedTasks.count, initialTasks.count + 1)
        XCTAssertTrue(updatedTasks.contains(where: { $0.uri == newMagnetUri }))

        // Toggle task pause/resume
        if let firstTask = updatedTasks.first {
            let paused = await mock.toggleMockDownloadTask(id: firstTask.id, action: "pause")
            XCTAssertTrue(paused)
            let tasksAfterPause = await mock.getMockDownloadTasks()
            XCTAssertEqual(tasksAfterPause.first(where: { $0.id == firstTask.id })?.status, .paused)

            let resumed = await mock.toggleMockDownloadTask(id: firstTask.id, action: "resume")
            XCTAssertTrue(resumed)
            let tasksAfterResume = await mock.getMockDownloadTasks()
            XCTAssertEqual(tasksAfterResume.first(where: { $0.id == firstTask.id })?.status, .downloading)
        }
    }

    // MARK: - 5. Storage Manager Tests

    func testMockStorageManagerVolumesAndDisks() async {
        let volumes = await mock.getMockStorageVolumes()
        XCTAssertFalse(volumes.isEmpty)

        guard let vol1 = volumes.first(where: { $0.id == "volume_1" }) else {
            XCTFail("volume_1 not found")
            return
        }

        XCTAssertEqual(vol1.status, "normal")
        XCTAssertEqual(vol1.fsType, "btrfs")
        XCTAssertGreaterThan(vol1.totalBytes, 0)
        XCTAssertGreaterThan(vol1.usedBytes, 0)
        XCTAssertGreaterThan(vol1.freeBytes, 0)
        XCTAssertEqual(vol1.totalBytes, vol1.usedBytes + vol1.freeBytes)
        XCTAssertGreaterThan(vol1.usedPercent, 0)
        XCTAssertLessThanOrEqual(vol1.usedPercent, 100)

        // Disks & SMART Status
        XCTAssertFalse(vol1.drives.isEmpty)
        for disk in vol1.drives {
            XCTAssertFalse(disk.model.isEmpty)
            XCTAssertFalse(disk.serial.isEmpty)
            XCTAssertEqual(disk.health, "healthy")
            XCTAssertGreaterThan(disk.temp, 0)
        }
    }

    // MARK: - 6. Notifications Tests

    func testMockNotificationStreamAndActions() async {
        let notifications = await mock.getMockNotifications()
        XCTAssertFalse(notifications.isEmpty)

        // Verify categories and severities parsed
        XCTAssertTrue(notifications.contains(where: { $0.category == "security" || $0.category == "system" }))
        XCTAssertTrue(notifications.contains(where: { $0.level == "warning" || $0.level == "info" }))

        // Mark all as read
        let marked = await mock.markAllMockNotificationsRead()
        XCTAssertTrue(marked)

        let notificationsAfterMark = await mock.getMockNotifications()
        XCTAssertTrue(notificationsAfterMark.allSatisfy { $0.read })

        // Clear all notifications
        let cleared = await mock.clearAllMockNotifications()
        XCTAssertTrue(cleared)

        let notificationsAfterClear = await mock.getMockNotifications()
        XCTAssertTrue(notificationsAfterClear.isEmpty)
    }

    // MARK: - 7. Services & Firewall Tests

    func testMockServicesAndFirewall() async {
        let services = await mock.getMockServices()
        XCTAssertFalse(services.isEmpty)
        XCTAssertTrue(services.contains(where: { $0.id == "smb" }))
        XCTAssertTrue(services.contains(where: { $0.id == "ssh" }))

        // Toggle SSH service
        let toggled = await mock.toggleMockService(id: "ssh", enabled: false)
        XCTAssertTrue(toggled)
        let servicesAfter = await mock.getMockServices()
        XCTAssertEqual(servicesAfter.first(where: { $0.id == "ssh" })?.enabled, false)

        // Firewall rules
        let rules = await mock.getMockFirewallRules()
        XCTAssertFalse(rules.isEmpty)
        XCTAssertTrue(rules.contains(where: { $0.action == "allow" }))
    }
}
