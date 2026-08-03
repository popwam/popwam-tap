package com.popwam.mobile.onboarding

import com.popwam.mobile.foundation.launch.CURRENT_WELCOME_VERSION
import com.popwam.mobile.foundation.launch.LaunchState
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.navigation.WelcomePage
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LaunchFlowTest {
    @Test fun cleanLaunchRequiresFinalSplash() =
        assertEquals(PopDestination.FirstLaunchFinalStage, requiredDestination(LaunchState(), false))

    @Test fun partialStateResumesAtFirstMissingRequirement() {
        val splash = LaunchState(hasSeenFirstLaunchStage = true)
        val language = splash.copy(hasSelectedLanguage = true, selectedLanguageTag = "ar")
        val theme = language.copy(hasSelectedBaseTheme = true)
        assertEquals(PopDestination.Language, requiredDestination(splash, false))
        assertEquals(PopDestination.Theme, requiredDestination(language, false))
        assertEquals(PopDestination.Welcome(), requiredDestination(theme, false))
    }

    @Test fun completeAndAuthenticatedLaunchesUseExistingDestinations() {
        val complete = LaunchState(
            hasSeenFirstLaunchStage = true,
            hasSelectedLanguage = true,
            selectedLanguageTag = "en",
            hasSelectedBaseTheme = true,
            hasCompletedWelcome = true,
            welcomeVersionSeen = CURRENT_WELCOME_VERSION,
        )
        assertEquals(PopDestination.PhoneAuth, requiredDestination(complete, false))
        assertEquals(PopDestination.Home, requiredDestination(complete, true))
    }

    @Test fun welcomeOrderIsExact() {
        assertEquals(WelcomePage.SHARE_YOUR_WAY, nextWelcomePage(WelcomePage.ALL_IN_ONE))
        assertEquals(WelcomePage.PERSONAL_AND_BUSINESS, nextWelcomePage(WelcomePage.SHARE_YOUR_WAY))
        assertEquals(WelcomePage.GET_STARTED, nextWelcomePage(WelcomePage.PERSONAL_AND_BUSINESS))
        assertNull(nextWelcomePage(WelcomePage.GET_STARTED))
    }
}
