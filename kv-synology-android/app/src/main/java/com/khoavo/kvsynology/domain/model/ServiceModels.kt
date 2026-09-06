package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class ServiceItem(
    val id: String,
    val name: String,
    val displayName: String,
    val description: String,
    val category: String = "file",
    val enabled: Boolean,
    val running: Boolean? = null,
    val status: String = "enabled",
    val port: Int? = null,
    val canToggle: Boolean = true
)

@Serializable
data class TerminalInfo(
    val enableSsh: Boolean = false,
    val enableTelnet: Boolean = false,
    val sshPort: Int = 22,
    val hostname: String? = null
)

@Serializable
data class FileServiceStatus(
    val smbEnabled: Boolean = true,
    val afpEnabled: Boolean = false,
    val nfsEnabled: Boolean = false,
    val ftpEnabled: Boolean = false
)

@Serializable
data class ReverseProxyFrontend(
    val protocol: Int = 1, // 0: HTTP, 1: HTTPS
    val fqdn: String,
    val port: Int,
    val hsts: Boolean = false,
    val http2: Boolean = false
)

@Serializable
data class ReverseProxyBackend(
    val protocol: Int = 0, // 0: HTTP, 1: HTTPS
    val fqdn: String = "localhost",
    val port: Int
)

@Serializable
data class ReverseProxyRule(
    val uuid: String,
    val description: String,
    val frontend: ReverseProxyFrontend,
    val backend: ReverseProxyBackend,
    val proxyConnectTimeout: Int? = null
)

@Serializable
data class ReverseProxyHealthInfo(
    val nginxSyntaxOk: Boolean = true,
    val activeRulesCount: Int = 0,
    val orphanedServicesCount: Int = 0
)
