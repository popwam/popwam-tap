package com.popwam.pop.ui.theme

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class PopIdentityThemeTest {
    @Test fun `built in identities retain their specified palettes`() {
        assertEquals(Color(0xFF1E5BFF),PopIdentity.PULSE.primary)
        assertEquals(Color(0xFF0EA5A4),PopIdentity.MINT.primary)
        assertEquals(Color(0xFF7C3AED),PopIdentity.VIOLET.primary)
        assertEquals(Color(0xFFF43F5E),PopIdentity.CORAL.primary)
        assertEquals(Color(0xFFF59E0B),PopIdentity.SOLAR.primary)
        assertEquals(Color(0xFF334155),PopIdentity.GRAPHITE.primary)
    }
    @Test fun `logo resolver uses identity primary by day and accent by night`() {
        assertEquals(Color(0xFF1E5BFF),logoColor(PopIdentity.PULSE,false))
        assertEquals(Color(0xFF60A5FA),logoColor(PopIdentity.PULSE,true))
        assertEquals(Color(0xFFCBD5E1),logoColor(PopIdentity.GRAPHITE,true))
    }
    @Test fun `pro remains a prepared premium identity`() { assertFalse(PopIdentity.PULSE.proOnly); assertEquals(true,PopIdentity.PRO.proOnly) }
}
