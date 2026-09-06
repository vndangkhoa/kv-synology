package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class DsmUser(
    val name: String,
    val uid: Int,
    val description: String? = null,
    val email: String? = null,
    val groups: List<String> = emptyList(),
    val status: String = "active",
    val isAdmin: Boolean = false
)

@Serializable
data class DsmGroup(
    val name: String,
    val gid: Int,
    val description: String? = null,
    val members: List<String> = emptyList()
)

@Serializable
data class AclRights(
    val read: Boolean = false,
    val write: Boolean = false,
    val execute: Boolean = false,
    val delete: Boolean = false
)

@Serializable
data class FolderUserAccess(
    val targetName: String,
    val isGroup: Boolean,
    val level: String, // "full_control", "read_write", "read_only", "deny"
    val inheritance: String = "direct",
    val rights: AclRights = AclRights()
)

@Serializable
data class FolderAclInfo(
    val path: String,
    val owner: String = "admin",
    val group: String = "administrators",
    val posixPerm: String = "755",
    val isAclMode: Boolean = true,
    val accessList: List<FolderUserAccess> = emptyList()
)

@Serializable
data class PermissionMatrixCell(
    val level: String,
    val inheritance: String = "direct"
)

@Serializable
data class PermissionMatrixData(
    val users: List<DsmUser> = emptyList(),
    val folders: List<String> = emptyList(),
    val matrix: Map<String, Map<String, PermissionMatrixCell>> = emptyMap()
)

@Serializable
data class SecurityAuditItem(
    val id: String,
    val severity: String, // "critical", "warning", "info"
    val title: String,
    val description: String,
    val recommendation: String
)
