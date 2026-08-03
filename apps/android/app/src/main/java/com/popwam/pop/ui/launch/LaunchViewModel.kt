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
import com.popwam.mobile.foundation.navigation.WelcomePage
import com.popwam.mobile.foundation.overlay.OverlayState
import com.popwam.mobile.onboarding.LaunchCoordinator
import com.popwam.mobile.onboarding.LaunchUiState
import com.popwam.mobile.onboarding.SplashStage
import com.popwam.mobile.onboarding.SplashTiming
import com.popwam.pop.data.auth.SessionRepository
import com.popwam.pop.data.launch.LegacyLaunchStateMigrator
import com.popwam.pop.data.localization.LocalizationAuthorityStore
import com.popwam.pop.ui.theme.AppearanceStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlin.math.min

class LaunchViewModel(
    private val coordinator: LaunchCoordinator,
    private val migrator: LegacyLaunchStateMigrator,
    private val sessions: SessionRepository,
    private val localization: LocalizationAuthorityStore,
    private val appearanceStore: AppearanceStore,
    private val savedStateHandle: SavedStateHandle,
    val reducedMotion: Boolean,
    private val afterSessionInitialized: suspend () -> Unit,
) : ViewModel() {
    val state: StateFlow<LaunchUiState> = coordinator.state
    val overlays: StateFlow<OverlayState> = coordinator.overlays.state
    private val foreground = MutableStateFlow(true)
    private var restored = false
    private var queuedDestination: PopDestination? = null

    init { beginColdLaunch() }

    fun setForeground(value: Boolean) { foreground.value = value }

    fun acceptDeepLink(raw: String?) {
        val parsed = PendingDeepLinkParser.parse(raw) ?: return
        if (!restored) queuedDestination = parsed
        else viewModelScope.launch { coordinator.preservePendingDestination(parsed) }
    }

    fun continueFromFirstLaunchStage() = viewModelScope.launch {
        coordinator.continueFromFirstLaunchStage()
    }

    fun selectLanguage(languageTag: String, applyLanguage: (String) -> Unit) = viewModelScope.launch {
        coordinator.selectLanguage(languageTag)
        applyLanguage(languageTag)
    }

    fun selectBaseTheme(mode: ThemeMode) = viewModelScope.launch {
        coordinator.selectBaseTheme(mode)
        appearanceStore.setTheme(mode.name)
    }

    fun completeTheme() = viewModelScope.launch { coordinator.completeThemeSelection() }

    fun openThemeGallery() = coordinator.openThemeGallery()
    fun previewPopStyle(style: IdentityPalette) = coordinator.previewPopStyle(style)
    fun cancelPopStyle() = coordinator.cancelPopStyle()
    fun confirmPopStyle() = viewModelScope.launch {
        coordinator.confirmPopStyle()
        appearanceStore.setIdentity(coordinator.state.value.persisted.selectedPopStyle.name)
    }

    fun nextWelcome(page: WelcomePage) {
        coordinator.nextWelcome(page)
        saveCurrentWelcomePage()
    }

    fun skipWelcome() {
        coordinator.skipWelcome()
        saveCurrentWelcomePage()
    }

    fun backFromWelcome(page: WelcomePage) {
        if (!coordinator.previousWelcome(page)) coordinator.showTheme()
        saveCurrentWelcomePage()
    }

    fun completeWelcome() = viewModelScope.launch { coordinator.completeWelcome() }

    private fun beginColdLaunch() {
        viewModelScope.launch {
            val timing = if (reducedMotion) SplashTiming.ReducedMotion else SplashTiming.Standard
            val startup = async(Dispatchers.IO) {
                runCatching { sessions.initialize() }
                val migrated = migrator.migrate(
                    authenticated = sessions.authenticated,
                    fallbackLanguageTag = localization.state.value.defaultLocale,
                )
                runCatching { afterSessionInitialized() }
                sessions.authenticated to migrated
            }
            launch { runCatching { localization.refresh() } }

            coordinator.showSplashStage(SplashStage.ONE)
            activeDelay(timing.stageOneMillis)
            coordinator.showSplashStage(SplashStage.TWO)
            activeDelay(timing.stageTwoMillis)
            coordinator.showSplashStage(SplashStage.THREE)
            activeDelay(timing.stageThreeMillis)
            coordinator.showSplashStage(SplashStage.FOUR)
            activeDelay(timing.stageFourMinimumMillis)

            val authenticated = startup.await().first
            coordinator.restore()
            restored = true
            queuedDestination?.let {
                coordinator.preservePendingDestination(it)
                queuedDestination = null
            }
            coordinator.finishInitialSplash(authenticated)
            val destination = coordinator.state.value.destination
            if (destination is PopDestination.Welcome) {
                savedWelcomePage()?.let(coordinator::showWelcome)
            }
        }
    }

    private suspend fun activeDelay(durationMillis: Long) {
        var remaining = durationMillis
        while (remaining > 0) {
            foreground.filter { it }.first()
            val slice = min(remaining, 20)
            delay(slice)
            if (foreground.value) remaining -= slice
        }
    }

    private fun saveCurrentWelcomePage() {
        val destination = coordinator.state.value.destination as? PopDestination.Welcome ?: return
        savedStateHandle[KEY_WELCOME_PAGE] = destination.page.name
    }

    private fun savedWelcomePage(): WelcomePage? = savedStateHandle.get<String>(KEY_WELCOME_PAGE)
        ?.let { runCatching { WelcomePage.valueOf(it) }.getOrNull() }

    companion object { private const val KEY_WELCOME_PAGE = "phase3_welcome_page" }
}

class LaunchViewModelFactory(
    private val coordinator: LaunchCoordinator,
    private val migrator: LegacyLaunchStateMigrator,
    private val sessions: SessionRepository,
    private val localization: LocalizationAuthorityStore,
    private val appearanceStore: AppearanceStore,
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
            appearanceStore,
            extras.createSavedStateHandle(),
            reducedMotion,
            afterSessionInitialized,
        ) as T
    }
}

fun reducedMotionEnabled(context: Context): Boolean = runCatching {
    Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
}.getOrDefault(false)
