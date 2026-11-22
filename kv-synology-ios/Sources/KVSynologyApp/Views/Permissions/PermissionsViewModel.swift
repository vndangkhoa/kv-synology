import Foundation
import SwiftUI
import KVSynologyCore

public enum PermissionsTab: String, CaseIterable, Identifiable, Sendable {
    case folders = "Folder ACL"
    case matrix = "Matrix Grid"
    case users = "Users & Groups"
    
    public var id: String { rawValue }
    
    public var iconName: String {
        switch self {
        case .folders: return "folder.badge.person.crop"
        case .matrix: return "square.grid.3x3.fill"
        case .users: return "person.2.fill"
        }
    }
}

public struct FolderTreeNode: Identifiable, Sendable {
    public let id: String
    public let name: String
    public let path: String
    public let children: [FolderTreeNode]?
    
    public init(id: String, name: String, path: String, children: [FolderTreeNode]? = nil) {
        self.id = id
        self.name = name
        self.path = path
        self.children = children
    }
}

@Observable
@MainActor
public final class PermissionsViewModel {
    public var selectedTab: PermissionsTab = .folders
    public var selectedFolder: String = "/volume1/docker"
    
    public var users: [DsmUser] = []
    public var groups: [DsmGroup] = []
    public var folderAcls: [String: FolderAclInfo] = [:]
    public var folderTree: [FolderTreeNode] = []
    public var matrixData: PermissionMatrixData = PermissionMatrixData()
    
    public var isLoading: Bool = false
    public var isSavingAcl: Bool = false
    public var errorMessage: String? = nil
    public var successMessage: String? = nil
    
    private let client: DSMClient?
    
    public init(client: DSMClient? = nil) {
        self.client = client
        loadMockDataIfEmpty()
    }
    
    public var currentFolderAcl: FolderAclInfo? {
        folderAcls[selectedFolder]
    }
    
