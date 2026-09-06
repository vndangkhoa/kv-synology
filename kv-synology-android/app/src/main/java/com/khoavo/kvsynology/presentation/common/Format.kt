package com.khoavo.kvsynology.presentation.common

import java.util.Locale

/** 1536 → "1.50 KB", 5_200_000 → "4.96 MB". */
fun formatBytes(bytes: Long): String {
    if (bytes < 0) return "0 B"
    val units = arrayOf("B", "KB", "MB", "GB", "TB")
    var v = bytes.toDouble()
    var i = 0
    while (v >= 1024 && i < units.lastIndex) {
        v /= 1024
        i++
    }
    return if (i == 0) "$bytes B" else String.format(Locale.US, "%.2f %s", v, units[i])
}

/** Bytes/sec → "12.50 KB/s". */
fun formatSpeed(bytesPerSec: Long): String = "${formatBytes(bytesPerSec)}/s"

/**
 * Sensor reading with unit-aware decimals:
 * % / °C → 1, KB/s / ms / Mbps / min → 2, h → 1, RPM → 0.
 */
fun formatSensorValue(value: Double?, unit: String): String {
    if (value == null || value.isNaN()) return "—"
    val decimals = when (unit.trim()) {
        "%", "°C", "h" -> 1
        "KB/s", "MB/s", "ms", "Mbps", "min" -> 2
        "RPM" -> 0
        else -> 2
    }
    return String.format(Locale.US, "%.${decimals}f %s", value, unit).trim()
}

/** 13.2244 (hours) → "13h 13m". */
fun formatUptimeHours(hours: Double?): String {
    if (hours == null || hours.isNaN() || hours < 0) return "—"
    val totalMin = (hours * 60).toLong()
    val h = totalMin / 60
    val m = totalMin % 60
    return if (h > 0) "${h}h ${m}m" else "${m}m"
}
