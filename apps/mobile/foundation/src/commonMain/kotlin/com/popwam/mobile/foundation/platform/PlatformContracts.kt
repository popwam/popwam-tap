package com.popwam.mobile.foundation.platform

import kotlinx.coroutines.flow.Flow

enum class BiometricCapability {
    AVAILABLE_AND_ENROLLED,
    HARDWARE_AVAILABLE_NOT_ENROLLED,
    HARDWARE_UNAVAILABLE,
    TEMPORARILY_UNAVAILABLE,
}

sealed interface LocalAuthorizationResult {
    data object Authorized : LocalAuthorizationResult
    data object Cancelled : LocalAuthorizationResult
    data object NotEnrolled : LocalAuthorizationResult
    data class Failed(val recoverable: Boolean) : LocalAuthorizationResult
}

interface BiometricAuthorizer {
    suspend fun capability(): BiometricCapability
    suspend fun authorize(reason: String): LocalAuthorizationResult
    suspend fun openEnrollmentSettings(): Boolean
}

interface PasskeyProvider {
    suspend fun create(optionsJson: String): String
    suspend fun authenticate(optionsJson: String): String
}

interface SecureKeyValueStore {
    suspend fun read(key: String): String?
    suspend fun write(key: String, value: String)
    suspend fun remove(key: String)
}

interface PhoneNumberHintProvider {
    suspend fun requestHint(): String?
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

