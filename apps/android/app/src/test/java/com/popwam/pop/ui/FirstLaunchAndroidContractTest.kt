package com.popwam.pop.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FirstLaunchAndroidContractTest {
    private fun source(path:String)=File(path).readText()

    @Test fun `startup is pre auth gated and no longer jumps to login on a timer`() {
        val app=source("src/main/java/com/popwam/pop/ui/PopwamApp.kt")
        assertTrue(app.contains("resolvePreAuthStage(preAuthState,authState.authenticated,availableLanguages)"))
        assertTrue(app.contains("PreAuthStage.LANGUAGE"))
        assertTrue(app.contains("PreAuthStage.APPEARANCE"))
        assertTrue(app.contains("PreAuthStage.INTRO"))
        assertFalse(app.contains("delay(650)"))
        assertFalse(app.contains("entry=EntryScreen.LOGIN"))
    }

    @Test fun `first launch persistence is versioned and never stores auth authority`() {
        val source=source("src/main/java/com/popwam/pop/ui/PreAuthExperience.kt")
        assertTrue(source.contains("\"pop_pre_auth\""))
        assertTrue(source.contains("\"language\""))
        assertTrue(source.contains("\"appearance\""))
        assertTrue(source.contains("\"intro_version_seen\""))
        assertFalse(source.contains("accessToken"))
        assertFalse(source.contains("refreshToken"))
        assertFalse(source.contains("FirebaseAuth"))
    }

    @Test fun `appearance reuses Phase H store and themes the whole app`() {
        val activity=source("src/main/java/com/popwam/pop/MainActivity.kt")
        val appearance=source("src/main/java/com/popwam/pop/ui/theme/AppearanceStore.kt")
        assertTrue(activity.contains("AppearanceStore(applicationContext)"))
        assertTrue(activity.contains("PopwamTheme(firstLaunchTheme,appearance.font)"))
        assertTrue(appearance.contains("putString(\"theme\",value)"))
        assertTrue(appearance.contains("setOf(\"SYSTEM\",\"LIGHT\",\"DARK\")"))
    }

    @Test fun `auth legal actions are native and contain no browser or WebView`() {
        val app=source("src/main/java/com/popwam/pop/ui/PopwamApp.kt")
        val experience=source("src/main/java/com/popwam/pop/ui/PreAuthExperience.kt")
        val login=app.substringAfter("private fun LoginScreen(").substringBefore("private fun passkeyErrorString")
        assertTrue(login.contains("openLegal(PreAuthLegalKind.PRIVACY)"))
        assertTrue(login.contains("openLegal(PreAuthLegalKind.TERMS)"))
        assertFalse(login.contains("openWeb("))
        assertTrue(experience.contains("fun NativeLegalScreen"))
        assertFalse(experience.contains("WebView"))
        assertFalse(experience.contains("CustomTabsIntent"))
    }

    @Test fun `country picker is searchable and normalized before OTP submission`() {
        val app=source("src/main/java/com/popwam/pop/ui/PopwamApp.kt")
        assertTrue(app.contains("CountryPickerDialog"))
        assertTrue(app.contains("PhoneIdentity.search(countries,query)"))
        assertTrue(app.contains("PhoneIdentity.normalize(phone,country)"))
        assertTrue(app.contains("auth.startPhoneVerification(activity,normalized,currentLocale())"))
    }

    @Test fun `returning passkey remains before phone fallback`() {
        val app=source("src/main/java/com/popwam/pop/ui/PopwamApp.kt")
        val viewModel=source("src/main/java/com/popwam/pop/ui/AppViewModels.kt")
        assertTrue(app.indexOf("continue_with_passkey")<app.indexOf("use_phone_instead"))
        assertTrue(app.contains("auth.verifyPasskey"))
        assertTrue(viewModel.contains("phoneFallbackAvailable"))
    }

    @Test fun `French is declared alongside Arabic and English`() {
        val locales=source("src/main/res/xml/locales_config.xml")
        assertTrue(locales.contains("android:name=\"ar\""))
        assertTrue(locales.contains("android:name=\"en\""))
        assertTrue(locales.contains("android:name=\"fr\""))
    }

    @Test fun `server localization authority and cold splash gate startup`() {
        val activity=source("src/main/java/com/popwam/pop/MainActivity.kt")
        val authority=source("src/main/java/com/popwam/pop/data/localization/LocalizationAuthorityStore.kt")
        val launch=source("src/main/java/com/popwam/pop/ui/RuntimeLaunchViewModel.kt")
        assertTrue(activity.contains("container.localization.refresh()"))
        assertTrue(authority.contains("api.localizationBootstrap()"))
        assertTrue(authority.contains("listOf(LocalizationLocaleDto())"))
        assertTrue(launch.contains("POP_COLD_SPLASH_MILLIS=3_000L"))
    }

    @Test fun `typography is centrally script aware`() {
        val theme=source("src/main/java/com/popwam/pop/ui/theme/Theme.kt")
        assertTrue(theme.contains("if(arabic)Cairo else ABeeZee"))
        assertTrue(theme.contains("R.font.cairo"))
        assertTrue(theme.contains("R.font.abeezee"))
    }
}
