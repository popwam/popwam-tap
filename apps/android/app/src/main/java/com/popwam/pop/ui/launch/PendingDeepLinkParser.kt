package com.popwam.pop.ui.launch

import com.popwam.mobile.foundation.navigation.PopDestination
import java.net.URI

object PendingDeepLinkParser {
    private val safeSegment = Regex("^[a-zA-Z0-9_-]{2,80}$")

    fun parse(raw: String?): PopDestination? {
        val uri = raw?.takeIf(String::isNotBlank)?.let { runCatching { URI(it) }.getOrNull() } ?: return null
        if (!uri.scheme.equals("https", ignoreCase = true) || uri.userInfo != null || uri.fragment != null) return null
        if (uri.port != -1) return null
        val host = uri.host?.lowercase() ?: return null
        if (host !in setOf(CANONICAL_HOST, LEGACY_PUBLIC_HOST)) return null
        val parts = uri.path.orEmpty().split('/').filter(String::isNotBlank)
        if (host == LEGACY_PUBLIC_HOST) return legacyPublicDestination(parts, uri.rawQuery)
        return when {
            parts.firstOrNull() == "p" && parts.size == 2 && uri.rawQuery == null ->
                parts[1].safePublicProfile()
            parts.take(2) == listOf("p", "id") && parts.size == 3 && uri.rawQuery == null ->
                parts[2].safePublicProfile()
            parts.firstOrNull() == "activate" -> PopDestination.Activate
            parts.firstOrNull() == "login" -> PopDestination.PhoneAuth
            parts.firstOrNull() == "dashboard" -> PopDestination.Home
            else -> null
        }
    }

    private fun legacyPublicDestination(parts: List<String>, rawQuery: String?): PopDestination? {
        if (rawQuery != null) return null
        return when {
            parts.size == 1 -> parts[0].safePublicProfile()
            parts.size == 2 && parts[0] == "p" -> parts[1].safePublicProfile()
            parts.size == 3 && parts.take(2) == listOf("p", "id") -> parts[2].safePublicProfile()
            else -> null
        }
    }

    private fun String.safePublicProfile(): PopDestination.PublicProfile? =
        takeIf { it.matches(safeSegment) }?.let(PopDestination::PublicProfile)

    const val CANONICAL_HOST = "pop.popwam.com"
    const val LEGACY_PUBLIC_HOST = "go.popwam.com"
}
