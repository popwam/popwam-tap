package com.popwam.pop.hce

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HceProfilePolicyTest {
    @Test fun `public profile switch replaces hce url without restart`() {
        val first = HceProfilePolicy.reconcile(true, "a", "https://go.popwam.com/p/alpha")
        val second = HceProfilePolicy.reconcile(first.requested, "b", "https://go.popwam.com/p/bravo")
        assertTrue(second.enabled)
        assertEquals("b", second.profileId)
        assertEquals("https://go.popwam.com/p/bravo", second.canonicalUrl)
    }

    @Test fun `private or unavailable profile clears payload but preserves preference`() {
        val state = HceProfilePolicy.reconcile(true, "private", null)
        assertTrue(state.requested)
        assertFalse(state.enabled)
        assertNull(state.canonicalUrl)
    }

    @Test fun `logout clears preference identity and url`() {
        val state = HceProfilePolicy.logout()
        assertFalse(state.requested)
        assertFalse(state.enabled)
        assertNull(state.profileId)
        assertNull(state.canonicalUrl)
    }
}
