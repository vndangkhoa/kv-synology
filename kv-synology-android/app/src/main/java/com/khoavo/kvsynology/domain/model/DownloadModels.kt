package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
enum class DownloadTaskStatus {
    DOWNLOADING,
    WAITING,
    PAUSED,
    FINISHED,
    ERROR;

    companion object {
        fun fromDsmStatus(rawStatus: String, speedDl: Long = 0): DownloadTaskStatus {
            val numStatus = rawStatus.toIntOrNull()
            if (numStatus != null) {
                return when {
                    numStatus in listOf(2, 4, 6, 10, 12) -> DOWNLOADING
                    numStatus in listOf(1, 9, 11) -> WAITING
                    numStatus in listOf(5, 7, 8) -> FINISHED
                    numStatus == 3 -> PAUSED
                    numStatus >= 100 -> ERROR
                    else -> PAUSED
                }
            }
            val lower = rawStatus.lowercase()
            return when {
                speedDl > 0 && lower != "finished" && lower != "error" -> DOWNLOADING
                lower in listOf("downloading", "finishing", "hash_checking", "seeding", "extracting") -> DOWNLOADING
                lower in listOf("waiting", "filehosting_waiting") -> WAITING
                lower in listOf("finished", "complete") -> FINISHED
                lower in listOf("paused", "stopped") -> PAUSED
                lower in listOf("error", "failed") -> ERROR
                else -> PAUSED
            }
        }
    }
}

@Serializable
data class DownloadTask(
    val id: String,
    val title: String,
    val size: Long = 0L,
    val status: DownloadTaskStatus = DownloadTaskStatus.PAUSED,
    val progress: Double = 0.0,
    val downloadSpeed: Long = 0L,
    val uploadSpeed: Long = 0L,
    val type: String = "http",
    val uri: String? = null,
    val destination: String? = null,
    val createdTime: Long? = null
)

@Serializable
data class DownloadStationConfig(
    val btMaxDownload: Long = 0L,
    val btMaxUpload: Long = 0L,
    val emuleEnabled: Boolean = false,
    val defaultDestination: String = ""
)

@Serializable
data class DownloadStationStatistic(
    val speedDownload: Long = 0L,
    val speedUpload: Long = 0L,
    val emuleSpeedDownload: Long = 0L,
    val emuleSpeedUpload: Long = 0L
)

@Serializable
data class RssSite(
    val id: String,
    val title: String,
    val url: String,
    val enabled: Boolean = true,
    val isUpdating: Boolean = false
)

@Serializable
data class RssFeed(
    val id: String,
    val title: String,
    val url: String,
    val description: String? = null,
    val publishDate: String? = null,
    val size: Long = 0L
)

@Serializable
data class BtSearchResult(
    val title: String,
    val download: String,
    val size: Long = 0L,
    val datetime: String = "",
    val seednum: Int = 0,
    val leech: Int = 0,
    val category: String = ""
)

@Serializable
data class HostModule(
    val id: String,
    val name: String,
    val enabled: Boolean = true,
    val hostType: String? = "all",
    val version: String? = null
)
