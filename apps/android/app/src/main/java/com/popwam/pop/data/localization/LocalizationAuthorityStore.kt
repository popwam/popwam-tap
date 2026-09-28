package com.popwam.pop.data.localization

import android.content.Context
import androidx.core.content.edit
import com.google.gson.Gson
import com.popwam.mobile.foundation.launch.LaunchStateStore
import com.popwam.pop.data.api.AuthApi
import com.popwam.pop.data.api.LocalizationLocaleDto
import com.popwam.pop.ui.LocaleDescriptor
import com.popwam.pop.ui.LocalePolicy
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class LocalizationAuthoritySnapshot(
    val defaultLocale:String="en",
    val translationVersion:Int=0,
    val availableLocales:List<LocalizationLocaleDto> = emptyList(),
    val cachedLocales:List<LocalizationLocaleDto> = emptyList(),
    val cachedPacks:Map<String,CachedTranslationPack> = emptyMap(),
    val updatedAtEpochMillis:Long=0,
)

class LocalizationAuthorityStore(
    context:Context,
    private val api:AuthApi,
    private val launchStateStore:LaunchStateStore,
) {
    private val appContext=context.applicationContext
    private val preferences=appContext.getSharedPreferences(PREFERENCES,Context.MODE_PRIVATE)
    private val gson=Gson()
    private val _state=MutableStateFlow(readCached())
    val state=_state.asStateFlow()

    init { applySnapshot(_state.value,launchStateStore.state.value.selectedLanguageTag) }

    suspend fun refresh() {
        val response=runCatching { api.localizationBootstrap() }.getOrNull()?.takeIf { it.ok } ?: return
        val current=_state.value
        val available=sanitizeLocales(response.availableLocales)
        val cachedLocales=(current.cachedLocales+available).distinctBy { it.code }
        var next=sanitize(
            LocalizationAuthoritySnapshot(
                defaultLocale=response.defaultLocale,
                translationVersion=response.translationVersion.coerceAtLeast(0),
                availableLocales=available,
                cachedLocales=cachedLocales,
                cachedPacks=current.cachedPacks,
                updatedAtEpochMillis=System.currentTimeMillis(),
            ),
        )
        publish(next)
        val selected=launchStateStore.state.value.selectedLanguageTag
        if(selected!=null&&available.any { it.code==selected }) {
            next=refreshPackIfNeeded(selected,next)
            publish(next)
        }
    }

    suspend fun selectLanguage(language:String) {
        DynamicLocalizationRuntime.select(language)
        val current=_state.value
        if(current.availableLocales.none { it.code==language })return
        publish(refreshPackIfNeeded(language,current,force=current.cachedPacks[language]==null))
    }

    private suspend fun refreshPackIfNeeded(
        language:String,
        snapshot:LocalizationAuthoritySnapshot,
        force:Boolean=false,
    ):LocalizationAuthoritySnapshot {
        val metadata=snapshot.availableLocales.firstOrNull { it.code==language } ?: return snapshot
        val cached=snapshot.cachedPacks[language]
        if(!force&&cached!=null&&cached.revision>=metadata.revision)return snapshot
        val response=runCatching { api.localizationPack(language) }.getOrNull()?.takeIf { it.ok&&it.code==language } ?: return snapshot
        val pack=CachedTranslationPack(
            code=language,
            revision=response.revision,
            translations=response.translations.filterKeys(::validKey).filterValues { it.isNotBlank() },
            updatedAtEpochMillis=System.currentTimeMillis(),
        )
        return snapshot.copy(cachedPacks=snapshot.cachedPacks+(language to pack))
    }

    private fun readCached():LocalizationAuthoritySnapshot {
        val cached=preferences.getString(KEY_CONFIG,null)?.let {
            runCatching { gson.fromJson(it,LocalizationAuthoritySnapshot::class.java) }.getOrNull()
        }
        return sanitize(cached)
    }

    private fun sanitize(value:LocalizationAuthoritySnapshot?):LocalizationAuthoritySnapshot {
        val available=sanitizeLocales(value?.availableLocales.orEmpty())
        val historical=sanitizeLocales(value?.cachedLocales.orEmpty()+available)
        val knownCodes=(historical.map { it.code }+"en").toSet()
        val packs=value?.cachedPacks.orEmpty().filter { (code,pack) ->
            code in knownCodes&&pack.code==code
        }.mapValues { (_,pack) ->
            pack.copy(translations=pack.translations.filterKeys(::validKey).filterValues { it.isNotBlank() })
        }
        return LocalizationAuthoritySnapshot(
            defaultLocale=value?.defaultLocale?.takeIf(::validLocale) ?: "en",
            translationVersion=value?.translationVersion?.coerceAtLeast(0) ?: 0,
            availableLocales=available,
            cachedLocales=historical,
            cachedPacks=packs,
            updatedAtEpochMillis=value?.updatedAtEpochMillis?.coerceAtLeast(0) ?: 0,
        )
    }

    private fun sanitizeLocales(locales:List<LocalizationLocaleDto>)=locales
        .filter { validLocale(it.code) }
        .map { locale ->
            locale.copy(
                code=locale.code.lowercase(),
                name=locale.name.trim().take(80).ifBlank { locale.code.uppercase() },
                nativeName=locale.nativeName.trim().take(80).ifBlank { locale.name.ifBlank { locale.code.uppercase() } },
                revision=locale.revision.coerceAtLeast(0),
            )
        }
        .distinctBy { it.code }

    private fun publish(snapshot:LocalizationAuthoritySnapshot) {
        val clean=sanitize(snapshot)
        _state.value=clean
        preferences.edit { putString(KEY_CONFIG,gson.toJson(clean)) }
        applySnapshot(clean,launchStateStore.state.value.selectedLanguageTag)
    }

    private fun applySnapshot(snapshot:LocalizationAuthoritySnapshot,selected:String?) {
        LocalePolicy.configure(
            snapshot.defaultLocale,
            snapshot.availableLocales.map(::descriptor),
            snapshot.cachedLocales.map(::descriptor),
        )
        DynamicLocalizationRuntime.install(
            selected?.takeIf(LocalePolicy::canRender) ?: LocalePolicy.resolve(null,""),
            snapshot.cachedPacks,
        )
    }

    companion object {
        private const val PREFERENCES="pop_localization_authority"
        private const val KEY_CONFIG="bootstrap_v2"
        private val localePattern=Regex("^[a-z]{2}(?:-[a-z0-9]{2,8})?$")
        private val keyPattern=Regex("^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$",RegexOption.IGNORE_CASE)

        private fun validLocale(code:String)=localePattern.matches(code.lowercase())
        private fun validKey(key:String)=key.length<=160&&keyPattern.matches(key)
        private fun descriptor(locale:LocalizationLocaleDto)=LocaleDescriptor(
            locale.code,locale.name,locale.nativeName,locale.rtl,locale.revision,
        )

        fun configureCachedPolicy(context:Context,selectedLanguage:String?) {
            val preferences=context.applicationContext.getSharedPreferences(PREFERENCES,Context.MODE_PRIVATE)
            val cached=preferences.getString(KEY_CONFIG,null)?.let {
                runCatching { Gson().fromJson(it,LocalizationAuthoritySnapshot::class.java) }.getOrNull()
            } ?: LocalizationAuthoritySnapshot()
            val available=cached.availableLocales.filter { validLocale(it.code) }
            val historical=(cached.cachedLocales+available).filter { validLocale(it.code) }.distinctBy { it.code }
            LocalePolicy.configure(
                cached.defaultLocale,
                available.map(::descriptor),
                historical.map(::descriptor),
            )
            DynamicLocalizationRuntime.install(
                selectedLanguage?.takeIf(LocalePolicy::canRender) ?: LocalePolicy.resolve(null,""),
                cached.cachedPacks,
            )
        }
    }
}
