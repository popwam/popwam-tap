package com.popwam.tap.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.popwam.tap.R

private val Dark = darkColorScheme(
    primary = Color(0xFF53E0B3),
    secondary = Color(0xFFB5C2BD),
    background = Color(0xFF111313),
    surface = Color(0xFF191C1B),
    surfaceVariant = Color(0xFF232725),
    outline = Color(0xFF3A403D),
    onBackground = Color(0xFFF4F6F5),
    onSurface = Color(0xFFF4F6F5),
    onPrimary = Color(0xFF03120D),
)

private val Cairo = FontFamily(
    Font(R.font.cairo,FontWeight.Normal),
    Font(R.font.cairo,FontWeight.Medium),
    Font(R.font.cairo,FontWeight.Bold),
    Font(R.font.cairo,FontWeight.Black),
)
private val BaseTypography=Typography()
private val PopwamTypography=Typography(
    displayLarge=BaseTypography.displayLarge.copy(fontFamily=Cairo),displayMedium=BaseTypography.displayMedium.copy(fontFamily=Cairo),displaySmall=BaseTypography.displaySmall.copy(fontFamily=Cairo),
    headlineLarge=BaseTypography.headlineLarge.copy(fontFamily=Cairo),headlineMedium=BaseTypography.headlineMedium.copy(fontFamily=Cairo),headlineSmall=BaseTypography.headlineSmall.copy(fontFamily=Cairo),
    titleLarge=BaseTypography.titleLarge.copy(fontFamily=Cairo),titleMedium=BaseTypography.titleMedium.copy(fontFamily=Cairo),titleSmall=BaseTypography.titleSmall.copy(fontFamily=Cairo),
    bodyLarge=BaseTypography.bodyLarge.copy(fontFamily=Cairo),bodyMedium=BaseTypography.bodyMedium.copy(fontFamily=Cairo),bodySmall=BaseTypography.bodySmall.copy(fontFamily=Cairo),
    labelLarge=BaseTypography.labelLarge.copy(fontFamily=Cairo),labelMedium=BaseTypography.labelMedium.copy(fontFamily=Cairo),labelSmall=BaseTypography.labelSmall.copy(fontFamily=Cairo),
)

@Composable
fun PopwamTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = Dark,
        typography = PopwamTypography,
        shapes = Shapes(
            small = RoundedCornerShape(12.dp),
            medium = RoundedCornerShape(18.dp),
            large = RoundedCornerShape(28.dp),
        ),
        content = content,
    )
}
