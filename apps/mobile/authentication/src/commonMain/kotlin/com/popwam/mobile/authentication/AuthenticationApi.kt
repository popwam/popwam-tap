package com.popwam.mobile.authentication

import com.popwam.mobile.foundation.auth.AuthChallenge
import com.popwam.mobile.foundation.auth.AuthenticatedSession
import com.popwam.mobile.foundation.auth.AuthenticationNextAction
import com.popwam.mobile.foundation.auth.RestrictedEnrollmentSession
import com.popwam.mobile.foundation.platform.DeviceBindingProof
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject

@Serializable
data class AuthenticationUser(val id: String, val role: String, val name: String? = null)

@Serializable
data class AuthenticationEnvelope(
    val ok: Boolean = false,
    val contractVersion: Int = 2,
    val challengeId: String = "",
    val accountState: com.popwam.mobile.foundation.auth.AccountState = com.popwam.mobile.foundation.auth.AccountState.UNKNOWN,
    val allowedMethods: List<com.popwam.mobile.foundation.auth.AuthenticationMethod> = emptyList(),
    val preferredMethod: com.popwam.mobile.foundation.auth.AuthenticationMethod = com.popwam.mobile.foundation.auth.AuthenticationMethod.PHONE_OTP,
    val otpConfiguration: com.popwam.mobile.foundation.auth.OtpConfiguration? = null,
    val passkeyRequirement: com.popwam.mobile.foundation.auth.PasskeyRequirement = com.popwam.mobile.foundation.auth.PasskeyRequirement.NOT_REQUIRED,
    val biometricEnrollmentPolicy: com.popwam.mobile.foundation.auth.BiometricEnrollmentPolicy = com.popwam.mobile.foundation.auth.BiometricEnrollmentPolicy.REQUIRED_WHEN_AVAILABLE,
    val sessionScope: com.popwam.mobile.foundation.auth.SessionScope = com.popwam.mobile.foundation.auth.SessionScope.NONE,
    val nextAction: AuthenticationNextAction = AuthenticationNextAction.BLOCKED,
    val expiresAt: String = "",
    val enrollmentSession: RestrictedEnrollmentSession? = null,
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val accessExpiresIn: Int = 0,
    val refreshExpiresIn: Int = 0,
    val tokenType: String = "Bearer",
    val user: AuthenticationUser? = null,
    val error: String? = null,
) {
    fun challenge() = AuthChallenge(
        contractVersion,
        challengeId,
        accountState,
        allowedMethods,
        preferredMethod,
        otpConfiguration,
        passkeyRequirement,
        biometricEnrollmentPolicy,
        sessionScope,
        nextAction,
        expiresAt,
        enrollmentSession,
    ).validated()

    fun fullSession(): AuthenticatedSession? {
        val currentUser = user ?: return null
        return AuthenticatedSession(
            accessToken = accessToken ?: return null,
            refreshToken = refreshToken ?: return null,
            accessExpiresIn = accessExpiresIn,
            refreshExpiresIn = refreshExpiresIn,
            tokenType = tokenType,
            userId = currentUser.id,
            role = currentUser.role,
            nextAction = nextAction,
        )
    }
}

@Serializable private data class ChallengeRequest(val contractVersion: Int = 2, val phoneE164: String, val deviceCredentialId: String? = null)
@Serializable private data class FirebaseExchangeRequest(val contractVersion: Int = 2, val challengeId: String, val deviceName: String)
@Serializable private data class DeviceOptionsRequest(val challengeId: String, val credentialId: String)
@Serializable private data class CompleteRequest(val deviceName: String, val idempotencyKey: String)
@Serializable private data class PasskeyAssertionRequest(val assertion: JsonObject, val deviceName: String, val contractVersion: Int = 2, val challengeId: String)
@Serializable private data class DeviceProofRequest(
    val challengeId: String? = null,
    val challenge: String,
    val credentialId: String,
    val publicKey: String,
    val signature: String,
    val biometricType: String,
    val deviceName: String? = null,
)

