package com.popwam.pop.ui.share

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ShareQrPayloadPolicyTest {
    @Test fun `qr content is deterministic canonical url only`() {
        val payload = CanonicalSharePayload("profile-id", "Sarah", "https://pop.popwam.com/p/sarah")

        val first = ShareQrPayloadPolicy.encodedText(payload)
        val second = ShareQrPayloadPolicy.encodedText(payload)

        assertEquals(payload.canonicalUrl, first)
        assertEquals(first, second)
        assertFalse(first.contains(payload.profileId))
        assertFalse(first.contains("token", ignoreCase = true))
        assertEquals(4, ShareQrRenderer.QUIET_ZONE_MODULES)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `qr rejects non public payload`() {
        ShareQrPayloadPolicy.encodedText(
            CanonicalSharePayload("profile-id", "Sarah", "https://api.popwam.com/profile/profile-id?token=secret"),
        )
    }
}
