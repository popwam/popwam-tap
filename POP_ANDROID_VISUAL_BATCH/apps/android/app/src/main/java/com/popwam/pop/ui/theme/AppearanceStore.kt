package com.popwam.pop.ui.theme
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class PopAppearance(val theme:String="SYSTEM",val identity:String="PULSE",val font:String="DEFAULT")
/**
 * Compatibility mirror for legacy authenticated screens. It is deliberately
 * in-memory only: PersistedLaunchStateStore is the sole theme authority.
 */
class AppearanceStore {
    private val _state=MutableStateFlow(PopAppearance())
    val state=_state.asStateFlow()
    fun synchronize(theme:String,identity:String,font:String="DEFAULT") {
        _state.value=PopAppearance(
            theme.takeIf { it in setOf("SYSTEM","LIGHT","DARK") } ?: "SYSTEM",
            identity.takeIf { runCatching { PopIdentity.valueOf(it) }.isSuccess } ?: "PULSE",
            font,
        )
    }
}
