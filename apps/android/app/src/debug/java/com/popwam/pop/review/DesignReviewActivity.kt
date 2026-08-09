package com.popwam.pop.review

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.os.LocaleListCompat
import com.popwam.mobile.authentication.AuthenticationCallbacks
import com.popwam.mobile.authentication.AuthenticationCountry
import com.popwam.mobile.authentication.AuthenticationExperience
import com.popwam.mobile.authentication.AuthenticationStage
import com.popwam.mobile.authentication.AuthenticationUiState
import com.popwam.mobile.authentication.OtpUiState
import com.popwam.mobile.foundation.auth.AccountState
import com.popwam.mobile.foundation.auth.AuthChallenge
import com.popwam.mobile.foundation.auth.AuthenticationMethod
import com.popwam.mobile.foundation.auth.AuthenticationNextAction
import com.popwam.mobile.foundation.auth.BiometricEnrollmentPolicy
import com.popwam.mobile.foundation.auth.OtpConfiguration
import com.popwam.mobile.foundation.auth.PasskeyRequirement
import com.popwam.mobile.foundation.auth.SessionScope
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.foundation.navigation.WelcomePage
import com.popwam.mobile.foundation.overlay.OverlayDismissPolicy
import com.popwam.mobile.foundation.overlay.OverlayEntry
import com.popwam.mobile.foundation.overlay.OverlayKey
import com.popwam.mobile.foundation.overlay.OverlayPresentation
import com.popwam.mobile.foundation.overlay.OverlayState
import com.popwam.mobile.foundation.platform.BiometricCapability
import com.popwam.mobile.onboarding.LanguageScreen
import com.popwam.mobile.onboarding.Phase3OnboardingTheme
import com.popwam.mobile.onboarding.PopSplashScreen
import com.popwam.mobile.onboarding.ThemeScreen
import com.popwam.mobile.onboarding.WelcomeScreen
import com.popwam.pop.ui.theme.popFontFamilies
import com.popwam.pop.TapApplication
import com.popwam.pop.ui.currentLocale
import com.popwam.pop.ui.home.HomeLoadState
import com.popwam.pop.ui.home.HomeProfile
import com.popwam.pop.ui.home.HomeScreen
import com.popwam.pop.ui.home.HomeUiState

/** Debug source set only. It renders fixtures and never instantiates a phone, OTP, or auth client. */
class DesignReviewActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { DesignReviewGallery() }
    }
}

private enum class ReviewScreen(val label: String) {
    SPLASH("Splash"), LANGUAGE("Language"), THEME("Theme"), THEME_GALLERY("Theme Gallery"),
    ALL_IN_ONE("All in One"), SHARE("Share Your Way"), PERSONAL("Personal & Business"), GET_STARTED("Get Started"),
    PHONE("Phone Number"), COUNTRY("Country"), OTP("OTP"), VERIFIED("Verified"), PASSKEY("Passkey"),
    BIOMETRIC("Biometric"), ACCOUNT_CREATED("Account Created"),
    HOME_LOADED("Home Loaded"), HOME_LOADING("Home Loading"), HOME_EMPTY("Home Empty"), HOME_ERROR("Home Error"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DesignReviewGallery() {
    var screen by remember { mutableStateOf(ReviewScreen.SPLASH) }
    var palette by remember { mutableStateOf(IdentityPalette.PULSE) }
    var mode by remember { mutableStateOf(ThemeMode.LIGHT) }
    var language by remember { mutableStateOf(currentLocale().substringBefore('-')) }
    var splashProgress by remember { mutableFloatStateOf(0f) }
    val app = LocalContext.current.applicationContext as TapApplication
    LaunchedEffect(app) {
        val live = app.container.launchState.initialize()
        palette = live.selectedPopStyle
        mode = live.selectedBaseTheme
        language = live.selectedLanguageTag?.substringBefore('-') ?: language
    }
    val countries = listOf(AuthenticationCountry("EG", "+20", "Egypt", "🇪🇬", "00 000 0000 00"))

    Phase3OnboardingTheme(mode, palette, isSystemInDarkTheme(), language, popFontFamilies()) {
        Scaffold(
            topBar = { TopAppBar(title = { Text("Phase 3–4 Design Review") }) },
        ) { inset ->
            Column(Modifier.fillMaxSize().padding(inset), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
                    items(ReviewScreen.entries) { item -> Button(onClick = { screen = item }) { Text(item.label) } }
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
                    items(IdentityPalette.entries) { item -> Button(onClick = { palette = item }) { Text(item.name.lowercase().replaceFirstChar(Char::uppercase)) } }
                    items(ThemeMode.entries) { item -> Button(onClick = { mode = item }) { Text(item.name.lowercase().replaceFirstChar(Char::uppercase)) } }
                    items(listOf("en", "ar")) { tag -> Button(onClick = { language = tag; AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(tag)) }) { Text(tag.uppercase()) } }
                }
                HorizontalDivider()
                when (screen) {
                    ReviewScreen.SPLASH -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(listOf(0f, .22f, .48f, .75f, 1f)) { value -> Button(onClick = { splashProgress = value }) { Text("${(value * 100).toInt()}%") } }
                        }
                        PopSplashScreen(splashProgress, showGoAhead = splashProgress >= 1f, onGoAhead = {})
                    }
                    ReviewScreen.LANGUAGE -> LanguageScreen(listOf("en", "ar"), language, {})
                    ReviewScreen.THEME -> ThemeScreen(mode, palette, false, { mode = it }, {}, {}, { palette = it }, {})
                    ReviewScreen.THEME_GALLERY -> ThemeScreen(mode, palette, true, { mode = it }, {}, {}, { palette = it }, {})
                    ReviewScreen.ALL_IN_ONE -> WelcomeScreen(WelcomePage.ALL_IN_ONE, language, reducedMotion = true, {}, {})
                    ReviewScreen.SHARE -> WelcomeScreen(WelcomePage.SHARE_YOUR_WAY, language, reducedMotion = true, {}, {})
                    ReviewScreen.PERSONAL -> WelcomeScreen(WelcomePage.PERSONAL_AND_BUSINESS, language, reducedMotion = true, {}, {})
                    ReviewScreen.GET_STARTED -> WelcomeScreen(WelcomePage.GET_STARTED, language, reducedMotion = true, {}, {})
                    ReviewScreen.PHONE -> AuthenticationExperience(AuthenticationUiState(phoneInput = "1001234567"), OverlayState(), countries, "", reviewCallbacks)
                    ReviewScreen.COUNTRY -> AuthenticationExperience(AuthenticationUiState(stage = AuthenticationStage.COUNTRY), OverlayState(), countries, "", reviewCallbacks)
                    ReviewScreen.OTP -> AuthenticationExperience(reviewState(AuthenticationStage.OTP, AuthenticationNextAction.VERIFY_OTP).copy(otp = OtpUiState(providerChallengeHandle = "review", remainingSeconds = 60)), otpOverlay, countries, "", reviewCallbacks)
                    ReviewScreen.VERIFIED -> AuthenticationExperience(reviewState(AuthenticationStage.VERIFIED, AuthenticationNextAction.ENROLL_PASSKEY), verifiedOverlay, countries, "", reviewCallbacks)
                    ReviewScreen.PASSKEY -> AuthenticationExperience(reviewState(AuthenticationStage.PASSKEY, AuthenticationNextAction.ENROLL_PASSKEY), OverlayState(), countries, "", reviewCallbacks)
                    ReviewScreen.BIOMETRIC -> AuthenticationExperience(reviewState(AuthenticationStage.BIOMETRIC, AuthenticationNextAction.ENROLL_BIOMETRIC).copy(biometricCapability = BiometricCapability.FINGERPRINT), OverlayState(), countries, "", reviewCallbacks)
                    ReviewScreen.ACCOUNT_CREATED -> AuthenticationExperience(reviewState(AuthenticationStage.ACCOUNT_CREATED, AuthenticationNextAction.PROFILE_SETUP, SessionScope.FULL), OverlayState(), countries, "", reviewCallbacks)
                    ReviewScreen.HOME_LOADED -> HomeScreen(homeReviewState(language), {})
                    ReviewScreen.HOME_LOADING -> HomeScreen(HomeUiState(), {})
                    ReviewScreen.HOME_EMPTY -> HomeScreen(HomeUiState(loadState = HomeLoadState.EMPTY), {})
                    ReviewScreen.HOME_ERROR -> HomeScreen(HomeUiState(loadState = HomeLoadState.ERROR, errorCode = "REVIEW"), {})
                }
            }
        }
    }
}

