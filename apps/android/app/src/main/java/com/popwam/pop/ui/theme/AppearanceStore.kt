package com.popwam.pop.ui.theme

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class PopAppearance(val theme:String="SYSTEM",val font:String="DEFAULT")

class AppearanceStore(context:Context) {
    private val preferences=context.applicationContext.getSharedPreferences("pop_appearance",Context.MODE_PRIVATE)
    private val _state=MutableStateFlow(PopAppearance(
        theme=preferences.getString("theme","SYSTEM")?.takeIf{it in setOf("SYSTEM","LIGHT","DARK")} ?: "SYSTEM",
        font=preferences.getString("font","DEFAULT")?.takeIf{it in setOf("DEFAULT","CAIRO","ABEEZEE")} ?: "DEFAULT",
    ))
    val state=_state.asStateFlow()

    fun setTheme(value:String) {
        if(value !in setOf("SYSTEM","LIGHT","DARK"))return
        preferences.edit().putString("theme",value).apply()
        _state.value=_state.value.copy(theme=value)
    }

    fun setFont(value:String) {
        if(value !in setOf("DEFAULT","CAIRO","ABEEZEE"))return
        preferences.edit().putString("font",value).apply()
        _state.value=_state.value.copy(font=value)
    }
}
