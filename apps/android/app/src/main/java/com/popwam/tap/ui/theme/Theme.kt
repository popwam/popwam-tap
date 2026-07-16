package com.popwam.tap.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.popwam.tap.R

private val Light = lightColorScheme(
    primary = Color(0xFF6D3DD7),
    secondary = Color(0xFF825BDD),
    background = Color(0xFFFFFFFF),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFFCFCFC),
    outline = Color(0xFFEDEDED),
    onBackground = Color(0xFF121020),
    onSurface = Color(0xFF121020),
    onSurfaceVariant = Color(0xFF6E6E6E),
    onPrimary = Color.White,
    error = Color(0xFFD92D20),
)

private val Cairo = FontFamily(
    Font(R.font.cairo,FontWeight.Normal),
    Font(R.font.cairo,FontWeight.Medium),
    Font(R.font.cairo,FontWeight.Bold),
    Font(R.font.cairo,FontWeight.Black),
)
private val ABeeZee = FontFamily(Font(R.font.abeezee, FontWeight.Normal))
private val BaseTypography=Typography()
private fun popwamTypography(font:FontFamily)=Typography(
    displayLarge=BaseTypography.displayLarge.copy(fontFamily=font),displayMedium=BaseTypography.displayMedium.copy(fontFamily=font),displaySmall=BaseTypography.displaySmall.copy(fontFamily=font),
    headlineLarge=BaseTypography.headlineLarge.copy(fontFamily=font),headlineMedium=BaseTypography.headlineMedium.copy(fontFamily=font),headlineSmall=BaseTypography.headlineSmall.copy(fontFamily=font),
    titleLarge=BaseTypography.titleLarge.copy(fontFamily=font),titleMedium=BaseTypography.titleMedium.copy(fontFamily=font),titleSmall=BaseTypography.titleSmall.copy(fontFamily=font),
    bodyLarge=BaseTypography.bodyLarge.copy(fontFamily=font),bodyMedium=BaseTypography.bodyMedium.copy(fontFamily=font),bodySmall=BaseTypography.bodySmall.copy(fontFamily=font),
    labelLarge=BaseTypography.labelLarge.copy(fontFamily=font),labelMedium=BaseTypography.labelMedium.copy(fontFamily=font),labelSmall=BaseTypography.labelSmall.copy(fontFamily=font),
)

@Composable
fun PopwamTheme(content: @Composable () -> Unit) {
    val arabic = LocalConfiguration.current.locales[0].language == "ar"
    MaterialTheme(
        colorScheme = Light,
        typography = popwamTypography(if(arabic) Cairo else ABeeZee),
        shapes = Shapes(
            small = RoundedCornerShape(14.dp),
            medium = RoundedCornerShape(24.dp),
            large = RoundedCornerShape(32.dp),
        ),
        content = content,
    )
}
