package com.popwam.pop.nfc

import org.junit.Assert.assertEquals
import org.junit.Test

class NfcDeepLinkPolicyTest {
    @Test fun separatesWriteAndTestActions() {
        assertEquals("programming", NfcDeepLinkPolicy.route("pop://write-tag/card-1"))
        assertEquals("nfc", NfcDeepLinkPolicy.route("pop://test-tag/card-1"))
        assertEquals("home", NfcDeepLinkPolicy.route("https://go.popwam.com/card-1"))
    }
}
