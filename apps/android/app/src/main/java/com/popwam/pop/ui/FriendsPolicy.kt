package com.popwam.pop.ui

import com.popwam.pop.data.api.FriendsSettingsResponse
import java.text.Normalizer
import java.util.Locale

enum class FriendsStage {
    LOADING,
    POLICY_UNAVAILABLE,
    POLICY_REQUIRED,
    SOCIAL_PROFILE_REQUIRED,
    PRIVACY_REQUIRED,
    READY,
    ERROR,
}

object FriendsPolicy {
    val reportCategories = setOf("SPAM", "HARASSMENT", "IMPERSONATION", "INAPPROPRIATE_CONTENT", "SCAM", "PRIVACY", "OTHER")

    fun resolve(settings: FriendsSettingsResponse?): FriendsStage = when {
        settings == null -> FriendsStage.LOADING
        !settings.ok -> FriendsStage.ERROR
        !settings.policy.available -> FriendsStage.POLICY_UNAVAILABLE
        !settings.policy.accepted -> FriendsStage.POLICY_REQUIRED
        !settings.preference.profileConfigured -> FriendsStage.SOCIAL_PROFILE_REQUIRED
        !settings.preference.privacyConfigured -> FriendsStage.PRIVACY_REQUIRED
        else -> FriendsStage.READY
    }

    fun normalizeSearch(value: String): String? {
        val normalized = Normalizer.normalize(value, Normalizer.Form.NFKC).trim().replace(Regex("\\s+"), " ").lowercase(Locale.ROOT)
        return normalized.takeIf { it.length in 2..64 }
    }

    fun validReport(category: String, details: String) =
        category in reportCategories && details.trim().length <= 500 && !Regex("<\\s*/?\\s*[a-z][^>]*>", RegexOption.IGNORE_CASE).containsMatchIn(details)

    fun publicRelationshipState(value: String) = if (value == "BLOCKED_ME") "UNAVAILABLE" else value

    fun relationshipSurvivesDeliveryFailure(authoritativeSuccess: Boolean, fcmSucceeded: Boolean) =
        authoritativeSuccess

    fun usesRtl(locale: String) = locale.lowercase().startsWith("ar")

    fun actionsFor(relationship: String) = when (publicRelationshipState(relationship)) {
        "FRIENDS" -> setOf("FAVORITE", "MUTE", "REMOVE", "BLOCK", "REPORT")
        "INCOMING_PENDING" -> setOf("ACCEPT", "REJECT", "BLOCK", "REPORT")
        "OUTGOING_PENDING" -> setOf("CANCEL", "BLOCK", "REPORT")
        "NONE" -> setOf("REQUEST", "BLOCK", "REPORT")
        else -> emptySet()
    }
}
