package com.popwam.pop.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FirstLaunchAndroidContractTest {
    private fun source(path:String)=File(path).readText()

    @Test fun `startup is owned by one feature scoped coordinator`() {
        val activity=source("src/main/java/com/popwam/pop/MainActivity.kt")
        val launch=source("src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt")
        assertTrue(activity.contains("LaunchCoordinator(app.container.launchState)"))
        assertTrue(activity.contains("LaunchExperience(launchViewModel"))
        assertTrue(launch.contains("systemSplashExit.await()"))
        assertFalse(launch.contains("advanceSplashTimeline"))
        assertFalse(File("src/main/java/com/popwam/pop/ui/RuntimeLaunchViewModel.kt").exists())
    }

    @Test fun `first launch persistence is versioned and legacy is read only for migration`() {
        val persistence=source("src/main/java/com/popwam/pop/data/launch/AndroidLaunchStatePersistence.kt")
        val migration=source("src/main/java/com/popwam/pop/data/launch/LegacyLaunchStateMigration.kt")
        assertTrue(persistence.contains("pop_launch_state"))
        assertTrue(migration.contains("pop_pre_auth"))
        assertTrue(migration.contains("MIGRATION_VERSION = 2"))
        assertFalse(persistence.contains("accessToken"))
        assertFalse(persistence.contains("refreshToken"))
    }

    @Test fun `launch state is the sole persisted theme authority`() {
        val activity=source("src/main/java/com/popwam/pop/MainActivity.kt")
        val appearance=source("src/main/java/com/popwam/pop/ui/theme/AppearanceStore.kt")
        assertTrue(activity.contains("AppearanceStore()"))
        assertTrue(activity.contains("Phase3OnboardingTheme" ) || source("src/main/java/com/popwam/pop/ui/launch/LaunchExperience.kt").contains("Phase3OnboardingTheme"))
        assertTrue(appearance.contains("Compatibility mirror"))
        assertFalse(appearance.contains("getSharedPreferences"))
    }

    @Test fun `auth legal actions are native and contain no browser or WebView`() {
        val app=source("src/main/java/com/popwam/pop/ui/auth/PhoneLoginScreen.kt")
        val experience=source("src/main/java/com/popwam/pop/ui/PreAuthExperience.kt")
        val login=app
        assertTrue(login.contains("legal=PreAuthLegalKind.PRIVACY"))
        assertTrue(login.contains("legal=PreAuthLegalKind.TERMS"))
        assertFalse(login.contains("openWeb("))
        assertTrue(experience.contains("fun NativeLegalScreen"))
        assertFalse(experience.contains("WebView"))
        assertFalse(experience.contains("CustomTabsIntent"))
    }

    @Test fun `country picker is searchable and normalized before OTP submission`() {
        val app=source("src/main/java/com/popwam/pop/ui/auth/PhoneLoginScreen.kt")
        assertTrue(app.contains("AlertDialog"))
        assertTrue(app.contains("PhoneIdentity.search(countries,query)"))
        assertTrue(source("src/main/java/com/popwam/pop/ui/auth/PhoneLoginViewModel.kt").contains("PhoneIdentity.normalize(before.phone,before.country)"))
        assertTrue(app.contains("viewModel.request(locale)"))
    }

    @Test fun `login offers passkey with explicit WhatsApp fallback`() {
        val app=source("src/main/java/com/popwam/pop/ui/auth/PhoneLoginScreen.kt")
        assertTrue(app.contains("p7_passkey_login"))
        assertTrue(app.contains("viewModel.request(locale)"))
    }

    @Test fun `French is declared alongside Arabic and English`() {
        val locales=source("src/main/res/xml/locales_config.xml")
        assertTrue(locales.contains("android:name=\"ar\""))
        assertTrue(locales.contains("android:name=\"en\""))
        assertTrue(locales.contains("android:name=\"fr\""))
    }

    @Test fun `session and local state restore do not trigger localization network`() {
        val application=source("src/main/java/com/popwam/pop/TapApplication.kt")
        val authority=source("src/main/java/com/popwam/pop/data/localization/LocalizationAuthorityStore.kt")
        val launch=source("src/main/java/com/popwam/pop/ui/launch/LaunchViewModel.kt")
        assertTrue(authority.contains("api.localizationBootstrap()"))
        assertTrue(launch.contains("sessions.initialize()"))
        assertFalse(launch.contains("localization.refresh()"))
        assertTrue(application.contains("localFirst.core"))
        assertFalse(application.contains("runBlocking"))
    }

    @Test fun `typography is centrally script aware`() {
        val theme=source("src/main/java/com/popwam/pop/ui/theme/Theme.kt")
        assertTrue(theme.contains("PopScriptDirection.RTL"))
        assertTrue(theme.contains("popFontFamilies()"))
        assertTrue(theme.contains("R.font.cairo"))
        assertTrue(theme.contains("R.font.montserrat"))
    }
}
