import Foundation

/// Status of a download task in Download Station.
public enum DownloadTaskStatus: String, Codable, Sendable, CaseIterable {
    case downloading = "DOWNLOADING"
    case waiting = "WAITING"
    case paused = "PAUSED"
    case finished = "FINISHED"
    case error = "ERROR"

    /// Maps DSM numeric status codes or string representations to DownloadTaskStatus.
    public static func fromDsmStatus(_ rawStatus: String, speedDl: Int64 = 0) -> DownloadTaskStatus {
        if let numStatus = Int(rawStatus) {
            switch numStatus {
            case 2, 4, 6, 10, 12:
                return .downloading
            case 1, 9, 11:
                return .waiting
            case 5, 7, 8:
                return .finished
            case 3:
                return .paused
            case 100...:
                return .error
            default:
                return .paused
            }
        }
        let lower = rawStatus.lowercased()
        if speedDl > 0 && lower != "finished" && lower != "error" {
            return .downloading
        }
        switch lower {
        case "downloading", "finishing", "hash_checking", "seeding", "extracting":
            return .downloading
        case "waiting", "filehosting_waiting":
            return .waiting
        case "finished", "complete":
            return .finished
        case "paused", "stopped":
            return .paused
        case "error", "failed":
            return .error
        default:
            return .paused
        }
    }
}

/// A download task managed by Download Station.
public struct DownloadTask: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var title: String
    public var size: Int64
    public var status: DownloadTaskStatus
    public var progress: Double
    public var downloadSpeed: Int64
    public var uploadSpeed: Int64
    public var type: String
    public var uri: String?
    public var destination: String?
    public var createdTime: Int64?

    public init(
        id: String,
        title: String,
        size: Int64 = 0,
        status: DownloadTaskStatus = .paused,
        progress: Double = 0.0,
        downloadSpeed: Int64 = 0,
        uploadSpeed: Int64 = 0,
        type: String = "http",
        uri: String? = nil,
        destination: String? = nil,
        createdTime: Int64? = nil
    ) {
        self.id = id
        self.title = title
        self.size = size
        self.status = status
        self.progress = progress
        self.downloadSpeed = downloadSpeed
        self.uploadSpeed = uploadSpeed
        self.type = type
        self.uri = uri
        self.destination = destination
        self.createdTime = createdTime
    }
}

/// Request payload to create a new download task.
public struct DownloadTaskCreateRequest: Codable, Sendable, Hashable {
    public var uri: String
    public var destination: String?
    public var unzipPassword: String?

    public init(uri: String, destination: String? = nil, unzipPassword: String? = nil) {
        self.uri = uri
        self.destination = destination
        self.unzipPassword = unzipPassword
    }
}

/// Global configuration settings for Download Station.
public struct DownloadStationConfig: Codable, Sendable, Hashable {
    public var btMaxDownload: Int64
    public var btMaxUpload: Int64
    public var emuleEnabled: Bool
    public var defaultDestination: String

    public init(
        btMaxDownload: Int64 = 0,
        btMaxUpload: Int64 = 0,
        emuleEnabled: Bool = false,
        defaultDestination: String = ""
    ) {
        self.btMaxDownload = btMaxDownload
        self.btMaxUpload = btMaxUpload
        self.emuleEnabled = emuleEnabled
        self.defaultDestination = defaultDestination
    }
}

/// Live throughput statistics for Download Station.
public struct DownloadStationStatistic: Codable, Sendable, Hashable {
    public var speedDownload: Int64
    public var speedUpload: Int64
    public var emuleSpeedDownload: Int64
    public var emuleSpeedUpload: Int64

    public init(
        speedDownload: Int64 = 0,
        speedUpload: Int64 = 0,
        emuleSpeedDownload: Int64 = 0,
        emuleSpeedUpload: Int64 = 0
    ) {
        self.speedDownload = speedDownload
        self.speedUpload = speedUpload
        self.emuleSpeedDownload = emuleSpeedDownload
        self.emuleSpeedUpload = emuleSpeedUpload
    }
}

/// Subscribed RSS site in Download Station.
public struct RssSite: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var title: String
    public var url: String
    public var enabled: Bool
    public var isUpdating: Bool

    public init(
        id: String,
        title: String,
        url: String,
        enabled: Bool = true,
        isUpdating: Bool = false
    ) {
        self.id = id
        self.title = title
        self.url = url
        self.enabled = enabled
        self.isUpdating = isUpdating
    }
}

/// RSS feed entry item in Download Station.
public struct RssFeed: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var title: String
    public var url: String
    public var description: String?
    public var publishDate: String?
    public var size: Int64

    public init(
        id: String,
        title: String,
        url: String,
        description: String? = nil,
        publishDate: String? = nil,
        size: Int64 = 0
    ) {
        self.id = id
        self.title = title
        self.url = url
        self.description = description
        self.publishDate = publishDate
        self.size = size
    }
}

/// BitTorrent search query result item.
public struct BtSearchResult: Codable, Sendable, Hashable {
    public var title: String
    public var download: String
    public var size: Int64
    public var datetime: String
    public var seednum: Int
    public var leech: Int
    public var category: String

    public init(
        title: String,
        download: String,
        size: Int64 = 0,
        datetime: String = "",
        seednum: Int = 0,
        leech: Int = 0,
        category: String = ""
    ) {
        self.title = title
        self.download = download
        self.size = size
        self.datetime = datetime
        self.seednum = seednum
        self.leech = leech
        self.category = category
    }
}

/// Supported file hosting or BT search module.
public struct HostModule: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var enabled: Bool
    public var hostType: String?
    public var version: String?

    public init(
        id: String,
        name: String,
        enabled: Bool = true,
        hostType: String? = "all",
        version: String? = nil
    ) {
        self.id = id
        self.name = name
        self.enabled = enabled
        self.hostType = hostType
        self.version = version
    }
}
