package com.popwam.mobile.onboarding

import com.popwam.mobile.foundation.launch.LaunchState
import com.popwam.mobile.foundation.navigation.PopDestination
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LaunchFlowTest {
    @Test fun cleanLaunchContinuesDirectlyToLanguage() =
        assertEquals(PopDestination.Language, requiredDestination(LaunchState(), false))

    @Test fun partialStateResumesAtFirstMissingRequirement() {
        val splash = LaunchState(hasSeenFirstLaunchStage = true)
        val language = splash.copy(hasSelectedLanguage = true, selectedLanguageTag = "ar")
        val theme = language.copy(hasSelectedBaseTheme = true)
        assertEquals(PopDestination.Language, requiredDestination(splash, false))
        assertEquals(PopDestination.Theme, requiredDestination(language, false))
        assertEquals(PopDestination.PhoneAuth, requiredDestination(theme, false))
    }

    @Test fun completeAndAuthenticatedLaunchesUseExistingDestinations() {
        val complete = LaunchState(
            hasSeenFirstLaunchStage = true,
            hasSelectedLanguage = true,
            selectedLanguageTag = "en",
            hasSelectedBaseTheme = true,
        )
        assertEquals(PopDestination.PhoneAuth, requiredDestination(complete, false))
        assertEquals(PopDestination.Home, requiredDestination(complete, true))
    }


}
