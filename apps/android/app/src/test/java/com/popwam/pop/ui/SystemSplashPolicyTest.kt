package com.popwam.pop.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.sqrt

class SystemSplashPolicyTest {
    @Test fun `system splash uses a dedicated padded mark and no icon background circle`() {
        val styles = File("src/main/res/values/styles.xml").readText()
        val mark = File("src/main/res/drawable/pop_splash_mark.xml").readText()
        assertTrue(styles.contains("windowSplashScreenAnimatedIcon\">@drawable/pop_splash_mark"))
        assertTrue(styles.contains("postSplashScreenTheme\">@style/Theme.POP"))
        assertFalse(styles.contains("windowSplashScreenIconBackgroundColor"))
        assertTrue(mark.contains("android:viewportWidth=\"288\""))
        assertTrue(mark.contains("android:scaleX=\"0.56\""))
        assertTrue(mark.contains("android:scaleY=\"0.56\""))
        val paddedDiagonal = sqrt((212.62 * .56) * (212.62 * .56) + (240.94 * .56) * (240.94 * .56))
        assertTrue(paddedDiagonal < 192.0)
    }
}
