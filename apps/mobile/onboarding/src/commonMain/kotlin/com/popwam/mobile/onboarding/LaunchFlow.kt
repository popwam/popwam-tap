package com.popwam.mobile.onboarding

import com.popwam.mobile.foundation.launch.CURRENT_WELCOME_VERSION
import com.popwam.mobile.foundation.launch.LaunchState
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.navigation.WelcomePage

data class SplashTiming(
    val totalMillis: Long,
) {
    init {
        require(totalMillis >= 0)
    }

    companion object {
        /** One timeline, with the Figma stages retained only as visual keyframes. */
        val Standard = SplashTiming(totalMillis = 840)
        /** Reduced Motion deliberately skips intermediate movement. */
        val ReducedMotion = SplashTiming(totalMillis = 0)
    }
}

fun requiredDestination(state: LaunchState, authenticated: Boolean): PopDestination = when {
    authenticated -> PopDestination.Home
    !state.hasSelectedLanguage -> PopDestination.Language
    !state.hasSelectedBaseTheme -> PopDestination.Theme
    !state.hasCompletedWelcome || state.welcomeVersionSeen < CURRENT_WELCOME_VERSION ->
        PopDestination.Welcome(WelcomePage.ALL_IN_ONE)
    else -> PopDestination.PhoneAuth
}

fun nextWelcomePage(page: WelcomePage): WelcomePage? = when (page) {
    WelcomePage.ALL_IN_ONE -> WelcomePage.SHARE_YOUR_WAY
    WelcomePage.SHARE_YOUR_WAY -> WelcomePage.PERSONAL_AND_BUSINESS
    WelcomePage.PERSONAL_AND_BUSINESS -> WelcomePage.GET_STARTED
    WelcomePage.GET_STARTED -> null
}

fun previousWelcomePage(page: WelcomePage): WelcomePage? = when (page) {
    WelcomePage.ALL_IN_ONE -> null
    WelcomePage.SHARE_YOUR_WAY -> WelcomePage.ALL_IN_ONE
    WelcomePage.PERSONAL_AND_BUSINESS -> WelcomePage.SHARE_YOUR_WAY
    WelcomePage.GET_STARTED -> WelcomePage.PERSONAL_AND_BUSINESS
}
