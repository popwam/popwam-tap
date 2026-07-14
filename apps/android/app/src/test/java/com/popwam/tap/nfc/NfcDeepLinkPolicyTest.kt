package com.popwam.tap.nfc

import org.junit.Assert.assertEquals
import org.junit.Test

class NfcDeepLinkPolicyTest {
    @Test fun separatesWriteAndTestActions() {
        assertEquals("programming", NfcDeepLinkPolicy.route("popwamtap://write-tag/card-1"))
        assertEquals("nfc", NfcDeepLinkPolicy.route("popwamtap://test-tag/card-1"))
        assertEquals("home", NfcDeepLinkPolicy.route("https://go.popwam.com/card-1"))
    }
}
