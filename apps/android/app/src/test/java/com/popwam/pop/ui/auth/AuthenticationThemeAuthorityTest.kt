package com.popwam.pop.ui.auth

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthenticationThemeAuthorityTest {
    @Test fun `authentication receives the persisted live POP theme rather than a default palette`() {
        val activity = File("src/main/java/com/popwam/pop/MainActivity.kt").readText()

        assertTrue(activity.contains("Phase3OnboardingTheme(\n                        launchState.persisted.selectedBaseTheme,"))
        assertTrue(activity.contains("launchState.persisted.selectedPopStyle,"))
        assertTrue(activity.contains("AuthenticationHost("))
        assertFalse(activity.contains("AuthenticationHost(\n                            IdentityPalette"))
    }

    @Test fun `authenticated palette changes use the same immediate selection event`() {
        val activity = File("src/main/java/com/popwam/pop/MainActivity.kt").readText()
        val viewModel = File("src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt").readText()

        assertTrue(activity.contains("onPaletteSelected = launchViewModel::selectPopStyle"))
        assertTrue(viewModel.contains("coordinator.selectPopStyle(style)"))
        assertFalse(viewModel.contains("previewPopStyle"))
    }
}
