package com.popwam.tap.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Dark = darkColorScheme(
    primary = Color(0xFF53E0B3),
    secondary = Color(0xFF83AFFF),
    background = Color(0xFF07090F),
    surface = Color(0xFF111722),
    onPrimary = Color(0xFF03120D),
)

private val Light = lightColorScheme(
    primary = Color(0xFF087E68),
    secondary = Color(0xFF1D4ED8),
    background = Color(0xFFEEF3F6),
    surface = Color.White,
)

@Composable
fun PopwamTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) Dark else Light,
        typography = Typography(),
        content = content,
    )
}
