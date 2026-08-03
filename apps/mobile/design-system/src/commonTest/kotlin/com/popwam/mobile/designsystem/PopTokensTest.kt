package com.popwam.mobile.designsystem

import androidx.compose.ui.graphics.Color
import kotlin.test.Test
import kotlin.test.assertEquals

class PopTokensTest {
    @Test
    fun usesApprovedReferenceFrameAndIdentityPrimaries() {
        assertEquals(393f, PopReferenceFrame.width.value)
        assertEquals(852f, PopReferenceFrame.height.value)
        assertEquals(Color(0xFF1E5BFF), PopIdentityStyle.PULSE.primary)
        assertEquals(Color(0xFF0EA5A4), PopIdentityStyle.MINT.primary)
        assertEquals(Color(0xFF7C3AED), PopIdentityStyle.VIOLET.primary)
        assertEquals(Color(0xFFF43F5E), PopIdentityStyle.CORAL.primary)
        assertEquals(Color(0xFFF59E0B), PopIdentityStyle.SOLAR.primary)
        assertEquals(Color(0xFF334155), PopIdentityStyle.GRAPHITE.primary)
    }

    @Test
    fun languageDirectionIsExplicitAndLocaleSafe() {
        assertEquals(PopScriptDirection.RTL, languageDirection("ar"))
        assertEquals(PopScriptDirection.RTL, languageDirection("ar-EG"))
        assertEquals(PopScriptDirection.LTR, languageDirection("en"))
        assertEquals(PopScriptDirection.LTR, languageDirection("fr"))
    }
}

