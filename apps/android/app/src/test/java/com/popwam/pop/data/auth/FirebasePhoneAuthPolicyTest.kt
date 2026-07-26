package com.popwam.pop.data.auth

import org.junit.Assert.assertEquals
import org.junit.Test

class FirebasePhoneAuthPolicyTest {
    @Test fun `provider errors are converted to user safe categories`() {
        assertEquals(FirebasePhoneFailure.INVALID_PHONE,firebasePhoneFailure("ERROR_INVALID_PHONE_NUMBER"))
        assertEquals(FirebasePhoneFailure.INVALID_CODE,firebasePhoneFailure("ERROR_INVALID_VERIFICATION_CODE",manualCode=true))
        assertEquals(FirebasePhoneFailure.SESSION_EXPIRED,firebasePhoneFailure("ERROR_SESSION_EXPIRED"))
        assertEquals(FirebasePhoneFailure.RECAPTCHA,firebasePhoneFailure("ERROR_RECAPTCHA_FAILED"))
        assertEquals(FirebasePhoneFailure.APP_VERIFICATION,firebasePhoneFailure("ERROR_INVALID_APP_CREDENTIAL"))
        assertEquals(FirebasePhoneFailure.QUOTA,firebasePhoneFailure("ERROR_QUOTA_EXCEEDED"))
    }

    @Test fun `network and throttling are distinct`() {
        assertEquals(FirebasePhoneFailure.NETWORK,firebasePhoneFailure("",network=true))
        assertEquals(FirebasePhoneFailure.TOO_MANY_REQUESTS,firebasePhoneFailure("",rateLimited=true))
    }

    @Test fun `phone masking keeps only destination context`() {
        assertEquals("+201 ••• ••• 4567",PhoneIdentity.mask("+201001234567"))
    }
}
