package com.popwam.mobile.designsystem

import androidx.compose.ui.graphics.Color
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.math.pow

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

    @Test
    fun semanticReadingAndControlRolesMeetTargetContrast() {
        PopIdentityStyle.entries.forEach { identity ->
            listOf(false, true).forEach { dark ->
                val colors = popSemanticColors(identity, dark)
                assertTrue(ratio(colors.textPrimary, colors.backgroundPrimary) >= 4.5f, "$identity primary text")
                assertTrue(ratio(colors.textSecondary, colors.backgroundPrimary) >= 4.5f, "$identity secondary text")
                assertTrue(ratio(colors.textTertiary, colors.backgroundPrimary) >= 4.5f, "$identity tertiary text")
                assertTrue(ratio(colors.primaryAction, colors.onPrimaryAction) >= 4.5f, "$identity primary action")
                assertTrue(ratio(colors.borderDefault, colors.surfacePrimary) >= 3f, "$identity control boundary")
            }
        }
    }

    private fun ratio(first: Color, second: Color): Float {
        fun Color.relativeLuminance(): Float {
            fun channel(value: Float) = if (value <= .04045f) value / 12.92f else
                (((value + .055f) / 1.055f).toDouble()).pow(2.4).toFloat()
            return .2126f * channel(red) + .7152f * channel(green) + .0722f * channel(blue)
        }
        val lighter = maxOf(first.relativeLuminance(), second.relativeLuminance())
        val darker = minOf(first.relativeLuminance(), second.relativeLuminance())
        return (lighter + .05f) / (darker + .05f)
    }
}
