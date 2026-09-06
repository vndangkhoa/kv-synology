package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class FirewallRule(
    val id: String,
    val name: String,
    val ports: String = "all",
    val protocol: String = "all",
    val sourceType: String = "all",
    val sourceValue: String = "all",
    val action: String = "allow",
    val enabled: Boolean = true,
    val order: Int = 1
)

@Serializable
data class FirewallConfig(
    val enabled: Boolean = true,
    val defaultProfile: String = "default",
    val allowUnmatched: Boolean = true,
    val rules: List<FirewallRule> = emptyList()
)

@Serializable
data class AutoBlockConfig(
    val enabled: Boolean = true,
    val attempts: Int = 5,
    val withinMinutes: Int = 10,
    val enableUnblock: Boolean = true,
    val unblockDays: Int = 7,
    val blockedCount: Int = 0,
    val allowedCount: Int = 0
)

@Serializable
data class BlockedIpItem(
    val ip: String,
    val denyTime: String,
    val expireTime: String? = null,
    val country: String? = null
)
