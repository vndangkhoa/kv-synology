package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class PackageItem(
    val id: String,
    val name: String,
    val version: String,
    val status: String = "running",
    val description: String = "",
    val maintainer: String = "Synology",
    val category: String? = null,
    val iconUrl: String? = null,
    val installed: Boolean = true,
    val hasUpdate: Boolean = false,
    val latestVersion: String? = null
)

@Serializable
data class PackageServer(
    val id: String,
    val name: String,
    val url: String,
    val enabled: Boolean = true,
    val isDefault: Boolean = false
)
