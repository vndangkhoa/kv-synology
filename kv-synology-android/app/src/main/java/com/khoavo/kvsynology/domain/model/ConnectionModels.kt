package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class ConnectionConfig(
    val host: String = "",
    val port: Int = 5001,
    val https: Boolean = true,
    val account: String = "",
    val password: String? = null,
    val otp: String? = null,
    val ignoreCert: Boolean = true,
    val isDemo: Boolean = false
) {
    val baseUrl: String
        get() {
            val scheme = if (https) "https" else "http"
            return "$scheme://$host:$port"
        }
}

@Serializable
data class DsmSession(
    val sid: String = "",
    val synoToken: String? = null,
    val did: String? = null,
    val cookie: String? = null,
    val isConnected: Boolean = false,
    val dsmVersion: Int = 7,
    val versionString: String = "",
    val model: String = "",
    val hostname: String = "",
    val account: String = ""
)
