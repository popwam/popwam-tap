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
    val splashStage: SplashStage = SplashStage.ONE,
    val persisted: LaunchState = LaunchState(),
    val previewPopStyle: IdentityPalette = IdentityPalette.MINT,
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
        mutableState.value = mutableState.value.copy(
            persisted = restored,
            previewPopStyle = restored.selectedPopStyle,
        )
        return restored
    }

    fun showSplashStage(stage: SplashStage) {
        if (mutableState.value.destination != PopDestination.Launch) return
        mutableState.value = mutableState.value.copy(splashStage = stage)
    }

    fun finishInitialSplash(authenticated: Boolean) {
        val destination = requiredDestination(mutableState.value.persisted, authenticated)
        mutableState.value = mutableState.value.copy(
            destination = destination,
            splashStage = if (destination == PopDestination.FirstLaunchFinalStage) SplashStage.FIVE else SplashStage.FOUR,
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
        mutableState.value = mutableState.value.copy(previewPopStyle = mutableState.value.persisted.selectedPopStyle)
        overlays.present(
            OverlayEntry(
                id = THEME_GALLERY_OVERLAY_ID,
                key = OverlayKey.THEME_GALLERY,
                presentation = OverlayPresentation.BOTTOM_SHEET,
            ),
        )
    }

    fun previewPopStyle(style: IdentityPalette) {
        mutableState.value = mutableState.value.copy(previewPopStyle = style)
    }

    suspend fun confirmPopStyle() {
        val selected = mutableState.value.previewPopStyle
        val updated = store.update { it.copy(selectedPopStyle = selected) }
        mutableState.value = mutableState.value.copy(persisted = updated)
        overlays.dismiss(THEME_GALLERY_OVERLAY_ID)
    }

    fun cancelPopStyle() {
        mutableState.value = mutableState.value.copy(
            previewPopStyle = mutableState.value.persisted.selectedPopStyle,
        )
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

    companion object {
        const val THEME_GALLERY_OVERLAY_ID = "phase3-theme-gallery"
    }
}
