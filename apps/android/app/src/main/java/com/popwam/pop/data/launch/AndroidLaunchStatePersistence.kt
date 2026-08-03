package com.popwam.pop.data.launch

import android.content.Context
import androidx.core.content.edit
import com.popwam.mobile.foundation.launch.LaunchStatePersistence
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class AndroidLaunchStatePersistence(context: Context) : LaunchStatePersistence {
    private val preferences = context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    override suspend fun read(): String? = withContext(Dispatchers.IO) {
        preferences.getString(KEY_STATE, null)
    }

    override suspend fun write(serializedState: String) = withContext(Dispatchers.IO) {
        preferences.edit(commit = true) { putString(KEY_STATE, serializedState) }
    }

    override suspend fun clear() = withContext(Dispatchers.IO) {
        preferences.edit { clear() }
    }

    fun migrationVersion(): Int = preferences.getInt(KEY_LEGACY_MIGRATION_VERSION, 0)

    fun markMigrationComplete(version: Int) {
        preferences.edit { putInt(KEY_LEGACY_MIGRATION_VERSION, version) }
    }

    companion object {
        const val PREFERENCES = "pop_launch_state"
        const val KEY_STATE = "state_json"
        private const val KEY_LEGACY_MIGRATION_VERSION = "legacy_migration_version"

        fun peekSelectedLanguage(context: Context): String? {
            val appContext = context.applicationContext
            val state = appContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getString(KEY_STATE, null)
            val current = state?.let { serialized ->
                runCatching {
                    Json.parseToJsonElement(serialized).jsonObject["selectedLanguageTag"]?.jsonPrimitive?.content
                }.getOrNull()
            }?.takeIf(::validLanguageTag)
            if (current != null) return current
            return appContext.getSharedPreferences("pop_pre_auth", Context.MODE_PRIVATE)
                .getString("language", null)
                ?.takeIf(::validLanguageTag)
        }

        private fun validLanguageTag(value: String) =
            value.matches(Regex("^[a-z]{2}(?:-[a-z0-9]{2,8})?$", RegexOption.IGNORE_CASE))
    }
}
