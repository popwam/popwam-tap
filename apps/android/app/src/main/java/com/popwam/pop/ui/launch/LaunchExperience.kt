package com.popwam.pop.ui.launch

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.popwam.mobile.designsystem.PopFontFamilies
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.navigation.PopDestination
import com.popwam.mobile.foundation.overlay.OverlayKey
import com.popwam.mobile.onboarding.LanguageScreen
import com.popwam.mobile.onboarding.LanguageChoice
import com.popwam.mobile.onboarding.LanguageScreenCopy
import com.popwam.mobile.onboarding.Phase3OnboardingTheme
import com.popwam.mobile.onboarding.ThemeScreen
import com.popwam.mobile.onboarding.ThemeScreenCopy
import com.popwam.pop.data.localization.LocalizationAuthoritySnapshot
import com.popwam.pop.data.localization.popStringResource
import com.popwam.pop.R
import com.popwam.pop.ui.PopSystemBars
import com.popwam.pop.ui.applyPopLanguage
import com.popwam.pop.ui.components.PopBrandedLoading

@Composable
fun LaunchExperience(
    viewModel: LaunchViewModel,
    localization: LocalizationAuthoritySnapshot,
    fonts: PopFontFamilies,
    startupAnimationReady: Boolean,
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
    val availableLanguages=localization.availableLocales.map { LanguageChoice(it.code,it.nativeName) }
    if(destination==PopDestination.Language&&availableLanguages.isEmpty()) {
        androidx.compose.runtime.LaunchedEffect(destination) {
            viewModel.selectLanguage("en",::applyPopLanguage)
        }
    }
    Phase3OnboardingTheme(theme, style, isSystemInDarkTheme(), language, fonts) {
        PopSystemBars(theme == ThemeMode.DARK || theme == ThemeMode.SYSTEM && isSystemInDarkTheme())
        when (destination) {
            PopDestination.Launch -> PopBrandedLoading(
                reducedMotion = viewModel.reducedMotion,
                animationReady = startupAnimationReady,
            )
            PopDestination.Language -> LanguageScreen(
                availableLanguages = availableLanguages,
                selectedLanguageTag = state.persisted.selectedLanguageTag,
                copy=LanguageScreenCopy(
                    logoDescription=popStringResource(R.string.app_name),
                    titlePrimary=popStringResource(R.string.pre_auth_language_title),
                    titleSecondary=popStringResource(R.string.pre_auth_language_help),
                    selectedDescription=popStringResource(R.string.localization_language_selected,"%s"),
                ),
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
                    copy=ThemeScreenCopy(
                        logoDescription=popStringResource(R.string.app_name),
                        title=popStringResource(R.string.localization_theme_title),
                        subtitle=popStringResource(R.string.localization_theme_subtitle),
                        styleAction=popStringResource(R.string.localization_theme_style),
                        continueAction=popStringResource(R.string.continue_action),
                        selectedDescription=popStringResource(R.string.localization_theme_selected,"%s"),
                        modeLabels=mapOf(
                            ThemeMode.SYSTEM to popStringResource(R.string.settings_system),
                            ThemeMode.LIGHT to popStringResource(R.string.settings_light),
                            ThemeMode.DARK to popStringResource(R.string.settings_dark),
                        ),
                        paletteLabels=mapOf(
                            IdentityPalette.MINT to popStringResource(R.string.localization_palette_mint),
                            IdentityPalette.PULSE to popStringResource(R.string.localization_palette_pulse),
                            IdentityPalette.VIOLET to popStringResource(R.string.localization_palette_violet),
                            IdentityPalette.CORAL to popStringResource(R.string.localization_palette_coral),
                            IdentityPalette.SOLAR to popStringResource(R.string.localization_palette_solar),
                            IdentityPalette.GRAPHITE to popStringResource(R.string.localization_palette_graphite),
                        ),
                    ),
                )
            }
            else -> existingApplication()
        }
    }
}
