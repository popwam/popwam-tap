package com.popwam.mobile.onboarding

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PopSplashPulseTest {
    @Test fun pulseIsSubtleAndReadable() {
        val rest = loadingPulseFrame(0f, reducedMotion = false)
        val peak = loadingPulseFrame(1f, reducedMotion = false)
        assertTrue(peak.scale > rest.scale)
        assertTrue(peak.scale <= 1.04f)
        assertTrue(rest.alpha >= .85f)
    }

    @Test fun reducedMotionIsStatic() {
        assertEquals(
            LoadingPulseFrame(scale = 1f, alpha = 1f),
            loadingPulseFrame(.4f, reducedMotion = true),
        )
    }
}
