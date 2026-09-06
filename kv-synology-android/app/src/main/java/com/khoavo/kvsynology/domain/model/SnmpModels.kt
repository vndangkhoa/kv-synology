package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class SnmpCredentials(
    val version: String = "v2c",
    val community: String = "public",
    val v3User: String? = null,
    val v3AuthPass: String? = null,
    val v3PrivPass: String? = null
)

@Serializable
data class SnmpSensor(
    val id: String,
    val name: String,
    val kind: String = "ping", // "ping", "cpu", "memory", "traffic", "uptime", "disk"
    val unit: String = "%",
    val value: Double? = null,
    val status: String = "up",
    val history: List<Double> = emptyList()
)

@Serializable
data class SnmpDevice(
    val id: String,
    val name: String,
    val host: String,
    val port: Int = 161,
    val credentials: SnmpCredentials = SnmpCredentials(),
    val sensors: List<SnmpSensor> = emptyList(),
    val status: String = "up"
)
