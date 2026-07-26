package com.popwam.pop.data.localization

import android.content.Context
import androidx.core.content.edit
import com.google.gson.Gson
import com.popwam.pop.data.api.AuthApi
import com.popwam.pop.data.api.LocalizationBootstrapResponse
import com.popwam.pop.data.api.LocalizationLocaleDto
import com.popwam.pop.ui.LocalePolicy
import com.popwam.pop.ui.PreAuthStore
import com.popwam.pop.ui.applyPopLanguage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class LocalizationAuthoritySnapshot(
    val defaultLocale:String="en",
    val translationVersion:Int=0,
    val availableLocales:List<LocalizationLocaleDto> = listOf(LocalizationLocaleDto()),
)

class LocalizationAuthorityStore(
    context:Context,
    private val api:AuthApi,
) {
    private val appContext=context.applicationContext
    private val preferences=appContext.getSharedPreferences(PREFERENCES,Context.MODE_PRIVATE)
    private val gson=Gson()
    private val _state=MutableStateFlow(readCached())
    val state=_state.asStateFlow()

    init { applyPolicy(_state.value) }

    suspend fun refresh() {
        val response=runCatching { api.localizationBootstrap() }.getOrNull()
        val next=response?.takeIf { it.ok }?.toSnapshot() ?: _state.value
        _state.value=next
        preferences.edit { putString(KEY_CONFIG,gson.toJson(next)) }
        applyPolicy(next)
        reconcilePersistedSelection(next)
    }

    private fun readCached():LocalizationAuthoritySnapshot {
        val cached=preferences.getString(KEY_CONFIG,null)?.let {
            runCatching { gson.fromJson(it,LocalizationAuthoritySnapshot::class.java) }.getOrNull()
        }
        return sanitize(cached)
    }

    private fun LocalizationBootstrapResponse.toSnapshot()=sanitize(
        LocalizationAuthoritySnapshot(defaultLocale,translationVersion,availableLocales),
    )

    private fun sanitize(value:LocalizationAuthoritySnapshot?):LocalizationAuthoritySnapshot {
        val locales=value?.availableLocales.orEmpty()
            .filter { it.code in BUNDLED_FALLBACK_CAPABILITIES }
            .distinctBy { it.code }
        val available=if(locales.any { it.code=="en" })locales else listOf(LocalizationLocaleDto())+locales
        val default=value?.defaultLocale?.takeIf { candidate -> available.any { it.code==candidate } } ?: "en"
        return LocalizationAuthoritySnapshot(default,value?.translationVersion?.coerceAtLeast(0) ?: 0,available)
    }

    private fun applyPolicy(snapshot:LocalizationAuthoritySnapshot) {
        LocalePolicy.configure(snapshot.defaultLocale,snapshot.availableLocales.map { it.code },snapshot.availableLocales.filter { it.rtl }.map { it.code }.toSet())
    }

    private fun reconcilePersistedSelection(snapshot:LocalizationAuthoritySnapshot) {
        val selected=PreAuthStore.persistedLanguage(appContext)
        val allowed=snapshot.availableLocales.map { it.code }.toSet()
        if(selected!=null&&selected !in allowed) {
            PreAuthStore.clearLaterLanguageChoice(appContext)
            applyPopLanguage(snapshot.defaultLocale)
        }
    }

    companion object {
        private const val PREFERENCES="pop_localization_authority"
        private const val KEY_CONFIG="bootstrap"
        private val BUNDLED_FALLBACK_CAPABILITIES=setOf("en","ar","fr")

        fun configureCachedPolicy(context:Context) {
            val preferences=context.applicationContext.getSharedPreferences(PREFERENCES,Context.MODE_PRIVATE)
            val cached=preferences.getString(KEY_CONFIG,null)?.let {
                runCatching { Gson().fromJson(it,LocalizationAuthoritySnapshot::class.java) }.getOrNull()
            }
            val locales=cached?.availableLocales.orEmpty().filter { it.code in BUNDLED_FALLBACK_CAPABILITIES }
            val available=if(locales.any { it.code=="en" })locales else listOf(LocalizationLocaleDto())
            val default=cached?.defaultLocale?.takeIf { candidate -> available.any { it.code==candidate } } ?: "en"
            LocalePolicy.configure(default,available.map { it.code },available.filter { it.rtl }.map { it.code }.toSet())
        }
    }
}
