package com.popwam.mobile.onboarding

import com.popwam.mobile.foundation.launch.CURRENT_WELCOME_VERSION
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.LaunchState
import com.popwam.mobile.foundation.launch.LaunchStateStore
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.navigation.WelcomePage
import com.popwam.mobile.foundation.overlay.OverlayCoordinator
import com.popwam.mobile.foundation.overlay.OverlayEntry
import com.popwam.mobile.foundation.overlay.OverlayKey
import com.popwam.mobile.foundation.overlay.OverlayPresentation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class LaunchUiState(
    val destination: PopDestination = PopDestination.Launch,
    /** Monotonic progress for the single, continuous splash composition. */
    val splashProgress: Float = 0f,
    val persisted: LaunchState = LaunchState(),
    val finalNavigationCommitted: Boolean = false,
)

class LaunchCoordinator(
    private val store: LaunchStateStore,
    val overlays: OverlayCoordinator = OverlayCoordinator(),
) {
    private val mutableState = MutableStateFlow(LaunchUiState())
    val state: StateFlow<LaunchUiState> = mutableState.asStateFlow()

    suspend fun restore(): LaunchState {
        val restored = store.initialize()
        mutableState.value = mutableState.value.copy(persisted = restored)
        return restored
    }

    fun showSplashProgress(progress: Float) {
        if (mutableState.value.destination != PopDestination.Launch) return
        mutableState.value = mutableState.value.copy(splashProgress = progress.coerceIn(0f, 1f))
    }

    fun finishInitialSplash(authenticated: Boolean) {
        val destination = requiredDestination(mutableState.value.persisted, authenticated)
        mutableState.value = mutableState.value.copy(
            destination = destination,
            splashProgress = 1f,
        )
    }

    suspend fun continueFromFirstLaunchStage() {
        val updated = store.update { it.copy(hasSeenFirstLaunchStage = true) }
        mutableState.value = mutableState.value.copy(destination = PopDestination.Language, persisted = updated)
    }

    suspend fun selectLanguage(languageTag: String) {
        val updated = store.update {
            it.copy(hasSelectedLanguage = true, selectedLanguageTag = languageTag)
        }
        mutableState.value = mutableState.value.copy(destination = PopDestination.Theme, persisted = updated)
    }

    suspend fun selectBaseTheme(mode: ThemeMode) {
        // The state exposed to Compose is the same persisted state that is about
        // to be written.  This makes the selection visible on tap without a
        // separate preview value that could disagree with the application theme.
        mutableState.value = mutableState.value.copy(
            persisted = mutableState.value.persisted.copy(selectedBaseTheme = mode),
        )
        val updated = store.update { it.copy(selectedBaseTheme = mode) }
        mutableState.value = mutableState.value.copy(persisted = updated)
    }

    suspend fun completeThemeSelection() {
        val updated = store.update { it.copy(hasSelectedBaseTheme = true) }
        mutableState.value = mutableState.value.copy(
            destination = PopDestination.Welcome(WelcomePage.ALL_IN_ONE),
            persisted = updated,
        )
    }

    fun openThemeGallery() {
        overlays.present(
            OverlayEntry(
                id = THEME_GALLERY_OVERLAY_ID,
                key = OverlayKey.THEME_GALLERY,
                presentation = OverlayPresentation.BOTTOM_SHEET,
            ),
        )
    }

    suspend fun selectPopStyle(style: IdentityPalette) {
        // Palette selection is not a draft: it is the live application theme
        // and is persisted immediately.  Continue only advances onboarding.
        mutableState.value = mutableState.value.copy(
            persisted = mutableState.value.persisted.copy(selectedPopStyle = style),
        )
        val updated = store.update { it.copy(selectedPopStyle = style) }
        mutableState.value = mutableState.value.copy(persisted = updated)
        overlays.dismiss(THEME_GALLERY_OVERLAY_ID)
    }

    fun dismissThemeGallery() {
        overlays.dismiss(THEME_GALLERY_OVERLAY_ID)
    }

    fun showWelcome(page: WelcomePage) {
        mutableState.value = mutableState.value.copy(destination = PopDestination.Welcome(page))
    }

    fun showLanguage() {
        mutableState.value = mutableState.value.copy(destination = PopDestination.Language)
    }

    fun showTheme() {
        mutableState.value = mutableState.value.copy(destination = PopDestination.Theme)
    }

    fun nextWelcome(page: WelcomePage) {
        nextWelcomePage(page)?.let(::showWelcome)
    }

    fun previousWelcome(page: WelcomePage): Boolean {
        val previous = previousWelcomePage(page) ?: return false
        showWelcome(previous)
        return true
    }

    fun skipWelcome() {
        showWelcome(WelcomePage.GET_STARTED)
    }

    suspend fun completeWelcome(): Boolean {
        if (mutableState.value.finalNavigationCommitted) return false
        mutableState.value = mutableState.value.copy(finalNavigationCommitted = true)
        val updated = store.update {
            it.copy(
                hasCompletedWelcome = true,
                welcomeVersionSeen = CURRENT_WELCOME_VERSION,
            )
        }
        mutableState.value = mutableState.value.copy(
            destination = PopDestination.PhoneAuth,
            persisted = updated,
        )
        return true
    }

    suspend fun preservePendingDestination(destination: PopDestination?) {
        val updated = store.update { it.copy(pendingDestination = destination) }
        mutableState.value = mutableState.value.copy(persisted = updated)
    }

    suspend fun selectActiveProfile(profileId: String) {
        val normalized = profileId.trim().takeIf(String::isNotEmpty) ?: return
        val updated = store.update { it.copy(activeProfileId = normalized, hasCompletedProfileSetup = true) }
        mutableState.value = mutableState.value.copy(persisted = updated)
    }

    companion object {
        const val THEME_GALLERY_OVERLAY_ID = "phase3-theme-gallery"
    }
}
