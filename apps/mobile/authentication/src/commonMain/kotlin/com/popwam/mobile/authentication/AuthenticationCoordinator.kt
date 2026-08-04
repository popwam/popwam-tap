package com.popwam.mobile.authentication

import com.popwam.mobile.foundation.auth.AuthChallenge
import com.popwam.mobile.foundation.auth.AuthenticatedSession
import com.popwam.mobile.foundation.auth.AuthenticationNextAction
import com.popwam.mobile.foundation.auth.SessionScope
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.navigation.ProfileSetupStep
import com.popwam.mobile.foundation.overlay.OverlayCoordinator
import com.popwam.mobile.foundation.overlay.OverlayDismissPolicy
import com.popwam.mobile.foundation.overlay.OverlayEntry
import com.popwam.mobile.foundation.overlay.OverlayKey
import com.popwam.mobile.foundation.overlay.OverlayPresentation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.JsonObject

interface AuthenticationSessionVault {
    suspend fun readRestrictedToken(): String?
    suspend fun saveRestrictedToken(token: String, expiresAt: String)
    suspend fun commitFullSession(session: AuthenticatedSession)
    suspend fun clearRestrictedToken()
    suspend fun readRestoration(): RestorableAuthenticationState?
    suspend fun saveRestoration(state: RestorableAuthenticationState?)
    suspend fun readOrCreateCompletionKey(): String
}

