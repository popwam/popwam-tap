package com.popwam.pop.ui.share

import com.popwam.pop.data.api.ShareTargetDto
import com.popwam.pop.nfc.PermanentUrlPolicy

object SharePayloadPolicy {
    fun canonicalProfileTarget(targets: List<ShareTargetDto>): ShareTargetDto? =
        targets.singleOrNull { it.type == "PROFILE" && it.id == "profile" && PermanentUrlPolicy.isValid(it.canonicalUrl) }

    fun payload(profile: ActiveShareProfile, serverName: String?, targets: List<ShareTargetDto>): CanonicalSharePayload? {
        if (profile.access == ShareProfileAccess.PRIVATE || profile.lifecycle in setOf("PAUSED", "ARCHIVED")) return null
        val target = canonicalProfileTarget(targets) ?: return null
        return CanonicalSharePayload(
            profileId = profile.id,
            profileName = profile.name?.takeIf(String::isNotBlank) ?: serverName?.takeIf(String::isNotBlank) ?: target.label,
            canonicalUrl = target.canonicalUrl,
        )
    }

    fun availability(profile: ActiveShareProfile, serverShareable: Boolean, payload: CanonicalSharePayload?): ShareAvailability = when {
        profile.access == ShareProfileAccess.PRIVATE -> ShareAvailability.PRIVATE
        profile.lifecycle == "PAUSED" -> ShareAvailability.PAUSED
        profile.lifecycle == "ARCHIVED" -> ShareAvailability.UNAVAILABLE
        !serverShareable -> ShareAvailability.NOT_PUBLISHED
        payload == null -> ShareAvailability.UNAVAILABLE
        profile.access == ShareProfileAccess.UNLISTED -> ShareAvailability.UNLISTED
        else -> ShareAvailability.PUBLIC
    }

    fun nativeMessage(payload: CanonicalSharePayload, arabic: Boolean): String =
        if (arabic) "${payload.profileName}\n${payload.canonicalUrl}" else "${payload.profileName}\n${payload.canonicalUrl}"

    fun containsOnlyPublicPayload(text: String, payload: CanonicalSharePayload): Boolean =
        payload.canonicalUrl in text && listOf("accessToken", "refreshToken", "firebase", "session=", "/api/").none { it in text }
}
