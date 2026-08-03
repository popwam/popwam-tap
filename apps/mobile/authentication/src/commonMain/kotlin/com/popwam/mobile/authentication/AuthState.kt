package com.popwam.mobile.authentication

import com.popwam.mobile.foundation.auth.AuthChallenge
import com.popwam.mobile.foundation.auth.AuthenticationNextAction
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.platform.BiometricCapability
import kotlinx.serialization.Serializable

enum class AuthenticationStage {
    PHONE,
    COUNTRY,
    OTP,
    VERIFIED,
    PASSKEY,
    BIOMETRIC,
    ACCOUNT_CREATED,
    AUTHENTICATED,
    BLOCKED,
}

enum class AuthenticationOperation { IDLE, SUBMITTING, WAITING_FOR_NATIVE_UI, VERIFYING, RECOVERING }

enum class AuthenticationError {
    EMPTY_PHONE,
    INCOMPLETE_PHONE,
    INVALID_COUNTRY,
    IMPOSSIBLE_NUMBER,
    INVALID_LENGTH,
    INVALID_PHONE,
    RATE_LIMITED,
    OFFLINE,
    SERVER_FAILURE,
    CHALLENGE_EXPIRED,
    SESSION_EXPIRED,
    OTP_INVALID,
    OTP_EXPIRED,
    OTP_ATTEMPTS_EXHAUSTED,
    PASSKEY_CANCELLED,
    PASSKEY_UNAVAILABLE,
    PASSKEY_REJECTED,
    BIOMETRIC_NOT_ENROLLED,
    BIOMETRIC_CANCELLED,
    BIOMETRIC_TEMPORARILY_LOCKED,
    BIOMETRIC_PERMANENTLY_LOCKED,
    BIOMETRIC_SECURITY_UPDATE_REQUIRED,
    DEVICE_BINDING_FAILED,
    CONFIGURATION,
    RECOVERY_REQUIRED,
}

data class OtpUiState(
    val value: String = "",
    val remainingSeconds: Int = 0,
    val attemptsUsed: Int = 0,
    val providerChallengeHandle: String? = null,
) {
    fun accept(raw: String, length: Int) = copy(value = raw.filter(Char::isDigit).take(length))
    fun isComplete(length: Int) = value.length == length && value.all(Char::isDigit)
}

data class AuthenticationUiState(
    val stage: AuthenticationStage = AuthenticationStage.PHONE,
    val operation: AuthenticationOperation = AuthenticationOperation.IDLE,
    val challenge: AuthChallenge? = null,
    val countryIso2: String = "EG",
    val phoneInput: String = "",
    val phoneE164: String? = null,
    val maskedPhone: String? = null,
    val otp: OtpUiState = OtpUiState(),
    val biometricCapability: BiometricCapability? = null,
    val pendingDestination: PopDestination? = null,
    val pendingServerAction: AuthenticationNextAction? = null,
    val error: AuthenticationError? = null,
    val navigationConsumed: Boolean = false,
)

@Serializable
data class RestorableAuthenticationState(
    val challengeId: String,
    val stage: AuthenticationStage,
    val maskedPhone: String? = null,
    val phoneE164: String? = null,
    val providerChallengeHandle: String? = null,
    val enrollmentExpiresAt: String? = null,
    val challenge: AuthChallenge? = null,
)

object AuthenticationStateMachine {
    fun stageFor(action: AuthenticationNextAction): AuthenticationStage = when (action) {
        AuthenticationNextAction.VERIFY_OTP -> AuthenticationStage.OTP
        AuthenticationNextAction.AUTHENTICATE_PASSKEY,
        AuthenticationNextAction.ENROLL_PASSKEY -> AuthenticationStage.PASSKEY
        AuthenticationNextAction.AUTHENTICATE_BIOMETRIC,
        AuthenticationNextAction.ENROLL_BIOMETRIC -> AuthenticationStage.BIOMETRIC
        AuthenticationNextAction.ACCOUNT_CREATED -> AuthenticationStage.ACCOUNT_CREATED
        AuthenticationNextAction.PROFILE_SETUP,
        AuthenticationNextAction.AUTHENTICATED -> AuthenticationStage.AUTHENTICATED
        AuthenticationNextAction.RECOVERY_REQUIRED,
        AuthenticationNextAction.BLOCKED -> AuthenticationStage.BLOCKED
    }

    fun afterVerified(state: AuthenticationUiState, challenge: AuthChallenge): AuthenticationUiState {
        val next = challenge.nextAction
        require(next != AuthenticationNextAction.VERIFY_OTP)
        return state.copy(
            stage = AuthenticationStage.VERIFIED,
            operation = AuthenticationOperation.IDLE,
            challenge = challenge,
            pendingServerAction = next,
            error = null,
            otp = state.otp.copy(value = ""),
        )
    }

    fun continueVerified(state: AuthenticationUiState): AuthenticationUiState {
        val action = state.pendingServerAction ?: return state
        return state.copy(stage = stageFor(action), pendingServerAction = null, navigationConsumed = false)
    }
}
