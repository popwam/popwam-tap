package com.popwam.mobile.designsystem

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

enum class PopScriptDirection { LTR, RTL }

data class PopFontFamilies(
    val englishMontserrat: FontFamily,
    val arabicCairo: FontFamily,
)

object PopTypeScale {
    val display = TextStyle(fontSize = 48.sp, lineHeight = 56.sp, fontWeight = FontWeight.Bold)
    val heading1 = TextStyle(fontSize = 40.sp, lineHeight = 48.sp, fontWeight = FontWeight.Bold)
    val heading2 = TextStyle(fontSize = 36.sp, lineHeight = 44.sp, fontWeight = FontWeight.Bold)
    val heading3 = TextStyle(fontSize = 32.sp, lineHeight = 40.sp, fontWeight = FontWeight.Bold)
    val title = TextStyle(fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold)
    val section = TextStyle(fontSize = 18.sp, lineHeight = 24.sp, fontWeight = FontWeight.SemiBold)
    val body = TextStyle(fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.Medium)
    val supporting = TextStyle(fontSize = 14.sp, lineHeight = 21.sp, fontWeight = FontWeight.Medium)
    val label = TextStyle(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.SemiBold)
    val caption = TextStyle(fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium)
    val button = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold)
}

fun popTypography(fonts: PopFontFamilies, direction: PopScriptDirection): Typography {
    val family = when (direction) {
        PopScriptDirection.LTR -> fonts.englishMontserrat
        PopScriptDirection.RTL -> fonts.arabicCairo
    }
    fun TextStyle.withFamily() = copy(fontFamily = family)
    return Typography(
        displayLarge = PopTypeScale.display.withFamily(),
        displayMedium = PopTypeScale.heading1.withFamily(),
        displaySmall = PopTypeScale.heading2.withFamily(),
        headlineLarge = PopTypeScale.heading1.withFamily(),
        headlineMedium = PopTypeScale.heading3.withFamily(),
        headlineSmall = PopTypeScale.title.withFamily(),
        titleLarge = PopTypeScale.title.withFamily(),
        titleMedium = PopTypeScale.section.withFamily(),
        titleSmall = PopTypeScale.body.copy(fontWeight = FontWeight.SemiBold).withFamily(),
        bodyLarge = PopTypeScale.body.withFamily(),
        bodyMedium = PopTypeScale.supporting.withFamily(),
        bodySmall = PopTypeScale.label.copy(fontWeight = FontWeight.Medium).withFamily(),
        labelLarge = PopTypeScale.button.withFamily(),
        labelMedium = PopTypeScale.label.withFamily(),
        labelSmall = PopTypeScale.caption.withFamily(),
    )
}
