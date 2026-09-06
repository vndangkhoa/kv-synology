package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class DriveInfo(
    val slot: Int,
    val slotName: String? = null,
    val model: String = "",
    val serial: String = "",
    val status: String = "normal",
    val temp: Int = 35,
    val size: Long = 0L,
    val health: String = "healthy",
    val driveType: String = "HDD",
    val smartStatus: String? = null
)

@Serializable
data class StorageVolume(
    val id: String,
    val name: String,
    val path: String,
    val fsType: String = "btrfs",
    val totalBytes: Long = 0L,
    val usedBytes: Long = 0L,
    val freeBytes: Long = 0L,
    val status: String = "normal",
    val drives: List<DriveInfo> = emptyList(),
    val raidType: String? = "SHR"
) {
    val usedPercent: Int
        get() = if (totalBytes > 0) ((usedBytes.toDouble() / totalBytes) * 100).toInt() else 0
}

@Serializable
data class StoragePool(
    val id: String,
    val name: String,
    val poolPath: String,
    val raidType: String = "SHR",
    val status: String = "normal",
    val totalBytes: Long = 0L,
    val usedBytes: Long = 0L,
    val freeBytes: Long = 0L,
    val drives: List<DriveInfo> = emptyList()
)

@Serializable
data class SmartAttribute(
    val id: Int,
    val name: String,
    val value: Int,
    val worst: Int,
    val threshold: Int,
    val raw: String
)

@Serializable
data class SmartInfo(
    val diskId: String,
    val model: String,
    val serial: String,
    val fwVersion: String = "",
    val smartStatus: String = "healthy",
    val temperature: Int = 35,
    val powerOnHours: Long = 0L,
    val badSectors: Int = 0,
    val attributes: List<SmartAttribute> = emptyList()
)

@Serializable
data class ScrubState(
    val status: String = "idle",
    val progress: Int = 0,
    val poolId: String? = null
)

@Serializable
data class SsdCacheItem(
    val id: String,
    val name: String,
    val type: String = "read_write",
    val status: String = "normal",
    val totalBytes: Long = 0L,
    val usedBytes: Long = 0L
)
