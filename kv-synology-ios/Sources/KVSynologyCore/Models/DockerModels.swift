import Foundation

/// Port binding between container port and host port.
public struct DockerPortBinding: Codable, Sendable, Hashable {
    public var hostPort: String
    public var containerPort: String
    public var protocolType: String

    public enum CodingKeys: String, CodingKey {
        case hostPort
        case containerPort
        case protocolType = "protocol"
    }

    public init(hostPort: String, containerPort: String, protocolType: String = "tcp") {
        self.hostPort = hostPort
        self.containerPort = containerPort
        self.protocolType = protocolType
    }
}

/// Volume mount between container directory and host directory.
public struct DockerVolumeMount: Codable, Sendable, Hashable {
    public var hostPath: String
    public var containerPath: String
    public var mode: String

    public init(hostPath: String, containerPath: String, mode: String = "rw") {
        self.hostPath = hostPath
        self.containerPath = containerPath
        self.mode = mode
    }
}

/// Container environment variable key-value pair.
public struct DockerEnvVar: Codable, Sendable, Hashable {
    public var key: String
    public var value: String

    public init(key: String, value: String) {
        self.key = key
        self.value = value
    }
}

/// High-level container summary for list views.
public struct DockerContainer: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var image: String
    public var status: String
    public var created: String
    public var ports: [String]
    public var cpuUsage: Double
    public var memoryUsage: String
    public var uptime: String?
    public var restartPolicy: String?

    public init(
        id: String,
        name: String,
        image: String,
        status: String,
        created: String = "",
        ports: [String] = [],
        cpuUsage: Double = 0.0,
        memoryUsage: String = "",
        uptime: String? = nil,
        restartPolicy: String? = nil
    ) {
        self.id = id
        self.name = name
        self.image = image
        self.status = status
        self.created = created
        self.ports = ports
        self.cpuUsage = cpuUsage
        self.memoryUsage = memoryUsage
        self.uptime = uptime
        self.restartPolicy = restartPolicy
    }

    public var isRunning: Bool {
        status.lowercased() == "running"
    }
}

/// Detailed container metadata including env, mounts, port bindings.
public struct DockerContainerDetails: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var image: String
    public var status: String
    public var created: String
    public var ports: [String]
    public var cpuUsage: Double
    public var memoryUsage: String
    public var uptime: String?
    public var restartPolicy: String?
    public var fullId: String?
    public var autoRestart: Bool?
    public var privileged: Bool?
    public var envVars: [DockerEnvVar]
    public var volumeMounts: [DockerVolumeMount]
    public var portBindings: [DockerPortBinding]

    public init(
        id: String,
        name: String,
        image: String,
        status: String,
        created: String = "",
        ports: [String] = [],
        cpuUsage: Double = 0.0,
        memoryUsage: String = "",
        uptime: String? = nil,
        restartPolicy: String? = nil,
        fullId: String? = nil,
        autoRestart: Bool? = nil,
        privileged: Bool? = nil,
        envVars: [DockerEnvVar] = [],
        volumeMounts: [DockerVolumeMount] = [],
        portBindings: [DockerPortBinding] = []
    ) {
        self.id = id
        self.name = name
        self.image = image
        self.status = status
        self.created = created
        self.ports = ports
        self.cpuUsage = cpuUsage
        self.memoryUsage = memoryUsage
        self.uptime = uptime
        self.restartPolicy = restartPolicy
        self.fullId = fullId
        self.autoRestart = autoRestart
        self.privileged = privileged
        self.envVars = envVars
        self.volumeMounts = volumeMounts
        self.portBindings = portBindings
    }

    public var isRunning: Bool {
        status.lowercased() == "running"
    }

    /// Converts to basic DockerContainer.
    public var asBasicContainer: DockerContainer {
        DockerContainer(
            id: id,
            name: name,
            image: image,
            status: status,
            created: created,
            ports: ports,
            cpuUsage: cpuUsage,
            memoryUsage: memoryUsage,
            uptime: uptime,
            restartPolicy: restartPolicy
        )
    }
}

/// Docker Compose service within a project.
public struct DockerProjectService: Codable, Sendable, Identifiable, Hashable {
    public var id: String { name }
    public var name: String
    public var image: String
    public var status: String
    public var ports: [String]

    public init(
        name: String,
        image: String,
        status: String = "running",
        ports: [String] = []
    ) {
        self.name = name
        self.image = image
        self.status = status
        self.ports = ports
    }
}

/// Docker Compose project representation.
public struct DockerProject: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var name: String
    public var status: String
    public var path: String
    public var yamlContent: String
    public var services: [DockerProjectService]
    public var created: String
    public var isPackage: Bool

    public init(
        id: String,
        name: String,
        status: String = "running",
        path: String = "",
        yamlContent: String = "",
        services: [DockerProjectService] = [],
        created: String = "",
        isPackage: Bool = false
    ) {
        self.id = id
        self.name = name
        self.status = status
        self.path = path
        self.yamlContent = yamlContent
        self.services = services
        self.created = created
        self.isPackage = isPackage
    }

    public var isRunning: Bool {
        status.lowercased() == "running"
    }
}

/// Docker image stored locally on the NAS.
public struct DockerImage: Codable, Sendable, Identifiable, Hashable {
    public var id: String
    public var repository: String
    public var tag: String
    public var sizeMB: Int64
    public var sizeFormatted: String
    public var created: String
    public var containersCount: Int
    public var isUsed: Bool

    public init(
        id: String,
        repository: String,
        tag: String = "latest",
        sizeMB: Int64 = 0,
        sizeFormatted: String = "",
        created: String = "",
        containersCount: Int = 0,
        isUsed: Bool = false
    ) {
        self.id = id
        self.repository = repository
        self.tag = tag
        self.sizeMB = sizeMB
        self.sizeFormatted = sizeFormatted.isEmpty ? "\(sizeMB) MB" : sizeFormatted
        self.created = created
        self.containersCount = containersCount
        self.isUsed = isUsed
    }

    public var fullName: String {
        "\(repository):\(tag)"
    }
}