private fun homeReviewState(language: String) = HomeUiState(
    loadState = HomeLoadState.CONTENT,
    profiles = listOf(
        HomeProfile(
            id = "review-primary",
            name = if (language == "ar") "سارة أحمد" else "Sarah Ahmed",
            subtitle = if (language == "ar") "مصممة منتجات" else "Product designer",
            avatarUrl = null,
            lifecycle = "PUBLISHED",
            visibility = "PUBLIC",
            isPrimary = true,
        ),
        HomeProfile(
            id = "review-business",
            name = if (language == "ar") "استوديو سارة" else "Sarah Studio",
            subtitle = if (language == "ar") "ملف أعمال" else "Business profile",
            avatarUrl = null,
            lifecycle = "DRAFT",
            visibility = "PRIVATE",
            isPrimary = false,
        ),
    ),
    activeProfileId = "review-primary",
    completionPercent = 84,
    activeProductCount = 2,
    totalOpenCount = 148,
    isPartial = true,
)

private val reviewCallbacks = AuthenticationCallbacks({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})
private val otpOverlay = OverlayState(OverlayEntry("review-otp", OverlayKey.OTP, OverlayPresentation.BOTTOM_SHEET, OverlayDismissPolicy.ACTION_REQUIRED))
private val verifiedOverlay = OverlayState(OverlayEntry("review-verified", OverlayKey.VERIFIED, OverlayPresentation.BOTTOM_SHEET, OverlayDismissPolicy.PROGRAMMATIC_ONLY))

private fun reviewState(stage: AuthenticationStage, action: AuthenticationNextAction, scope: SessionScope = SessionScope.ENROLLMENT) = AuthenticationUiState(
    stage = stage,
    challenge = AuthChallenge(
        challengeId = "review-only", accountState = AccountState.NEW,
        allowedMethods = listOf(AuthenticationMethod.PHONE_OTP, AuthenticationMethod.PASSKEY), preferredMethod = AuthenticationMethod.PHONE_OTP,
        otpConfiguration = OtpConfiguration(6, 300, 60, 5, true),
        passkeyRequirement = if (action == AuthenticationNextAction.ENROLL_PASSKEY) PasskeyRequirement.REQUIRED else PasskeyRequirement.AVAILABLE,
        biometricEnrollmentPolicy = BiometricEnrollmentPolicy.REQUIRED_WHEN_AVAILABLE,
        sessionScope = scope, nextAction = action, expiresAt = "2099-01-01T00:00:00Z",
    ),
)
