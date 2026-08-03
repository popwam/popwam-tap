package com.popwam.mobile.designsystem

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.platform.LocalLayoutDirection

val LocalPopSemanticColors = staticCompositionLocalOf<PopSemanticColors> {
    error("Pop semantic colors are available only inside PopTheme")
}

val LocalPopScriptDirection = staticCompositionLocalOf { PopScriptDirection.LTR }

@Composable
fun PopTheme(
    dark: Boolean,
    identity: PopIdentityStyle,
    direction: PopScriptDirection,
    fonts: PopFontFamilies,
    content: @Composable () -> Unit,
) {
    val colors = popSemanticColors(identity, dark)
    val scheme = if (dark) {
        darkColorScheme(
            primary = colors.brandPrimary,
            onPrimary = colors.onBrand,
            background = colors.backgroundPrimary,
            onBackground = colors.textPrimary,
            surface = colors.surfacePrimary,
            onSurface = colors.textPrimary,
            surfaceVariant = colors.surfaceSecondary,
            onSurfaceVariant = colors.textSecondary,
            outline = colors.borderDefault,
            error = colors.error,
            onError = colors.textInverse,
        )
    } else {
        lightColorScheme(
            primary = colors.brandPrimary,
            onPrimary = colors.onBrand,
            background = colors.backgroundPrimary,
            onBackground = colors.textPrimary,
            surface = colors.surfacePrimary,
            onSurface = colors.textPrimary,
            surfaceVariant = colors.surfaceSecondary,
            onSurfaceVariant = colors.textSecondary,
            outline = colors.borderDefault,
            error = colors.error,
            onError = colors.textInverse,
        )
    }
    val layoutDirection = if (direction == PopScriptDirection.RTL) LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(
        LocalPopSemanticColors provides colors,
        LocalPopScriptDirection provides direction,
        LocalLayoutDirection provides layoutDirection,
    ) {
        MaterialTheme(
            colorScheme = scheme,
            typography = popTypography(fonts, direction),
            shapes = Shapes(
                small = RoundedCornerShape(PopRadius.small),
                medium = RoundedCornerShape(PopRadius.medium),
                large = RoundedCornerShape(PopRadius.large),
            ),
            content = content,
        )
    }
}

fun languageDirection(languageTag: String): PopScriptDirection =
    if (languageTag.substringBefore('-').lowercase() == "ar") PopScriptDirection.RTL else PopScriptDirection.LTR

