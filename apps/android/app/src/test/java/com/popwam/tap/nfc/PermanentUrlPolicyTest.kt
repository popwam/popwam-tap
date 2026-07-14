package com.popwam.tap.nfc

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PermanentUrlPolicyTest {
    @Test
    fun acceptsPermanentCardUrl() {
        assertTrue(PermanentUrlPolicy.isValid("https://go.popwam.com/pw000001"))
        assertTrue(PermanentUrlPolicy.isValid("https://go.popwam.com/custom-slug_2"))
    }

    @Test
    fun rejectsActivationSecretsAndUnexpectedHosts() {
        assertFalse(PermanentUrlPolicy.isValid("http://go.popwam.com/pw000001"))
        assertFalse(PermanentUrlPolicy.isValid("https://evil.example/pw000001"))
        assertFalse(PermanentUrlPolicy.isValid("https://go.popwam.com/pw000001?activationToken=secret"))
        assertFalse(PermanentUrlPolicy.isValid("https://go.popwam.com/a/b"))
    }
}
