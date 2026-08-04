package com.popwam.mobile.designsystem

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

object PopReferenceFrame {
    val width: Dp = 393.dp
    val height: Dp = 852.dp
}

object PopSpacing {
    val xxs = 4.dp
    val xs = 8.dp
    val sm = 12.dp
    val md = 16.dp
    val lg = 20.dp
    val xl = 24.dp
    val xxl = 32.dp
    val xxxl = 40.dp
    val jumbo = 48.dp
}

object PopRadius {
    val small = 10.dp
    val medium = 16.dp
    val large = 24.dp
    val full = 9999.dp
}

data class PopElevationToken(
    val elevation: Dp,
    val blur: Dp,
    val color: Color,
)

object PopElevation {
    val flat = PopElevationToken(0.dp, 0.dp, Color.Transparent)
    val card = PopElevationToken(1.dp, 3.dp, Color.Black.copy(alpha = 0.08f))
    val floating = PopElevationToken(4.dp, 12.dp, Color.Black.copy(alpha = 0.12f))
    val modal = PopElevationToken(12.dp, 32.dp, Color.Black.copy(alpha = 0.18f))
}

enum class PopIdentityStyle(
    val primary: Color,
    val hover: Color,
    val pressed: Color,
    val soft: Color,
    val onPrimary: Color = Color.White,
) {
    PULSE(Color(0xFF1E5BFF), Color(0xFF1749D8), Color(0xFF1239B3), Color(0xFFEAF0FF)),
    MINT(Color(0xFF0EA5A4), Color(0xFF0D9493), Color(0xFF0B7F7E), Color(0xFFE6F7F7)),
    VIOLET(Color(0xFF7C3AED), Color(0xFF6D28D9), Color(0xFF5B21B6), Color(0xFFF1EAFE)),
    CORAL(Color(0xFFF43F5E), Color(0xFFE11D48), Color(0xFFBE123C), Color(0xFFFFF0F3)),
    SOLAR(Color(0xFFF59E0B), Color(0xFFD97706), Color(0xFFB45309), Color(0xFFFFF7E6)),
    GRAPHITE(Color(0xFF334155), Color(0xFF273444), Color(0xFF1E293B), Color(0xFFEEF1F4)),
}

data class PopSemanticColors(
    val brandPrimary: Color,
    val onBrand: Color,
    /** Explicit artwork roles. Consumers must not recolor logo paths blindly. */
    val logoPrimary: Color,
    val logoSecondary: Color,
    val logoAccent: Color,
    val logoOnPrimary: Color,
    val logoOnDark: Color,
    val backgroundPrimary: Color,
    val backgroundSecondary: Color,
    val backgroundTertiary: Color,
    val surfacePrimary: Color,
    val surfaceSecondary: Color,
    val surfaceElevated: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textTertiary: Color,
    val textInverse: Color,
    val textDisabled: Color,
    val borderDefault: Color,
    val borderStrong: Color,
    val borderFocus: Color,
    val success: Color,
    val successText: Color,
    val successBackground: Color,
    val warning: Color,
    val warningText: Color,
    val warningBackground: Color,
    val error: Color,
    val errorText: Color,
    val errorBackground: Color,
    val info: Color,
    val infoText: Color,
    val infoBackground: Color,
    val disabledBackground: Color,
    val disabledBorder: Color,
)

fun popSemanticColors(identity: PopIdentityStyle, dark: Boolean): PopSemanticColors {
    if (!dark) return PopSemanticColors(
        brandPrimary = identity.primary,
        onBrand = identity.onPrimary,
        logoPrimary = Color(0xFF111817),
        logoSecondary = Color(0xFF111817),
        logoAccent = identity.primary,
        logoOnPrimary = identity.onPrimary,
        logoOnDark = Color.White,
        backgroundPrimary = Color(0xFFFFFFFF),
        backgroundSecondary = Color(0xFFF7F9F9),
        backgroundTertiary = Color(0xFFEEF3F2),
        surfacePrimary = Color(0xFFFFFFFF),
        surfaceSecondary = Color(0xFFF4F7F6),
        surfaceElevated = Color(0xFFFFFFFF),
        textPrimary = Color(0xFF111817),
        textSecondary = Color(0xFF52605E),
        textTertiary = Color(0xFF7A8785),
        textInverse = Color(0xFFFFFFFF),
        textDisabled = Color(0xFF9DA8A6),
        borderDefault = Color(0xFFE1E7E6),
        borderStrong = Color(0xFFC2CCCA),
        borderFocus = identity.primary,
        success = Color(0xFF16A34A),
        successText = Color(0xFF166534),
        successBackground = Color(0xFFF0FDF4),
        warning = Color(0xFFD97706),
        warningText = Color(0xFF92400E),
        warningBackground = Color(0xFFFFFBEB),
        error = Color(0xFFDC2626),
        errorText = Color(0xFF991B1B),
        errorBackground = Color(0xFFFEF2F2),
        info = Color(0xFF2563EB),
        infoText = Color(0xFF1E40AF),
        infoBackground = Color(0xFFEFF6FF),
        disabledBackground = Color(0xFFEEF1F1),
        disabledBorder = Color(0xFFDDE2E1),
    )

    val darkBrand = if (identity == PopIdentityStyle.MINT) Color(0xFF2DD4D1) else identity.primary
    val darkOnBrand = if (identity == PopIdentityStyle.MINT) Color(0xFF062524) else identity.onPrimary
    return PopSemanticColors(
        brandPrimary = darkBrand,
        onBrand = darkOnBrand,
        logoPrimary = Color(0xFFF4F7F6),
        logoSecondary = Color(0xFFF4F7F6),
        logoAccent = darkBrand,
        logoOnPrimary = darkOnBrand,
        logoOnDark = Color.White,
        backgroundPrimary = Color(0xFF0B0F0F),
        backgroundSecondary = Color(0xFF111716),
        backgroundTertiary = Color(0xFF17201F),
        surfacePrimary = Color(0xFF121817),
        surfaceSecondary = Color(0xFF18201F),
        surfaceElevated = Color(0xFF1D2625),
        textPrimary = Color(0xFFF4F7F6),
        textSecondary = Color(0xFFB7C1BF),
        textTertiary = Color(0xFF87928F),
        textInverse = Color(0xFF111817),
        textDisabled = Color(0xFF66716F),
        borderDefault = Color(0xFF283330),
        borderStrong = Color(0xFF3B4845),
        borderFocus = darkBrand,
        success = Color(0xFF22C55E),
        successText = Color(0xFF86EFAC),
        successBackground = Color(0xFF0D2818),
        warning = Color(0xFFF59E0B),
        warningText = Color(0xFFFCD34D),
        warningBackground = Color(0xFF2B1D08),
        error = Color(0xFFEF4444),
        errorText = Color(0xFFFCA5A5),
        errorBackground = Color(0xFF2B1111),
        info = Color(0xFF3B82F6),
        infoText = Color(0xFF93C5FD),
        infoBackground = Color(0xFF101F3D),
        disabledBackground = Color(0xFF1C2322),
        disabledBorder = Color(0xFF303937),
    )
}
