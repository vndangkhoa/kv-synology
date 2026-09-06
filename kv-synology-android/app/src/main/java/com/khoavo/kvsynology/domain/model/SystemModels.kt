package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class SystemInfo(
    val model: String = "Synology NAS",
    val serial: String = "",
    val version: String = "DSM 7.2.1",
    val uptime: Long = 0L,
    val temperature: Int = 40,
    val time: String = "",
    val ramTotal: Long = 8192L,
    val ramUsed: Long = 2048L,
    val cpuModel: String = "",
    val cpuCores: Int = 4
)

@Serializable
data class SystemUtilization(
    val cpuPercent: Double = 0.0,
    val memoryPercent: Double = 0.0,
    val memoryUsedMB: Long = 0L,
    val memoryTotalMB: Long = 0L,
    val networkRxBytes: Long = 0L,
    val networkTxBytes: Long = 0L,
    val diskReadBytes: Long = 0L,
    val diskWriteBytes: Long = 0L,
    val timestamp: Long = System.currentTimeMillis()
)

@Serializable
data class DsmProcess(
    val pid: Int,
    val name: String,
    val cpu: Double = 0.0,
    val memory: Double = 0.0,
    val user: String = "root",
    val status: String = "running"
)

@Serializable
data class ChatMessage(
    val role: String,
    val content: String,
    val timestamp: Long = System.currentTimeMillis()
)

