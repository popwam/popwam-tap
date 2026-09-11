package com.popwam.pop.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalFirstStartupPolicyTest {
    private fun source(path: String) = File(path).readText()

    @Test fun `normal authenticated launch restores local core without startup side requests`() {
        val activity = source("src/main/java/com/popwam/pop/MainActivity.kt")
        val launch = source("src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt")
        val app = source("src/main/java/com/popwam/pop/ui/PopwamApp.kt")
        val main = source("src/main/java/com/popwam/pop/ui/AppViewModels.kt")
        assertTrue(activity.contains("localFirst.core(null,currentLocale())"))
        assertFalse(launch.contains("localization.refresh()"))
        assertFalse(app.contains("LaunchedEffect(phoneCountries) { phoneCountries.refresh() }"))
        assertFalse(main.substringAfter("class MainViewModel(").substringBefore("fun reload()").contains("reload()"))
    }

    @Test fun `share stays lazy until a share screen is composed`() {
        val navigation = source("src/main/java/com/popwam/pop/ui/FigmaNavigation.kt")
        val shareScreen = source("src/main/java/com/popwam/pop/ui/share/ShareScreens.kt")
        assertFalse(navigation.substringBefore("NavHost(").contains("share.activateProfile"))
        assertTrue(shareScreen.contains("LaunchedEffect(activeProfile)"))
        assertTrue(shareScreen.contains("viewModel.activateProfile(activeProfile)"))
    }

    @Test fun `only the active editor is loaded during core synchronization`() {
        val repository = source("src/main/java/com/popwam/pop/data/repository/LocalFirstRepository.kt")
        assertTrue(repository.contains("remote.profileEditor(it, locale)"))
        assertFalse(repository.contains("selector.profiles.map"))
        assertTrue(repository.contains("DEFAULT_SYNC_TTL_MILLIS"))
    }

    @Test fun `PASS 6 loads catalogue only from the picker and stores editor responses without full sync`() {
        val repository=source("src/main/java/com/popwam/pop/data/repository/LocalFirstRepository.kt")
        val viewModel=source("src/main/java/com/popwam/pop/ui/profile/ProfilesViewModel.kt")
        assertFalse(repository.substringAfter("suspend fun core(").substringBefore("suspend fun cachedShare").contains("templates("))
        assertFalse(repository.substringAfter("private suspend fun syncCore").contains("templates("))
        val mutation=viewModel.substringAfter("override suspend fun mutate(").substringBefore("override suspend fun updateVisibility")
        assertTrue(mutation.contains("localFirst.persistEditor"))
        assertFalse(mutation.contains("core("))
        assertFalse(mutation.contains("refresh("))
    }

    @Test fun `official loader loops and launch has no fixed delay`() {
        val loader = source("src/main/java/com/popwam/pop/ui/components/PopBrandedLoading.kt")
        val launch = source("src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt")
        assertTrue(loader.contains("while (isActive)"))
        assertTrue(loader.contains("size: Dp = 220.dp"))
        assertFalse(launch.contains("delay("))
    }
}
