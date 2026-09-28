package com.popwam.pop.data.localization

import android.content.Context
import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import com.popwam.pop.ui.LocalePolicy
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

data class CachedTranslationPack(
    val code:String="",
    val revision:Int=0,
    val translations:Map<String,String> = emptyMap(),
    val updatedAtEpochMillis:Long=0,
)

private data class DynamicLocalizationState(
    val selectedLocale:String="en",
    val packs:Map<String,CachedTranslationPack> = emptyMap(),
)

object DynamicLocalizationRuntime {
    private val _state=MutableStateFlow(DynamicLocalizationState())
    private val state=_state.asStateFlow()

    fun install(selectedLocale:String?,packs:Map<String,CachedTranslationPack>) {
        _state.value=DynamicLocalizationState(selectedLocale?.takeIf(LocalePolicy::canRender) ?: "en",packs)
    }

    fun select(language:String) {
        _state.value=_state.value.copy(selectedLocale=language.takeIf(LocalePolicy::canRender) ?: "en")
    }

    fun key(context:Context,@StringRes id:Int):String = runCatching {
        "android."+context.resources.getResourceEntryName(id).replace('_','.')
    }.getOrElse { "android.resource.$id" }

    fun resolve(context:Context,@StringRes id:Int,vararg formatArgs:Any):String {
        val snapshot=_state.value
        val key=key(context,id)
        val english=runCatching { context.resources.getString(id,*formatArgs) }.getOrElse { key }
        return resolveTranslation(snapshot.selectedLocale,snapshot.packs,key,english,*formatArgs)
    }

    @Composable
    fun observeVersion():Any {
        val snapshot by state.collectAsState()
        return snapshot
    }
}

internal fun resolveTranslation(
    selectedLocale:String,
    packs:Map<String,CachedTranslationPack>,
    key:String,
    englishFallback:String,
    vararg formatArgs:Any,
):String {
    val translated=packs[selectedLocale]?.translations?.get(key)?.takeIf { it.isNotBlank() } ?: return englishFallback
    if(formatArgs.isEmpty())return translated
    return runCatching { String.format(Locale.forLanguageTag(selectedLocale),translated,*formatArgs) }
        .getOrElse { englishFallback }
}

@Composable
fun popStringResource(@StringRes id:Int,vararg formatArgs:Any):String {
    val context=LocalContext.current
    val version=DynamicLocalizationRuntime.observeVersion()
    return remember(context,id,formatArgs.toList(),version) {
        DynamicLocalizationRuntime.resolve(context,id,*formatArgs)
    }
}

@Composable
fun PopLocalizationProvider(content:@Composable ()->Unit) {
    DynamicLocalizationRuntime.observeVersion()
    val direction=if(LocalePolicy.isRtl(com.popwam.pop.ui.currentLocale())) LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(LocalLayoutDirection provides direction,content=content)
}
