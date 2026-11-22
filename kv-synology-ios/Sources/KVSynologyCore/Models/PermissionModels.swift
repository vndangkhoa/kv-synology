import Foundation

/// Specific permission bitflags in Synology Windows ACL system.
public struct AclPermission: Codable, Sendable, Hashable {
    public var readData: Bool
    public var writeData: Bool
    public var executeFile: Bool
    public var appendData: Bool
    public var delete: Bool
    public var deleteSubfolderAndFiles: Bool
    public var readAttributes: Bool
    public var writeAttributes: Bool
    public var readExtendedAttributes: Bool
    public var writeExtendedAttributes: Bool
    public var readPermissions: Bool
    public var changePermissions: Bool
    public var takeOwnership: Bool

    public init(
        readData: Bool = false,
        writeData: Bool = false,
        executeFile: Bool = false,
        appendData: Bool = false,
        delete: Bool = false,
        deleteSubfolderAndFiles: Bool = false,
        readAttributes: Bool = false,
        writeAttributes: Bool = false,
        readExtendedAttributes: Bool = false,
        writeExtendedAttributes: Bool = false,
        readPermissions: Bool = false,
        changePermissions: Bool = false,
        takeOwnership: Bool = false
    ) {
        self.readData = readData
        self.writeData = writeData
        self.executeFile = executeFile
        self.appendData = appendData
        self.delete = delete
        self.deleteSubfolderAndFiles = deleteSubfolderAndFiles
        self.readAttributes = readAttributes
        self.writeAttributes = writeAttributes
        self.readExtendedAttributes = readExtendedAttributes
        self.writeExtendedAttributes = writeExtendedAttributes
        self.readPermissions = readPermissions
        self.changePermissions = changePermissions
        self.takeOwnership = takeOwnership
    }

    public static var fullControl: AclPermission {
        AclPermission(
            readData: true, writeData: true, executeFile: true, appendData: true,
            delete: true, deleteSubfolderAndFiles: true, readAttributes: true,
            writeAttributes: true, readExtendedAttributes: true, writeExtendedAttributes: true,
            readPermissions: true, changePermissions: true, takeOwnership: true
        )
    }

    public static var readWrite: AclPermission {
        AclPermission(
            readData: true, writeData: true, executeFile: true, appendData: true,
            delete: true, deleteSubfolderAndFiles: false, readAttributes: true,
            writeAttributes: true, readExtendedAttributes: true, writeExtendedAttributes: true,
            readPermissions: true, changePermissions: false, takeOwnership: false
        )
    }

    public static var readOnly: AclPermission {
        AclPermission(
            readData: true, writeData: false, executeFile: true, appendData: false,
            delete: false, deleteSubfolderAndFiles: false, readAttributes: true,
            writeAttributes: false, readExtendedAttributes: true, writeExtendedAttributes: false,
            readPermissions: true, changePermissions: false, takeOwnership: false
        )
    }
}

/// Application privilege granted to a DSM user or group.
public struct UserPrivilege: Codable, Sendable, Identifiable, Hashable {
    public var id: String { appId }
    public var appId: String
    public var appName: String
    public var isAllowed: Bool

    public init(appId: String, appName: String, isAllowed: Bool = true) {
        self.appId = appId
        self.appName = appName
        self.isAllowed = isAllowed
    }
}

/// DSM user account details.
public struct DsmUser: Codable, Sendable, Identifiable, Hashable {
    public var id: String { name }
    public var name: String
    public var uid: Int
    public var userDescription: String?
    public var email: String?
    public var groups: [String]
    public var status: String
    public var isAdmin: Bool
    public var description: String? { userDescription }

    public enum CodingKeys: String, CodingKey {
        case name
        case uid
        case userDescription = "description"
        case email
        case groups
        case status
        case isAdmin
    }

    public init(
        name: String,
        uid: Int,
        userDescription: String? = nil,
        description: String? = nil,
        email: String? = nil,
        groups: [String] = [],
        status: String = "active",
        isAdmin: Bool = false
    ) {
        self.name = name
        self.uid = uid
        self.userDescription = userDescription ?? description
        self.email = email
        self.groups = groups
        self.status = status
        self.isAdmin = isAdmin
    }
}

/// DSM user group information.
public struct DsmGroup: Codable, Sendable, Identifiable, Hashable {
    public var id: String { name }
    public var name: String
    public var gid: Int
    public var groupDescription: String?
    public var members: [String]
    public var description: String? { groupDescription }

    public enum CodingKeys: String, CodingKey {
        case name
        case gid
        case groupDescription = "description"
        case members
    }

    public init(
        name: String,
        gid: Int,
        groupDescription: String? = nil,
        description: String? = nil,
        members: [String] = []
    ) {
        self.name = name
        self.gid = gid
        self.groupDescription = groupDescription ?? description
        self.members = members
    }
}

/// Basic ACL rights summary for simple representations.
public struct AclRights: Codable, Sendable, Hashable {
    public var read: Bool
    public var write: Bool
    public var execute: Bool
    public var delete: Bool

    public init(read: Bool = false, write: Bool = false, execute: Bool = false, delete: Bool = false) {
        self.read = read
        self.write = write
        self.execute = execute
        self.delete = delete
    }
}

/// Access permission assigned to a specific user or group for a folder.
public struct FolderUserAccess: Codable, Sendable, Identifiable, Hashable {
    public var id: String { "\(targetName)_\(isGroup)" }
    public var targetName: String
    public var isGroup: Bool
    /// "full_control", "read_write", "read_only", "deny"
    public var level: String
    public var inheritance: String
    public var rights: AclRights

    public init(
        targetName: String,
        isGroup: Bool,
        level: String,
        inheritance: String = "direct",
        rights: AclRights = AclRights()
    ) {
        self.targetName = targetName
        self.isGroup = isGroup
        self.level = level
        self.inheritance = inheritance
        self.rights = rights
    }
}

/// Complete ACL inspection for a file or directory.
public struct FolderAclInfo: Codable, Sendable, Hashable {
    public var path: String
    public var owner: String
    public var group: String
    public var posixPerm: String
    public var isAclMode: Bool
    public var accessList: [FolderUserAccess]

    public init(
        path: String,
        owner: String = "admin",
        group: String = "administrators",
        posixPerm: String = "755",
        isAclMode: Bool = true,
        accessList: [FolderUserAccess] = []
    ) {
        self.path = path
        self.owner = owner
        self.group = group
        self.posixPerm = posixPerm
        self.isAclMode = isAclMode
        self.accessList = accessList
    }
}

/// Matrix cell representing permission level and inheritance.
public struct PermissionMatrixCell: Codable, Sendable, Hashable {
    public var level: String
    public var inheritance: String

    public init(level: String, inheritance: String = "direct") {
        self.level = level
        self.inheritance = inheritance
    }
}

/// User by folder permission matrix overview.
public struct PermissionMatrixData: Codable, Sendable, Hashable {
    public var users: [DsmUser]
    public var folders: [String]
    public var matrix: [String: [String: PermissionMatrixCell]]

    public init(
        users: [DsmUser] = [],
        folders: [String] = [],
        matrix: [String: [String: PermissionMatrixCell]] = [:]
    ) {
        self.users = users
        self.folders = folders
        self.matrix = matrix
    }
}
