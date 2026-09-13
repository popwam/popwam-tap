package com.popwam.pop.ui.launch

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LaunchViewModelTest {
    private val source = File("src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt").readText()

    @Test fun `cold splash has no animation duration gate`() {
        assertTrue(source.contains("systemSplashExit.await()"))
        assertFalse(source.contains("SplashTiming.Standard"))
        assertFalse(source.contains("advanceSplashTimeline"))
        assertFalse(source.contains("delay("))
    }

    @Test fun `timeline starts after system splash and startup does not block`() {
        assertTrue(source.contains("fun onSystemSplashExited()"))
        assertFalse(source.contains("System.currentTimeMillis() - startedAt"))
        assertFalse(source.contains("runBlocking"))
    }

    @Test fun `typed pending destination survives recreation boundaries`() {
        assertTrue(source.contains("SavedStateHandle"))
        assertTrue(source.contains("coordinator.preservePendingDestination"))
    }
}
