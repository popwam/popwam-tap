package com.popwam.pop.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HomeIntegrationPolicyTest {
    @Test fun `authenticated root renders feature Home and not legacy Home`() {
        val navigation = File("src/main/java/com/popwam/pop/ui/FigmaNavigation.kt").readText()
        assertTrue(navigation.contains("composable(\"home\")"))
        assertTrue(navigation.contains("HomeRoute("))
        assertFalse(navigation.contains("fun FigmaHome("))
        assertFalse(navigation.contains("ProfileEditorHomeScreen("))
        assertTrue(navigation.contains("ProfileViewScreen("))
        assertTrue(navigation.contains("ProfileEditorHubScreen("))
        assertTrue(navigation.contains("profiles/create"))
        assertFalse(navigation.contains("LegacyProfileEditor("))
        val app = File("src/main/java/com/popwam/pop/ui/PopwamApp.kt").readText()
        assertFalse(app.contains("private fun MainNavigation("))
        assertFalse(app.contains("private fun HomeScreen("))
        assertFalse(File("src/main/java/com/popwam/pop/ui/ProfileEditorHomeScreen.kt").exists())
        assertFalse(File("src/main/java/com/popwam/pop/ui/ProfileHomePolicy.kt").exists())
        assertFalse(File("src/main/java/com/popwam/pop/ui/ProfilePublishingScreen.kt").exists())
        assertTrue(File("src/main/java/com/popwam/pop/ui/profile/ProfilePolicy.kt").exists())
    }

    @Test fun `selected persisted palette wraps authenticated Home`() {
        val activity = File("src/main/java/com/popwam/pop/MainActivity.kt").readText()
        assertTrue(activity.contains("launchState.persisted.selectedPopStyle.name"))
        assertTrue(activity.contains("HomeViewModelFactory"))
        assertTrue(activity.contains("home.selectActiveProfile(profileId)"))
        assertTrue(activity.contains("ProfilesViewModelFactory"))
        assertTrue(activity.contains("PopwamApp("))
    }

    @Test fun `Profiles consumes the same semantic theme without screen colors`() {
        val activity=File("src/main/java/com/popwam/pop/MainActivity.kt").readText()
        val screens=File("src/main/java/com/popwam/pop/ui/profile/ProfileScreens.kt").readText()
        assertTrue(activity.contains("launchState.persisted.selectedBaseTheme.name"))
        assertTrue(activity.contains("launchState.persisted.selectedPopStyle.name"))
        assertTrue(screens.contains("MaterialTheme.colorScheme"))
        assertFalse(screens.contains("Color(0x"))
    }
}
