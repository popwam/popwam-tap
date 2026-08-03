package com.popwam.mobile.foundation.overlay

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class OverlayPresentation { DIALOG, BOTTOM_SHEET, FULL_SCREEN_MODAL }

enum class OverlayDismissPolicy {
    USER_DISMISSIBLE,
    ACTION_REQUIRED,
    PROGRAMMATIC_ONLY,
}

enum class OverlayKey {
    THEME_GALLERY,
    OTP,
    AUTHENTICATION_STATUS,
    PROFILE_SWITCHER,
    QR_CODE,
    WALLET_UNDER_DEVELOPMENT,
    FOUNDATION_ALERT,
}

data class OverlayEntry(
    val id: String,
    val key: OverlayKey,
    val presentation: OverlayPresentation,
    val dismissPolicy: OverlayDismissPolicy = OverlayDismissPolicy.USER_DISMISSIBLE,
)

data class OverlayState(val active: OverlayEntry? = null)

class OverlayCoordinator {
    private val mutableState = MutableStateFlow(OverlayState())
    val state: StateFlow<OverlayState> = mutableState.asStateFlow()

    fun present(entry: OverlayEntry) {
        require(entry.id.isNotBlank()) { "Overlay id must not be blank" }
        mutableState.value = OverlayState(entry)
    }

    fun dismiss(id: String? = null, forced: Boolean = false): Boolean {
        val active = mutableState.value.active ?: return false
        if (id != null && id != active.id) return false
        if (!forced && active.dismissPolicy != OverlayDismissPolicy.USER_DISMISSIBLE) return false
        mutableState.value = OverlayState()
        return true
    }
}

