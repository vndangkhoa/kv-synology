package com.khoavo.kvsynology

import com.khoavo.kvsynology.domain.model.PackageItem
import com.khoavo.kvsynology.presentation.common.formatBytes
import com.khoavo.kvsynology.presentation.common.formatSensorValue
import com.khoavo.kvsynology.presentation.common.formatSpeed
import com.khoavo.kvsynology.presentation.common.formatUptimeHours
import com.khoavo.kvsynology.presentation.packages.isContainerRelated
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FormatTest {

    @Test
    fun `formatBytes uses binary units`() {
        assertEquals("0 B", formatBytes(0))
        assertEquals("512 B", formatBytes(512))
        assertEquals("1.50 KB", formatBytes(1536))
        assertEquals("4.96 MB", formatBytes(5_200_000))
    }

    @Test
    fun `formatSpeed appends per-second`() {
        assertEquals("12.21 KB/s", formatSpeed(12_500))
    }

    @Test
    fun `formatSensorValue is unit-aware`() {
        assertEquals("2.0 %", formatSensorValue(2.0, "%"))
        assertEquals("13.2 h", formatSensorValue(13.2244, "h"))
        assertEquals("0.90 KB/s", formatSensorValue(0.896484375, "KB/s"))
        assertEquals("44.0 °C", formatSensorValue(44.0, "°C"))
        assertEquals("1950 RPM", formatSensorValue(1950.0, "RPM"))
        assertEquals("—", formatSensorValue(null, "%"))
    }

    @Test
    fun `formatUptimeHours renders hours and minutes`() {
        assertEquals("13h 13m", formatUptimeHours(13.2244))
        assertEquals("45m", formatUptimeHours(0.75))
        assertEquals("—", formatUptimeHours(null))
    }

    @Test
    fun `container-related packages are detected`() {
        assertTrue(PackageItem("ContainerManager", "Container Manager", "1.0", "running").isContainerRelated())
        assertTrue(PackageItem("Docker", "Docker", "1.0", "running").isContainerRelated())
        assertFalse(PackageItem("FileStation", "File Station", "1.0", "running").isContainerRelated())
    }
}
