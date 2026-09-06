package com.khoavo.kvsynology.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class IpGeoInfo(
    val ip: String,
    val countryCode: String = "VN",
    val countryName: String = "Vietnam",
    val flagEmoji: String = "🇻🇳",
    val isp: String = "Local Network",
    val isPrivate: Boolean = false
)

@Serializable
data class NetworkConnectionItem(
    val id: String,
    val direction: String = "inbound", // "inbound", "outbound", "local"
    val localAddress: String,
    val localPort: Int,
    val remoteAddress: String,
    val remotePort: Int,
    val protocol: String = "TCP",
    val state: String = "ESTABLISHED",
    val processName: String,
    val geo: IpGeoInfo = IpGeoInfo(ip = remoteAddress),
    val rxSpeedBytes: Long = 0L,
    val txSpeedBytes: Long = 0L
)

@Serializable
data class CountryTrafficSummary(
    val countryCode: String,
    val countryName: String,
    val flagEmoji: String,
    val activeConnections: Int,
    val outboundBytes: Long,
    val inboundBytes: Long
)

@Serializable
data class TrafficSummary(
    val totalConnections: Int = 0,
    val outboundConnections: Int = 0,
    val inboundConnections: Int = 0,
    val localConnections: Int = 0,
    val currentOutboundSpeed: Long = 0L,
    val currentInboundSpeed: Long = 0L,
    val topCountries: List<CountryTrafficSummary> = emptyList(),
    val connections: List<NetworkConnectionItem> = emptyList(),
    val interfaces: List<NetworkInterfaceInfo> = emptyList()
)

@Serializable
data class NetworkInterfaceInfo(
    val id: String,
    val name: String,
    val ip: String,
    val mask: String = "255.255.255.0",
    val mac: String,
    val status: String = "up",
    val speedMbps: Int = 1000,
    val rxBytes: Long = 0L,
    val txBytes: Long = 0L
)