@Serializable
data class DeviceOptionsResponse(
    val ok: Boolean = false,
    val completed: Boolean = false,
    val challenge: String = "",
    val expiresAt: String = "",
    val algorithm: String = "ES256",
    val error: String? = null,
)

sealed interface AuthenticationApiResult<out T> {
    data class Success<T>(val value: T) : AuthenticationApiResult<T>
    data class Failure(val code: String, val status: Int? = null) : AuthenticationApiResult<Nothing>
}

interface AuthenticationRemoteDataSource {
    suspend fun createChallenge(phoneE164: String, deviceCredentialId: String?): AuthenticationApiResult<AuthenticationEnvelope>
    suspend fun exchangeFirebaseProof(challengeId: String, idToken: String, deviceName: String): AuthenticationApiResult<AuthenticationEnvelope>
    suspend fun passkeyAuthenticationOptions(): AuthenticationApiResult<JsonObject>
    suspend fun verifyPasskeyAuthentication(challengeId: String, assertion: JsonObject, deviceName: String): AuthenticationApiResult<AuthenticationEnvelope>
    suspend fun enrollmentStatus(enrollmentToken: String): AuthenticationApiResult<AuthenticationEnvelope>
    suspend fun enrollmentPasskeyOptions(enrollmentToken: String): AuthenticationApiResult<JsonObject>
    suspend fun verifyEnrollmentPasskey(enrollmentToken: String, response: JsonObject): AuthenticationApiResult<AuthenticationEnvelope>
    suspend fun deviceEnrollmentOptions(enrollmentToken: String): AuthenticationApiResult<DeviceOptionsResponse>
    suspend fun verifyDeviceEnrollment(enrollmentToken: String, proof: DeviceBindingProof): AuthenticationApiResult<AuthenticationEnvelope>
    suspend fun deviceAuthenticationOptions(challengeId: String, credentialId: String): AuthenticationApiResult<DeviceOptionsResponse>
    suspend fun verifyDeviceAuthentication(challengeId: String, proof: DeviceBindingProof, deviceName: String): AuthenticationApiResult<AuthenticationEnvelope>
    suspend fun completeEnrollment(enrollmentToken: String, idempotencyKey: String, deviceName: String): AuthenticationApiResult<AuthenticationEnvelope>
    suspend fun abortEnrollment(enrollmentToken: String): AuthenticationApiResult<Unit>
}

