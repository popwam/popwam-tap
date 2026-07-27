package com.popwam.pop.data.auth

import androidx.biometric.BiometricManager
import org.junit.Assert.assertEquals
import org.junit.Test

class BiometricUnlockPolicyTest {
    @Test fun `no local POP authority is never an authentication route`() {
        assertEquals(BiometricUnlockEligibility.NO_LOCAL_POP_AUTHORITY,biometricUnlockEligibility(false,BiometricManager.BIOMETRIC_SUCCESS))
    }
    @Test fun `eligible biometric needs both secure authority and strong biometric`() {
        assertEquals(BiometricUnlockEligibility.ELIGIBLE,biometricUnlockEligibility(true,BiometricManager.BIOMETRIC_SUCCESS))
    }
    @Test fun `hardware enrollment and unsupported states remain unavailable`() {
        assertEquals(BiometricUnlockEligibility.HARDWARE_UNAVAILABLE,biometricUnlockEligibility(true,BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE))
        assertEquals(BiometricUnlockEligibility.NOT_ENROLLED,biometricUnlockEligibility(true,BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED))
        assertEquals(BiometricUnlockEligibility.UNSUPPORTED,biometricUnlockEligibility(true,BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED))
    }
}
