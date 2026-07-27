package com.popwam.pop.ui.theme
import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class PopAppearance(val theme:String="SYSTEM",val identity:String="PULSE",val font:String="DEFAULT")
class AppearanceStore(context:Context) {
    private val preferences=context.applicationContext.getSharedPreferences("pop_appearance",Context.MODE_PRIVATE)
    private val _state=MutableStateFlow(PopAppearance(preferences.getString("theme","SYSTEM")?.takeIf{it in setOf("SYSTEM","LIGHT","DARK")}?:"SYSTEM",preferences.getString("identity","PULSE")?.takeIf{runCatching{PopIdentity.valueOf(it)}.isSuccess}?:"PULSE",preferences.getString("font","DEFAULT")?:"DEFAULT"))
    val state=_state.asStateFlow()
    fun setTheme(value:String){if(value in setOf("SYSTEM","LIGHT","DARK")){preferences.edit().putString("theme",value).apply();_state.value=_state.value.copy(theme=value)}}
    fun setIdentity(value:String){if(runCatching{PopIdentity.valueOf(value)}.isSuccess){preferences.edit().putString("identity",value).apply();_state.value=_state.value.copy(identity=value)}}
    fun setFont(value:String){preferences.edit().putString("font",value).apply();_state.value=_state.value.copy(font=value)}
}