class KtorAuthenticationRemoteDataSource(
    private val client: HttpClient,
    private val baseUrl: String,
    private val json: Json = Json { ignoreUnknownKeys = true; encodeDefaults = true },
) : AuthenticationRemoteDataSource {
    private fun endpoint(path: String) = "${baseUrl.trimEnd('/')}/$path"

    private suspend inline fun <reified T> call(crossinline block: suspend () -> io.ktor.client.statement.HttpResponse): AuthenticationApiResult<T> = try {
        val response = block()
        val text = response.body<String>()
        if (response.status.value in 200..299) AuthenticationApiResult.Success(json.decodeFromString<T>(text))
        else AuthenticationApiResult.Failure(runCatching { json.parseToJsonElement(text).jsonObject["error"]?.toString()?.trim('"') }.getOrNull() ?: "SERVER_FAILURE", response.status.value)
    } catch (_: Throwable) {
        AuthenticationApiResult.Failure("NETWORK_FAILURE")
    }

    override suspend fun createChallenge(phoneE164: String, deviceCredentialId: String?) = call<AuthenticationEnvelope> {
        client.post(endpoint("api/mobile/auth/challenge")) { contentType(ContentType.Application.Json); setBody(ChallengeRequest(phoneE164 = phoneE164, deviceCredentialId = deviceCredentialId)) }
    }

    override suspend fun exchangeFirebaseProof(challengeId: String, idToken: String, deviceName: String) = call<AuthenticationEnvelope> {
        client.post(endpoint("api/mobile/auth/firebase/phone/exchange")) {
            contentType(ContentType.Application.Json)
            header("X-Firebase-Id-Token", idToken)
            setBody(FirebaseExchangeRequest(challengeId = challengeId, deviceName = deviceName))
        }
    }

    override suspend fun passkeyAuthenticationOptions() = call<JsonObject> { client.post(endpoint("api/mobile/auth/passkey/options")) }
    override suspend fun verifyPasskeyAuthentication(challengeId: String, assertion: JsonObject, deviceName: String) = call<AuthenticationEnvelope> {
        client.post(endpoint("api/mobile/auth/passkey/verify")) { contentType(ContentType.Application.Json); setBody(PasskeyAssertionRequest(assertion, deviceName, challengeId = challengeId)) }
    }
    override suspend fun enrollmentStatus(enrollmentToken: String) = call<AuthenticationEnvelope> { client.get(endpoint("api/mobile/auth/enrollment/status")) { enrollment(enrollmentToken) } }
    override suspend fun enrollmentPasskeyOptions(enrollmentToken: String) = call<JsonObject> { client.post(endpoint("api/mobile/auth/enrollment/passkey/options")) { enrollment(enrollmentToken) } }
    override suspend fun verifyEnrollmentPasskey(enrollmentToken: String, response: JsonObject) = call<AuthenticationEnvelope> { client.post(endpoint("api/mobile/auth/enrollment/passkey/verify")) { enrollment(enrollmentToken); contentType(ContentType.Application.Json); setBody(response) } }
    override suspend fun deviceEnrollmentOptions(enrollmentToken: String) = call<DeviceOptionsResponse> { client.post(endpoint("api/mobile/auth/enrollment/device/options")) { enrollment(enrollmentToken) } }
    override suspend fun verifyDeviceEnrollment(enrollmentToken: String, proof: DeviceBindingProof) = call<AuthenticationEnvelope> {
        client.post(endpoint("api/mobile/auth/enrollment/device/verify")) { enrollment(enrollmentToken); contentType(ContentType.Application.Json); setBody(proof.request()) }
    }
    override suspend fun deviceAuthenticationOptions(challengeId: String, credentialId: String) = call<DeviceOptionsResponse> {
        client.post(endpoint("api/mobile/auth/device/options")) { contentType(ContentType.Application.Json); setBody(DeviceOptionsRequest(challengeId, credentialId)) }
    }
    override suspend fun verifyDeviceAuthentication(challengeId: String, proof: DeviceBindingProof, deviceName: String) = call<AuthenticationEnvelope> {
        client.post(endpoint("api/mobile/auth/device/verify")) { contentType(ContentType.Application.Json); setBody(proof.request(challengeId, deviceName)) }
    }
    override suspend fun completeEnrollment(enrollmentToken: String, idempotencyKey: String, deviceName: String) = call<AuthenticationEnvelope> {
        client.post(endpoint("api/mobile/auth/enrollment/complete")) { enrollment(enrollmentToken); contentType(ContentType.Application.Json); setBody(CompleteRequest(deviceName,idempotencyKey)) }
    }
    override suspend fun abortEnrollment(enrollmentToken: String): AuthenticationApiResult<Unit> {
        return when (val result = call<JsonObject> { client.post(endpoint("api/mobile/auth/enrollment/abort")) { enrollment(enrollmentToken) } }) {
            is AuthenticationApiResult.Success -> AuthenticationApiResult.Success(Unit)
            is AuthenticationApiResult.Failure -> result
        }
    }

    private fun io.ktor.client.request.HttpRequestBuilder.enrollment(token: String) = header(HttpHeaders.Authorization, "Enrollment $token")
    private fun DeviceBindingProof.request(challengeId: String? = null, deviceName: String? = null) = DeviceProofRequest(
        challengeId = challengeId,
        challenge = challenge,
        credentialId = credentialId,
        publicKey = publicKey,
        signature = signature,
        biometricType = biometricType.name,
        deviceName = deviceName,
    )
}
