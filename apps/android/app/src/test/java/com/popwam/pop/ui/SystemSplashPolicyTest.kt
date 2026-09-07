package com.popwam.pop.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SystemSplashPolicyTest {
    @Test fun `system splash uses the official uncropped mark and no icon background circle`() {
        val styles = File("src/main/res/values/styles.xml").readText()
        val mark = File("src/main/res/drawable/pop_logo_official.xml").readText()
        assertTrue(styles.contains("windowSplashScreenAnimatedIcon\">@drawable/pop_logo_official"))
        assertTrue(styles.contains("postSplashScreenTheme\">@style/Theme.POP"))
        assertFalse(styles.contains("windowSplashScreenIconBackgroundColor"))
        assertTrue(mark.contains("android:viewportWidth=\"1024\""))
        assertTrue(mark.contains("android:viewportHeight=\"1024\""))
        assertTrue(mark.contains("android:scaleX=\"0.1\""))
        assertTrue(mark.contains("android:scaleY=\"-0.1\""))
        assertTrue(mark.contains("android:fillColor=\"#03797B\""))
    }
}
