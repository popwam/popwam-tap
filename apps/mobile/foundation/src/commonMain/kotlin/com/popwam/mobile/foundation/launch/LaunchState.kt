package com.popwam.mobile.foundation.launch

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

const val CURRENT_LAUNCH_STATE_SCHEMA = 1

@Serializable
enum class ThemeMode { SYSTEM, LIGHT, DARK }

@Serializable
enum class IdentityPalette { PULSE, MINT, VIOLET, CORAL, SOLAR, GRAPHITE }

@Serializable
data class LaunchState(
    val schemaVersion: Int = CURRENT_LAUNCH_STATE_SCHEMA,
    val hasCompletedFirstLaunchSplash: Boolean = false,
    val hasSelectedLanguage: Boolean = false,
    val selectedLanguageTag: String? = null,
    val hasSelectedTheme: Boolean = false,
    val selectedThemeMode: ThemeMode = ThemeMode.SYSTEM,
    val selectedIdentityPalette: IdentityPalette = IdentityPalette.PULSE,
    val hasCompletedWelcome: Boolean = false,
    val welcomeVersionSeen: Int = 0,
    val hasAuthenticatedBefore: Boolean = false,
    val hasCompletedProfileSetup: Boolean = false,
    val activeProfileId: String? = null,
) {
    fun normalized(): LaunchState = copy(
        schemaVersion = CURRENT_LAUNCH_STATE_SCHEMA,
        selectedLanguageTag = selectedLanguageTag
            ?.trim()
            ?.lowercase()
            ?.takeIf { it.matches(Regex("^[a-z]{2}(?:-[a-z0-9]{2,8})?$")) },
        welcomeVersionSeen = welcomeVersionSeen.coerceAtLeast(0),
        activeProfileId = activeProfileId?.trim()?.takeIf(String::isNotEmpty),
    ).let {
        it.copy(
            hasSelectedLanguage = it.hasSelectedLanguage && it.selectedLanguageTag != null,
            hasCompletedProfileSetup = it.hasCompletedProfileSetup && it.activeProfileId != null,
        )
    }
}

interface LaunchStatePersistence {
    suspend fun read(): String?
    suspend fun write(serializedState: String)
    suspend fun clear()
}

interface LaunchStateStore {
    val state: StateFlow<LaunchState>
    suspend fun initialize(): LaunchState
    suspend fun update(transform: (LaunchState) -> LaunchState): LaunchState
    suspend fun clear()
}

class PersistedLaunchStateStore(
    private val persistence: LaunchStatePersistence,
    private val json: Json = Json {
        encodeDefaults = true
        ignoreUnknownKeys = true
    },
) : LaunchStateStore {
    private val mutex = Mutex()
    private val mutableState = MutableStateFlow(LaunchState())
    override val state: StateFlow<LaunchState> = mutableState.asStateFlow()

    override suspend fun initialize(): LaunchState = mutex.withLock {
        val restored = persistence.read()
            ?.let { runCatching { json.decodeFromString<LaunchState>(it) }.getOrNull() }
            ?.normalized()
            ?: LaunchState()
        mutableState.value = restored
        restored
    }

    override suspend fun update(transform: (LaunchState) -> LaunchState): LaunchState = mutex.withLock {
        val updated = transform(mutableState.value).normalized()
        persistence.write(json.encodeToString(updated))
        mutableState.value = updated
        updated
    }

    override suspend fun clear() = mutex.withLock {
        persistence.clear()
        mutableState.value = LaunchState()
    }
}