    public func loadPermissions() async {
        isLoading = true
        errorMessage = nil
        
        do {
            if let client = client {
                let acl = try await client.getFolderAcl(path: selectedFolder)
                folderAcls[selectedFolder] = acl
            } else {
                loadMockDataIfEmpty()
            }
        } catch {
            self.errorMessage = "Failed to load permissions: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    public func selectFolder(_ path: String) async {
        selectedFolder = path
        if folderAcls[path] == nil {
            await loadPermissions()
        }
    }
    
    public func updateUserAccess(folderPath: String, targetName: String, level: String) async {
        isSavingAcl = true
        errorMessage = nil
        
        do {
            if let client = client {
                if var acl = folderAcls[folderPath] {
                    var list = acl.accessList
                    if let idx = list.firstIndex(where: { $0.targetName == targetName }) {
                        list[idx] = FolderUserAccess(
                            targetName: targetName,
                            isGroup: list[idx].isGroup,
                            level: level,
                            inheritance: "direct",
                            rights: levelToRights(level)
                        )
                    }
                    _ = try await client.setFolderAcl(path: folderPath, accessList: list)
                    acl = FolderAclInfo(
                        path: acl.path,
                        owner: acl.owner,
                        group: acl.group,
                        posixPerm: acl.posixPerm,
                        isAclMode: acl.isAclMode,
                        accessList: list
                    )
                    folderAcls[folderPath] = acl
                }
            } else {
                try? await Task.sleep(nanoseconds: 300_000_000)
                if var acl = folderAcls[folderPath] {
                    var list = acl.accessList
                    if let idx = list.firstIndex(where: { $0.targetName == targetName }) {
                        list[idx] = FolderUserAccess(
                            targetName: targetName,
                            isGroup: list[idx].isGroup,
                            level: level,
                            inheritance: "direct",
                            rights: levelToRights(level)
                        )
                    }
                    folderAcls[folderPath] = FolderAclInfo(
                        path: acl.path,
                        owner: acl.owner,
                        group: acl.group,
                        posixPerm: acl.posixPerm,
                        isAclMode: acl.isAclMode,
                        accessList: list
                    )
                }
            }
            
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            successMessage = "Permissions updated for \(targetName)"
        } catch {
            errorMessage = "Failed to update permissions: \(error.localizedDescription)"
        }
        
        isSavingAcl = false
    }
    
    private func levelToRights(_ level: String) -> AclRights {
        switch level.lowercased() {
        case "full_control":
            return AclRights(read: true, write: true, execute: true, delete: true)
        case "read_write":
            return AclRights(read: true, write: true, execute: true, delete: false)
        case "read_only":
            return AclRights(read: true, write: false, execute: true, delete: false)
        default:
            return AclRights(read: false, write: false, execute: false, delete: false)
        }
    }
    
    private func loadMockDataIfEmpty() {
        if folderTree.isEmpty {
            folderTree = [
                FolderTreeNode(id: "node_docker", name: "docker", path: "/volume1/docker", children: [
                    FolderTreeNode(id: "node_docker_vault", name: "vaultwarden", path: "/volume1/docker/vaultwarden"),
                    FolderTreeNode(id: "node_docker_adguard", name: "adguard", path: "/volume1/docker/adguard")
                ]),
                FolderTreeNode(id: "node_video", name: "video", path: "/volume1/video", children: [
                    FolderTreeNode(id: "node_video_movies", name: "Movies", path: "/volume1/video/Movies"),
                    FolderTreeNode(id: "node_video_shows", name: "TV Shows", path: "/volume1/video/TV Shows")
                ]),
                FolderTreeNode(id: "node_homes", name: "homes", path: "/volume1/homes"),
                FolderTreeNode(id: "node_backup", name: "backup", path: "/volume1/backup")
            ]
        }
        
        if folderAcls.isEmpty {
            folderAcls["/volume1/docker"] = FolderAclInfo(
                path: "/volume1/docker",
                owner: "admin",
                group: "administrators",
                posixPerm: "755",
                isAclMode: true,
                accessList: [
                    FolderUserAccess(targetName: "admin", isGroup: false, level: "full_control", inheritance: "direct", rights: AclRights(read: true, write: true, execute: true, delete: true)),
                    FolderUserAccess(targetName: "administrators", isGroup: true, level: "full_control", inheritance: "direct", rights: AclRights(read: true, write: true, execute: true, delete: true)),
                    FolderUserAccess(targetName: "khoavo", isGroup: false, level: "read_write", inheritance: "direct", rights: AclRights(read: true, write: true, execute: true, delete: false)),
                    FolderUserAccess(targetName: "users", isGroup: true, level: "read_only", inheritance: "inherited", rights: AclRights(read: true, write: false, execute: true, delete: false)),
                    FolderUserAccess(targetName: "guest", isGroup: false, level: "deny", inheritance: "direct", rights: AclRights(read: false, write: false, execute: false, delete: false))
                ]
            )
            folderAcls["/volume1/video"] = FolderAclInfo(
                path: "/volume1/video",
                owner: "admin",
                group: "administrators",
                posixPerm: "775",
                isAclMode: true,
                accessList: [
                    FolderUserAccess(targetName: "admin", isGroup: false, level: "full_control", inheritance: "direct", rights: AclRights(read: true, write: true, execute: true, delete: true)),
                    FolderUserAccess(targetName: "users", isGroup: true, level: "read_only", inheritance: "direct", rights: AclRights(read: true, write: false, execute: true, delete: false)),
                    FolderUserAccess(targetName: "guest", isGroup: false, level: "deny", inheritance: "direct", rights: AclRights(read: false, write: false, execute: false, delete: false))
                ]
            )
        }
        
        if users.isEmpty {
            users = [
                DsmUser(name: "admin", uid: 1024, description: "System Administrator", email: "admin@synology.local", groups: ["administrators"], status: "active", isAdmin: true),
                DsmUser(name: "khoavo", uid: 1026, description: "Lead Developer", email: "khoavo@example.com", groups: ["administrators", "users"], status: "active", isAdmin: true),
                DsmUser(name: "guest", uid: 1025, description: "Guest Account", email: nil, groups: ["users"], status: "disabled", isAdmin: false)
            ]
        }
        
        if groups.isEmpty {
            groups = [
                DsmGroup(name: "administrators", gid: 101, description: "Administrators with full root authority", members: ["admin", "khoavo"]),
                DsmGroup(name: "users", gid: 100, description: "Default group for regular domain accounts", members: ["admin", "khoavo", "guest"]),
                DsmGroup(name: "http", gid: 1023, description: "Web daemon & PHP process user group", members: [])
            ]
        }
        
        matrixData = PermissionMatrixData(
            users: users,
            folders: ["/volume1/docker", "/volume1/video", "/volume1/homes", "/volume1/backup"],
            matrix: [
                "admin": [
                    "/volume1/docker": PermissionMatrixCell(level: "full_control", inheritance: "direct"),
                    "/volume1/video": PermissionMatrixCell(level: "full_control", inheritance: "direct"),
                    "/volume1/homes": PermissionMatrixCell(level: "full_control", inheritance: "direct"),
                    "/volume1/backup": PermissionMatrixCell(level: "full_control", inheritance: "direct")
                ],
                "khoavo": [
                    "/volume1/docker": PermissionMatrixCell(level: "read_write", inheritance: "direct"),
                    "/volume1/video": PermissionMatrixCell(level: "read_write", inheritance: "direct"),
                    "/volume1/homes": PermissionMatrixCell(level: "full_control", inheritance: "direct"),
                    "/volume1/backup": PermissionMatrixCell(level: "read_only", inheritance: "inherited")
                ],
                "guest": [
                    "/volume1/docker": PermissionMatrixCell(level: "deny", inheritance: "direct"),
                    "/volume1/video": PermissionMatrixCell(level: "read_only", inheritance: "direct"),
                    "/volume1/homes": PermissionMatrixCell(level: "deny", inheritance: "direct"),
                    "/volume1/backup": PermissionMatrixCell(level: "deny", inheritance: "direct")
                ]
            ]
        )
    }
}
