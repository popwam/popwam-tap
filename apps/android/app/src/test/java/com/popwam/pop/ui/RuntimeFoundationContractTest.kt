package com.popwam.pop.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RuntimeFoundationContractTest {
    private fun source(path:String)=File(path).readText()

    @Test fun `Android quota UI reads effective backend quota`() {
        val api=source("src/main/java/com/popwam/pop/data/api/PopwamApi.kt")
        val screen=source("src/main/java/com/popwam/pop/ui/SecuritySettingsScreen.kt")
        assertTrue(api.contains("api/settings/quota"))
        assertTrue(screen.contains("quota.storage.usedBytes"))
        assertTrue(screen.contains("quota.links.remaining"))
        assertFalse(screen.contains("MAX_STORAGE_BYTES ="))
    }

    @Test fun `normal feedback uses the centralized three second policy`() {
        val visuals=source("src/main/java/com/popwam/pop/ui/PopVisuals.kt")
        val navigation=source("src/main/java/com/popwam/pop/ui/FigmaNavigation.kt")
        assertTrue(visuals.contains("POP_TRANSIENT_FEEDBACK_MILLIS=3_000L"))
        assertTrue(navigation.contains("showPopTransient(message)"))
        assertTrue(navigation.contains("SnackbarDuration.Indefinite"))
    }
}
