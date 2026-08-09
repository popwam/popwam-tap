package com.popwam.pop.ui

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidTypographyPolicyTest {
    @Test fun `Cairo and Montserrat bind semantic weights to the variable font axis`() {
        val theme = File("src/main/java/com/popwam/pop/ui/theme/Theme.kt").readText()
        assertTrue(theme.contains("FontVariation.Settings(FontVariation.weight(weight.weight))"))
        assertTrue(theme.contains("variableFont(R.font.cairo,FontWeight.SemiBold)"))
        assertTrue(theme.contains("variableFont(R.font.montserrat,FontWeight.Bold)"))
    }
}
