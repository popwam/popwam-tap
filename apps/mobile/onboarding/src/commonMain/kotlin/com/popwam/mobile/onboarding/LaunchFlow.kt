package com.popwam.mobile.onboarding

import com.popwam.mobile.foundation.launch.CURRENT_WELCOME_VERSION
import com.popwam.mobile.foundation.launch.LaunchState
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.navigation.WelcomePage

enum class SplashStage { ONE, TWO, THREE, FOUR, FIVE }

data class SplashTiming(
    val stageOneMillis: Long,
    val stageTwoMillis: Long,
    val stageThreeMillis: Long,
    val stageFourMinimumMillis: Long,
) {
    init {
        require(stageOneMillis >= 0 && stageTwoMillis >= 0 && stageThreeMillis >= 0 && stageFourMinimumMillis >= 0)
    }

    companion object {
        val Standard = SplashTiming(180, 180, 220, 260)
        val ReducedMotion = SplashTiming(40, 40, 40, 80)
    }
}

fun requiredDestination(state: LaunchState, authenticated: Boolean): PopDestination = when {
    authenticated -> PopDestination.Home
    !state.hasSeenFirstLaunchStage -> PopDestination.FirstLaunchFinalStage
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
