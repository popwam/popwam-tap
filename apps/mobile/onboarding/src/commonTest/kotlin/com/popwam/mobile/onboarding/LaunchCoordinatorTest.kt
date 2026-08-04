package com.popwam.mobile.onboarding

import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.LaunchStatePersistence
import com.popwam.mobile.foundation.launch.PersistedLaunchStateStore
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.navigation.WelcomePage
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LaunchCoordinatorTest {
    @Test fun firstLaunchCompletesInOrderAndNavigatesOnce() = runTest {
        val coordinator = LaunchCoordinator(PersistedLaunchStateStore(MemoryPersistence()))
        coordinator.restore()
        coordinator.finishInitialSplash(authenticated = false)
        assertEquals(PopDestination.FirstLaunchFinalStage, coordinator.state.value.destination)
        coordinator.continueFromFirstLaunchStage()
        coordinator.selectLanguage("ar")
        coordinator.selectBaseTheme(ThemeMode.DARK)
        coordinator.completeThemeSelection()
        coordinator.skipWelcome()
        assertEquals(PopDestination.Welcome(WelcomePage.GET_STARTED), coordinator.state.value.destination)
        assertTrue(coordinator.completeWelcome())
        assertFalse(coordinator.completeWelcome())
        assertEquals(PopDestination.PhoneAuth, coordinator.state.value.destination)
    }

    @Test fun processRestoreKeepsThemeAndPaletteSelectedOnTap() = runTest {
        val persistence = MemoryPersistence()
        val first = LaunchCoordinator(PersistedLaunchStateStore(persistence))
        first.restore()
        first.selectBaseTheme(ThemeMode.LIGHT)
        first.openThemeGallery()
        first.selectPopStyle(IdentityPalette.CORAL)

        val restored = LaunchCoordinator(PersistedLaunchStateStore(persistence))
        restored.restore()
        assertEquals(ThemeMode.LIGHT, restored.state.value.persisted.selectedBaseTheme)
        assertEquals(IdentityPalette.CORAL, restored.state.value.persisted.selectedPopStyle)
    }

    @Test fun typedPendingProfileSurvivesMandatoryFirstLaunchFlow() = runTest {
        val persistence = MemoryPersistence()
        val coordinator = LaunchCoordinator(PersistedLaunchStateStore(persistence))
        coordinator.restore()
        val pending = PopDestination.PublicProfile("mmdoh")
        coordinator.preservePendingDestination(pending)
        coordinator.finishInitialSplash(authenticated = false)
        coordinator.continueFromFirstLaunchStage()
        coordinator.selectLanguage("en")
        coordinator.selectBaseTheme(ThemeMode.SYSTEM)
        coordinator.completeThemeSelection()
        coordinator.skipWelcome()
        coordinator.completeWelcome()

        val restored = LaunchCoordinator(PersistedLaunchStateStore(persistence))
        restored.restore()
        assertEquals(pending, restored.state.value.persisted.pendingDestination)
    }
}

internal class MemoryPersistence(var serialized: String? = null) : LaunchStatePersistence {
    override suspend fun read(): String? = serialized
    override suspend fun write(serializedState: String) { serialized = serializedState }
    override suspend fun clear() { serialized = null }
}
