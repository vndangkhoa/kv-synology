package com.khoavo.kvsynology

import com.khoavo.kvsynology.presentation.adaptive.FoldPosture
import com.khoavo.kvsynology.presentation.adaptive.WidthClass
import com.khoavo.kvsynology.presentation.adaptive.computeWindowState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AdaptiveWindowStateTest {

    @Test
    fun `width class boundaries match Material adaptive spec`() {
        assertEquals(WidthClass.Compact, WidthClass.forWidthDp(320))
        assertEquals(WidthClass.Compact, WidthClass.forWidthDp(392))
        assertEquals(WidthClass.Compact, WidthClass.forWidthDp(599))
        assertEquals(WidthClass.Medium, WidthClass.forWidthDp(600))
        assertEquals(WidthClass.Medium, WidthClass.forWidthDp(700))
        assertEquals(WidthClass.Medium, WidthClass.forWidthDp(839))
        assertEquals(WidthClass.Expanded, WidthClass.forWidthDp(840))
        assertEquals(WidthClass.Expanded, WidthClass.forWidthDp(1280))
    }

    @Test
    fun `compact phone uses bottom bar and single-column cards`() {
        val state = computeWindowState(widthDp = 392, heightDp = 850)
        assertEquals(WidthClass.Compact, state.widthClass)
        assertTrue(state.isCompact)
        assertFalse(state.isWide)
        assertTrue(state.useBottomBar)
        assertFalse(state.useNavigationRail)
        assertFalse(state.usePermanentSidebar)
        assertFalse(state.isTwoPane)
        assertEquals(2, state.metricGridColumns)
        assertEquals(1, state.cardGridColumns)
        assertEquals(FoldPosture.Flat, state.foldPosture)
    }

    @Test
    fun `cover foldable uses compact navigation`() {
        val state = computeWindowState(widthDp = 320, heightDp = 840)
        assertEquals(WidthClass.Compact, state.widthClass)
        assertTrue(state.useBottomBar)
        assertFalse(state.useNavigationRail)
        assertEquals(1, state.cardGridColumns)
    }

    @Test
    fun `unfolded foldable portrait uses navigation rail and 2-col cards`() {
        val state = computeWindowState(widthDp = 700, heightDp = 840)
        assertEquals(WidthClass.Medium, state.widthClass)
        assertTrue(state.isWide)
        assertFalse(state.useBottomBar)
        assertTrue(state.useNavigationRail)
        assertFalse(state.usePermanentSidebar)
        assertEquals(4, state.metricGridColumns)
        assertEquals(2, state.cardGridColumns)
    }

    @Test
    fun `expanded tablet landscape uses permanent sidebar and two-pane layout`() {
        val state = computeWindowState(widthDp = 1280, heightDp = 800)
        assertEquals(WidthClass.Expanded, state.widthClass)
        assertTrue(state.isLandscape)
        assertFalse(state.useBottomBar)
        assertFalse(state.useNavigationRail)
        assertTrue(state.usePermanentSidebar)
        assertTrue(state.isTwoPane)
        assertEquals(4, state.metricGridColumns)
        assertEquals(2, state.cardGridColumns)
    }

    @Test
    fun `foldable book posture exposes vertical hinge bounds and two-pane`() {
        val state = computeWindowState(
            widthDp = 720,
            heightDp = 840,
            isHalfOpened = true,
            isHorizontalHinge = false,
            hingeTopDp = 0f,
            hingeHeightDp = 840f,
            hingeStartDp = 352f,
            hingeWidthDp = 16f
        )
        assertEquals(FoldPosture.Book, state.foldPosture)
        assertTrue(state.isBook)
        assertFalse(state.isTabletop)
        assertTrue(state.isTwoPane)
        assertEquals(352f, state.hingeStartDp)
        assertEquals(16f, state.hingeWidthDp)
        assertEquals(0f, state.hingeTopDp)
    }

    @Test
    fun `foldable tabletop posture exposes horizontal hinge bounds`() {
        val state = computeWindowState(
            widthDp = 840,
            heightDp = 720,
            isHalfOpened = true,
            isHorizontalHinge = true,
            hingeTopDp = 350f,
            hingeHeightDp = 20f,
            hingeStartDp = 0f,
            hingeWidthDp = 840f
        )
        assertEquals(FoldPosture.Tabletop, state.foldPosture)
        assertTrue(state.isTabletop)
        assertFalse(state.isBook)
        assertEquals(350f, state.hingeTopDp)
        assertEquals(20f, state.hingeHeightDp)
        assertEquals(0f, state.hingeWidthDp)
    }
}
