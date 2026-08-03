package com.popwam.mobile.foundation.auth

import kotlinx.serialization.Serializable

const val AUTHENTICATION_CONTRACT_VERSION = 2

@Serializable
enum class AccountState { UNKNOWN, NEW, RETURNING }

@Serializable
enum class AuthenticationMethod { PHONE_OTP, PASSKEY, BIOMETRIC_DEVICE_CREDENTIAL }

@Serializable
enum class SessionScope { NONE, ENROLLMENT, FULL }

@Serializable
enum class PasskeyRequirement { NOT_REQUIRED, AVAILABLE, REQUIRED }

@Serializable
enum class BiometricEnrollmentPolicy { REQUIRED_WHEN_AVAILABLE }

@Serializable
enum class AuthenticationNextAction {
    VERIFY_OTP,
    AUTHENTICATE_PASSKEY,
    AUTHENTICATE_BIOMETRIC,
    ENROLL_PASSKEY,
    ENROLL_BIOMETRIC,
    ACCOUNT_CREATED,
    PROFILE_SETUP,
    AUTHENTICATED,
    RECOVERY_REQUIRED,
    BLOCKED,
}

@Serializable
data class OtpConfiguration(
    val codeLength: Int,
    val expiresAfterSeconds: Int,
    val resendAfterSeconds: Int,
    val maximumAttempts: Int,
    val automaticSubmissionAllowed: Boolean,
) {
    fun normalized() = copy(
        codeLength = codeLength.coerceIn(4, 10),
        expiresAfterSeconds = expiresAfterSeconds.coerceIn(30, 900),
        resendAfterSeconds = resendAfterSeconds.coerceIn(10, 300),
        maximumAttempts = maximumAttempts.coerceIn(1, 20),
    )
}

@Serializable
data class RestrictedEnrollmentSession(
    val token: String,
    val expiresAt: String,
)

@Serializable
data class AuthChallenge(
    val contractVersion: Int = AUTHENTICATION_CONTRACT_VERSION,
    val challengeId: String,
    val accountState: AccountState,
    val allowedMethods: List<AuthenticationMethod>,
    val preferredMethod: AuthenticationMethod,
    val otpConfiguration: OtpConfiguration? = null,
    val passkeyRequirement: PasskeyRequirement,
    val biometricEnrollmentPolicy: BiometricEnrollmentPolicy,
    val sessionScope: SessionScope,
    val nextAction: AuthenticationNextAction,
    val expiresAt: String,
    val enrollmentSession: RestrictedEnrollmentSession? = null,
) {
    fun validated(): AuthChallenge {
        require(contractVersion == AUTHENTICATION_CONTRACT_VERSION)
        require(challengeId.isNotBlank())
        require(preferredMethod in allowedMethods)
        require(sessionScope != SessionScope.FULL || enrollmentSession == null)
        require(nextAction != AuthenticationNextAction.ENROLL_PASSKEY || passkeyRequirement == PasskeyRequirement.REQUIRED)
        return copy(otpConfiguration = otpConfiguration?.normalized())
    }
}

@Serializable
data class AuthenticatedSession(
    val accessToken: String,
    val refreshToken: String,
    val accessExpiresIn: Int,
    val refreshExpiresIn: Int,
    val tokenType: String = "Bearer",
    val userId: String,
    val role: String,
    val nextAction: AuthenticationNextAction,
)

@Serializable
data class DeviceEnrollmentRecord(
    val credentialId: String,
    val publicKey: String,
    val biometricType: String,
    val platform: String,
)

