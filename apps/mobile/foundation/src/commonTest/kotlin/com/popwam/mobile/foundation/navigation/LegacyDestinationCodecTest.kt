package com.popwam.mobile.foundation.navigation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class LegacyDestinationCodecTest {
    @Test
    fun encodesExistingAndroidBoundaries() {
        assertEquals("home", LegacyDestinationCodec.encode(PopDestination.Home))
        assertEquals("first-launch-final", LegacyDestinationCodec.encode(PopDestination.FirstLaunchFinalStage))
        assertEquals("theme", LegacyDestinationCodec.encode(PopDestination.Theme))
        assertEquals("welcome/get-started", LegacyDestinationCodec.encode(PopDestination.Welcome(WelcomePage.GET_STARTED)))
        assertEquals("profile/profile-1", LegacyDestinationCodec.encode(PopDestination.Profile("profile-1")))
        assertEquals("public-profile/profile-name", LegacyDestinationCodec.encode(PopDestination.PublicProfile("profile-name")))
        assertEquals(
            "settings/sharing-and-nfc",
            LegacyDestinationCodec.encode(PopDestination.Settings(SettingsSection.SHARING_AND_NFC)),
        )
    }

    @Test
    fun refusesUnsafePathIdentifiers() {
        assertFailsWith<IllegalArgumentException> {
            LegacyDestinationCodec.encode(PopDestination.Profile("profile/other"))
        }
    }
}
