package com.popwam.mobile.foundation.launch

import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PersistedLaunchStateStoreTest {
    @Test
    fun persistsAndRestoresNormalizedState() = runTest {
        val persistence = FakePersistence()
        val store = PersistedLaunchStateStore(persistence)

        store.update {
            it.copy(
                hasSelectedLanguage = true,
                selectedLanguageTag = "AR",
                hasCompletedProfileSetup = true,
                activeProfileId = " profile-1 ",
            )
        }

        val restored = PersistedLaunchStateStore(persistence).initialize()
        assertEquals("ar", restored.selectedLanguageTag)
        assertEquals("profile-1", restored.activeProfileId)
        assertTrue(restored.hasSelectedLanguage)
        assertTrue(restored.hasCompletedProfileSetup)
    }

    @Test
    fun removesClaimsThatDoNotHaveTheirRequiredValues() = runTest {
        val store = PersistedLaunchStateStore(FakePersistence())
        val updated = store.update {
            it.copy(
                hasSelectedLanguage = true,
                selectedLanguageTag = "not a language",
                hasCompletedProfileSetup = true,
                activeProfileId = null,
            )
        }

        assertFalse(updated.hasSelectedLanguage)
        assertNull(updated.selectedLanguageTag)
        assertFalse(updated.hasCompletedProfileSetup)
    }

    @Test
    fun migratesSchemaOneFieldNamesWithoutLosingSelections() = runTest {
        val persistence = FakePersistence().apply {
            value = """{
                "schemaVersion":1,
                "hasCompletedFirstLaunchSplash":true,
                "hasSelectedLanguage":true,
                "selectedLanguageTag":"ar",
                "hasSelectedTheme":true,
                "selectedThemeMode":"DARK",
                "selectedIdentityPalette":"CORAL",
                "hasCompletedWelcome":true,
                "welcomeVersionSeen":1
            }""".trimIndent()
        }

        val restored = PersistedLaunchStateStore(persistence).initialize()

        assertEquals(CURRENT_LAUNCH_STATE_SCHEMA, restored.schemaVersion)
        assertTrue(restored.hasSeenFirstLaunchStage)
        assertTrue(restored.hasSelectedBaseTheme)
        assertEquals(ThemeMode.DARK, restored.selectedBaseTheme)
        assertEquals(IdentityPalette.CORAL, restored.selectedPopStyle)
    }

    @Test
    fun corruptedStateFallsBackToSafeFirstLaunch() = runTest {
        val restored = PersistedLaunchStateStore(FakePersistence().apply { value = "{not-json" }).initialize()
        assertEquals(LaunchState(), restored)
    }

    @Test
    fun unsupportedPersistedLanguageCannotRemainSelected() = runTest {
        val store = PersistedLaunchStateStore(FakePersistence())
        val updated = store.update {
            it.copy(
                hasSeenFirstLaunchStage = true,
                hasSelectedLanguage = true,
                selectedLanguageTag = "zz",
                hasSelectedBaseTheme = true,
            )
        }
        assertFalse(updated.hasSelectedLanguage)
    }

    private class FakePersistence : LaunchStatePersistence {
        var value: String? = null
        override suspend fun read(): String? = value
        override suspend fun write(serializedState: String) { value = serializedState }
        override suspend fun clear() { value = null }
    }
}
