package com.popwam.pop.ui.auth

import android.graphics.Bitmap
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.core.os.LocaleListCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
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
import com.popwam.mobile.foundation.overlay.OverlayDismissPolicy
import com.popwam.mobile.foundation.overlay.OverlayEntry
import com.popwam.mobile.foundation.overlay.OverlayKey
import com.popwam.mobile.foundation.overlay.OverlayPresentation
import com.popwam.mobile.foundation.overlay.OverlayState
import com.popwam.mobile.foundation.platform.BiometricCapability
import com.popwam.mobile.onboarding.Phase3OnboardingTheme
import com.popwam.pop.ui.theme.popFontFamilies
import java.io.File
import java.io.FileOutputStream
import org.junit.AfterClass
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class Phase4ScreenshotTest {
    @get:Rule val compose=createComposeRule()
    private val country=AuthenticationCountry("EG","+20","Egypt","🇪🇬","00 000 0000 00")
    private val callbacks=AuthenticationCallbacks({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {})

    companion object {
        @JvmStatic @AfterClass fun restoreLocale(){AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())}
    }

    @Test fun phoneEnglish()=capture("phone-en","en",AuthenticationUiState(phoneInput="1001234567"))
    @Test fun countryArabic()=capture("country-ar","ar",AuthenticationUiState(stage=AuthenticationStage.COUNTRY),countries=listOf(country,AuthenticationCountry("SA","+966","المملكة العربية السعودية","🇸🇦","50 123 4567")))
    @Test fun otpInitial()=capture("otp-initial","en",state(AuthenticationStage.OTP,AuthenticationNextAction.VERIFY_OTP).copy(maskedPhone="+20 ••• ••• 4567",otp=OtpUiState(remainingSeconds=60,providerChallengeHandle="provider")),OverlayState(OverlayEntry("otp",OverlayKey.OTP,OverlayPresentation.BOTTOM_SHEET,OverlayDismissPolicy.ACTION_REQUIRED)))
    @Test fun verifiedArabic()=capture("verified-ar","ar",state(AuthenticationStage.VERIFIED,AuthenticationNextAction.ENROLL_PASSKEY),OverlayState(OverlayEntry("verified",OverlayKey.VERIFIED,OverlayPresentation.BOTTOM_SHEET,OverlayDismissPolicy.PROGRAMMATIC_ONLY)))
    @Test fun setupPasskey()=capture("setup-passkey","en",state(AuthenticationStage.PASSKEY,AuthenticationNextAction.ENROLL_PASSKEY))
    @Test fun setupFingerprint()=capture("setup-fingerprint","en",state(AuthenticationStage.BIOMETRIC,AuthenticationNextAction.ENROLL_BIOMETRIC).copy(biometricCapability=BiometricCapability.FINGERPRINT))
    @Test fun setupFaceArabic()=capture("setup-face-ar","ar",state(AuthenticationStage.BIOMETRIC,AuthenticationNextAction.ENROLL_BIOMETRIC).copy(biometricCapability=BiometricCapability.FACE))
    @Test fun biometricUnavailable()=capture("biometric-unavailable","en",state(AuthenticationStage.BIOMETRIC,AuthenticationNextAction.ENROLL_BIOMETRIC).copy(biometricCapability=BiometricCapability.UNAVAILABLE))
    @Test fun accountCreated()=capture("account-created","en",state(AuthenticationStage.ACCOUNT_CREATED,AuthenticationNextAction.PROFILE_SETUP,SessionScope.FULL))

    private fun state(stage:AuthenticationStage,action:AuthenticationNextAction,scope:SessionScope=SessionScope.ENROLLMENT)=AuthenticationUiState(
        stage=stage,
        challenge=AuthChallenge(
            challengeId="visual-challenge",
            accountState=if(scope==SessionScope.FULL)AccountState.NEW else AccountState.NEW,
            allowedMethods=listOf(AuthenticationMethod.PHONE_OTP,AuthenticationMethod.PASSKEY),
            preferredMethod=AuthenticationMethod.PHONE_OTP,
            otpConfiguration=OtpConfiguration(6,300,60,5,true),
            passkeyRequirement=if(action==AuthenticationNextAction.ENROLL_PASSKEY)PasskeyRequirement.REQUIRED else PasskeyRequirement.AVAILABLE,
            biometricEnrollmentPolicy=BiometricEnrollmentPolicy.REQUIRED_WHEN_AVAILABLE,
            sessionScope=scope,
            nextAction=action,
            expiresAt="2099-01-01T00:00:00Z",
        ),
    )

    private fun capture(name:String,language:String,state:AuthenticationUiState,overlay:OverlayState=OverlayState(),countries:List<AuthenticationCountry> = listOf(country)) {
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(language))
        InstrumentationRegistry.getInstrumentation().waitForIdleSync()
        compose.setContent {
            Phase3OnboardingTheme(ThemeMode.LIGHT,IdentityPalette.PULSE,isSystemInDarkTheme(),language,popFontFamilies()) {
                AuthenticationExperience(state,overlay,countries,"",callbacks)
            }
        }
        compose.waitForIdle()
        val bitmap=compose.onRoot().captureToImage().asAndroidBitmap()
        val context=InstrumentationRegistry.getInstrumentation().targetContext
        val directory=File(requireNotNull(context.getExternalFilesDir(null)),"phase4-screenshots").apply{mkdirs()}
        FileOutputStream(File(directory,"$name.png")).use{check(bitmap.compress(Bitmap.CompressFormat.PNG,100,it))}
    }
}
