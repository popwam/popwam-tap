package com.popwam.pop.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.popwam.pop.R

private val Light = lightColorScheme(
    primary = Color(0xFFD4AF37),
    secondary = Color(0xFFF5D76E),
    background = Color(0xFFFFFFFF),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFFCFCFC),
    outline = Color(0xFF6E5420),
    onBackground = Color(0xFF111111),
    onSurface = Color(0xFF111111),
    onSurfaceVariant = Color(0xFF6E6E6E),
    onPrimary = Color.White,
    error = Color(0xFFD92D20),
)
private val Dark = darkColorScheme(
    primary = Color(0xFFD4AF37),
    secondary = Color(0xFFF5D76E),
    background = Color(0xFF07090F),
    surface = Color(0xFF111722),
    surfaceVariant = Color(0xFF18202C),
    outline = Color(0xFF8D7440),
    onBackground = Color(0xFFF5F7FB),
    onSurface = Color(0xFFF5F7FB),
    onSurfaceVariant = Color(0xFFB8C1CC),
    onPrimary = Color(0xFF171100),
    error = Color(0xFFFFB4AB),
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
fun PopwamTheme(themeMode:String="SYSTEM",fontMode:String="DEFAULT",content: @Composable () -> Unit) {
    val arabic = LocalConfiguration.current.locales[0].language == "ar"
    val dark=when(themeMode){"DARK"->true;"LIGHT"->false;else->isSystemInDarkTheme()}
    val font=when(fontMode){"CAIRO"->Cairo;"ABEEZEE"->ABeeZee;else->if(arabic)Cairo else ABeeZee}
    MaterialTheme(
        colorScheme = if(dark) Dark else Light,
        typography = popwamTypography(font),
        shapes = Shapes(
            small = RoundedCornerShape(14.dp),
            medium = RoundedCornerShape(24.dp),
            large = RoundedCornerShape(32.dp),
        ),
        content = content,
    )
}
