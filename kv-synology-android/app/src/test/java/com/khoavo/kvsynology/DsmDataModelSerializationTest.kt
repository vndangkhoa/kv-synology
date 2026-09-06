package com.khoavo.kvsynology

import com.khoavo.kvsynology.domain.model.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class DsmDataModelSerializationTest {

    private val json = Json { ignoreUnknownKeys = true; prettyPrint = true }

    @Test
    fun testConnectionConfigSerialization() {
        val config = ConnectionConfig(
            host = "192.168.1.10",
            port = 5001,
            https = true,
            account = "admin",
            password = "secret_password",
            ignoreCert = true
        )
        val encoded = json.encodeToString(config)
        val decoded = json.decodeFromString<ConnectionConfig>(encoded)

        assertEquals(config.host, decoded.host)
        assertEquals(config.port, decoded.port)
        assertEquals(config.https, decoded.https)
        assertEquals(config.account, decoded.account)
        assertEquals(config.password, decoded.password)
    }

    @Test
    fun testSystemInfoSerialization() {
        val info = SystemInfo(
            model = "DS920+",
            serial = "2170QNR641001",
            version = "DSM 7.2.1",
            uptime = 846200L,
            temperature = 42,
            ramTotal = 8192L,
            ramUsed = 3276L,
            cpuModel = "Intel Celeron J4125",
            cpuCores = 4
        )
        val encoded = json.encodeToString(info)
        val decoded = json.decodeFromString<SystemInfo>(encoded)

        assertEquals("DS920+", decoded.model)
        assertEquals(42, decoded.temperature)
        assertEquals(4, decoded.cpuCores)
    }

    @Test
    fun testFileItemSerialization() {
        val item = FileItem(
            path = "/volume1/media/video.mp4",
            name = "video.mp4",
            isdir = false,
            size = 154200000L,
            mimeType = "video/mp4"
        )
        val encoded = json.encodeToString(item)
        val decoded = json.decodeFromString<FileItem>(encoded)

        assertEquals(item.path, decoded.path)
        assertEquals(true, decoded.isVideo)
        assertEquals("mp4", decoded.extension)
    }

    @Test
    fun testDockerContainerSerialization() {
        val container = DockerContainerDetails(
            id = "c1_vault",
            name = "vaultwarden",
            image = "vaultwarden/server:latest",
            status = "running",
            ports = listOf("8080:80")
        )
        val encoded = json.encodeToString(container)
        val decoded = json.decodeFromString<DockerContainerDetails>(encoded)

        assertEquals("vaultwarden", decoded.name)
        assertEquals("running", decoded.status)
        assertEquals(1, decoded.ports.size)
    }

    @Test
    fun testFirewallRuleSerialization() {
        val rule = FirewallRule(
            id = "fw_1",
            name = "Allow DSM Web",
            ports = "5000,5001",
            protocol = "tcp",
            action = "allow"
        )
        val encoded = json.encodeToString(rule)
        val decoded = json.decodeFromString<FirewallRule>(encoded)

        assertEquals("fw_1", decoded.id)
        assertEquals("allow", decoded.action)
    }
}
