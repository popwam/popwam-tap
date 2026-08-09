package com.popwam.mobile.onboarding

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class PopSplashTimelineTest {
    @Test fun `splash logo and shape interpolate continuously between visual keyframes`() {
        val start = splashFrame(0f)
        // FastOutSlowIn has already crossed the final radius keyframe at raw .5.
        val middle = splashFrame(.4f)
        val end = splashFrame(1f)

        assertNotEquals(start.circleCenterY, middle.circleCenterY)
        assertNotEquals(middle.circleRadius, end.circleRadius)
        assertTrue(middle.logoOnPrimaryAlpha in 0f..1f)
        assertEquals(196.5f, end.logoX + 59.5f, "the logo remains optically centered on the reference frame")
    }

    @Test fun `reusing an externally owned progress value never restarts the timeline`() {
        val restoredProgress = .63f
        assertEquals(splashFrame(restoredProgress), splashFrame(restoredProgress))
        assertTrue(splashFrame(restoredProgress).circleRadius > splashFrame(.48f).circleRadius)
    }
}
