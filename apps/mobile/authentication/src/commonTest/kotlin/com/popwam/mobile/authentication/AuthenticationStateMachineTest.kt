package com.popwam.mobile.authentication

import com.popwam.mobile.foundation.auth.*
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails

class AuthenticationStateMachineTest {
    @Test fun `all server next actions map to explicit stages`() {
        assertEquals(AuthenticationStage.OTP, AuthenticationStateMachine.stageFor(AuthenticationNextAction.VERIFY_OTP))
        assertEquals(AuthenticationStage.PASSKEY, AuthenticationStateMachine.stageFor(AuthenticationNextAction.AUTHENTICATE_PASSKEY))
        assertEquals(AuthenticationStage.PASSKEY, AuthenticationStateMachine.stageFor(AuthenticationNextAction.ENROLL_PASSKEY))
        assertEquals(AuthenticationStage.BIOMETRIC, AuthenticationStateMachine.stageFor(AuthenticationNextAction.AUTHENTICATE_BIOMETRIC))
        assertEquals(AuthenticationStage.BIOMETRIC, AuthenticationStateMachine.stageFor(AuthenticationNextAction.ENROLL_BIOMETRIC))
        assertEquals(AuthenticationStage.ACCOUNT_CREATED, AuthenticationStateMachine.stageFor(AuthenticationNextAction.ACCOUNT_CREATED))
        assertEquals(AuthenticationStage.AUTHENTICATED, AuthenticationStateMachine.stageFor(AuthenticationNextAction.PROFILE_SETUP))
        assertEquals(AuthenticationStage.AUTHENTICATED, AuthenticationStateMachine.stageFor(AuthenticationNextAction.AUTHENTICATED))
        assertEquals(AuthenticationStage.BLOCKED, AuthenticationStateMachine.stageFor(AuthenticationNextAction.RECOVERY_REQUIRED))
        assertEquals(AuthenticationStage.BLOCKED, AuthenticationStateMachine.stageFor(AuthenticationNextAction.BLOCKED))
    }

    @Test fun `restricted enrollment cannot claim full session scope`() {
        assertFails {
            challenge(AuthenticationNextAction.ENROLL_PASSKEY, SessionScope.FULL).copy(
                enrollmentSession = RestrictedEnrollmentSession("secret", "2099-01-01T00:00:00Z"),
            ).validated()
        }
    }

    @Test fun `otp accepts variable server configured length and paste`() {
        val otp = OtpUiState().accept("12 34-56789", 8)
        assertEquals("12345678", otp.value)
        assertEquals(true, otp.isComplete(8))
    }

    private fun challenge(action: AuthenticationNextAction, scope: SessionScope = SessionScope.ENROLLMENT) = AuthChallenge(
        challengeId = "challenge",
        accountState = AccountState.NEW,
        allowedMethods = listOf(AuthenticationMethod.PHONE_OTP),
        preferredMethod = AuthenticationMethod.PHONE_OTP,
        otpConfiguration = OtpConfiguration(6, 300, 60, 5, true),
        passkeyRequirement = if (action == AuthenticationNextAction.ENROLL_PASSKEY) PasskeyRequirement.REQUIRED else PasskeyRequirement.AVAILABLE,
        biometricEnrollmentPolicy = BiometricEnrollmentPolicy.REQUIRED_WHEN_AVAILABLE,
        sessionScope = scope,
        nextAction = action,
        expiresAt = "2099-01-01T00:00:00Z",
    )
}
