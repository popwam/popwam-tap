package com.popwam.pop.ui.share

import com.popwam.pop.data.api.ShareTargetDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SharePayloadPolicyTest {
    private fun profile(url: String = "https://go.popwam.com/p/sarah") = ShareTargetDto("profile", "PROFILE", "Sarah", url, true)
    private val contact = ShareTargetDto("contact", "CONTACT", "Contact", "https://go.popwam.com/p/sarah/contact.vcf", true)

    @Test fun `core methods select only canonical profile target`() {
        assertEquals(profile(), SharePayloadPolicy.canonicalProfileTarget(listOf(contact, profile())))
        assertNull(SharePayloadPolicy.canonicalProfileTarget(listOf(contact)))
        assertNull(SharePayloadPolicy.canonicalProfileTarget(listOf(profile("https://evil.example/p/sarah"))))
    }

    @Test fun `private and paused profiles never produce payloads`() {
        assertNull(SharePayloadPolicy.payload(ActiveShareProfile("p1", "Sarah", ShareProfileAccess.PRIVATE, "PUBLISHED"), "Sarah", listOf(profile())))
        assertNull(SharePayloadPolicy.payload(ActiveShareProfile("p1", "Sarah", ShareProfileAccess.PUBLIC, "PAUSED"), "Sarah", listOf(profile())))
    }

    @Test fun `unlisted profile remains link shareable and explicit`() {
        val owner = ActiveShareProfile("p1", "Sarah", ShareProfileAccess.UNLISTED, "PUBLISHED")
        val payload = SharePayloadPolicy.payload(owner, "Sarah", listOf(profile()))
        assertEquals("p1", payload?.profileId)
        assertEquals(ShareAvailability.UNLISTED, SharePayloadPolicy.availability(owner, true, payload))
    }

    @Test fun `profile switch replaces every payload identity and url`() {
        val first = SharePayloadPolicy.payload(ActiveShareProfile("a", "A", ShareProfileAccess.PUBLIC, "PUBLISHED"), "A", listOf(profile("https://go.popwam.com/p/alpha")))
        val second = SharePayloadPolicy.payload(ActiveShareProfile("b", "B", ShareProfileAccess.PUBLIC, "PUBLISHED"), "B", listOf(profile("https://pop.popwam.com/p/bravo")))
        assertEquals("a", first?.profileId)
        assertEquals("b", second?.profileId)
        assertFalse(first?.canonicalUrl == second?.canonicalUrl)
    }

    @Test fun `native payload has no token or api material`() {
        val payload = CanonicalSharePayload("p1", "Sarah", "https://go.popwam.com/p/sarah")
        val text = SharePayloadPolicy.nativeMessage(payload, false)
        assertTrue(SharePayloadPolicy.containsOnlyPublicPayload(text, payload))
        assertFalse(SharePayloadPolicy.containsOnlyPublicPayload("$text?accessToken=secret", payload))
    }
}
