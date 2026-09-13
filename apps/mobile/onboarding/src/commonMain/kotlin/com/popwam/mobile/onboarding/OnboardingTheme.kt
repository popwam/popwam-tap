package com.popwam.mobile.onboarding
import androidx.compose.runtime.Composable
import com.popwam.mobile.designsystem.*
import com.popwam.mobile.foundation.launch.*
@Composable
fun Phase3OnboardingTheme(
    baseTheme: ThemeMode,
    popStyle: IdentityPalette,
    systemDark: Boolean,
    languageTag: String,
    fonts: PopFontFamilies,
    content: @Composable () -> Unit,
) {
    val dark = resolveDarkTheme(baseTheme, systemDark)
    PopTheme(
        dark = dark,
        identity = PopIdentityStyle.valueOf(popStyle.name),
        direction = if (languageTag.substringBefore('-') == "ar") PopScriptDirection.RTL else PopScriptDirection.LTR,
        fonts = fonts,
        content = content,
    )
}

fun resolveDarkTheme(baseTheme: ThemeMode, systemDark: Boolean): Boolean = when (baseTheme) {
    ThemeMode.SYSTEM -> systemDark
    ThemeMode.LIGHT -> false
    ThemeMode.DARK -> true
}

