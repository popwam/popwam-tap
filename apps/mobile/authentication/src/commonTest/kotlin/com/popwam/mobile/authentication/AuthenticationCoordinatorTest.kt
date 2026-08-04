package com.popwam.mobile.authentication

import com.popwam.mobile.foundation.auth.*
import com.popwam.mobile.foundation.platform.DeviceBindingProof
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AuthenticationCoordinatorTest {
    @Test fun `new user receives restricted state until server upgrade`() = runTest {
        val vault = FakeVault()
        val remote = FakeRemote()
        val coordinator = AuthenticationCoordinator(remote, vault)

        assertNotNull(coordinator.startChallenge("+201001234567", "+20 ••• ••• 4567", null))
        coordinator.phoneCodeSent("provider-handle")
        coordinator.exchangeFirebaseProof("firebase-proof", "Android test")
        assertEquals(AuthenticationStage.VERIFIED, coordinator.state.value.stage)
        assertNull(vault.full)
        assertEquals("restricted-token", vault.restricted)

        coordinator.continueVerified()
        assertEquals(AuthenticationStage.PASSKEY, coordinator.state.value.stage)
        assertTrue(coordinator.acceptPasskeyEnrollment(JsonObject(emptyMap())))
        assertEquals(AuthenticationStage.BIOMETRIC, coordinator.state.value.stage)
        assertTrue(coordinator.acceptDeviceEnrollment(remote.deviceProof))
        assertEquals(AuthenticationStage.BIOMETRIC, coordinator.state.value.stage)
        assertNull(vault.full)
        assertTrue(coordinator.completeEnrollment("Android test"))
        assertEquals(AuthenticationStage.ACCOUNT_CREATED, coordinator.state.value.stage)
        assertNotNull(vault.full)
        assertNull(vault.restricted)
        assertNotNull(coordinator.profileSetupDestination())
        assertNull(coordinator.profileSetupDestination())
    }

    @Test fun `duplicate native result cannot create duplicate navigation`() = runTest {
        val vault = FakeVault(restricted = "restricted-token")
        val remote = FakeRemote()
        val coordinator = AuthenticationCoordinator(remote, vault)
        coordinator.startChallenge("+201001234567", "masked", null)
        coordinator.exchangeFirebaseProof("proof", "device")
        coordinator.continueVerified()
        coordinator.acceptPasskeyEnrollment(JsonObject(emptyMap()))
        coordinator.acceptPasskeyEnrollment(JsonObject(emptyMap()))
        assertEquals(1, remote.passkeyCallbacks)
        assertEquals(AuthenticationStage.BIOMETRIC, coordinator.state.value.stage)
    }

    @Test fun `manual otp result is exchanged once and advances a new user to verified`() = runTest {
        val vault = FakeVault()
        val remote = FakeRemote()
        val coordinator = AuthenticationCoordinator(remote, vault)

        coordinator.startChallenge("+201001234567", "masked", null)
        coordinator.phoneCodeSent("provider-handle")
        coordinator.updateOtp("123456")
        assertTrue(coordinator.beginOtpVerification())

        assertNotNull(coordinator.exchangeFirebaseProof("firebase-proof", "device"))
        assertNull(coordinator.exchangeFirebaseProof("duplicate-proof", "device"))
        assertEquals(1, remote.phoneExchangeCalls)
        assertEquals(AuthenticationStage.VERIFIED, coordinator.state.value.stage)
        assertEquals(AuthenticationNextAction.ENROLL_PASSKEY, coordinator.state.value.pendingServerAction)
        assertEquals("restricted-token", vault.restricted)
    }

    @Test fun `existing full session from otp becomes authenticated without enrollment`() = runTest {
        val vault = FakeVault()
        val remote = FakeRemote().apply { phoneExchangeAction = AuthenticationNextAction.AUTHENTICATED }
        val coordinator = AuthenticationCoordinator(remote, vault)

        coordinator.startChallenge("+201001234567", "masked", null)
        coordinator.phoneCodeSent("provider-handle")
        coordinator.updateOtp("123456")
        assertTrue(coordinator.beginOtpVerification())
        coordinator.exchangeFirebaseProof("firebase-proof", "device")

        assertEquals(AuthenticationStage.AUTHENTICATED, coordinator.state.value.stage)
        assertNotNull(vault.full)
        assertNull(vault.restricted)
    }

    @Test fun `phone fallback is permitted only by an unauthenticated server challenge`() = runTest {
        val coordinator = AuthenticationCoordinator(FakeRemote(), FakeVault())
        coordinator.startChallenge("+201001234567", "masked", null)

        assertTrue(coordinator.usePhoneFallback())
        assertEquals(AuthenticationNextAction.VERIFY_OTP, coordinator.state.value.challenge?.nextAction)

        coordinator.exchangeFirebaseProof("proof", "device")
        assertEquals(SessionScope.ENROLLMENT, coordinator.state.value.challenge?.sessionScope)
        assertEquals(false, coordinator.usePhoneFallback())
    }
}

