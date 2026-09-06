package com.khoavo.kvsynology

import com.khoavo.kvsynology.domain.model.DownloadTaskStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class DownloadStationStateTest {

    @Test
    fun testNumericStatusMapping() {
        // 1, 9, 11 -> WAITING
        assertEquals(DownloadTaskStatus.WAITING, DownloadTaskStatus.fromDsmStatus("1"))
        assertEquals(DownloadTaskStatus.WAITING, DownloadTaskStatus.fromDsmStatus("9"))
        assertEquals(DownloadTaskStatus.WAITING, DownloadTaskStatus.fromDsmStatus("11"))

        // 2, 4, 6, 10, 12 -> DOWNLOADING
        assertEquals(DownloadTaskStatus.DOWNLOADING, DownloadTaskStatus.fromDsmStatus("2"))
        assertEquals(DownloadTaskStatus.DOWNLOADING, DownloadTaskStatus.fromDsmStatus("4"))
        assertEquals(DownloadTaskStatus.DOWNLOADING, DownloadTaskStatus.fromDsmStatus("6"))
        assertEquals(DownloadTaskStatus.DOWNLOADING, DownloadTaskStatus.fromDsmStatus("10"))
        assertEquals(DownloadTaskStatus.DOWNLOADING, DownloadTaskStatus.fromDsmStatus("12"))

        // 3 -> PAUSED
        assertEquals(DownloadTaskStatus.PAUSED, DownloadTaskStatus.fromDsmStatus("3"))

        // 5, 7, 8 -> FINISHED
        assertEquals(DownloadTaskStatus.FINISHED, DownloadTaskStatus.fromDsmStatus("5"))
        assertEquals(DownloadTaskStatus.FINISHED, DownloadTaskStatus.fromDsmStatus("7"))
        assertEquals(DownloadTaskStatus.FINISHED, DownloadTaskStatus.fromDsmStatus("8"))

        // >= 100 -> ERROR
        assertEquals(DownloadTaskStatus.ERROR, DownloadTaskStatus.fromDsmStatus("101"))
        assertEquals(DownloadTaskStatus.ERROR, DownloadTaskStatus.fromDsmStatus("105"))
        assertEquals(DownloadTaskStatus.ERROR, DownloadTaskStatus.fromDsmStatus("113"))
    }

    @Test
    fun testStringStatusMapping() {
        assertEquals(DownloadTaskStatus.DOWNLOADING, DownloadTaskStatus.fromDsmStatus("downloading"))
        assertEquals(DownloadTaskStatus.WAITING, DownloadTaskStatus.fromDsmStatus("waiting"))
        assertEquals(DownloadTaskStatus.PAUSED, DownloadTaskStatus.fromDsmStatus("paused"))
        assertEquals(DownloadTaskStatus.FINISHED, DownloadTaskStatus.fromDsmStatus("complete"))
        assertEquals(DownloadTaskStatus.ERROR, DownloadTaskStatus.fromDsmStatus("error"))
    }
}
