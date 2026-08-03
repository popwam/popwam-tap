package com.popwam.pop.data.launch

import com.popwam.mobile.foundation.launch.CURRENT_WELCOME_VERSION
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.LaunchState
import com.popwam.mobile.foundation.launch.ThemeMode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LegacyLaunchStateMigrationTest {
    @Test fun `clean install remains a clean first launch`() {
        val migrated = migrateLegacyLaunchState(LaunchState(), LegacyLaunchSnapshot(), "en")
        assertFalse(migrated.hasSeenFirstLaunchStage)
        assertFalse(migrated.hasSelectedLanguage)
        assertFalse(migrated.hasCompletedWelcome)
        assertEquals(IdentityPalette.MINT, migrated.selectedPopStyle)
    }

    @Test fun `partial legacy progress resumes without being marked complete`() {
        val migrated = migrateLegacyLaunchState(
            LaunchState(),
            LegacyLaunchSnapshot(languageTag = "AR", baseTheme = "DARK", popStyle = "pulsa"),
            "en",
        )
        assertTrue(migrated.hasSeenFirstLaunchStage)
        assertTrue(migrated.hasSelectedLanguage)
        assertEquals("ar", migrated.selectedLanguageTag)
        assertTrue(migrated.hasSelectedBaseTheme)
        assertEquals(ThemeMode.DARK, migrated.selectedBaseTheme)
        assertEquals(IdentityPalette.PULSE, migrated.selectedPopStyle)
        assertFalse(migrated.hasCompletedWelcome)
    }

    @Test fun `completed legacy intro maps to completed versioned welcome`() {
        val migrated = migrateLegacyLaunchState(
            LaunchState(),
            LegacyLaunchSnapshot(introVersionSeen = 1),
            "en",
        )
        assertTrue(migrated.hasCompletedWelcome)
        assertEquals(CURRENT_WELCOME_VERSION, migrated.welcomeVersionSeen)
        assertTrue(migrated.hasSelectedLanguage)
        assertTrue(migrated.hasSelectedBaseTheme)
    }

    @Test fun `valid restored session adopts an existing user without profile claims`() {
        val migrated = migrateLegacyLaunchState(LaunchState(), LegacyLaunchSnapshot(authenticated = true), "ar")
        assertTrue(migrated.hasCompletedWelcome)
        assertTrue(migrated.hasAuthenticatedBefore)
        assertFalse(migrated.hasCompletedProfileSetup)
    }

    @Test fun `migration is idempotent and does not overwrite v2 choices`() {
        val current = LaunchState(
            hasSeenFirstLaunchStage = true,
            hasSelectedLanguage = true,
            selectedLanguageTag = "fr",
            hasSelectedBaseTheme = true,
            selectedBaseTheme = ThemeMode.LIGHT,
            selectedPopStyle = IdentityPalette.CORAL,
        )
        val legacy = LegacyLaunchSnapshot("ar", "DARK", "PULSA")
        assertEquals(current, migrateLegacyLaunchState(current, legacy, "en"))
    }
}
