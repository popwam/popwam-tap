package com.popwam.mobile.foundation.platform

import kotlinx.coroutines.flow.Flow

enum class BiometricCapability {
    UNAVAILABLE,
    AVAILABLE_NOT_ENROLLED,
    FINGERPRINT,
    FACE,
    GENERIC_BIOMETRIC,
    TEMPORARILY_LOCKED,
    PERMANENTLY_LOCKED,
    SECURITY_UPDATE_REQUIRED,
}

sealed interface LocalAuthorizationResult {
    data object Authorized : LocalAuthorizationResult
    data object Cancelled : LocalAuthorizationResult
    data object NotEnrolled : LocalAuthorizationResult
    data object TemporarilyLocked : LocalAuthorizationResult
    data object PermanentlyLocked : LocalAuthorizationResult
    data object KeyInvalidated : LocalAuthorizationResult
    data class Failed(val recoverable: Boolean) : LocalAuthorizationResult
}

interface BiometricAuthorizer {
    suspend fun capability(): BiometricCapability
    suspend fun authorize(reason: String): LocalAuthorizationResult
    suspend fun openEnrollmentSettings(): Boolean
}

interface PasskeyProvider {
    suspend fun create(optionsJson: String): PasskeyOperationResult
    suspend fun authenticate(optionsJson: String): PasskeyOperationResult
}

sealed interface PasskeyOperationResult {
    data class Success(val responseJson: String) : PasskeyOperationResult
    data object Cancelled : PasskeyOperationResult
    data object NoCredential : PasskeyOperationResult
    data object Unavailable : PasskeyOperationResult
    data object Interrupted : PasskeyOperationResult
    data class Failed(val recoverable: Boolean) : PasskeyOperationResult
}

interface SecureKeyValueStore {
    suspend fun read(key: String): String?
    suspend fun write(key: String, value: String)
    suspend fun remove(key: String)
}

interface PhoneNumberHintProvider {
    suspend fun requestHint(): PhoneNumberHintResult
}

sealed interface PhoneNumberHintResult {
    data class Selected(val phoneNumber: String) : PhoneNumberHintResult
    data object Cancelled : PhoneNumberHintResult
    data object Unavailable : PhoneNumberHintResult
    data object Empty : PhoneNumberHintResult
}

data class DeviceBindingOptions(val challenge: String, val expiresAt: String, val algorithm: String)

data class DeviceBindingProof(
    val challenge: String,
    val credentialId: String,
    val publicKey: String,
    val signature: String,
    val biometricType: BiometricCapability,
)

interface DeviceBindingProvider {
    suspend fun credentialId(): String?
    suspend fun createProof(options: DeviceBindingOptions, requireBiometric: Boolean): DeviceBindingResult
    suspend fun invalidate()
}

sealed interface DeviceBindingResult {
    data class Success(val proof: DeviceBindingProof) : DeviceBindingResult
    data object Cancelled : DeviceBindingResult
    data object NotEnrolled : DeviceBindingResult
    data object TemporarilyLocked : DeviceBindingResult
    data object PermanentlyLocked : DeviceBindingResult
    data object KeyInvalidated : DeviceBindingResult
    data class Failed(val recoverable: Boolean) : DeviceBindingResult
}

interface TelephoneInputSemantics {
    val oneTimeCodeContentHint: String?
    val telephoneContentHint: String?
}

data class IncomingPublicLink(val url: String, val receivedAtEpochMillis: Long)

interface PublicLinkSource {
    val links: Flow<IncomingPublicLink>
}

interface LocaleController {
    fun currentLanguageTag(): String
    suspend fun applyLanguageTag(languageTag: String)
    fun isRightToLeft(languageTag: String): Boolean
}

interface AppearanceController {
    suspend fun apply(themeMode: String, identityPalette: String)
}

interface SystemShareProvider {
    suspend fun shareText(text: String, title: String? = null): Boolean
}

interface MediaSaveProvider {
    suspend fun savePng(bytes: ByteArray, suggestedName: String): String?
}

interface NfcCapabilityProvider {
    suspend fun isNfcAvailable(): Boolean
    suspend fun isHostCardEmulationAvailable(): Boolean
}
