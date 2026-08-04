package com.popwam.pop.ui.launch

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LaunchViewModelTest {
    private val source = File("src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt").readText()

    @Test fun `cold splash has one continuous timeline and reduced motion`() {
        assertTrue(source.contains("SplashTiming.ReducedMotion"))
        assertTrue(source.contains("SplashTiming.Standard"))
        assertTrue(source.contains("advanceSplashTimeline"))
        assertTrue(source.contains("KEY_SPLASH_STARTED_AT"))
        assertTrue(source.contains("coordinator.showSplashProgress"))
    }

    @Test fun `timeline does not restart on recreation and startup does not block`() {
        assertTrue(source.contains("savedStateHandle.get<Long>(KEY_SPLASH_STARTED_AT)"))
        assertTrue(source.contains("System.currentTimeMillis() - startedAt"))
        assertFalse(source.contains("runBlocking"))
    }

    @Test fun `welcome page and typed pending destination survive recreation boundaries`() {
        assertTrue(source.contains("SavedStateHandle"))
        assertTrue(source.contains("KEY_WELCOME_PAGE"))
        assertTrue(source.contains("coordinator.preservePendingDestination"))
    }
}
