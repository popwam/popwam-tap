package com.popwam.pop.ui.launch

import android.graphics.Bitmap
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.core.os.LocaleListCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.popwam.mobile.foundation.launch.IdentityPalette
import com.popwam.mobile.foundation.launch.ThemeMode
import com.popwam.mobile.foundation.navigation.WelcomePage
import com.popwam.mobile.onboarding.LanguageScreen
import com.popwam.mobile.onboarding.Phase3OnboardingTheme
import com.popwam.mobile.onboarding.PopSplashScreen
import com.popwam.mobile.onboarding.ThemeScreen
import com.popwam.mobile.onboarding.WelcomeScreen
import com.popwam.pop.ui.theme.popFontFamilies
import java.io.File
import java.io.FileOutputStream
import org.junit.AfterClass
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class Phase3ScreenshotTest {
    @get:Rule val compose = createComposeRule()

    companion object {
        @JvmStatic
        @AfterClass
        fun restoreLocale() {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
        }
    }

    @Test fun firstSplashStage() = capture("splash-stage-1", "en", ThemeMode.LIGHT) {
        PopSplashScreen(progress = 0f, reducedMotion = false, modifier = Modifier.fillMaxSize())
    }

    @Test fun finalFirstLaunchSplashStage() = capture("splash-stage-5", "en", ThemeMode.LIGHT) {
        PopSplashScreen(progress = 1f, reducedMotion = true, modifier = Modifier.fillMaxSize())
    }

    @Test fun languageEnglish() = capture("language-en", "en", ThemeMode.LIGHT) {
        LanguageScreen(listOf("en", "ar"), null, {}, Modifier.fillMaxSize())
    }

    @Test fun languageArabic() = capture("language-ar", "ar", ThemeMode.LIGHT) {
        LanguageScreen(listOf("en", "ar"), "ar", {}, Modifier.fillMaxSize())
    }

    @Test fun themeLight() = capture("theme-light", "en", ThemeMode.LIGHT) {
        ThemeScreenCapture(ThemeMode.LIGHT, gallery = false)
    }

    @Test fun themeDark() = capture("theme-dark", "en", ThemeMode.DARK) {
        ThemeScreenCapture(ThemeMode.DARK, gallery = false)
    }

    @Test fun themeGallery() = capture("theme-gallery", "en", ThemeMode.LIGHT) {
        ThemeScreenCapture(ThemeMode.SYSTEM, gallery = true)
    }

    @Test fun onboardingArabic() = capture("onboarding-all-in-one-ar", "ar", ThemeMode.LIGHT) {
        WelcomeScreen(WelcomePage.ALL_IN_ONE, "ar", true, {}, {}, Modifier.fillMaxSize())
    }

    @Test fun onboardingEnglish() = capture("onboarding-share-en", "en", ThemeMode.LIGHT) {
        WelcomeScreen(WelcomePage.SHARE_YOUR_WAY, "en", true, {}, {}, Modifier.fillMaxSize())
    }

    @Test fun getStarted() = capture("get-started", "en", ThemeMode.LIGHT) {
        WelcomeScreen(WelcomePage.GET_STARTED, "en", true, {}, {}, Modifier.fillMaxSize())
    }

    @androidx.compose.runtime.Composable
    private fun ThemeScreenCapture(mode: ThemeMode, gallery: Boolean) {
        ThemeScreen(mode, IdentityPalette.MINT, gallery, {}, {}, {}, {}, {})
    }

    private fun capture(
        name: String,
        language: String,
        mode: ThemeMode,
        content: @androidx.compose.runtime.Composable () -> Unit,
    ) {
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(language))
        InstrumentationRegistry.getInstrumentation().waitForIdleSync()
        compose.setContent {
            Phase3OnboardingTheme(mode, IdentityPalette.MINT, isSystemInDarkTheme(), language, popFontFamilies(), content)
        }
        compose.waitForIdle()
        val bitmap = compose.onRoot().captureToImage().asAndroidBitmap()
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(
            requireNotNull(context.getExternalFilesDir(null)) { "External test output directory unavailable" },
            "phase3-screenshots",
        ).apply { mkdirs() }
        FileOutputStream(File(directory, "$name.png")).use {
            check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it))
        }
    }
}
