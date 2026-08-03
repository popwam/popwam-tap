package com.popwam.pop.ui.launch

import com.popwam.mobile.foundation.navigation.PopDestination
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PendingDeepLinkParserTest {
    @Test fun `canonical profile link becomes a typed pending profile`() {
        assertEquals(
            PopDestination.PublicProfile("mmdoh"),
            PendingDeepLinkParser.parse("https://pop.popwam.com/p/mmdoh"),
        )
    }

    @Test fun `legacy public profile remains compatible`() {
        assertEquals(
            PopDestination.PublicProfile("profile-name"),
            PendingDeepLinkParser.parse("https://go.popwam.com/p/profile-name"),
        )
    }

    @Test fun `known app destinations are typed without retaining raw url data`() {
        assertEquals(PopDestination.Activate, PendingDeepLinkParser.parse("https://pop.popwam.com/activate/scan?code=secret"))
        assertEquals(PopDestination.PhoneAuth, PendingDeepLinkParser.parse("https://pop.popwam.com/login"))
        assertEquals(PopDestination.Home, PendingDeepLinkParser.parse("https://pop.popwam.com/dashboard"))
    }

    @Test fun `unsafe or unsupported links are rejected`() {
        assertNull(PendingDeepLinkParser.parse("http://pop.popwam.com/p/person"))
        assertNull(PendingDeepLinkParser.parse("https://user:pass@pop.popwam.com/p/person"))
        assertNull(PendingDeepLinkParser.parse("https://pop.popwam.com/p/person?redirect=evil"))
        assertNull(PendingDeepLinkParser.parse("https://example.com/p/person"))
        assertNull(PendingDeepLinkParser.parse("not a url"))
    }
}
