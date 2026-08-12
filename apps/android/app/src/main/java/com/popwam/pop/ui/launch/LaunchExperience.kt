package com.popwam.pop.ui.launch

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.popwam.mobile.designsystem.PopFontFamilies
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.overlay.OverlayKey
import com.popwam.mobile.onboarding.LanguageScreen
import com.popwam.mobile.onboarding.Phase3OnboardingTheme
import com.popwam.mobile.onboarding.PopSplashScreen
import com.popwam.mobile.onboarding.ThemeScreen
import com.popwam.mobile.onboarding.WelcomeScreen
import com.popwam.pop.data.localization.LocalizationAuthoritySnapshot
import com.popwam.pop.ui.PopSystemBars
import com.popwam.pop.ui.applyPopLanguage

@Composable
fun LaunchExperience(
    viewModel: LaunchViewModel,
    localization: LocalizationAuthoritySnapshot,
    fonts: PopFontFamilies,
    existingApplication: @Composable () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val overlay by viewModel.overlays.collectAsStateWithLifecycle()
    val destination = state.destination
    if (destination == PopDestination.PhoneAuth || destination == PopDestination.Home) {
        existingApplication()
        return
    }

    val language = state.persisted.selectedLanguageTag ?: localization.defaultLocale
    val theme = if (destination == PopDestination.Language || destination == PopDestination.Launch || destination == PopDestination.FirstLaunchFinalStage) {
        ThemeMode.LIGHT
    } else state.persisted.selectedBaseTheme
    val style = state.persisted.selectedPopStyle
    val availableLanguages = buildList {
        add("en")
        add("ar")
        if (localization.availableLocales.any { it.code == "fr" }) add("fr")
    }
    Phase3OnboardingTheme(theme, style, isSystemInDarkTheme(), language, fonts) {
        PopSystemBars(theme == ThemeMode.DARK || theme == ThemeMode.SYSTEM && isSystemInDarkTheme())
        when (destination) {
            PopDestination.Launch -> PopSplashScreen(
                progress = state.splashProgress,
                reducedMotion = viewModel.reducedMotion,
            )
            PopDestination.Language -> LanguageScreen(
                availableLanguageTags = availableLanguages,
                selectedLanguageTag = state.persisted.selectedLanguageTag,
                onSelect = { viewModel.selectLanguage(it, ::applyPopLanguage) },
            )
            PopDestination.Theme -> {
                BackHandler(enabled = overlay.active?.key == OverlayKey.THEME_GALLERY) { viewModel.dismissThemeGallery() }
                ThemeScreen(
                    selectedMode = state.persisted.selectedBaseTheme,
                    selectedStyle = state.persisted.selectedPopStyle,
                    galleryVisible = overlay.active?.key == OverlayKey.THEME_GALLERY,
                    onSelectMode = viewModel::selectBaseTheme,
                    onContinue = viewModel::completeTheme,
                    onOpenGallery = viewModel::openThemeGallery,
                    onSelectStyle = viewModel::selectPopStyle,
                    onDismissGallery = viewModel::dismissThemeGallery,
                )
            }
            is PopDestination.Welcome -> {
                BackHandler { viewModel.backFromWelcome(destination.page) }
                WelcomeScreen(
                    page = destination.page,
                    languageTag = language,
                    reducedMotion = viewModel.reducedMotion,
                    onContinue = {
                        if (destination.page == com.popwam.mobile.foundation.navigation.WelcomePage.GET_STARTED) {
                            viewModel.completeWelcome()
                        } else viewModel.nextWelcome(destination.page)
                    },
                    onSkip = viewModel::skipWelcome,
                )
            }
            else -> existingApplication()
        }
    }
}
