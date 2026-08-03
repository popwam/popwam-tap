package com.popwam.mobile.foundation.launch

import com.popwam.mobile.foundation.navigation.PopDestination
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

const val CURRENT_LAUNCH_STATE_SCHEMA = 2
const val CURRENT_WELCOME_VERSION = 1

@Serializable
enum class ThemeMode { SYSTEM, LIGHT, DARK }

@Serializable
enum class IdentityPalette { PULSE, MINT, VIOLET, CORAL, SOLAR, GRAPHITE }

@Serializable
data class LaunchState(
    val schemaVersion: Int = CURRENT_LAUNCH_STATE_SCHEMA,
    val hasSeenFirstLaunchStage: Boolean = false,
    val hasSelectedLanguage: Boolean = false,
    val selectedLanguageTag: String? = null,
    val hasSelectedBaseTheme: Boolean = false,
    val selectedBaseTheme: ThemeMode = ThemeMode.SYSTEM,
    val selectedPopStyle: IdentityPalette = IdentityPalette.MINT,
    val hasCompletedWelcome: Boolean = false,
    val welcomeVersionSeen: Int = 0,
    val pendingDestination: PopDestination? = null,
    val hasAuthenticatedBefore: Boolean = false,
    val hasCompletedProfileSetup: Boolean = false,
    val activeProfileId: String? = null,
) {
    fun normalized(): LaunchState = copy(
        schemaVersion = CURRENT_LAUNCH_STATE_SCHEMA,
        selectedLanguageTag = selectedLanguageTag
            ?.trim()
            ?.lowercase()
            ?.takeIf {
                it.matches(Regex("^[a-z]{2}(?:-[a-z0-9]{2,8})?$")) &&
                    it.substringBefore('-') in SUPPORTED_LAUNCH_LANGUAGES
            },
        welcomeVersionSeen = welcomeVersionSeen.coerceAtLeast(0),
        activeProfileId = activeProfileId?.trim()?.takeIf(String::isNotEmpty),
    ).let {
        val validSelectedLanguage = it.hasSelectedLanguage && it.selectedLanguageTag != null
        it.copy(
            hasSelectedLanguage = validSelectedLanguage,
            hasCompletedWelcome = it.hasCompletedWelcome &&
                it.hasSeenFirstLaunchStage &&
                validSelectedLanguage &&
                it.hasSelectedBaseTheme &&
                it.welcomeVersionSeen >= CURRENT_WELCOME_VERSION,
            hasCompletedProfileSetup = it.hasCompletedProfileSetup && it.activeProfileId != null,
        )
    }
}

private val SUPPORTED_LAUNCH_LANGUAGES = setOf("en", "ar", "fr")

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
            ?.let(::decodeAndMigrate)
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

    private fun decodeAndMigrate(serializedState: String): LaunchState? = runCatching {
        val source = json.parseToJsonElement(serializedState) as? JsonObject ?: return null
        val schema = source["schemaVersion"]?.jsonPrimitive?.intOrNull ?: 1
        val migrated = if (schema <= 1) migrateSchemaOne(source) else source
        json.decodeFromJsonElement<LaunchState>(migrated)
    }.getOrNull()

    private fun migrateSchemaOne(source: JsonObject): JsonObject = buildJsonObject {
        source.forEach { (key, value) ->
            if (key !in SCHEMA_ONE_RENAMED_FIELDS) put(key, value)
        }
        put("schemaVersion", CURRENT_LAUNCH_STATE_SCHEMA)
        source["hasCompletedFirstLaunchSplash"]?.let { put("hasSeenFirstLaunchStage", it) }
        source["hasSelectedTheme"]?.let { put("hasSelectedBaseTheme", it) }
        source["selectedThemeMode"]?.let { put("selectedBaseTheme", it) }
        source["selectedIdentityPalette"]?.let { put("selectedPopStyle", it) }
    }

    private companion object {
        val SCHEMA_ONE_RENAMED_FIELDS = setOf(
            "schemaVersion",
            "hasCompletedFirstLaunchSplash",
            "hasSelectedTheme",
            "selectedThemeMode",
            "selectedIdentityPalette",
        )
    }
}
