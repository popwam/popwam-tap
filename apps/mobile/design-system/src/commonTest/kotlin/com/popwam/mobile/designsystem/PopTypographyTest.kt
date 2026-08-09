package com.popwam.mobile.designsystem

import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PopTypographyTest {
    private val fonts = PopFontFamilies(
        englishMontserrat = FontFamily.SansSerif,
        arabicCairo = FontFamily.Serif,
    )

    @Test
    fun englishUsesMontserratWithFunctionalWeightsAtMediumOrAbove() {
        val typography = popTypography(fonts, PopScriptDirection.LTR)
        assertEquals(fonts.englishMontserrat, typography.bodyLarge.fontFamily)
        assertFunctionalWeights(typography)
    }

    @Test
    fun arabicUsesCairoWithFunctionalWeightsAtMediumOrAbove() {
        val typography = popTypography(fonts, PopScriptDirection.RTL)
        assertEquals(fonts.arabicCairo, typography.bodyLarge.fontFamily)
        assertFunctionalWeights(typography)
    }

    private fun assertFunctionalWeights(typography: androidx.compose.material3.Typography) {
        listOf(
            typography.titleLarge,
            typography.titleMedium,
            typography.bodyLarge,
            typography.bodyMedium,
            typography.bodySmall,
            typography.labelLarge,
            typography.labelMedium,
            typography.labelSmall,
        ).forEach { style -> assertTrue((style.fontWeight ?: FontWeight.Normal) >= FontWeight.Medium) }
    }
}
