package com.khoavo.kvsynology.data.local.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "nas_profiles")
data class NasProfileEntity(
    @PrimaryKey
    val id: String, // e.g. "nas_192.168.1.10_5001_admin"
    val name: String,
    val host: String,
    val port: Int = 5001,
    val https: Boolean = true,
    val account: String,
    val ignoreCert: Boolean = true,
    val stay7Days: Boolean = true,
    val remember: Boolean = true,
    val model: String = "Synology NAS",
    val versionString: String = "DSM 7.2",
    val lastConnectedAt: Long = System.currentTimeMillis(),
    val isCurrent: Boolean = false
)
