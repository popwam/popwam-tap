package com.popwam.pop.ui

import com.popwam.pop.data.api.ShareTargetDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ShareCenterPolicyTest {
    private val profile = ShareTargetDto(
        id = "profile",
        type = "PROFILE",
        label = "Profile",
        canonicalUrl = "https://go.popwam.com/p/profile-name",
        hceCompatible = true,
    )
    private val contact = ShareTargetDto(
        id = "contact",
        type = "CONTACT",
        label = "Contact",
        canonicalUrl = "https://go.popwam.com/p/profile-name/contact.vcf",
        hceCompatible = true,
    )

    @Test
    fun selectsRequestedServerTargetOrSafeFirstTarget() {
        assertEquals(contact, ShareCenterPolicy.selectedTarget(listOf(profile, contact), "contact"))
        assertEquals(profile, ShareCenterPolicy.selectedTarget(listOf(profile, contact), "missing"))
        assertEquals(null, ShareCenterPolicy.selectedTarget(emptyList(), "profile"))
    }

    @Test
    fun acceptsOnlySixDigitScratchInput() {
        assertTrue(ShareCenterPolicy.activationScratchValid("104729"))
        assertFalse(ShareCenterPolicy.activationScratchValid("10472"))
        assertFalse(ShareCenterPolicy.activationScratchValid("10472a"))
        assertFalse(ShareCenterPolicy.activationScratchValid("1047290"))
    }

    @Test
    fun distinguishesNfcAndHceCapabilityStates() {
        assertEquals("NFC_UNAVAILABLE", ShareCenterPolicy.hceState(false, false, false))
        assertEquals("NFC_DISABLED", ShareCenterPolicy.hceState(true, false, true))
        assertEquals("HCE_UNSUPPORTED", ShareCenterPolicy.hceState(true, true, false))
        assertEquals("READY", ShareCenterPolicy.hceState(true, true, true))
    }

    @Test
    fun assignsOnlyPublishedServerTargetsOnApprovedPublicHost() {
        assertTrue(ShareCenterPolicy.canAssignTarget(true, profile))
        assertFalse(ShareCenterPolicy.canAssignTarget(false, profile))
        assertFalse(ShareCenterPolicy.canAssignTarget(true, profile.copy(canonicalUrl = "https://evil.example/p/profile-name")))
        assertFalse(ShareCenterPolicy.canAssignTarget(true, null))
    }

    @Test
    fun boundsActivationIdentifiersBeforeNetworkSubmission() {
        assertEquals("pw000001", ShareCenterPolicy.activationIdentifierCandidate("  pw000001  "))
        assertEquals(512, ShareCenterPolicy.activationIdentifierCandidate("x".repeat(600)).length)
    }
}
