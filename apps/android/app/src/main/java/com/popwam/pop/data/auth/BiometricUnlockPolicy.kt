package com.popwam.pop.data.auth

import androidx.biometric.BiometricManager

/**
 * Biometric success is never POP authentication by itself. It is eligible only
 * when a separately provisioned, biometric-protected POP authority exists.
 */
enum class BiometricUnlockEligibility { ELIGIBLE, NO_LOCAL_POP_AUTHORITY, HARDWARE_UNAVAILABLE, NOT_ENROLLED, LOCKED_OUT, UNSUPPORTED }

fun biometricUnlockEligibility(hasLocalPopAuthority:Boolean,canAuthenticate:Int):BiometricUnlockEligibility {
    if(!hasLocalPopAuthority)return BiometricUnlockEligibility.NO_LOCAL_POP_AUTHORITY
    return when(canAuthenticate) {
        BiometricManager.BIOMETRIC_SUCCESS -> BiometricUnlockEligibility.ELIGIBLE
        BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE,
        BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> BiometricUnlockEligibility.HARDWARE_UNAVAILABLE
        BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricUnlockEligibility.NOT_ENROLLED
        BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED,
        BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED -> BiometricUnlockEligibility.UNSUPPORTED
        else -> BiometricUnlockEligibility.LOCKED_OUT
    }
}