private class FakeVault(var restricted: String? = null) : AuthenticationSessionVault {
    var full: AuthenticatedSession? = null
    private var restoration: RestorableAuthenticationState? = null
    override suspend fun readRestrictedToken() = restricted
    override suspend fun saveRestrictedToken(token: String, expiresAt: String) { restricted = token }
    override suspend fun commitFullSession(session: AuthenticatedSession) { full = session }
    override suspend fun clearRestrictedToken() { restricted = null }
    override suspend fun readRestoration() = restoration
    override suspend fun saveRestoration(state: RestorableAuthenticationState?) { restoration = state }
    override suspend fun readOrCreateCompletionKey() = "completion-key-that-is-long-enough-123456"
}

private class FakeRemote : AuthenticationRemoteDataSource {
    var passkeyCallbacks = 0
    var phoneExchangeCalls = 0
    var phoneExchangeAction = AuthenticationNextAction.ENROLL_PASSKEY
    val deviceProof = DeviceBindingProof("challenge", "credential_123456789", "public", "signature", com.popwam.mobile.foundation.platform.BiometricCapability.FINGERPRINT)
    private fun envelope(action: AuthenticationNextAction, enrollment: Boolean = true) = AuthenticationEnvelope(
        ok = true,
        challengeId = "challenge",
        accountState = AccountState.NEW,
        allowedMethods = listOf(AuthenticationMethod.PHONE_OTP),
        preferredMethod = AuthenticationMethod.PHONE_OTP,
        otpConfiguration = OtpConfiguration(6, 300, 60, 5, true),
        passkeyRequirement = if (action == AuthenticationNextAction.ENROLL_PASSKEY) PasskeyRequirement.REQUIRED else PasskeyRequirement.AVAILABLE,
        biometricEnrollmentPolicy = BiometricEnrollmentPolicy.REQUIRED_WHEN_AVAILABLE,
        sessionScope = if (enrollment) SessionScope.ENROLLMENT else SessionScope.FULL,
        nextAction = action,
        expiresAt = "2099-01-01T00:00:00Z",
        enrollmentSession = if (enrollment) RestrictedEnrollmentSession("restricted-token", "2099-01-01T00:00:00Z") else null,
        accessToken = if (enrollment) null else "access",
        refreshToken = if (enrollment) null else "refresh",
        accessExpiresIn = 900,
        refreshExpiresIn = 1000,
        user = if (enrollment) null else AuthenticationUser("user", "USER"),
    )
    override suspend fun createChallenge(phoneE164: String, deviceCredentialId: String?) = AuthenticationApiResult.Success(envelope(AuthenticationNextAction.VERIFY_OTP).copy(accountState = AccountState.UNKNOWN, sessionScope = SessionScope.NONE, enrollmentSession = null))
    override suspend fun exchangeFirebaseProof(challengeId: String, idToken: String, deviceName: String): AuthenticationApiResult<AuthenticationEnvelope> {
        phoneExchangeCalls += 1
        val enrollment = phoneExchangeAction != AuthenticationNextAction.AUTHENTICATED
        return AuthenticationApiResult.Success(envelope(phoneExchangeAction, enrollment))
    }
    override suspend fun passkeyAuthenticationOptions() = AuthenticationApiResult.Success(JsonObject(emptyMap()))
    override suspend fun verifyPasskeyAuthentication(challengeId: String, assertion: JsonObject, deviceName: String) = AuthenticationApiResult.Success(envelope(AuthenticationNextAction.AUTHENTICATED, false))
    override suspend fun enrollmentStatus(enrollmentToken: String) = AuthenticationApiResult.Success(envelope(AuthenticationNextAction.ENROLL_PASSKEY))
    override suspend fun enrollmentPasskeyOptions(enrollmentToken: String) = AuthenticationApiResult.Success(JsonObject(emptyMap()))
    override suspend fun verifyEnrollmentPasskey(enrollmentToken: String, response: JsonObject): AuthenticationApiResult<AuthenticationEnvelope> { passkeyCallbacks += 1; return AuthenticationApiResult.Success(envelope(AuthenticationNextAction.ENROLL_BIOMETRIC)) }
    override suspend fun deviceEnrollmentOptions(enrollmentToken: String) = AuthenticationApiResult.Success(DeviceOptionsResponse(ok = true, challenge = "challenge"))
    override suspend fun verifyDeviceEnrollment(enrollmentToken: String, proof: DeviceBindingProof) = AuthenticationApiResult.Success(envelope(AuthenticationNextAction.ACCOUNT_CREATED))
    override suspend fun deviceAuthenticationOptions(challengeId: String, credentialId: String) = AuthenticationApiResult.Success(DeviceOptionsResponse(ok = true, challenge = "challenge"))
    override suspend fun verifyDeviceAuthentication(challengeId: String, proof: DeviceBindingProof, deviceName: String) = AuthenticationApiResult.Success(envelope(AuthenticationNextAction.AUTHENTICATED, false))
    override suspend fun completeEnrollment(enrollmentToken: String, idempotencyKey: String, deviceName: String) = AuthenticationApiResult.Success(envelope(AuthenticationNextAction.PROFILE_SETUP, false))
    override suspend fun abortEnrollment(enrollmentToken: String) = AuthenticationApiResult.Success(Unit)
}
