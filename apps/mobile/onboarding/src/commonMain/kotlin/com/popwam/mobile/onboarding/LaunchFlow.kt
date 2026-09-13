package com.popwam.mobile.onboarding

import com.popwam.mobile.foundation.launch.LaunchState
import com.popwam.mobile.foundation.navigation.PopDestination

data class SplashTiming(
    val totalMillis: Long,
) {
    init {
        require(totalMillis >= 0)
    }

    companion object {
        /** One timeline, with the Figma stages retained only as visual keyframes. */
        val Standard = SplashTiming(totalMillis = 2_000)
        /** Reduced Motion deliberately skips intermediate movement. */
        val ReducedMotion = SplashTiming(totalMillis = 0)
    }
}

fun requiredDestination(state: LaunchState, authenticated: Boolean): PopDestination = when {
    authenticated -> PopDestination.Home
    !state.hasSelectedLanguage -> PopDestination.Language
    !state.hasSelectedBaseTheme -> PopDestination.Theme
    else -> PopDestination.PhoneAuth
}
