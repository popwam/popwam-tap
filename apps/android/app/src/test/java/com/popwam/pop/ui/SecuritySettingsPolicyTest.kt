package com.popwam.pop.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SecuritySettingsPolicyTest {
    @Test fun `settings navigation includes all native Phase H sections`() {
        assertTrue(nativeSettingsSections.containsAll(setOf("appearance","notifications","privacy","permissions","security","devices","sessions","passkeys","usage","account")))
    }

    @Test fun `analytics routes are privacy safe category events`() {
        assertEquals("settings_viewed",settingsAnalyticsEvent("appearance"))
        assertEquals("security_viewed",settingsAnalyticsEvent("sessions"))
        assertEquals("devices_viewed",settingsAnalyticsEvent("devices"))
        assertEquals("passkey_management_opened",settingsAnalyticsEvent("passkeys"))
    }

    @Test fun `permission state remains device owned and opening settings requests nothing`() {
        assertEquals("UNAVAILABLE",devicePermissionState(false,false,false))
        assertEquals("ALLOWED",devicePermissionState(true,true,false))
        assertEquals("DENIED",devicePermissionState(true,false,true))
        assertEquals("NOT_REQUESTED",devicePermissionState(true,false,false))
    }

    @Test fun `step up requires a bounded server grant`() {
        assertFalse(stepUpGrantUsable(null))
        assertFalse(stepUpGrantUsable("short"))
        assertTrue(stepUpGrantUsable("g".repeat(32)))
        assertFalse(stepUpGrantUsable("g".repeat(257)))
    }

    @Test fun `current revocation logs out locally while other revoke preserves current`() {
        assertTrue(revocationRequiresLocalLogout(true))
        assertFalse(revocationRequiresLocalLogout(false))
    }

    @Test fun `FCM cleanup cannot control POP security success`() {
        assertFalse(fcmCleanupControlsSecuritySuccess())
    }
}
