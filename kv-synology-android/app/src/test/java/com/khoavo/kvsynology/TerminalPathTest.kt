package com.khoavo.kvsynology

import com.khoavo.kvsynology.presentation.terminal.resolveRemotePath
import com.khoavo.kvsynology.presentation.terminal.shQuote
import org.junit.Assert.assertEquals
import org.junit.Test

class TerminalPathTest {

    @Test
    fun `cd with blank arg goes home`() {
        assertEquals("/var/services/homes/admin", resolveRemotePath("/volume1", "", "/var/services/homes/admin"))
        assertEquals("/root", resolveRemotePath("/volume1", "~", "/root"))
    }

    @Test
    fun `cd absolute path normalizes dots`() {
        assertEquals("/volume2", resolveRemotePath("/volume1", "/volume2/", "/root"))
        assertEquals("/", resolveRemotePath("/volume1/a", "/../..", "/root"))
        assertEquals("/a/c", resolveRemotePath("/", "/a/b/../c", "/root"))
    }

    @Test
    fun `cd relative path resolves against current`() {
        assertEquals("/volume1/docker", resolveRemotePath("/volume1", "docker", "/root"))
        assertEquals("/volume1", resolveRemotePath("/volume1/docker", "..", "/root"))
        assertEquals("/", resolveRemotePath("/", "..", "/root"))
        assertEquals("/volume1/docker", resolveRemotePath("/volume1", "./docker", "/root"))
    }

    @Test
    fun `cd tilde expands to home`() {
        assertEquals("/root", resolveRemotePath("/volume2/x", "~", "/root"))
        assertEquals("/root/bin", resolveRemotePath("/volume2", "~/bin", "/root"))
    }

    @Test
    fun `shQuote escapes single quotes`() {
        assertEquals("'/volume1/my dir'", shQuote("/volume1/my dir"))
        assertEquals("'a'\\''b'", shQuote("a'b"))
    }
}
