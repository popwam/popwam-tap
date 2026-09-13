package com.popwam.pop.ui.launch

import android.content.Context
import android.provider.Settings
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewmodel.CreationExtras
import androidx.lifecycle.viewModelScope
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.overlay.OverlayState
import com.popwam.mobile.onboarding.LaunchCoordinator
import com.popwam.mobile.onboarding.LaunchUiState
import com.popwam.pop.data.auth.SessionRepository
import com.popwam.pop.data.launch.LegacyLaunchStateMigrator
import com.popwam.pop.data.localization.LocalizationAuthorityStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class LaunchViewModel(
    private val coordinator: LaunchCoordinator,
    private val migrator: LegacyLaunchStateMigrator,
    private val sessions: SessionRepository,
    private val localization: LocalizationAuthorityStore,
    private val savedStateHandle: SavedStateHandle,
    val reducedMotion: Boolean,
    private val afterSessionInitialized: suspend () -> Unit,
) : ViewModel() {
    val state: StateFlow<LaunchUiState> = coordinator.state
    val overlays: StateFlow<OverlayState> = coordinator.overlays.state
    private val foreground = MutableStateFlow(true)
    private var restored = false
    private var queuedDestination: PopDestination? = null
    private val systemSplashExit = CompletableDeferred<Unit>()

    init { beginColdLaunch() }

    fun setForeground(value: Boolean) { foreground.value = value }

    fun onSystemSplashExited() { systemSplashExit.complete(Unit) }

    fun acceptDeepLink(raw: String?) {
        val parsed = PendingDeepLinkParser.parse(raw) ?: return
        if (!restored) queuedDestination = parsed
        else viewModelScope.launch { coordinator.preservePendingDestination(parsed) }
    }

    /** Phase 4 terminates at this typed boundary. Phase 5 will consume it and
     * render Profile Setup; this phase deliberately does not create that UI. */
    fun acceptProfileSetupHandoff(destination: PopDestination.ProfileSetup) {
        savedStateHandle["phase4_profile_setup_handoff"] = destination.step.name
    }

    fun selectLanguage(languageTag: String, applyLanguage: (String) -> Unit) = viewModelScope.launch {
        coordinator.selectLanguage(languageTag)
        applyLanguage(languageTag)
    }

    fun selectBaseTheme(mode: ThemeMode) = viewModelScope.launch {
        coordinator.selectBaseTheme(mode)
    }

    fun completeTheme() = viewModelScope.launch { coordinator.completeThemeSelection() }

    fun openThemeGallery() = coordinator.openThemeGallery()
    fun selectPopStyle(style: IdentityPalette) = viewModelScope.launch { coordinator.selectPopStyle(style) }
    fun selectActiveProfile(profileId: String) = viewModelScope.launch { coordinator.selectActiveProfile(profileId) }
    fun dismissThemeGallery() = coordinator.dismissThemeGallery()

    private fun beginColdLaunch() {
        viewModelScope.launch {
            val startup = async(Dispatchers.IO) {
                runCatching { sessions.initialize() }
                val migrated = migrator.migrate(
                    authenticated = sessions.authenticated,
                    fallbackLanguageTag = localization.state.value.defaultLocale,
                )
                runCatching { afterSessionInitialized() }
                sessions.authenticated to migrated
            }
            // Android owns the system splash. Once it exits, navigate as soon as local
            // session and launch state are ready; there is no animation-duration gate.
            systemSplashExit.await()
            val authenticated = startup.await().first
            coordinator.restore()
            restored = true
            queuedDestination?.let {
                coordinator.preservePendingDestination(it)
                queuedDestination = null
            }
            coordinator.finishInitialSplash(authenticated)

        }
    }


}

class LaunchViewModelFactory(
    private val coordinator: LaunchCoordinator,
    private val migrator: LegacyLaunchStateMigrator,
    private val sessions: SessionRepository,
    private val localization: LocalizationAuthorityStore,
    private val reducedMotion: Boolean,
    private val afterSessionInitialized: suspend () -> Unit,
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T {
        require(modelClass.isAssignableFrom(LaunchViewModel::class.java))
        @Suppress("UNCHECKED_CAST")
        return LaunchViewModel(
            coordinator,
            migrator,
            sessions,
            localization,
            extras.createSavedStateHandle(),
            reducedMotion,
            afterSessionInitialized,
        ) as T
    }
}

fun reducedMotionEnabled(context: Context): Boolean = runCatching {
    Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
}.getOrDefault(false)
