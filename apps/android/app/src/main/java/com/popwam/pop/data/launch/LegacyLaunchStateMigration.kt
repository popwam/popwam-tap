package com.popwam.pop.data.launch

import android.content.Context
import com.popwam.mobile.foundation.launch.CURRENT_WELCOME_VERSION
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.LaunchState
import com.popwam.mobile.foundation.launch.LaunchStateStore
import com.popwam.mobile.foundation.launch.ThemeMode

data class LegacyLaunchSnapshot(
    val languageTag: String? = null,
    val baseTheme: String? = null,
    val popStyle: String? = null,
    val introVersionSeen: Int = 0,
    val authenticated: Boolean = false,
) {
    val hasProgress: Boolean
        get() = languageTag != null || baseTheme != null || popStyle != null || introVersionSeen > 0
}

fun migrateLegacyLaunchState(
    current: LaunchState,
    legacy: LegacyLaunchSnapshot,
    fallbackLanguageTag: String,
): LaunchState {
    val migratedLanguage = legacy.languageTag?.normalizeLanguage()
    val migratedTheme = legacy.baseTheme?.let(::themeAlias)
    val migratedStyle = legacy.popStyle?.let(::paletteAlias)
    val completedLegacyIntro = legacy.introVersionSeen >= 1
    val adoptExistingUser = legacy.authenticated
    val shouldCompleteWelcome = current.hasCompletedWelcome || completedLegacyIntro || adoptExistingUser
    val selectedLanguage = current.selectedLanguageTag
        ?: migratedLanguage
        ?: fallbackLanguageTag.normalizeLanguage()
        ?: "en"
    return current.copy(
        hasSeenFirstLaunchStage = current.hasSeenFirstLaunchStage || legacy.hasProgress || adoptExistingUser,
        hasSelectedLanguage = current.hasSelectedLanguage || migratedLanguage != null || shouldCompleteWelcome,
        selectedLanguageTag = if (current.hasSelectedLanguage) current.selectedLanguageTag else selectedLanguage,
        hasSelectedBaseTheme = current.hasSelectedBaseTheme || migratedTheme != null || shouldCompleteWelcome,
        selectedBaseTheme = if (current.hasSelectedBaseTheme) current.selectedBaseTheme else migratedTheme ?: current.selectedBaseTheme,
        selectedPopStyle = if (current.hasSeenFirstLaunchStage || current.hasSelectedBaseTheme || current.hasCompletedWelcome) {
            current.selectedPopStyle
        } else migratedStyle ?: current.selectedPopStyle,
        hasCompletedWelcome = shouldCompleteWelcome,
        welcomeVersionSeen = if (shouldCompleteWelcome) CURRENT_WELCOME_VERSION else current.welcomeVersionSeen,
        hasAuthenticatedBefore = current.hasAuthenticatedBefore || adoptExistingUser,
    ).normalized()
}

class LegacyLaunchStateMigrator(
    context: Context,
    private val persistence: AndroidLaunchStatePersistence,
    private val store: LaunchStateStore,
) {
    private val appContext = context.applicationContext

    suspend fun migrate(authenticated: Boolean, fallbackLanguageTag: String): LaunchState {
        val restored = store.initialize()
        if (persistence.migrationVersion() >= MIGRATION_VERSION) return restored
        val legacy = readLegacy(authenticated)
        val migrated = migrateLegacyLaunchState(restored, legacy, fallbackLanguageTag)
        val written = store.update { migrated }
        persistence.markMigrationComplete(MIGRATION_VERSION)
        return written
    }

    private fun readLegacy(authenticated: Boolean): LegacyLaunchSnapshot {
        val preAuth = appContext.getSharedPreferences("pop_pre_auth", Context.MODE_PRIVATE)
        val appearance = appContext.getSharedPreferences("pop_appearance", Context.MODE_PRIVATE)
        return LegacyLaunchSnapshot(
            languageTag = preAuth.getString("language", null),
            baseTheme = preAuth.getString("appearance", null),
            popStyle = appearance.getString("identity", null),
            introVersionSeen = preAuth.getInt("intro_version_seen", 0).coerceAtLeast(0),
            authenticated = authenticated,
        )
    }

    companion object { const val MIGRATION_VERSION = 2 }
}

private fun String.normalizeLanguage(): String? = trim().lowercase()
    .takeIf { it.matches(Regex("^[a-z]{2}(?:-[a-z0-9]{2,8})?$")) }

private fun themeAlias(value: String): ThemeMode? = when (value.trim().uppercase()) {
    "SYSTEM" -> ThemeMode.SYSTEM
    "LIGHT" -> ThemeMode.LIGHT
    "DARK" -> ThemeMode.DARK
    else -> null
}

private fun paletteAlias(value: String): IdentityPalette? = when (value.trim().uppercase()) {
    "PULSA", "PULSE" -> IdentityPalette.PULSE
    "MINT" -> IdentityPalette.MINT
    "VIOLET" -> IdentityPalette.VIOLET
    "CORAL" -> IdentityPalette.CORAL
    "SOLAR" -> IdentityPalette.SOLAR
    "GRAPHITE" -> IdentityPalette.GRAPHITE
    else -> null
}
