package com.popwam.pop.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PhoneFirstEntryPolicyTest {
    @Test fun `phone entry progresses to otp without account classification`() {
        assertEquals(PhoneEntryStage.PHONE, phoneEntryStage(null, false))
        assertEquals(PhoneEntryStage.OTP, phoneEntryStage("challenge", false))
    }

    @Test fun `otp submission is numeric and bounded`() {
        assertTrue(canSubmitOtp("123456", false))
        assertFalse(canSubmitOtp("12345a", false))
        assertFalse(canSubmitOtp("123456", true))
    }

    @Test fun `manual phone code is exactly six digits`() {
        assertTrue(canSubmitOtp("123456", false))
        assertFalse(canSubmitOtp("1234", false))
        assertFalse(canSubmitOtp("1234567", false))
    }
}