class AuthenticationCoordinator(
    private val remote: AuthenticationRemoteDataSource,
    private val vault: AuthenticationSessionVault,
    val overlays: OverlayCoordinator = OverlayCoordinator(),
) {
    private val mutableState = MutableStateFlow(AuthenticationUiState())
    val state: StateFlow<AuthenticationUiState> = mutableState.asStateFlow()

    fun updatePhone(value: String) { mutableState.value = mutableState.value.copy(phoneInput = value, error = null) }
    fun updateCountry(iso2: String) { mutableState.value = mutableState.value.copy(countryIso2 = iso2, error = null) }
    fun openCountry() { mutableState.value = mutableState.value.copy(stage = AuthenticationStage.COUNTRY) }
    fun closeCountry() { mutableState.value = mutableState.value.copy(stage = AuthenticationStage.PHONE) }
    suspend fun resetPhone() {
        overlays.dismiss(forced = true)
        vault.clearRestrictedToken()
        vault.saveRestoration(null)
        mutableState.value = AuthenticationUiState(countryIso2 = mutableState.value.countryIso2)
    }
    fun updateOtp(value: String) {
        val length = mutableState.value.challenge?.otpConfiguration?.codeLength ?: 6
        mutableState.value = mutableState.value.copy(otp = mutableState.value.otp.accept(value, length), error = null)
    }

    fun beginOtpVerification(): Boolean {
        val current = mutableState.value
        val policy = current.challenge?.otpConfiguration ?: return false
        if (current.operation != AuthenticationOperation.IDLE || !current.otp.isComplete(policy.codeLength)) return false
        if (current.otp.attemptsUsed >= policy.maximumAttempts) {
            reportError(AuthenticationError.OTP_ATTEMPTS_EXHAUSTED)
            return false
        }
        mutableState.value = current.copy(
            operation = AuthenticationOperation.VERIFYING,
            otp = current.otp.copy(attemptsUsed = current.otp.attemptsUsed + 1),
            error = null,
        )
        return true
    }

    fun beginOtpResend(): Boolean {
        val current = mutableState.value
        if (current.operation != AuthenticationOperation.IDLE || current.stage != AuthenticationStage.OTP) return false
        mutableState.value = current.copy(operation = AuthenticationOperation.SUBMITTING, error = null)
        return true
    }

    suspend fun restoreEnrollment(): Boolean {
        val token = vault.readRestrictedToken()
        if (token == null) {
            val restored = vault.readRestoration() ?: return false
            val challenge = restored.challenge ?: return false
            mutableState.value = AuthenticationUiState(
                stage = restored.stage,
                challenge = challenge,
                phoneE164 = restored.phoneE164,
                maskedPhone = restored.maskedPhone,
                otp = OtpUiState(providerChallengeHandle = restored.providerChallengeHandle, remainingSeconds = challenge.otpConfiguration?.resendAfterSeconds ?: 0),
            )
            if (restored.stage == AuthenticationStage.OTP) overlays.present(OverlayEntry("auth-otp-${challenge.challengeId}", OverlayKey.OTP, OverlayPresentation.BOTTOM_SHEET, OverlayDismissPolicy.ACTION_REQUIRED))
            return true
        }
        mutableState.value = mutableState.value.copy(operation = AuthenticationOperation.RECOVERING, error = null)
        return when (val result = remote.enrollmentStatus(token)) {
            is AuthenticationApiResult.Failure -> { vault.clearRestrictedToken(); vault.saveRestoration(null); fail(result.code); false }
            is AuthenticationApiResult.Success -> { applyChallenge(result.value.challenge()); true }
        }
    }

    suspend fun startChallenge(phoneE164: String, maskedPhone: String, deviceCredentialId: String?): AuthChallenge? {
        if (mutableState.value.operation != AuthenticationOperation.IDLE) return null
        mutableState.value = mutableState.value.copy(operation = AuthenticationOperation.SUBMITTING, phoneE164 = phoneE164, maskedPhone = maskedPhone, error = null)
        return when (val result = remote.createChallenge(phoneE164, deviceCredentialId)) {
            is AuthenticationApiResult.Failure -> { fail(result.code); null }
            is AuthenticationApiResult.Success -> {
                val challenge = runCatching { result.value.challenge() }.getOrElse { fail("CONFIGURATION"); return null }
                applyChallenge(challenge)
                challenge
            }
        }
    }

    suspend fun phoneCodeSent(providerHandle: String) {
        val current = mutableState.value
        val challenge = current.challenge ?: return
        val otp = current.otp.copy(providerChallengeHandle = providerHandle, remainingSeconds = challenge.otpConfiguration?.resendAfterSeconds ?: 60)
        mutableState.value = current.copy(
            stage = AuthenticationStage.OTP,
            operation = AuthenticationOperation.IDLE,
            otp = otp,
            otpResultConsumed = false,
        )
        overlays.present(OverlayEntry("auth-otp-${challenge.challengeId}", OverlayKey.OTP, OverlayPresentation.BOTTOM_SHEET, OverlayDismissPolicy.ACTION_REQUIRED))
        vault.saveRestoration(RestorableAuthenticationState(challenge.challengeId, AuthenticationStage.OTP, current.maskedPhone, current.phoneE164, providerHandle, challenge = challenge))
    }

    suspend fun exchangeFirebaseProof(idToken: String, deviceName: String): AuthenticationEnvelope? {
        val current = mutableState.value
        val challenge = current.challenge ?: return null
        // beginOtpVerification intentionally sets VERIFYING before Firebase
        // returns.  The previous VERIFYING guard therefore dropped every
        // manually entered correct code before the POP exchange could begin.
        // Gate the Firebase result itself instead, so a late duplicate callback
        // cannot start a second exchange or navigation.
        if (current.otpResultConsumed) return null
        mutableState.value = current.copy(
            operation = AuthenticationOperation.VERIFYING,
            error = null,
            otpResultConsumed = true,
        )
        return when (val result = remote.exchangeFirebaseProof(challenge.challengeId, idToken, deviceName)) {
            is AuthenticationApiResult.Failure -> { fail(result.code); null }
            is AuthenticationApiResult.Success -> {
                if (!result.value.ok) {
                    fail(result.value.error ?: "AUTH_CONTRACT_PARSE_FAILED")
                    null
                } else {
                    acceptVerifiedEnvelope(result.value)
                    result.value
                }
            }
        }
    }

    suspend fun acceptPasskeyEnrollment(response: kotlinx.serialization.json.JsonObject): Boolean {
        if (mutableState.value.stage != AuthenticationStage.PASSKEY || mutableState.value.challenge?.nextAction != AuthenticationNextAction.ENROLL_PASSKEY) return false
        val token = vault.readRestrictedToken() ?: run { fail("ENROLLMENT_SESSION_REQUIRED"); return false }
        mutableState.value = mutableState.value.copy(operation = AuthenticationOperation.VERIFYING, error = null)
        return when (val result = remote.verifyEnrollmentPasskey(token, response)) {
            is AuthenticationApiResult.Failure -> { fail(result.code); false }
            is AuthenticationApiResult.Success -> { applyChallenge(result.value.challenge()); true }
        }
    }

    suspend fun passkeyOptions(enrollment: Boolean): JsonObject? {
        val result = if (enrollment) {
            val token = vault.readRestrictedToken() ?: run { fail("ENROLLMENT_SESSION_REQUIRED"); return null }
            remote.enrollmentPasskeyOptions(token)
        } else remote.passkeyAuthenticationOptions()
        return when (result) {
            is AuthenticationApiResult.Success -> result.value
            is AuthenticationApiResult.Failure -> { fail(result.code); null }
        }
    }

    suspend fun acceptPasskeyAuthentication(response: JsonObject, deviceName: String): Boolean {
        if (mutableState.value.stage != AuthenticationStage.PASSKEY || mutableState.value.challenge?.nextAction != AuthenticationNextAction.AUTHENTICATE_PASSKEY) return false
        val challenge = mutableState.value.challenge ?: return false
        mutableState.value = mutableState.value.copy(operation = AuthenticationOperation.VERIFYING, error = null)
        return when (val result = remote.verifyPasskeyAuthentication(challenge.challengeId, response, deviceName)) {
            is AuthenticationApiResult.Failure -> { fail(result.code); false }
            is AuthenticationApiResult.Success -> { acceptVerifiedEnvelope(result.value); true }
        }
    }

    suspend fun deviceOptions(enrollment: Boolean, credentialId: String? = null): com.popwam.mobile.foundation.platform.DeviceBindingOptions? {
        val result = if (enrollment) {
            val token = vault.readRestrictedToken() ?: run { fail("ENROLLMENT_SESSION_REQUIRED"); return null }
            remote.deviceEnrollmentOptions(token)
        } else {
            val challenge = mutableState.value.challenge ?: return null
            val id = credentialId ?: run { fail("DEVICE_CREDENTIAL_UNAVAILABLE"); return null }
            remote.deviceAuthenticationOptions(challenge.challengeId, id)
        }
        return when (result) {
            is AuthenticationApiResult.Failure -> { fail(result.code); null }
            is AuthenticationApiResult.Success -> com.popwam.mobile.foundation.platform.DeviceBindingOptions(result.value.challenge, result.value.expiresAt, result.value.algorithm)
        }
    }

    suspend fun acceptDeviceAuthentication(proof: com.popwam.mobile.foundation.platform.DeviceBindingProof, deviceName: String): Boolean {
        if (mutableState.value.stage != AuthenticationStage.BIOMETRIC || mutableState.value.challenge?.nextAction != AuthenticationNextAction.AUTHENTICATE_BIOMETRIC) return false
        val challenge = mutableState.value.challenge ?: return false
        mutableState.value = mutableState.value.copy(operation = AuthenticationOperation.VERIFYING, error = null)
        return when (val result = remote.verifyDeviceAuthentication(challenge.challengeId, proof, deviceName)) {
            is AuthenticationApiResult.Failure -> { fail(result.code); false }
            is AuthenticationApiResult.Success -> { acceptVerifiedEnvelope(result.value); true }
        }
    }

    suspend fun acceptDeviceEnrollment(proof: com.popwam.mobile.foundation.platform.DeviceBindingProof): Boolean {
        if (mutableState.value.stage != AuthenticationStage.BIOMETRIC || mutableState.value.challenge?.nextAction != AuthenticationNextAction.ENROLL_BIOMETRIC) return false
        val token = vault.readRestrictedToken() ?: run { fail("ENROLLMENT_SESSION_REQUIRED"); return false }
        mutableState.value = mutableState.value.copy(operation = AuthenticationOperation.VERIFYING, error = null)
        return when (val result = remote.verifyDeviceEnrollment(token, proof)) {
            is AuthenticationApiResult.Failure -> { fail(result.code); false }
            is AuthenticationApiResult.Success -> { applyChallenge(result.value.challenge()); true }
        }
    }

    suspend fun completeEnrollment(deviceName: String): Boolean {
        if (mutableState.value.pendingServerAction != AuthenticationNextAction.ACCOUNT_CREATED) return false
        val token = vault.readRestrictedToken() ?: run { fail("ENROLLMENT_SESSION_REQUIRED"); return false }
        mutableState.value = mutableState.value.copy(operation = AuthenticationOperation.VERIFYING, error = null)
        val completionKey = vault.readOrCreateCompletionKey()
        return when (val result = remote.completeEnrollment(token, completionKey, deviceName)) {
            is AuthenticationApiResult.Failure -> { fail(result.code); false }
            is AuthenticationApiResult.Success -> {
                val session = result.value.fullSession() ?: run { fail("SESSION_UPGRADE_FAILED"); return false }
                vault.commitFullSession(session)
                vault.clearRestrictedToken()
                vault.saveRestoration(null)
                mutableState.value = mutableState.value.copy(stage = AuthenticationStage.ACCOUNT_CREATED, operation = AuthenticationOperation.IDLE, challenge = result.value.challenge(), error = null)
                true
            }
        }
    }

    fun continueVerified() {
        overlays.dismiss(forced = true)
        mutableState.value = AuthenticationStateMachine.continueVerified(mutableState.value)
    }

    /** Bounded recovery for a provider/exchange callback that never returns. */
    fun recoverOtpVerification() {
        val current = mutableState.value
        if (current.stage != AuthenticationStage.OTP || current.operation != AuthenticationOperation.VERIFYING) return
        mutableState.value = current.copy(
            operation = AuthenticationOperation.IDLE,
            error = AuthenticationError.PHONE_VERIFICATION_FAILED,
            otpResultConsumed = true,
        )
    }

    fun usePasskeyFallback(): Boolean {
        val current = mutableState.value
        val challenge = current.challenge ?: return false
        if (com.popwam.mobile.foundation.auth.AuthenticationMethod.PASSKEY !in challenge.allowedMethods || challenge.sessionScope != SessionScope.NONE) return false
        mutableState.value = current.copy(stage = AuthenticationStage.PASSKEY, operation = AuthenticationOperation.IDLE, challenge = challenge.copy(preferredMethod = com.popwam.mobile.foundation.auth.AuthenticationMethod.PASSKEY, nextAction = AuthenticationNextAction.AUTHENTICATE_PASSKEY), error = null)
        return true
    }

    fun usePhoneFallback(): Boolean {
        val current = mutableState.value
        val challenge = current.challenge ?: return false
        if (
            com.popwam.mobile.foundation.auth.AuthenticationMethod.PHONE_OTP !in challenge.allowedMethods ||
            challenge.sessionScope != SessionScope.NONE
        ) return false
        mutableState.value = current.copy(
            operation = AuthenticationOperation.IDLE,
            challenge = challenge.copy(
                preferredMethod = com.popwam.mobile.foundation.auth.AuthenticationMethod.PHONE_OTP,
                nextAction = AuthenticationNextAction.VERIFY_OTP,
            ),
            error = null,
        )
        return true
    }

    fun profileSetupDestination(): PopDestination.ProfileSetup? {
        val current = mutableState.value
        if (current.stage != AuthenticationStage.ACCOUNT_CREATED || current.navigationConsumed) return null
        mutableState.value = current.copy(navigationConsumed = true)
        return PopDestination.ProfileSetup(ProfileSetupStep.BASIC_IDENTITY)
    }

    fun markWaitingForNativeUi() { mutableState.value = mutableState.value.copy(operation = AuthenticationOperation.WAITING_FOR_NATIVE_UI, error = null) }
    fun nativeCancelled(kind: AuthenticationError) { mutableState.value = mutableState.value.copy(operation = AuthenticationOperation.IDLE, error = kind) }
    fun setBiometricCapability(value: com.popwam.mobile.foundation.platform.BiometricCapability) { mutableState.value = mutableState.value.copy(biometricCapability = value, operation = AuthenticationOperation.IDLE) }
    fun reportError(error: AuthenticationError) {
        val current = mutableState.value
        val exhausted = error == AuthenticationError.OTP_INVALID && current.otp.attemptsUsed >= (current.challenge?.otpConfiguration?.maximumAttempts ?: Int.MAX_VALUE)
        mutableState.value = current.copy(operation = AuthenticationOperation.IDLE, error = if (exhausted) AuthenticationError.OTP_ATTEMPTS_EXHAUSTED else error)
    }

    private suspend fun acceptVerifiedEnvelope(envelope: AuthenticationEnvelope) {
        val challenge = envelope.challenge()
        envelope.enrollmentSession?.let { vault.saveRestrictedToken(it.token, it.expiresAt) }
        val full = envelope.fullSession()
        if (full != null) {
            require(challenge.sessionScope == SessionScope.FULL)
            vault.commitFullSession(full)
            vault.clearRestrictedToken()
            vault.saveRestoration(null)
            mutableState.value = mutableState.value.copy(stage = AuthenticationStage.AUTHENTICATED, operation = AuthenticationOperation.IDLE, challenge = challenge, error = null)
            overlays.dismiss(forced = true)
            return
        }
        require(challenge.sessionScope == SessionScope.ENROLLMENT && envelope.enrollmentSession != null)
        mutableState.value = AuthenticationStateMachine.afterVerified(mutableState.value, challenge)
        overlays.present(OverlayEntry("auth-verified-${challenge.challengeId}", OverlayKey.VERIFIED, OverlayPresentation.BOTTOM_SHEET, OverlayDismissPolicy.PROGRAMMATIC_ONLY))
        vault.saveRestoration(RestorableAuthenticationState(challenge.challengeId, AuthenticationStage.VERIFIED, mutableState.value.maskedPhone, mutableState.value.phoneE164, enrollmentExpiresAt = envelope.enrollmentSession.expiresAt, challenge = challenge))
    }

    private fun applyChallenge(challenge: AuthChallenge) {
        // ACCOUNT_CREATED is only presentable after the restricted token has been
        // atomically upgraded to a full session. While still restricted it is a
        // server signal to perform that upgrade, not permission to show success.
        val restrictedReady = challenge.nextAction == AuthenticationNextAction.ACCOUNT_CREATED && challenge.sessionScope == SessionScope.ENROLLMENT
        val stage = if (restrictedReady) AuthenticationStage.BIOMETRIC else AuthenticationStateMachine.stageFor(challenge.nextAction)
        mutableState.value = mutableState.value.copy(
            stage = stage,
            operation = AuthenticationOperation.IDLE,
            challenge = challenge,
            pendingServerAction = if (restrictedReady) AuthenticationNextAction.ACCOUNT_CREATED else null,
            error = null,
        )
    }

    private fun fail(code: String) {
        mutableState.value = mutableState.value.copy(operation = AuthenticationOperation.IDLE, error = errorFor(code))
    }

    private fun errorFor(code: String) = when {
        code.contains("RATE_LIMIT") -> AuthenticationError.RATE_LIMITED
        code.contains("ADMIN_UNAVAILABLE") || code.contains("CONFIG") || code.contains("CONTRACT") || code.contains("CHALLENGE_UNAVAILABLE") -> AuthenticationError.SERVER_CONFIGURATION_INCOMPLETE
        code.contains("NETWORK") -> AuthenticationError.SERVER_UNREACHABLE
        code.contains("FIREBASE") || code.contains("PHONE_IDENTITY") || code.contains("OTP") -> AuthenticationError.PHONE_VERIFICATION_FAILED
        code.contains("ENROLLMENT") || code.contains("SESSION_UPGRADE") -> AuthenticationError.ACCOUNT_PREPARATION_FAILED
        code.contains("CHALLENGE_EXPIRED") -> AuthenticationError.CHALLENGE_EXPIRED
        code.contains("SESSION_EXPIRED") -> AuthenticationError.SESSION_EXPIRED
        code.contains("PASSKEY") -> AuthenticationError.PASSKEY_REJECTED
        code.contains("DEVICE_BINDING") -> AuthenticationError.DEVICE_BINDING_FAILED
        code.contains("CONFIG") -> AuthenticationError.CONFIGURATION
        else -> AuthenticationError.SERVER_FAILURE
    }
}
