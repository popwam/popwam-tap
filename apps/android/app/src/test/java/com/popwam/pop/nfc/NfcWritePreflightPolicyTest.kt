package com.popwam.pop.nfc

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NfcWritePreflightPolicyTest {
    @Test fun `reports read only and capacity failures before write`() {
        assertEquals(NfcFailure.READ_ONLY, NfcWritePreflightPolicy.failure(false, 1024, 80))
        assertEquals(NfcFailure.TOO_SMALL, NfcWritePreflightPolicy.failure(true, 32, 80))
        assertEquals(NfcFailure.VERIFY_FAILED, NfcWritePreflightPolicy.failure(true, 1024, 0))
        assertNull(NfcWritePreflightPolicy.failure(true, 1024, 80))
    }
}
