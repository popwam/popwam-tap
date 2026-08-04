package com.popwam.mobile.onboarding

import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.PersistedLaunchStateStore
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.designsystem.PopIdentityStyle
import com.popwam.mobile.designsystem.popSemanticColors
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ThemeGalleryStateTest {
    @Test fun paletteTapCommitsTheLiveThemeImmediatelyAndDismissDoesNotRevertIt() = runTest {
        val coordinator = LaunchCoordinator(PersistedLaunchStateStore(MemoryPersistence()))
        coordinator.restore()
        coordinator.openThemeGallery()
        coordinator.selectPopStyle(IdentityPalette.VIOLET)
        assertEquals(IdentityPalette.VIOLET, coordinator.state.value.persisted.selectedPopStyle)
        coordinator.dismissThemeGallery()
        assertEquals(IdentityPalette.VIOLET, coordinator.state.value.persisted.selectedPopStyle)
    }

    @Test fun allSixRuntimeStylesAreCanonical() {
        assertEquals(
            listOf("PULSE", "MINT", "VIOLET", "CORAL", "SOLAR", "GRAPHITE"),
            IdentityPalette.entries.map(IdentityPalette::name),
        )
        IdentityPalette.entries.forEach { style ->
            val identity = PopIdentityStyle.valueOf(style.name)
            assertTrue(popSemanticColors(identity, false).brandPrimary != androidx.compose.ui.graphics.Color.Unspecified)
            assertTrue(popSemanticColors(identity, true).brandPrimary != androidx.compose.ui.graphics.Color.Unspecified)
        }
    }

    @Test fun baseAppearanceRemainsIndependentFromPaletteAndTracksSystem() {
        assertFalse(resolveDarkTheme(ThemeMode.LIGHT, systemDark = true))
        assertTrue(resolveDarkTheme(ThemeMode.DARK, systemDark = false))
        assertFalse(resolveDarkTheme(ThemeMode.SYSTEM, systemDark = false))
        assertTrue(resolveDarkTheme(ThemeMode.SYSTEM, systemDark = true))
    }

    @Test fun continueOnlyAdvancesOnboardingAndDoesNotChangeTheSelectedTheme() = runTest {
        val coordinator = LaunchCoordinator(PersistedLaunchStateStore(MemoryPersistence()))
        coordinator.restore()
        coordinator.selectBaseTheme(ThemeMode.DARK)
        coordinator.selectPopStyle(IdentityPalette.GRAPHITE)

        coordinator.completeThemeSelection()

        assertEquals(ThemeMode.DARK, coordinator.state.value.persisted.selectedBaseTheme)
        assertEquals(IdentityPalette.GRAPHITE, coordinator.state.value.persisted.selectedPopStyle)
    }
}
