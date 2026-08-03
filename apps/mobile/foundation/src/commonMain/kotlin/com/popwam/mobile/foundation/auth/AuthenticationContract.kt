package com.popwam.mobile.foundation.auth

import kotlinx.serialization.Serializable

const val AUTHENTICATION_CONTRACT_VERSION = 2

@Serializable
enum class AccountState { NEW, RETURNING }

@Serializable
enum class AuthenticationMethod { PASSKEY, PHONE_OTP }

@Serializable
enum class RequiredEnrollment { PASSKEY, LOCAL_BIOMETRIC_AUTHORIZATION, PROFILE_SETUP }

@Serializable
enum class AuthenticationNextStep {
    VERIFY_PHONE,
    CREATE_PASSKEY,
    AUTHORIZE_LOCAL_BIOMETRICS,
    COMPLETE_PROFILE_SETUP,
    COMPLETE,
}

@Serializable
data class OtpPolicy(
    val codeLength: Int,
    val resendAfterSeconds: Int,
    val expiresAfterSeconds: Int,
    val maximumAttempts: Int,
)

@Serializable
data class RestrictedEnrollmentSession(
    val token: String,
    val expiresAt: String,
    val permittedActions: Set<AuthenticationNextStep>,
)

@Serializable
data class AuthenticationDecision(
    val contractVersion: Int = AUTHENTICATION_CONTRACT_VERSION,
    val transactionId: String,
    val accountState: AccountState,
    val allowedMethods: Set<AuthenticationMethod>,
    val preferredMethod: AuthenticationMethod,
    val otpPolicy: OtpPolicy? = null,
    val requiredEnrollments: List<RequiredEnrollment>,
    val nextStep: AuthenticationNextStep,
    val enrollmentSession: RestrictedEnrollmentSession? = null,
)

@Serializable
data class DeviceEnrollmentRecord(
    val deviceId: String,
    val passkeyCredentialId: String,
    val localBiometricAuthorizationEnabled: Boolean,
    val platform: String,
    val createdAt: String,
)

