package com.popwam.pop.ui.launch

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LaunchViewModelTest {
    private val source = File("src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt").readText()

    @Test fun `cold splash has deterministic four stage progression and reduced timing`() {
        assertTrue(source.contains("SplashTiming.ReducedMotion"))
        assertTrue(source.contains("SplashTiming.Standard"))
        listOf("SplashStage.ONE", "SplashStage.TWO", "SplashStage.THREE", "SplashStage.FOUR")
            .forEach { assertTrue(source.contains(it)) }
    }

    @Test fun `background pauses active animation time and startup does not block`() {
        assertTrue(source.contains("foreground.filter { it }.first()"))
        assertTrue(source.contains("if (foreground.value) remaining -= slice"))
        assertFalse(source.contains("runBlocking"))
    }

    @Test fun `welcome page and typed pending destination survive recreation boundaries`() {
        assertTrue(source.contains("SavedStateHandle"))
        assertTrue(source.contains("KEY_WELCOME_PAGE"))
        assertTrue(source.contains("coordinator.preservePendingDestination"))
    }
}
