package com.popwam.pop.nfc

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PermanentUrlPolicyTest {
    @Test
    fun acceptsPermanentCardUrl() {
        assertTrue(PermanentUrlPolicy.isValid("https://go.popwam.com/pw000001"))
        assertTrue(PermanentUrlPolicy.isValid("https://go.popwam.com/custom-slug_2"))
        assertTrue(PermanentUrlPolicy.isValid("https://go.popwam.com/p/profile-name"))
        assertTrue(PermanentUrlPolicy.isValid("https://pop.popwam.com/p/profile-name"))
        assertTrue(PermanentUrlPolicy.isValid("https://go.popwam.com/s/opaque_share_key"))
        assertTrue(PermanentUrlPolicy.isValid("https://go.popwam.com/p/profile-name/contact.vcf"))
    }

    @Test
    fun rejectsActivationSecretsAndUnexpectedHosts() {
        assertFalse(PermanentUrlPolicy.isValid("http://go.popwam.com/pw000001"))
        assertFalse(PermanentUrlPolicy.isValid("https://evil.example/pw000001"))
        assertFalse(PermanentUrlPolicy.isValid("https://pop.popwam.com/p/profile-name?token=secret"))
        assertFalse(PermanentUrlPolicy.isValid("https://go.popwam.com/pw000001?activationToken=secret"))
        assertFalse(PermanentUrlPolicy.isValid("https://go.popwam.com/a/b"))
        assertFalse(PermanentUrlPolicy.isValid("https://go.popwam.com/activate/card/pw000001"))
        assertFalse(PermanentUrlPolicy.isValid("https://user:pass@go.popwam.com/p/profile-name"))
        assertFalse(PermanentUrlPolicy.isValid("https://go.popwam.com:443/p/profile-name"))
        assertFalse(PermanentUrlPolicy.isValid("javascript:alert(1)"))
    }
}
