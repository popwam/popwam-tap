package com.popwam.pop.data.auth

import androidx.biometric.BiometricManager
import com.popwam.mobile.foundation.platform.BiometricCapability
import org.junit.Assert.assertEquals
import org.junit.Test

class AndroidBiometricCapabilityTest {
    @Test fun `labels fingerprint and face from real hardware features`() {
        assertEquals(BiometricCapability.FINGERPRINT,androidBiometricCapability(BiometricManager.BIOMETRIC_SUCCESS,true,false))
        assertEquals(BiometricCapability.FACE,androidBiometricCapability(BiometricManager.BIOMETRIC_SUCCESS,false,true))
        assertEquals(BiometricCapability.GENERIC_BIOMETRIC,androidBiometricCapability(BiometricManager.BIOMETRIC_SUCCESS,false,false))
    }
    @Test fun `does not collapse enrollment and recovery states into unavailable`() {
        assertEquals(BiometricCapability.AVAILABLE_NOT_ENROLLED,androidBiometricCapability(BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED,true,false))
        assertEquals(BiometricCapability.SECURITY_UPDATE_REQUIRED,androidBiometricCapability(BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED,true,false))
        assertEquals(BiometricCapability.TEMPORARILY_LOCKED,androidBiometricCapability(BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE,true,false))
        assertEquals(BiometricCapability.UNAVAILABLE,androidBiometricCapability(BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,false,false))
    }
}
