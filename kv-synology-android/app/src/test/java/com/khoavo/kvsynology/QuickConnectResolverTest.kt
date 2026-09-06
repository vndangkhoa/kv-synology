package com.khoavo.kvsynology

import com.khoavo.kvsynology.data.remote.quickconnect.QuickConnectResolver
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class QuickConnectResolverTest {

    private lateinit var resolver: QuickConnectResolver

    @Before
    fun setup() {
        resolver = QuickConnectResolver()
    }

    @Test
    fun testIsQuickConnectIdIdentification() {
        assertTrue(resolver.isQuickConnectId("my_synology_id"))
        assertTrue(resolver.isQuickConnectId("ds920plus"))
        assertTrue(resolver.isQuickConnectId("demo.quickconnect.to"))

        assertFalse(resolver.isQuickConnectId("192.168.1.10"))
        assertFalse(resolver.isQuickConnectId("nas.myds.me"))
        assertFalse(resolver.isQuickConnectId("localhost"))
        assertFalse(resolver.isQuickConnectId("10.0.0.1:5001"))
        assertFalse(resolver.isQuickConnectId(""))
    }
}
